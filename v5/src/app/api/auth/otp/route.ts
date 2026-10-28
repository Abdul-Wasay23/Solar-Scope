import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

type OtpChallenge = {
  codeHash: string;
  expiresAt: number;
  nextSendAt: number;
  attempts: number;
  sends: number;
  windowStartedAt: number;
};

const challenges = new Map<string, OtpChallenge>();
const OTP_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const SEND_LIMIT = 5;
const SEND_WINDOW_MS = 60 * 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function hashCode(code: string): Buffer {
  return createHash("sha256").update(code).digest();
}

type EmailDeliveryResult =
  | { status: "sent" | "not_configured" | "unavailable" }
  | { status: "rejected"; reason: string };

async function sendEmail(email: string, code: string): Promise<EmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "development") return { status: "not_configured" };
    console.info(`[SolarScope development OTP] ${email}: ${code}`);
    return { status: "sent" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Verify your SolarScope account",
        text: `Your SolarScope verification code is ${code}. It expires in 10 minutes.`,
      }),
    });
    if (response.ok) return { status: "sent" };
    let reason = `HTTP ${response.status}`;
    try {
      const errorBody: unknown = await response.json();
      if (errorBody && typeof errorBody === "object" && "message" in errorBody && typeof errorBody.message === "string") {
        reason = errorBody.message.replace(/[\r\n]/g, " ").slice(0, 240);
      }
    } catch {
      // Keep the HTTP status as the diagnostic if the provider body is not JSON.
    }
    return { status: "rejected", reason };
  } catch {
    return { status: "unavailable" };
  }
}

export async function POST(request: Request) {
  let payload: { action?: unknown; email?: unknown; code?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const email = normalizeEmail(payload.email);
  if (!email) return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });

  if (payload.action === "send") {
    const now = Date.now();
    const previous = challenges.get(email);
    const windowStartedAt = previous?.windowStartedAt ?? now;
    const sends = now - windowStartedAt >= SEND_WINDOW_MS ? 0 : previous?.sends ?? 0;
    const activeWindowStart = sends === 0 ? now : windowStartedAt;

    if (previous && now < previous.nextSendAt) {
      return NextResponse.json(
        { message: "Wait before requesting another code.", retryAfterSeconds: Math.ceil((previous.nextSendAt - now) / 1000) },
        { status: 429 },
      );
    }
    if (sends >= SEND_LIMIT) {
      return NextResponse.json({ message: "Too many code requests. Try again later." }, { status: 429 });
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const delivery = await sendEmail(email, code);
    if (delivery.status !== "sent") {
      const message = delivery.status === "not_configured"
        ? "Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM."
        : delivery.status === "rejected"
          ? `Resend rejected this email (${delivery.reason}). Check API key, verified sender/domain, and test-mode recipient restrictions.`
          : "Could not reach Resend. Check the server connection and try again.";
      return NextResponse.json(
        { message },
        { status: delivery.status === "not_configured" ? 503 : 502 },
      );
    }

    challenges.set(email, {
      codeHash: hashCode(code).toString("hex"),
      expiresAt: now + OTP_LIFETIME_MS,
      nextSendAt: now + RESEND_COOLDOWN_MS,
      attempts: 0,
      sends: sends + 1,
      windowStartedAt: activeWindowStart,
    });
    return NextResponse.json({ message: "Verification code sent.", expiresInSeconds: OTP_LIFETIME_MS / 1000 });
  }

  if (payload.action === "verify") {
    const challenge = challenges.get(email);
    if (!challenge || Date.now() >= challenge.expiresAt) {
      challenges.delete(email);
      return NextResponse.json({ message: "Code expired. Request a new code." }, { status: 400 });
    }
    if (challenge.attempts >= MAX_VERIFY_ATTEMPTS) {
      challenges.delete(email);
      return NextResponse.json({ message: "Too many incorrect attempts. Request a new code." }, { status: 429 });
    }
    if (typeof payload.code !== "string" || !/^\d{6}$/.test(payload.code)) {
      challenge.attempts += 1;
      return NextResponse.json({ message: "Enter the 6-digit verification code." }, { status: 400 });
    }

    const submittedHash = hashCode(payload.code);
    const expectedHash = Buffer.from(challenge.codeHash, "hex");
    if (!timingSafeEqual(submittedHash, expectedHash)) {
      challenge.attempts += 1;
      return NextResponse.json({ message: "That code is incorrect." }, { status: 400 });
    }

    challenges.delete(email);
    return NextResponse.json({ verified: true });
  }

  return NextResponse.json({ message: "Unsupported OTP action." }, { status: 400 });
}
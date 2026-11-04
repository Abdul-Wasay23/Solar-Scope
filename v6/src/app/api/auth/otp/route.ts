import { NextResponse } from "next/server";
import { sendOtpEmail } from "@/lib/email";
import {
  normalizeEmail,
  generateOtp,
  verifyOtp,
} from "@/lib/otpStore";

export async function POST(request: Request) {
  let payload: { action?: unknown; email?: unknown; code?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const email = normalizeEmail(payload.email);
  if (!email) {
    return NextResponse.json({ message: "Enter a valid email address." }, { status: 400 });
  }

  // ── Action: Send OTP via Gmail SMTP ─────────────────────────────────────────
  if (payload.action === "send") {
    // 1. Generate secure OTP (persisted in PostgreSQL)
    const genResult = await generateOtp(email);
    if (!genResult.success) {
      return NextResponse.json(
        { message: genResult.message },
        { status: genResult.statusCode }
      );
    }

    // 2. Deliver via Gmail SMTP
    const delivery = await sendOtpEmail(email, genResult.code);
    if (!delivery.success) {
      return NextResponse.json(
        {
          message: `Email delivery failed: ${delivery.error}. Please check your Gmail SMTP settings.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      message: "Verification code sent to your email.",
      expiresInSeconds: genResult.expiresInSeconds,
    });
  }

  // ── Action: Verify OTP ──────────────────────────────────────────────────────
  if (payload.action === "verify") {
    const code = typeof payload.code === "string" ? payload.code.trim() : "";
    const verifyResult = await verifyOtp(email, code);

    if (!verifyResult.success) {
      return NextResponse.json(
        { message: verifyResult.message },
        { status: verifyResult.statusCode }
      );
    }

    return NextResponse.json({
      verified: true,
      message: "Email verified successfully.",
    });
  }

  return NextResponse.json({ message: "Unsupported OTP action." }, { status: 400 });
}

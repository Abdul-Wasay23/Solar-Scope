import { NextResponse } from "next/server";
import { findRegisteredAccount, createPasswordResetToken } from "@/lib/passwordReset";
import { sendPasswordResetEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function getBaseUrl(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "localhost:3000";

  return `${proto}://${host}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { message: "Email address is required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // 1. Check whether it exists in database and belongs to a registered account
    const user = await findRegisteredAccount(normalizedEmail);
    if (!user) {
      // Exact required message:
      return NextResponse.json(
        { message: "Account not found. Please enter your registered email address." },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { message: "This account has been deactivated. Please contact support." },
        { status: 403 }
      );
    }

    // 2. Generate secure unique time-limited reset token
    const token = await createPasswordResetToken(user.id, user.email);

    // 3. Build reset URL
    const baseUrl = getBaseUrl(request);
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    // 4. Send email strictly to the registered user's email
    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      resetUrl,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { message: emailResult.error || "Unable to send recovery email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: `Password reset instructions have been sent to ${user.email}. Please check your inbox.`,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Forgot password API error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}


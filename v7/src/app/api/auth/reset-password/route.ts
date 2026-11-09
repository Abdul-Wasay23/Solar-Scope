import { NextResponse } from "next/server";
import {
  verifyPasswordResetToken,
  completePasswordReset,
} from "@/lib/passwordReset";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || "";

    if (!token) {
      return NextResponse.json(
        { valid: false, message: "Reset token is missing." },
        { status: 400 }
      );
    }

    const verification = await verifyPasswordResetToken(token);
    if (!verification.valid) {
      return NextResponse.json(
        { valid: false, message: verification.error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        email: verification.email,
        fullName: verification.fullName,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Verify reset token error:", error);
    return NextResponse.json(
      { valid: false, message: "Unable to verify token. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, password, confirmPassword } = body;

    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { message: "Password reset token is required." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { message: "Passwords do not match." },
        { status: 400 }
      );
    }

    const result = await completePasswordReset(token, password);
    if (!result.success) {
      return NextResponse.json(
        { message: result.error },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json(
      { message: result.message },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Reset password POST error:", error);
    return NextResponse.json(
      { message: "Failed to reset password. Please try again later." },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { consumeVerifiedEmail } from "@/lib/otpStore";
import type { UserRole } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, password, role = "BUYER" } = body;

    // 1. Validation
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json(
        { message: "Full name is required." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { message: "A valid email address is required." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Enforce OTP Verification Check
    const isVerified = await consumeVerifiedEmail(normalizedEmail);
    if (!isVerified) {
      return NextResponse.json(
        {
          message:
            "Email verification required. Please verify the 6-digit code sent to your email before completing registration.",
        },
        { status: 403 }
      );
    }
    const normalizedRole: UserRole = role === "SELLER" ? "SELLER" : "BUYER";
    const dbRoleName = normalizedRole.toLowerCase(); // 'buyer' or 'seller'

    // 2. Check if user already exists
    const existingUser = await query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { message: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    // 3. Hash Password
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Insert into users table
    const userResult = await query<{
      id: string | number;
      full_name: string;
      email: string;
      is_active: boolean;
    }>(
      `INSERT INTO users (full_name, email, password_hash, is_active, is_email_verified)
       VALUES ($1, $2, $3, true, true)
       RETURNING id, full_name, email, is_active`,
      [fullName.trim(), normalizedEmail, passwordHash]
    );

    const newUser = userResult.rows[0];

    // 5. Look up Role ID & Insert into user_roles table
    const roleResult = await query<{ id: number }>(
      "SELECT id FROM roles WHERE LOWER(name) = $1",
      [dbRoleName]
    );

    if (roleResult.rows.length > 0) {
      const roleId = roleResult.rows[0].id;
      await query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [newUser.id, roleId]
      );
    }

    return NextResponse.json(
      {
        message: "Registration successful.",
        user: {
          id: String(newUser.id),
          fullName: newUser.full_name,
          email: newUser.email,
          role: normalizedRole,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Failed to register user. Please try again later." },
      { status: 500 }
    );
  }
}


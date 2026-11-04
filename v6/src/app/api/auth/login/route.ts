import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import type { UserRole } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. Fetch user from PostgreSQL along with role
    const result = await query<{
      id: string | number;
      full_name: string;
      email: string;
      password_hash: string;
      is_active: boolean;
      role_name: string | null;
    }>(
      `SELECT u.id, u.full_name, u.email, u.password_hash, u.is_active, r.name as role_name
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE LOWER(u.email) = $1
       LIMIT 1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return NextResponse.json(
        { message: "Your account is deactivated. Please contact support." },
        { status: 403 }
      );
    }

    // 2. Compare password with bcrypt hash
    const isPasswordValid = await bcrypt.compare(String(password), user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Invalid email or password." },
        { status: 401 }
      );
    }

    // 3. Resolve role: BUYER | SELLER | ADMIN
    let role: UserRole = "BUYER";
    const dbRole = (user.role_name || "").toUpperCase();
    if (dbRole === "SELLER") role = "SELLER";
    else if (dbRole === "ADMIN") role = "ADMIN";
    else role = "BUYER";

    return NextResponse.json(
      {
        message: "Login successful.",
        user: {
          id: String(user.id),
          fullName: user.full_name,
          email: user.email,
          role,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Login failed. Please try again later." },
      { status: 500 }
    );
  }
}


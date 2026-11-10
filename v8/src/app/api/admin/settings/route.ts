import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/admin/settings — load authenticated admin profile from PostgreSQL
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    const emailParam = searchParams.get("email");

    let sql = `
      SELECT u.id, u.full_name, u.email, u.created_at
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE LOWER(r.name) = 'admin'
    `;
    const params: any[] = [];

    if (userIdParam && !isNaN(Number(userIdParam))) {
      params.push(Number(userIdParam));
      sql += ` AND u.id = $${params.length}`;
    } else if (emailParam) {
      params.push(emailParam.trim().toLowerCase());
      sql += ` AND LOWER(u.email) = $${params.length}`;
    }

    sql += ` ORDER BY u.id ASC LIMIT 1`;

    let res = await query<{
      id: number;
      full_name: string;
      email: string;
      created_at: Date;
    }>(sql, params);

    // Fallback if specific ID not passed or not matched: find first admin in DB
    if (res.rows.length === 0) {
      res = await query<{
        id: number;
        full_name: string;
        email: string;
        created_at: Date;
      }>(
        `SELECT u.id, u.full_name, u.email, u.created_at
         FROM users u
         JOIN user_roles ur ON u.id = ur.user_id
         JOIN roles r ON ur.role_id = r.id
         WHERE LOWER(r.name) = 'admin'
         ORDER BY u.id ASC
         LIMIT 1`
      );
    }

    // Auto-bootstrap Platform Admin in PostgreSQL if no admin exists yet
    if (res.rows.length === 0) {
      const configuredEmail = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase() || "admin@example.test";
      const configuredPassword = process.env.DEMO_ADMIN_PASSWORD || "admin12345";
      const hash = await bcrypt.hash(configuredPassword, 10);
      const insert = await query<{ id: number; full_name: string; email: string; created_at: Date }>(
        `INSERT INTO users (full_name, email, password_hash, is_active, is_email_verified)
         VALUES ('Platform Admin', $1, $2, true, true)
         ON CONFLICT (email) DO UPDATE SET is_active = true
         RETURNING id, full_name, email, created_at`,
        [configuredEmail, hash]
      );
      if (insert.rows.length > 0) {
        const adminId = insert.rows[0].id;
        const roleRes = await query<{ id: number }>("SELECT id FROM roles WHERE LOWER(name) = 'admin' LIMIT 1");
        const roleId = roleRes.rows.length > 0 ? roleRes.rows[0].id : 3;
        await query(
          "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [adminId, roleId]
        );
        res = insert;
      }
    }

    if (res.rows.length === 0) {
      return NextResponse.json({ message: "Admin account not found in database." }, { status: 404 });
    }

    const admin = res.rows[0];
    return NextResponse.json({
      id: String(admin.id),
      email: admin.email,
      fullName: admin.full_name,
    });
  } catch (error: any) {
    console.error("GET admin settings error:", error);
    return NextResponse.json({ message: "Failed to fetch admin settings." }, { status: 500 });
  }
}

// POST /api/admin/settings — update admin profile & password in PostgreSQL
export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON request body." }, { status: 400 });
    }

    const { userId, fullName, email, currentPassword, newPassword } = body;

    // 1. Fetch the targeted admin user record from PostgreSQL
    let admin: { id: number; full_name: string; email: string; password_hash: string } | null = null;

    if (userId && !isNaN(Number(userId))) {
      const res = await query<{
        id: number;
        full_name: string;
        email: string;
        password_hash: string;
      }>(
        `SELECT u.id, u.full_name, u.email, u.password_hash
         FROM users u
         JOIN user_roles ur ON u.id = ur.user_id
         JOIN roles r ON ur.role_id = r.id
         WHERE u.id = $1 AND LOWER(r.name) = 'admin'
         LIMIT 1`,
        [Number(userId)]
      );
      if (res.rows.length > 0) {
        admin = res.rows[0];
      }
    }

    if (!admin && email) {
      const res = await query<{
        id: number;
        full_name: string;
        email: string;
        password_hash: string;
      }>(
        `SELECT u.id, u.full_name, u.email, u.password_hash
         FROM users u
         JOIN user_roles ur ON u.id = ur.user_id
         JOIN roles r ON ur.role_id = r.id
         WHERE LOWER(u.email) = $1 AND LOWER(r.name) = 'admin'
         LIMIT 1`,
        [String(email).trim().toLowerCase()]
      );
      if (res.rows.length > 0) {
        admin = res.rows[0];
      }
    }

    // Fallback: fetch the primary admin if neither matched
    if (!admin) {
      const res = await query<{
        id: number;
        full_name: string;
        email: string;
        password_hash: string;
      }>(
        `SELECT u.id, u.full_name, u.email, u.password_hash
         FROM users u
         JOIN user_roles ur ON u.id = ur.user_id
         JOIN roles r ON ur.role_id = r.id
         WHERE LOWER(r.name) = 'admin'
         ORDER BY u.id ASC
         LIMIT 1`
      );
      if (res.rows.length > 0) {
        admin = res.rows[0];
      }
    }

    if (!admin) {
      return NextResponse.json({ message: "Admin account not found in database." }, { status: 404 });
    }

    // 2. If changing password, verify current password and validate new password
    if (newPassword !== undefined && newPassword !== null && newPassword !== "") {
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return NextResponse.json(
          { message: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      if (!currentPassword) {
        return NextResponse.json(
          { message: "Current password is required to change password." },
          { status: 400 }
        );
      }

      const isMatch = await bcrypt.compare(String(currentPassword), admin.password_hash);
      if (!isMatch) {
        return NextResponse.json(
          { message: "Current password is incorrect." },
          { status: 400 }
        );
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await query(
        "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [newHash, admin.id]
      );
    }

    // 3. Update profile details (full name & email)
    let updatedFullName = admin.full_name;
    let updatedEmail = admin.email;

    if (fullName !== undefined) {
      const trimmedName = String(fullName).trim();
      if (!trimmedName) {
        return NextResponse.json(
          { message: "Full name cannot be empty." },
          { status: 400 }
        );
      }
      updatedFullName = trimmedName;
    }

    if (email !== undefined) {
      const trimmedEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return NextResponse.json(
          { message: "A valid email address is required." },
          { status: 400 }
        );
      }

      // Check if email is already taken by another user
      if (trimmedEmail !== admin.email.toLowerCase()) {
        const dup = await query<{ id: number }>(
          "SELECT id FROM users WHERE LOWER(email) = $1 AND id != $2 LIMIT 1",
          [trimmedEmail, admin.id]
        );
        if (dup.rows.length > 0) {
          return NextResponse.json(
            { message: "An account with this email address already exists." },
            { status: 409 }
          );
        }
      }
      updatedEmail = trimmedEmail;
    }

    await query(
      "UPDATE users SET full_name = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
      [updatedFullName, updatedEmail, admin.id]
    );

    return NextResponse.json({
      message: "Admin settings updated successfully.",
      user: {
        id: String(admin.id),
        fullName: updatedFullName,
        email: updatedEmail,
      },
    });
  } catch (error: any) {
    console.error("POST admin settings error:", error);
    return NextResponse.json(
      { message: "Failed to update settings.", error: error.message },
      { status: 500 }
    );
  }
}

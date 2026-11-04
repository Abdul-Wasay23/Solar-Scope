import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

// GET /api/admin/settings — load current admin profile
export async function GET() {
  try {
    const res = await query<{
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

    if (res.rows.length === 0) {
      return NextResponse.json(
        { email: "admin@example.test", fullName: "Platform Admin" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      id: res.rows[0].id,
      email: res.rows[0].email,
      fullName: res.rows[0].full_name,
    });
  } catch (error: any) {
    console.error("GET admin settings error:", error);
    return NextResponse.json({ message: "Failed to fetch admin settings." }, { status: 500 });
  }
}

// POST /api/admin/settings — update admin profile & password
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, currentPassword, newPassword } = body;

    // Fetch the admin user record
    const adminRes = await query<{
      id: number;
      password_hash: string;
      email: string;
    }>(
      `SELECT u.id, u.password_hash, u.email
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE LOWER(r.name) = 'admin'
       ORDER BY u.id ASC
       LIMIT 1`
    );

    if (adminRes.rows.length === 0) {
      return NextResponse.json({ message: "Admin account not found in database." }, { status: 404 });
    }

    const admin = adminRes.rows[0];

    // If changing password, verify current password
    if (newPassword) {
      if (typeof newPassword !== "string" || newPassword.length < 6) {
        return NextResponse.json(
          { message: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      if (currentPassword) {
        const isMatch = await bcrypt.compare(String(currentPassword), admin.password_hash);
        if (!isMatch) {
          return NextResponse.json(
            { message: "Current password is incorrect." },
            { status: 400 }
          );
        }
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, admin.id]);
    }

    // Update profile info
    if (fullName && fullName.trim()) {
      await query("UPDATE users SET full_name = $1 WHERE id = $2", [fullName.trim(), admin.id]);
    }

    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      await query("UPDATE users SET email = $1 WHERE id = $2", [email.trim().toLowerCase(), admin.id]);
    }

    return NextResponse.json({
      message: "Admin settings updated successfully.",
      user: {
        fullName: fullName || "Platform Admin",
        email: email || admin.email,
      },
    });
  } catch (error: any) {
    console.error("POST admin settings error:", error);
    return NextResponse.json({ message: "Failed to update settings.", error: error.message }, { status: 500 });
  }
}


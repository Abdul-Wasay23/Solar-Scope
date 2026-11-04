import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

function parseDbId(rawId: string): number | null {
  const clean = rawId.replace(/^SS-/i, "").trim();
  const num = parseInt(clean, 10);
  return isNaN(num) ? null : num;
}

// GET /api/admin/users/[id]
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dbId = parseDbId(params.id);
    if (!dbId) {
      return NextResponse.json({ message: "Invalid user ID." }, { status: 400 });
    }

    const res = await query<{
      id: number;
      full_name: string;
      email: string;
      phone_number: string | null;
      is_active: boolean;
      is_email_verified: boolean;
      created_at: Date;
      role_name: string | null;
    }>(
      `SELECT u.id, u.full_name, u.email, u.phone_number, u.is_active, u.is_email_verified, u.created_at, r.name as role_name
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1`,
      [dbId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const u = res.rows[0];
    let role: "Buyer" | "Seller" | "Admin" = "Buyer";
    const dbRole = (u.role_name || "").toLowerCase();
    if (dbRole === "seller") role = "Seller";
    else if (dbRole === "admin") role = "Admin";

    let status: "Active" | "Pending" | "Suspended" = "Active";
    if (!u.is_active) status = "Suspended";
    else if (!u.is_email_verified) status = "Pending";

    return NextResponse.json({
      user: {
        id: `SS-${u.id}`,
        dbId: u.id,
        name: u.full_name,
        email: u.email,
        role,
        status,
        phone: u.phone_number || "",
        location: "",
        createdAt: u.created_at,
      },
    });
  } catch (error: any) {
    console.error("GET user by ID error:", error);
    return NextResponse.json({ message: "Failed to fetch user.", error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/users/[id] — update user role, status, or details in PostgreSQL
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dbId = parseDbId(params.id);
    if (!dbId) {
      return NextResponse.json({ message: "Invalid user ID." }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, role, status, phone, password } = body;

    // 1. Update basic fields if provided
    if (name) {
      await query("UPDATE users SET full_name = $1 WHERE id = $2", [name.trim(), dbId]);
    }

    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      await query("UPDATE users SET email = $1 WHERE id = $2", [email.trim().toLowerCase(), dbId]);
    }

    if (phone !== undefined) {
      await query("UPDATE users SET phone_number = $1 WHERE id = $2", [phone ? String(phone).trim() : null, dbId]);
    }

    if (password && String(password).trim().length >= 6) {
      const hash = await bcrypt.hash(String(password).trim(), 10);
      await query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, dbId]);
    }

    // 2. Update status (is_active, is_email_verified)
    if (status) {
      const isActive = status !== "Suspended";
      const isVerified = status === "Active";
      await query(
        "UPDATE users SET is_active = $1, is_email_verified = $2 WHERE id = $3",
        [isActive, isVerified, dbId]
      );
    }

    // 3. Update role in user_roles (strictly Buyer or Seller)
    if (role) {
      const targetRoleName = role.toLowerCase() === "seller" ? "seller" : "buyer";
      const roleRes = await query<{ id: number }>(
        "SELECT id FROM roles WHERE LOWER(name) = $1",
        [targetRoleName]
      );

      if (roleRes.rows.length > 0) {
        // Delete previous roles for this user and insert new one
        await query("DELETE FROM user_roles WHERE user_id = $1", [dbId]);
        await query(
          "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
          [dbId, roleRes.rows[0].id]
        );
      }
    }

    return NextResponse.json({ message: "User updated successfully." });
  } catch (error: any) {
    console.error("PATCH user error:", error);
    return NextResponse.json({ message: "Failed to update user.", error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/users/[id] — remove user from PostgreSQL
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dbId = parseDbId(params.id);
    if (!dbId) {
      return NextResponse.json({ message: "Invalid user ID." }, { status: 400 });
    }

    await query("DELETE FROM users WHERE id = $1", [dbId]);
    return NextResponse.json({ message: "User deleted successfully from database." });
  } catch (error: any) {
    console.error("DELETE user error:", error);
    return NextResponse.json({ message: "Failed to delete user.", error: error.message }, { status: 500 });
  }
}


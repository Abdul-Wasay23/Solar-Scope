import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { normalizePhoneNumber } from "@/lib/phone";

export const dynamic = "force-dynamic";

function formatJoined(createdAt: Date | string): string {
  const d = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// GET /api/admin/users — list all users from PostgreSQL database
export async function GET() {
  try {
    const result = await query<{
      id: string | number;
      full_name: string;
      email: string;
      phone_number: string | null;
      is_active: boolean;
      is_email_verified: boolean;
      created_at: Date;
      role_name: string | null;
    }>(
      `SELECT 
         u.id, 
         u.full_name, 
         u.email, 
         u.phone_number, 
         u.is_active, 
         u.is_email_verified, 
         u.created_at, 
         COALESCE(r.name, 'buyer') as role_name
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       ORDER BY u.created_at DESC`
    );

    const users = result.rows.map((u) => {
      let role: "Buyer" | "Seller" | "Admin" = "Buyer";
      const dbRole = (u.role_name || "").toLowerCase();
      if (dbRole === "seller") role = "Seller";
      else if (dbRole === "admin") role = "Admin";

      let status: "Active" | "Pending" | "Suspended" = "Active";
      if (!u.is_active) {
        status = "Suspended";
      } else if (!u.is_email_verified) {
        status = "Pending";
      }

      return {
        id: `SS-${u.id}`,
        dbId: Number(u.id),
        name: u.full_name,
        email: u.email,
        role,
        status,
        joined: formatJoined(u.created_at),
        phone: u.phone_number || undefined,
        location: undefined,
        createdAt: u.created_at,
      };
    });

    return NextResponse.json({ users }, { status: 200 });
  } catch (error: any) {
    console.error("Admin GET users error:", error);
    return NextResponse.json(
      { message: "Failed to fetch users from database.", error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/admin/users — add user directly to PostgreSQL database
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, role = "Buyer", status = "Active", phone, location } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ message: "Full name is required." }, { status: 400 });
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ message: "Valid email address is required." }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existing = await query("SELECT id FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { message: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    // Default password if not provided
    const userPassword = (password && String(password).trim().length >= 6)
      ? String(password).trim()
      : "SolarScope123!";

    const passwordHash = await bcrypt.hash(userPassword, 10);
    const isActive = status !== "Suspended";
    const isVerified = status === "Active";

    // Insert user
    const insertRes = await query<{
      id: string | number;
      full_name: string;
      email: string;
      phone_number: string | null;
      created_at: Date;
    }>(
      `INSERT INTO users (full_name, email, phone_number, password_hash, is_active, is_email_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, phone_number, created_at`,
      [name.trim(), normalizedEmail, normalizePhoneNumber(phone), passwordHash, isActive, isVerified]
    );

    const newUser = insertRes.rows[0];

    // Assign role (buyer or seller)
    const targetRoleName = role.toLowerCase() === "seller" ? "seller" : "buyer";
    const roleRes = await query<{ id: number }>(
      "SELECT id FROM roles WHERE LOWER(name) = $1",
      [targetRoleName]
    );

    if (roleRes.rows.length > 0) {
      await query(
        `INSERT INTO user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [newUser.id, roleRes.rows[0].id]
      );
    }

    return NextResponse.json(
      {
        message: "User created successfully in database.",
        user: {
          id: `SS-${newUser.id}`,
          dbId: Number(newUser.id),
          name: newUser.full_name,
          email: newUser.email,
          role: targetRoleName === "seller" ? "Seller" : "Buyer",
          status,
          joined: "Just now",
          phone: newUser.phone_number || undefined,
          location: location || undefined,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Admin POST user error:", error);
    return NextResponse.json(
      { message: "Failed to create user in database.", error: error.message },
      { status: 500 }
    );
  }
}


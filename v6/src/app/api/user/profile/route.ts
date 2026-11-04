import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/user/profile — fetch authenticated user's profile from PostgreSQL database
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get("email");
    const userIdParam = searchParams.get("userId");

    if (!emailParam && !userIdParam) {
      return NextResponse.json({ message: "User ID or Email parameter is required." }, { status: 400 });
    }

    let sql = `
      SELECT u.id, u.full_name, u.email, u.phone_number, u.organization, u.professional_title, u.city, r.name as role_name
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE 
    `;
    const params: any[] = [];

    if (userIdParam && !isNaN(Number(userIdParam))) {
      params.push(Number(userIdParam));
      sql += `u.id = $1`;
    } else if (emailParam) {
      params.push(emailParam.trim().toLowerCase());
      sql += `LOWER(u.email) = $1`;
    } else {
      params.push(userIdParam);
      sql += `u.id::text = $1`;
    }
    sql += ` LIMIT 1`;

    let res = await query<{
      id: string | number;
      full_name: string;
      email: string;
      phone_number: string | null;
      organization: string | null;
      professional_title: string | null;
      city: string | null;
      role_name: string | null;
    }>(sql, params);

    // If user is not found in database yet, auto-provision user so profile works seamlessly
    if (res.rows.length === 0 && emailParam) {
      const normalizedEmail = emailParam.trim().toLowerCase();
      const defaultName = normalizedEmail.split("@")[0] || "Solar Designer";

      await query(
        `INSERT INTO users (full_name, email, password_hash, is_active, organization, professional_title, city)
         VALUES ($1, $2, 'oauth_or_demo_hash', true, 'SolarScope Engineering Solutions', 'Senior PV Systems Designer', 'Karachi, Pakistan')
         ON CONFLICT (email) DO NOTHING`,
        [defaultName, normalizedEmail]
      );

      res = await query(sql, params);
    }

    if (res.rows.length === 0) {
      return NextResponse.json({ message: "User not found in database." }, { status: 404 });
    }

    const u = res.rows[0];
    return NextResponse.json({
      success: true,
      user: {
        id: String(u.id),
        fullName: u.full_name,
        email: u.email,
        phone: u.phone_number || "",
        company: u.organization || "SolarScope Engineering Solutions",
        title: u.professional_title || "Senior PV Systems Designer",
        city: u.city || "Karachi, Pakistan",
        role: (u.role_name || "BUYER").toUpperCase(),
      },
    });
  } catch (err: any) {
    console.error("GET profile error:", err);
    return NextResponse.json({ message: "Failed to fetch profile.", error: err.message }, { status: 500 });
  }
}

// PATCH /api/user/profile — save updated profile to PostgreSQL database
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, fullName, phone, company, title, city } = body;

    if (!email && !userId) {
      return NextResponse.json({ message: "User ID or Email is required to update profile." }, { status: 400 });
    }

    const normalizedEmail = email ? email.trim().toLowerCase() : null;

    let updateRes;
    if (userId && !isNaN(Number(userId))) {
      updateRes = await query<{
        id: string | number;
        full_name: string;
        email: string;
        phone_number: string | null;
        organization: string | null;
        professional_title: string | null;
        city: string | null;
      }>(
        `UPDATE users
         SET full_name = COALESCE($1, full_name),
             email = COALESCE($2, email),
             phone_number = COALESCE($3, phone_number),
             organization = COALESCE($4, organization),
             professional_title = COALESCE($5, professional_title),
             city = COALESCE($6, city),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING id, full_name, email, phone_number, organization, professional_title, city`,
        [
          fullName ? fullName.trim() : null,
          normalizedEmail,
          phone ? phone.trim() : null,
          company ? company.trim() : null,
          title ? title.trim() : null,
          city ? city.trim() : null,
          Number(userId),
        ]
      );
    } else {
      updateRes = await query<{
        id: string | number;
        full_name: string;
        email: string;
        phone_number: string | null;
        organization: string | null;
        professional_title: string | null;
        city: string | null;
      }>(
        `UPDATE users
         SET full_name = COALESCE($1, full_name),
             phone_number = COALESCE($2, phone_number),
             organization = COALESCE($3, organization),
             professional_title = COALESCE($4, professional_title),
             city = COALESCE($5, city),
             updated_at = CURRENT_TIMESTAMP
         WHERE LOWER(email) = $6
         RETURNING id, full_name, email, phone_number, organization, professional_title, city`,
        [
          fullName ? fullName.trim() : null,
          phone ? phone.trim() : null,
          company ? company.trim() : null,
          title ? title.trim() : null,
          city ? city.trim() : null,
          normalizedEmail,
        ]
      );
    }

    if (updateRes.rows.length === 0) {
      // If user not in DB yet, create user record with provided profile details
      const insertRes = await query<{
        id: string | number;
        full_name: string;
        email: string;
        phone_number: string | null;
        organization: string | null;
        professional_title: string | null;
        city: string | null;
      }>(
        `INSERT INTO users (full_name, email, password_hash, phone_number, organization, professional_title, city, is_active)
         VALUES ($1, $2, 'default_profile_hash', $3, $4, $5, $6, true)
         ON CONFLICT (email) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             phone_number = EXCLUDED.phone_number,
             organization = EXCLUDED.organization,
             professional_title = EXCLUDED.professional_title,
             city = EXCLUDED.city,
             updated_at = CURRENT_TIMESTAMP
         RETURNING id, full_name, email, phone_number, organization, professional_title, city`,
        [
          fullName ? fullName.trim() : "Solar Designer",
          normalizedEmail || "user@solarscope.pk",
          phone ? phone.trim() : null,
          company ? company.trim() : "SolarScope Engineering Solutions",
          title ? title.trim() : "Senior PV Systems Designer",
          city ? city.trim() : "Karachi, Pakistan",
        ]
      );
      updateRes = insertRes;
    }

    const u = updateRes.rows[0];
    return NextResponse.json({
      success: true,
      message: "Profile updated successfully in database.",
      user: {
        id: String(u.id),
        fullName: u.full_name,
        email: u.email,
        phone: u.phone_number || "",
        company: u.organization || "SolarScope Engineering Solutions",
        title: u.professional_title || "Senior PV Systems Designer",
        city: u.city || "Karachi, Pakistan",
      },
    });
  } catch (err: any) {
    console.error("PATCH profile error:", err);
    return NextResponse.json({ message: "Failed to update profile.", error: err.message }, { status: 500 });
  }
}

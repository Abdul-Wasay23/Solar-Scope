import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  const configuredEmail = process.env.DEMO_ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.DEMO_ADMIN_PASSWORD;

  let payload: { email?: unknown; password?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!configuredEmail || !configuredPassword) {
    const status = configuredEmail && email === configuredEmail ? 503 : 404;
    return NextResponse.json({ message: "Demo Admin login is not configured." }, { status });
  }
  if (email !== configuredEmail) return NextResponse.json({ message: "Not found." }, { status: 404 });

  const submitted = Buffer.from(typeof payload.password === "string" ? payload.password : "");
  const expected = Buffer.from(configuredPassword);
  const passwordMatches = submitted.length === expected.length && timingSafeEqual(submitted, expected);
  if (!passwordMatches) return NextResponse.json({ message: "Invalid Admin credentials." }, { status: 401 });

  return NextResponse.json({
    user: {
      id: "demo-admin",
      fullName: "SolarScope Admin",
      email: configuredEmail,
      role: "ADMIN",
    },
  });
}
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ready",
    message: "SolarScope asset configuration is complete. Assets are located in public/images.",
  });
}

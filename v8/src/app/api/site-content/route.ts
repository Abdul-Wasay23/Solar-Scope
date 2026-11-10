import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await query<{ section_key: string; content: any }>(
      "SELECT section_key, content FROM site_content"
    );

    const siteContent: Record<string, any> = {};
    for (const row of res.rows) {
      siteContent[row.section_key] = row.content;
    }

    return NextResponse.json({ content: siteContent }, { status: 200 });
  } catch (err: any) {
    console.error("GET site-content error:", err);
    return NextResponse.json({ message: "Failed to fetch site content", content: {} }, { status: 500 });
  }
}


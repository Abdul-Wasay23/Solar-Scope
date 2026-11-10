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
    console.error("Admin GET site-content error:", err);
    return NextResponse.json(
      { message: "Failed to fetch website content", error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sectionKey, content } = body;

    if (!sectionKey || !content) {
      return NextResponse.json(
        { message: "sectionKey and content are required." },
        { status: 400 }
      );
    }

    await query(
      `INSERT INTO site_content (section_key, content, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (section_key)
       DO UPDATE SET content = $2, updated_at = CURRENT_TIMESTAMP`,
      [sectionKey, JSON.stringify(content)]
    );

    return NextResponse.json(
      { message: `Section '${sectionKey}' updated successfully.` },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Admin POST site-content error:", err);
    return NextResponse.json(
      { message: "Failed to save section content.", error: err.message },
      { status: 500 }
    );
  }
}


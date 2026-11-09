import { NextResponse } from "next/server";
import { suggestRegisteredAccounts } from "@/lib/passwordReset";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    const suggestions = await suggestRegisteredAccounts(query);
    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (err: any) {
    console.error("Suggest error:", err);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}


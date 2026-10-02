import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  try {
    const lead = await req.json();
    console.log("[LEAD]", JSON.stringify(lead).slice(0, 1000));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
export async function GET() {
  return NextResponse.json({ ok: true, info: "POST lead {name,company,role,email,sector}" });
}

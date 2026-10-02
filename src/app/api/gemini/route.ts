import { NextRequest, NextResponse } from "next/server";
import { getReply, getModelInfo } from "@/lib/ai-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET -> infos modèles branchés (pour le badge UI)
export async function GET() {
  return NextResponse.json(await getModelInfo());
}

// POST { message, context, image?, lang, model? } -> { reply, provider, model }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await getReply({
      message: body.message ?? "",
      context: body.context,
      image: body.image,
      lang: body.lang ?? "fr",
      modelOverride: body.model,
      voice: body.voice === true,
      history: body.history,
      deepThink: body.deepThink === true,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({
      reply: "Lara est momentanément indisponible. Les expériences restent accessibles.",
      provider: "mock-error",
      model: "error",
    });
  }
}

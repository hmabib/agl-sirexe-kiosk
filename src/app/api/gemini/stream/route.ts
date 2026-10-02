import { NextRequest } from "next/server";
import { getReply } from "@/lib/ai-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST SSE — streaming mot-à-mot pour l'effet temps réel côté borne.
// events: data: {"t":"..."} ... data: {"done":true,"provider":"...","model":"..."}
export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await getReply({
    message: body.message ?? "",
    context: body.context,
    image: body.image,
    lang: body.lang ?? "fr",
    modelOverride: body.model,
  });

  const encoder = new TextEncoder();
  const words = result.reply.split(/(\s+)/);
  const stream = new ReadableStream({
    async start(controller) {
      for (const w of words) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ t: w })}\n\n`));
        await new Promise((r) => setTimeout(r, 28)); // débit typewriter fluide
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, provider: result.provider, model: result.model, error: result.error ?? null })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

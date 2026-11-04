import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateTexture, hasMetaKey, MetaError, MUSE_IMAGE_MODEL } from "@/lib/meta";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120;

const bodySchema = z.object({
  kind: z.enum(["facade", "floor", "roof"]),
  style: z.string().trim().min(1).max(120).default("modern residential"),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(`texture:${clientIp(req)}`, 30, 10 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Please wait a moment and retry." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }
  try {
    const { kind, style } = bodySchema.parse(await req.json());
    if (!hasMetaKey()) {
      return NextResponse.json(
        { success: false, error: "Texture generation needs META_API_KEY on the server." },
        { status: 503 }
      );
    }
    const texture = await generateTexture(kind, style);
    return NextResponse.json({ success: true, kind, texture, model: MUSE_IMAGE_MODEL });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid texture request." }, { status: 400 });
    }
    const message = err instanceof MetaError ? err.message : "Texture generation failed.";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

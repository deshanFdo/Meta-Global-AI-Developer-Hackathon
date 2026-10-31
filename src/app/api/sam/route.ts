import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasMetaKey, MetaError, SAM_MODEL } from "@/lib/meta";
import { SAM_CONCEPTS, segmentConcepts } from "@/lib/sam";

export const maxDuration = 180;

const bodySchema = z.object({
  image: z.string().min(1).max(15_000_000),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]).default("image/png"),
  concepts: z.array(z.string().min(1).max(40)).min(1).max(6).default([...SAM_CONCEPTS].slice(0, 4)),
});

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    if (!hasMetaKey()) {
      return NextResponse.json(
        { success: false, error: "SAM verification needs META_API_KEY on the server." },
        { status: 503 }
      );
    }
    const clean = body.image.replace(/^data:[^;]+;base64,/, "").replace(/[\r\n\s]/g, "");
    const matches = await segmentConcepts(`data:${body.mimeType};base64,${clean}`, body.concepts);
    return NextResponse.json({ success: true, matches, model: SAM_MODEL });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid verification request." }, { status: 400 });
    }
    const message = err instanceof MetaError ? err.message : "SAM segmentation failed.";
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}

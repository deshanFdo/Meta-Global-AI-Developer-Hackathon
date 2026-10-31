import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasMetaKey, MetaError, recommendElement } from "@/lib/meta";
import type { HouseAnalysis } from "@/types";

export const maxDuration = 120;

const bodySchema = z.object({
  kind: z.enum(["door", "window"]),
  id: z.string().min(1).max(80),
  plan: z.custom<HouseAnalysis>(
    (v) => !!v && typeof v === "object" && Array.isArray((v as HouseAnalysis).walls),
    "Invalid plan payload."
  ),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > 300_000) {
      return NextResponse.json({ error: "Plan payload is too large." }, { status: 413 });
    }
    const { kind, id, plan } = bodySchema.parse(JSON.parse(raw));
    if (!hasMetaKey()) {
      return NextResponse.json({ error: "Recommendations need META_API_KEY on the server." }, { status: 503 });
    }
    const { rec, model } = await recommendElement(kind, id, plan);
    return NextResponse.json({ success: true, patch: rec.patch, reason: rec.reason, model });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid recommendation request." }, { status: 400 });
    }
    const message = err instanceof MetaError ? err.message : "Recommendation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

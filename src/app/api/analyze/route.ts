import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeFloorPlan, auditFurniture, hasMetaKey, MetaError, MUSE_SPARK_MODEL } from "@/lib/meta";
import {
  getEcoCabinAnalysis,
  getScandinavianVillaAnalysis,
  getUrbanLoftAnalysis,
} from "@/lib/archetype-plans";

export const maxDuration = 300;

const bodySchema = z.object({
  image: z.string().min(1).max(15_000_000),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]).default("image/png"),
  archetype: z.enum(["villa", "loft", "eco_cabin"]).optional(),
  isDemo: z.boolean().optional().default(false),
  deep: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  const started = Date.now();
  try {
    const body = bodySchema.parse(await req.json());

    if (body.isDemo) {
      const analysis =
        body.archetype === "loft"
          ? getUrbanLoftAnalysis()
          : body.archetype === "eco_cabin"
            ? getEcoCabinAnalysis()
            : getScandinavianVillaAnalysis();
      return NextResponse.json({
        success: true,
        source: "sample",
        model: "prebuilt-archetype (no inference)",
        analysis,
        processingTime: Date.now() - started,
      });
    }

    if (!hasMetaKey()) {
      return NextResponse.json(
        { success: false, error: "Live analysis is not configured on this server. Add META_API_KEY or use a labeled sample." },
        { status: 503 }
      );
    }

    const clean = body.image.replace(/^data:[^;]+;base64,/, "").replace(/[\r\n\s]/g, "");
    if (clean.length > 14_000_000) {
      return NextResponse.json({ success: false, error: "Image is too large. Use a PNG, JPEG or WebP up to 10 MB." }, { status: 400 });
    }

    const analysis = await analyzeFloorPlan(clean, body.mimeType);
    let deepRan = false;
    if (body.deep) {
      try {
        const audit = await auditFurniture(clean, body.mimeType, analysis.furniture ?? [], analysis.rooms);
        analysis.furniture = audit.items;
        analysis.notes.push(audit.note);
        deepRan = true;
      } catch (err) {
        analysis.notes.push(
          `Deep furniture pass failed (${err instanceof MetaError ? err.message : "unknown error"}); kept first-pass items.`
        );
      }
    }
    return NextResponse.json({
      success: true,
      source: "live",
      model: MUSE_SPARK_MODEL,
      deep: deepRan,
      analysis,
      processingTime: Date.now() - started,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
    }
    // Live failures never substitute sample data.
    const message = err instanceof MetaError ? err.message : "Analysis failed. Please retry.";
    const status = err instanceof MetaError && err.code === "NO_KEY" ? 503 : 502;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

import { NextResponse } from "next/server";
import { hasMetaKey, MUSE_IMAGE_MODEL, MUSE_SPARK_MODEL, MUSE_WONDER_MODEL, SAM_MODEL } from "@/lib/meta";

export async function GET() {
  return NextResponse.json({
    ok: true,
    live: hasMetaKey(),
    models: { spark: MUSE_SPARK_MODEL, wonder: MUSE_WONDER_MODEL, image: MUSE_IMAGE_MODEL, sam: SAM_MODEL },
    baseURL: process.env.META_API_BASE_URL || "https://api.meta.ai/v1",
  });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { askAboutPlan, hasMetaKey, MetaError } from "@/lib/meta";
import type { HouseAnalysis } from "@/types";

export const maxDuration = 120;

const bodySchema = z.object({
  question: z.string().trim().min(1).max(1000),
  // The plan is validated structurally; full geometry validation already ran at extraction.
  plan: z.custom<HouseAnalysis>(
    (v) => !!v && typeof v === "object" && Array.isArray((v as HouseAnalysis).walls) && Array.isArray((v as HouseAnalysis).rooms),
    "Invalid plan payload."
  ),
});

/**
 * Local heuristic fallback. Clearly labeled in the response, computes only
 * from supplied geometry, and makes NO compliance or safety claims.
 */
function localHeuristic(question: string, plan: HouseAnalysis): string {
  const q = question.toLowerCase();
  const lines: string[] = [
    "[Local geometry summary — the Muse API is unreachable, so this answer is computed on-device from the extracted measurements only. It is not an AI assessment.]",
    "",
  ];
  if (/(area|size|big|meter|square|dimension)/.test(q)) {
    lines.push(`Total area: ${plan.metadata.totalArea.toFixed(1)} m2.`);
    lines.push(`Footprint: ${plan.metadata.overallWidth.toFixed(2)} m x ${plan.metadata.overallDepth.toFixed(2)} m.`);
    lines.push(`Ceiling height: ${plan.metadata.wallHeight.toFixed(2)} m.`);
    for (const r of plan.rooms) lines.push(`- ${r.name}: ${r.area.toFixed(1)} m2.`);
    return lines.join("\n");
  }
  if (/(window|door|opening|egress|light)/.test(q)) {
    lines.push(`Doors: ${plan.doors.length}. Windows: ${plan.windows.length}.`);
    for (const d of plan.doors.slice(0, 20)) {
      lines.push(`- ${d.id}: ${d.width.toFixed(2)} x ${d.height.toFixed(2)} m on ${d.wallId}.`);
    }
    for (const w of plan.windows.slice(0, 20)) {
      lines.push(`- ${w.id}: ${w.width.toFixed(2)} x ${w.height.toFixed(2)} m, sill ${w.sillHeight.toFixed(2)} m.`);
    }
    return lines.join("\n");
  }
  lines.push(
    `${plan.metadata.style}: ${plan.rooms.length} rooms, ${plan.walls.length} walls, ${plan.doors.length} doors, ${plan.windows.length} windows.`
  );
  lines.push(
    `Furniture items: ${(plan.furniture ?? []).length}. Extraction confidence: ${(plan.confidence * 100).toFixed(0)}% (model self-estimate).`
  );
  lines.push("Ask about areas, doors, or windows for a detailed on-device breakdown.");
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > 300_000) {
      return NextResponse.json({ error: "Plan payload is too large." }, { status: 413 });
    }
    const { question, plan } = bodySchema.parse(JSON.parse(raw));

    if (hasMetaKey()) {
      try {
        const { answer, model } = await askAboutPlan(question, plan);
        return NextResponse.json({ answer, source: "live", model });
      } catch (err) {
        if (err instanceof MetaError) {
          // Fall through to the labeled local heuristic.
        } else {
          throw err;
        }
      }
    }
    return NextResponse.json({ answer: localHeuristic(question, plan), source: "local-heuristic", model: "on-device" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Provide a question and an extracted plan." }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process the question." }, { status: 500 });
  }
}

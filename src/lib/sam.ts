import { SAM_MODEL, metaClient, MetaError } from "./meta";
import type { SamMatch } from "@/types";

// ---------------------------------------------------------------------------
// SAM 3.1 visual grounding over the Responses API.
// One concept per request. A concept with no match is a normal empty result.
// ---------------------------------------------------------------------------

export const SAM_CONCEPTS = ["bed", "sofa", "dining table", "bathtub", "toilet", "staircase"] as const;

const BOX_RE = /<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)(?:;c=([\d.]+))?\|>/g;

export function parseSamOutput(text: string, concept: string): SamMatch[] {
  if (!text.includes("<|box;")) return [];
  const matches: SamMatch[] = [];
  const records = text.split(/,(?=\d+<\|box;)/);
  let ordinal = 0;
  for (const record of records) {
    BOX_RE.lastIndex = 0;
    const m = BOX_RE.exec(record);
    if (m) {
      matches.push({
        concept,
        ordinal,
        box: {
          x1: Number(m[1]),
          y1: Number(m[2]),
          x2: Number(m[3]),
          y2: Number(m[4]),
          w: Number(m[5]),
          h: Number(m[6]),
          ...(m[7] !== undefined ? { confidence: Number(m[7]) } : {}),
        },
      });
    }
    ordinal += 1;
  }
  return matches;
}

function responseText(resp: unknown): string {
  if (!resp || typeof resp !== "object") return "";
  const r = resp as { output_text?: unknown; output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }> };
  if (typeof r.output_text === "string" && r.output_text) return r.output_text;
  const parts: string[] = [];
  for (const item of r.output ?? []) {
    if (item?.type === "message") {
      for (const c of item.content ?? []) {
        if ((c.type === "output_text" || c.type === "text") && c.text) parts.push(c.text);
      }
    }
  }
  return parts.join("\n");
}

async function segmentOne(imageUrl: string, concept: string): Promise<SamMatch[]> {
  const client = metaClient();
  const resp = await client.responses.create({
    model: SAM_MODEL,
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: concept },
          { type: "input_image", image_url: imageUrl },
        ],
      },
    ],
  } as unknown as Parameters<typeof client.responses.create>[0]);
  return parseSamOutput(responseText(resp), concept);
}

/** Segment up to `concepts.length` concepts with capped concurrency. */
export async function segmentConcepts(imageUrl: string, concepts: string[]): Promise<SamMatch[]> {
  const queue = [...concepts];
  const matches: SamMatch[] = [];
  const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length > 0) {
      const concept = queue.shift();
      if (!concept) return;
      try {
        const found = await segmentOne(imageUrl, concept);
        matches.push(...found);
      } catch (err) {
        throw new MetaError(err instanceof Error ? err.message : String(err), "API");
      }
    }
  });
  await Promise.all(workers);
  return matches;
}

import { NextRequest, NextResponse } from 'next/server';
import { getMetaAPIClient } from '@/lib/meta-api';
export const maxDuration = 120;
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > 200000) return NextResponse.json({ error: 'Plan is too large.' }, { status: 413 });
    const { question, plan } = JSON.parse(raw);
    if (typeof question !== 'string' || !question.trim() || question.length > 1000 || !plan?.metadata || !Array.isArray(plan.rooms) || !Array.isArray(plan.walls)) return NextResponse.json({ error: 'Provide a question and extracted plan.' }, { status: 400 });
    const answer = await getMetaAPIClient().askPlan(question.trim(), plan);
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: 'Muse could not answer. Check server configuration or retry shortly.' }, { status: 502 });
  }
}

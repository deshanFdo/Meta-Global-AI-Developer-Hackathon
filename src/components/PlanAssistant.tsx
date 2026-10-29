"use client";
import { useState } from 'react';
import type { HouseAnalysis } from '@/types';

export default function PlanAssistant({ analysis, onSelect }: { analysis: HouseAnalysis; onSelect: (id: string) => void }) {
  const [question, setQuestion] = useState('Which measurements should I verify before furnishing this home?');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const points = analysis.walls.flatMap(w => [w.start, w.end]);
  const x = Math.min(...points.map(p => p.x)) - 0.5;
  const y = Math.min(...points.map(p => p.y)) - 0.5;
  const width = Math.max(...points.map(p => p.x)) - x + 0.5;
  const height = Math.max(...points.map(p => p.y)) - y + 0.5;
  async function ask() {
    setBusy(true); setError(''); setAnswer('');
    try {
      const res = await fetch('/api/ask-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, plan: analysis }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Question failed');
      setAnswer(data.answer);
    } catch (err) { setError(err instanceof Error ? err.message : 'Question failed'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-white/10 p-3 text-xs">
    <h2 className="font-semibold">Verify your reconstruction</h2>
    <p className="text-gray-400">Compare this extracted map with your uploaded image. Select a room to highlight it in 3D. Measurements are unverified.</p>
    <svg role="img" aria-label="Interactive extracted floor plan" viewBox={`${x} ${y} ${width} ${height}`} className="w-full rounded-lg bg-slate-950">
      {analysis.rooms.map(r => <polygon key={r.id} points={r.vertices.map(p => `${p.x},${p.y}`).join(' ')} fill="#2563eb33" stroke="#60a5fa" strokeWidth="0.025" tabIndex={0} role="button" aria-label={`Select ${r.name}`} onClick={() => onSelect(r.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(r.id); } }}><title>{r.name}: {r.area.toFixed(1)} m²</title></polygon>)}
      {analysis.walls.map(w => <line key={w.id} x1={w.start.x} y1={w.start.y} x2={w.end.x} y2={w.end.y} stroke="#cbd5e1" strokeWidth={w.thickness} pointerEvents="none" />)}
      {analysis.doors.map(d => <circle key={d.id} cx={d.position.x} cy={d.position.y} r={0.15} fill="#4ade80"><title>{d.id}: {d.width}m door</title></circle>)}
      {analysis.windows.map(w => <circle key={w.id} cx={w.position.x} cy={w.position.y} r={0.12} fill="#38bdf8"><title>{w.id}: window</title></circle>)}
    </svg>
    <p className="text-gray-400">Green: doors · Blue: windows</p>
    <details><summary className="cursor-pointer">Assumptions and source notes</summary><ul className="list-disc pl-4 space-y-1 mt-2">{analysis.notes.map((note,i) => <li key={i}>{note}</li>)}</ul></details>
    <form onSubmit={e => { e.preventDefault(); void ask(); }} className="space-y-2">
      <label htmlFor="plan-question" className="block font-semibold">Ask Muse about this plan</label>
      <textarea id="plan-question" value={question} maxLength={1000} onChange={e => setQuestion(e.target.value)} className="w-full bg-slate-950 border border-white/20 rounded-lg p-2" rows={3} />
      <button disabled={busy || !question.trim()} className="rounded-lg bg-blue-600 px-3 py-2 disabled:opacity-50">{busy ? 'Asking Muse…' : 'Ask Muse'}</button>
    </form>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    {answer && <p aria-live="polite" className="whitespace-pre-wrap leading-relaxed">{answer}</p>}
  </section>;
}

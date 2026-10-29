async function test() {
  const archetypes = ['villa', 'loft', 'eco_cabin'];
  for (const arch of archetypes) {
    const res = await fetch('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: 'archetype', archetype: arch, isDemo: true })
    });
    const data = await res.json();
    console.log(`[${arch.toUpperCase()}] success:`, data.success, '| style:', data.analysis?.metadata?.style, '| area:', data.analysis?.metadata?.totalArea, 'm2 | rooms:', data.analysis?.rooms?.length, '| furniture:', data.analysis?.furniture?.length);
  }

  // Test ask-plan with architectural reasoning
  const askRes = await fetch('http://localhost:3000/api/ask-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: 'Is the corridor accessible for wheelchairs and can I knock down the living room wall?',
      plan: (await (await fetch('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: 'archetype', archetype: 'villa', isDemo: true })
      })).json()).analysis
    })
  });
  const askData = await askRes.json();
  console.log('\n[PLAN ASSISTANT ANSWER PREVIEW]:\n', askData.answer?.substring(0, 300) + '...\n');
}

test().catch(console.error);


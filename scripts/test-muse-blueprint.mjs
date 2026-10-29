import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env.local
const envPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      process.env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

const apiKey = process.env.META_API_KEY;
const baseURL = process.env.META_API_BASE_URL || 'https://api.meta.ai/v1';

console.log('Testing Meta AI API Base URL:', baseURL);
console.log('API Key present:', Boolean(apiKey));

// Test image path
const imagePath = 'C:/Users/desha/.gemini/antigravity/brain/02f42e88-1951-4796-8b79-5df5ce0d80e7/.user_uploaded/media_1793110702616_23b38d54.png';
const imageBase64 = fs.existsSync(imagePath) ? fs.readFileSync(imagePath).toString('base64') : null;
console.log('Image Base64 length:', imageBase64?.length);

async function testVision() {
  const payload = {
    model: 'muse-spark-1.3',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe what this blueprint floorplan contains in 3 sentences.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
        ]
      }
    ],
    max_tokens: 2048,
    temperature: 0.1,
  };

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    console.log('Vision HTTP Status:', res.status);
    const data = await res.json();
    console.log('Vision Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Vision test error:', err);
  }
}

testVision();

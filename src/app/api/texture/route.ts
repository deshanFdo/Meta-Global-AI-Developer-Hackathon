import { NextRequest, NextResponse } from 'next/server';
import { getMetaAPIClient } from '@/lib/meta-api';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const prompt = body.prompt;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Prompt is required.' },
        { status: 400 },
      );
    }

    const apiKey = process.env.META_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_meta_api_key_here')) {
      return NextResponse.json({
        success: true,
        texture: null,
        note: 'Mock mode: configure META_API_KEY for live Muse Image textures.',
      });
    }

    const client = getMetaAPIClient();
    const texture = await client.generateTexture(prompt);

    return NextResponse.json({
      success: true,
      texture,
    });
  } catch (err: unknown) {
    console.error('Error in /api/texture:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to generate texture.',
      },
      { status: 500 },
    );
  }
}

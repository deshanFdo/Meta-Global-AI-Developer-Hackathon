import { NextRequest, NextResponse } from 'next/server';
import { getMetaAPIClient } from '@/lib/meta-api';
import type { AnalyzeResponse, HouseAnalysis } from '@/types';
import {
  getScandinavianVillaAnalysis,
  getUrbanLoftAnalysis,
  getEcoCabinAnalysis,
} from '@/lib/archetype-plans';

export const maxDuration = 120; // 2 minutes for vision AI analysis

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    let base64Image = '';
    let mimeType = 'image/png';
    let archetype = 'villa';

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json<AnalyzeResponse>(
          {
            success: false,
            error: 'No file provided in form data.',
            processingTime: Date.now() - startTime,
          },
          { status: 400 },
        );
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json<AnalyzeResponse>(
          {
            success: false,
            error: 'File size exceeds 10MB limit.',
            processingTime: Date.now() - startTime,
          },
          { status: 400 },
        );
      }

      mimeType = file.type || 'image/png';
      const arrayBuffer = await file.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString('base64');
    } else {
      const body = await req.json();
      base64Image = body.image || '';
      mimeType = body.mimeType || 'image/png';
      archetype = body.archetype || 'villa';

      if (body.isDemo || body.image === 'demo' || body.image === 'archetype') {
        let selectedAnalysis: HouseAnalysis;
        if (archetype === 'loft') {
          selectedAnalysis = getUrbanLoftAnalysis();
        } else if (archetype === 'eco_cabin') {
          selectedAnalysis = getEcoCabinAnalysis();
        } else {
          selectedAnalysis = getScandinavianVillaAnalysis();
        }

        return NextResponse.json<AnalyzeResponse>({
          success: true,
          analysis: selectedAnalysis,
          processingTime: Date.now() - startTime,
        });
      }
    }

    if (!base64Image) {
      return NextResponse.json<AnalyzeResponse>(
        {
          success: false,
          error: 'Missing base64 image data.',
          processingTime: Date.now() - startTime,
        },
        { status: 400 },
      );
    }

    // Clean any whitespace or newline breaks in base64 string
    const cleanBase64 = base64Image.replace(/[\r\n\s]/g, '');

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType) || cleanBase64.length > 14 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Provide a PNG, JPEG or WebP image up to 10 MB.' }, { status: 400 });
    }

    // Check if META_API_KEY is configured
    const apiKey = process.env.META_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_meta_api_key_here')) {
      return NextResponse.json({ success: false, error: 'Live analysis is not configured. Configure server credentials or use the labeled sample demo.' }, { status: 503 });
    }

    // Call live Meta AI API
    const metaClient = getMetaAPIClient();
    const analysis = await metaClient.analyzeFloorPlan(cleanBase64, mimeType);

    return NextResponse.json<AnalyzeResponse>({
      success: true,
      analysis,
      processingTime: Date.now() - startTime,
    });
  } catch {
    console.error('Floor plan analysis failed');
    return NextResponse.json<AnalyzeResponse>({ success: false, error: 'Muse analysis failed. Please retry. Your upload has not been replaced with sample data.', processingTime: Date.now() - startTime }, { status: 502 });
  }
}

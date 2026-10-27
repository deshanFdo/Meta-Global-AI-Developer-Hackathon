import { NextRequest, NextResponse } from 'next/server';
import { getMetaAPIClient } from '@/lib/meta-api';
import type { AnalyzeResponse, HouseAnalysis } from '@/types';

export const maxDuration = 120; // 2 minutes for vision AI analysis

// ============================================
// Fallback Mock Analysis for Offline / Dev Demo
// ============================================
function getMockHouseAnalysis(): HouseAnalysis {
  return {
    id: `mock-${Date.now()}`,
    metadata: {
      style: 'Modern Craftsman',
      floors: 1,
      totalArea: 104.0,
      overallWidth: 12.0,
      overallDepth: 9.0,
      wallHeight: 2.8,
      scale: 50.0,
    },
    walls: [
      // Exterior perimeter
      { id: 'wall-ext-n', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.25, height: 2.8, material: 'brick', color: '#B85C38', isExterior: true },
      { id: 'wall-ext-e', start: { x: 12, y: 0 }, end: { x: 12, y: 9 }, thickness: 0.25, height: 2.8, material: 'brick', color: '#B85C38', isExterior: true },
      { id: 'wall-ext-s', start: { x: 12, y: 9 }, end: { x: 0, y: 9 }, thickness: 0.25, height: 2.8, material: 'brick', color: '#B85C38', isExterior: true },
      { id: 'wall-ext-w', start: { x: 0, y: 9 }, end: { x: 0, y: 0 }, thickness: 0.25, height: 2.8, material: 'brick', color: '#B85C38', isExterior: true },
      // Interior partitions
      { id: 'wall-int-1', start: { x: 0, y: 5 }, end: { x: 7, y: 5 }, thickness: 0.12, height: 2.8, material: 'drywall', color: '#F5F0E8', isExterior: false },
      { id: 'wall-int-2', start: { x: 7, y: 0 }, end: { x: 7, y: 9 }, thickness: 0.12, height: 2.8, material: 'drywall', color: '#F5F0E8', isExterior: false },
      { id: 'wall-int-3', start: { x: 7, y: 4.5 }, end: { x: 12, y: 4.5 }, thickness: 0.12, height: 2.8, material: 'drywall', color: '#F5F0E8', isExterior: false },
    ],
    doors: [
      { id: 'door-front', position: { x: 3.5, y: 0 }, width: 0.95, height: 2.15, wallId: 'wall-ext-n', style: 'single', swingDirection: 'inward', material: 'wood', color: '#8B5A2B' },
      { id: 'door-patio', position: { x: 9.5, y: 9 }, width: 1.8, height: 2.15, wallId: 'wall-ext-s', style: 'sliding', swingDirection: 'right', material: 'glass', color: '#E0E8F0' },
      { id: 'door-bed1', position: { x: 7, y: 2.5 }, width: 0.85, height: 2.1, wallId: 'wall-int-2', style: 'single', swingDirection: 'inward', material: 'wood', color: '#A0784C' },
      { id: 'door-bed2', position: { x: 7, y: 6.5 }, width: 0.85, height: 2.1, wallId: 'wall-int-2', style: 'single', swingDirection: 'inward', material: 'wood', color: '#A0784C' },
    ],
    windows: [
      { id: 'win-living-1', position: { x: 1.5, y: 0 }, width: 1.4, height: 1.5, sillHeight: 0.85, wallId: 'wall-ext-n', style: 'double-hung', panes: 2, material: 'vinyl', color: '#FFFFFF' },
      { id: 'win-living-2', position: { x: 0, y: 2.5 }, width: 1.4, height: 1.5, sillHeight: 0.85, wallId: 'wall-ext-w', style: 'double-hung', panes: 2, material: 'vinyl', color: '#FFFFFF' },
      { id: 'win-kitchen', position: { x: 0, y: 7.0 }, width: 1.2, height: 1.2, sillHeight: 1.1, wallId: 'wall-ext-w', style: 'casement', panes: 1, material: 'vinyl', color: '#FFFFFF' },
      { id: 'win-bed1', position: { x: 9.5, y: 0 }, width: 1.5, height: 1.4, sillHeight: 0.9, wallId: 'wall-ext-n', style: 'double-hung', panes: 2, material: 'vinyl', color: '#FFFFFF' },
      { id: 'win-bed2', position: { x: 12, y: 7.0 }, width: 1.4, height: 1.4, sillHeight: 0.9, wallId: 'wall-ext-e', style: 'double-hung', panes: 2, material: 'vinyl', color: '#FFFFFF' },
    ],
    rooms: [
      {
        id: 'room-living',
        name: 'Living Room',
        type: 'living_room',
        vertices: [{ x: 0, y: 0 }, { x: 7, y: 0 }, { x: 7, y: 5 }, { x: 0, y: 5 }],
        area: 35.0,
        wallIds: ['wall-ext-n', 'wall-int-2', 'wall-int-1', 'wall-ext-w'],
      },
      {
        id: 'room-kitchen',
        name: 'Kitchen & Dining',
        type: 'kitchen',
        vertices: [{ x: 0, y: 5 }, { x: 7, y: 5 }, { x: 7, y: 9 }, { x: 0, y: 9 }],
        area: 28.0,
        wallIds: ['wall-int-1', 'wall-int-2', 'wall-ext-s', 'wall-ext-w'],
      },
      {
        id: 'room-bed-primary',
        name: 'Primary Bedroom',
        type: 'bedroom',
        vertices: [{ x: 7, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 4.5 }, { x: 7, y: 4.5 }],
        area: 22.5,
        wallIds: ['wall-ext-n', 'wall-ext-e', 'wall-int-3', 'wall-int-2'],
      },
      {
        id: 'room-bed-guest',
        name: 'Guest Bedroom',
        type: 'bedroom',
        vertices: [{ x: 7, y: 4.5 }, { x: 12, y: 4.5 }, { x: 12, y: 9 }, { x: 7, y: 9 }],
        area: 22.5,
        wallIds: ['wall-int-3', 'wall-ext-e', 'wall-ext-s', 'wall-int-2'],
      },
    ],
    roof: {
      type: 'gable',
      pitch: 28,
      overhang: 0.6,
      material: 'asphalt_shingle',
      color: '#3C4048',
    },
    staircases: [],
    confidence: 0.92,
    notes: [
      'Successfully extracted structural layout from architectural plan.',
      'Identified 4 primary rooms with standard residential door/window clearances.',
      'Exterior envelope mapped with 0.25m brick boundary walls.',
    ],
  };
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    let base64Image = '';
    let mimeType = 'image/png';

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

    // Check if META_API_KEY is configured
    const apiKey = process.env.META_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_meta_api_key_here')) {
      console.warn('META_API_KEY is not configured. Serving high-fidelity architectural mock model.');
      const mockAnalysis = getMockHouseAnalysis();
      mockAnalysis.notes.unshift('💡 Demo Mode: Add META_API_KEY to .env.local for live Meta Muse Spark vision analysis.');
      
      return NextResponse.json<AnalyzeResponse>({
        success: true,
        analysis: mockAnalysis,
        processingTime: Date.now() - startTime,
      });
    }

    // Call live Meta AI API
    const metaClient = getMetaAPIClient();
    const analysis = await metaClient.analyzeFloorPlan(base64Image, mimeType);

    return NextResponse.json<AnalyzeResponse>({
      success: true,
      analysis,
      processingTime: Date.now() - startTime,
    });
  } catch (err: unknown) {
    console.error('Error in /api/analyze:', err);

    // If API failed due to quota or rate limit, gracefully fallback with notification
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      const fallback = getMockHouseAnalysis();
      fallback.notes.unshift(`⚠️ Meta API Quota Note: ${errorMessage}. Displaying architectural model fallback.`);
      return NextResponse.json<AnalyzeResponse>({
        success: true,
        analysis: fallback,
        processingTime: Date.now() - startTime,
      });
    }

    return NextResponse.json<AnalyzeResponse>(
      {
        success: false,
        error: errorMessage || 'An unexpected error occurred during floor plan analysis.',
        processingTime: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getMetaAPIClient } from '@/lib/meta-api';
import type { AnalyzeResponse, HouseAnalysis } from '@/types';

export const maxDuration = 120; // 2 minutes for vision AI analysis

// ============================================
// High-Fidelity CAD Blueprint Architectural Model (14.81m × 11.30m Villa)
// ============================================
function getMockHouseAnalysis(): HouseAnalysis {
  return {
    id: `villa-${Date.now()}`,
    metadata: {
      style: 'Modern Scandinavian Villa',
      floors: 1,
      totalArea: 122.42,
      overallWidth: 14.81,
      overallDepth: 11.30,
      wallHeight: 2.8,
      scale: 50.0,
    },
    walls: [
      // Perimeter / Exterior walls (0.28m thick insulated masonry)
      { id: 'wall-ext-n', start: { x: 0, y: 0 }, end: { x: 14.81, y: 0 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-e', start: { x: 14.81, y: 0 }, end: { x: 14.81, y: 11.30 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-s-east', start: { x: 14.81, y: 11.30 }, end: { x: 9.62, y: 11.30 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-terrace-e', start: { x: 9.62, y: 11.30 }, end: { x: 9.62, y: 9.22 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-s-terrace', start: { x: 9.62, y: 9.22 }, end: { x: 2.98, y: 9.22 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-terrace-w', start: { x: 2.98, y: 9.22 }, end: { x: 2.98, y: 11.30 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-s-west', start: { x: 2.98, y: 11.30 }, end: { x: 0, y: 11.30 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-w', start: { x: 0, y: 11.30 }, end: { x: 0, y: 0 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-hall-s', start: { x: 0, y: 9.22 }, end: { x: 2.98, y: 9.22 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },

      // Interior partitions (0.15m insulated drywall)
      // Zone 1: West Hallway Partitions
      { id: 'wall-int-hall-nw', start: { x: 0, y: 3.50 }, end: { x: 2.98, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-hall-e', start: { x: 2.98, y: 3.50 }, end: { x: 2.98, y: 9.22 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },

      // Zone 2: North Bedroom NW, Furnace, WC 1, WC 2 Partitions
      { id: 'wall-int-bednw-corridor', start: { x: 2.98, y: 3.50 }, end: { x: 4.25, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-bednw-furnace', start: { x: 4.25, y: 0 }, end: { x: 4.25, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-furnace-wc1', start: { x: 4.25, y: 1.70 }, end: { x: 6.30, y: 1.70 }, thickness: 0.12, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-wc1-corridor', start: { x: 4.25, y: 3.50 }, end: { x: 6.30, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-wc1-wc2', start: { x: 6.30, y: 0 }, end: { x: 6.30, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-wc2-corridor', start: { x: 6.30, y: 3.50 }, end: { x: 8.20, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-wc2-bedne', start: { x: 8.20, y: 0 }, end: { x: 8.20, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },

      // Zone 3: Corridor & Living Room Dividers
      { id: 'wall-int-living-north', start: { x: 2.98, y: 4.65 }, end: { x: 7.60, y: 4.65 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-corridor-living-return', start: { x: 7.60, y: 3.50 }, end: { x: 7.60, y: 4.65 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-living-east', start: { x: 9.62, y: 4.65 }, end: { x: 9.62, y: 9.22 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },

      // Zone 4: East Bedroom Wing Partitions
      { id: 'wall-int-corridor-bedne', start: { x: 8.20, y: 3.50 }, end: { x: 9.62, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-bedne-bede', start: { x: 9.62, y: 3.50 }, end: { x: 14.81, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-corridor-bede', start: { x: 9.62, y: 3.50 }, end: { x: 9.62, y: 4.65 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-bede-bedse', start: { x: 9.62, y: 7.00 }, end: { x: 14.81, y: 7.00 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
    ],
    doors: [
      { id: 'door-front', position: { x: 1.8, y: 9.22 }, width: 0.95, height: 2.15, wallId: 'wall-ext-hall-s', style: 'single', swingDirection: 'inward', material: 'wood', color: '#5C4033' },
      { id: 'door-terrace', position: { x: 6.3, y: 9.22 }, width: 3.2, height: 2.2, wallId: 'wall-ext-s-terrace', style: 'sliding', swingDirection: 'outward', material: 'glass', color: '#FFFFFF' },
      { id: 'door-hall-living', position: { x: 2.98, y: 5.5 }, width: 0.9, height: 2.1, wallId: 'wall-int-hall-e', style: 'pocket', swingDirection: 'inward', material: 'wood', color: '#A0784C' },
      { id: 'door-hall-corridor', position: { x: 2.5, y: 3.50 }, width: 0.9, height: 2.1, wallId: 'wall-int-hall-nw', style: 'single', swingDirection: 'inward', material: 'wood', color: '#A0784C' },
      { id: 'door-bed-nw', position: { x: 3.6, y: 3.50 }, width: 0.85, height: 2.1, wallId: 'wall-int-bednw-corridor', style: 'single', swingDirection: 'inward', material: 'wood', color: '#A0784C' },
      { id: 'door-furnace-ext', position: { x: 5.2, y: 0 }, width: 0.9, height: 2.1, wallId: 'wall-ext-n', style: 'single', swingDirection: 'outward', material: 'metal', color: '#444444' },
      { id: 'door-wc1', position: { x: 5.2, y: 3.50 }, width: 0.8, height: 2.1, wallId: 'wall-int-wc1-corridor', style: 'single', swingDirection: 'inward', material: 'wood', color: '#A0784C' },
      { id: 'door-wc2', position: { x: 7.2, y: 3.50 }, width: 0.8, height: 2.1, wallId: 'wall-int-wc2-corridor', style: 'single', swingDirection: 'inward', material: 'wood', color: '#A0784C' },
      { id: 'door-bed-ne', position: { x: 8.9, y: 3.50 }, width: 0.85, height: 2.1, wallId: 'wall-int-corridor-bedne', style: 'single', swingDirection: 'inward', material: 'wood', color: '#A0784C' },
      { id: 'door-living-corridor', position: { x: 7.0, y: 4.65 }, width: 1.1, height: 2.1, wallId: 'wall-int-living-north', style: 'single', swingDirection: 'inward', material: 'wood', color: '#A0784C' },
      { id: 'door-bed-e', position: { x: 9.62, y: 4.1 }, width: 0.85, height: 2.1, wallId: 'wall-int-corridor-bede', style: 'single', swingDirection: 'inward', material: 'wood', color: '#A0784C' },
      { id: 'door-bed-se', position: { x: 9.62, y: 7.6 }, width: 0.85, height: 2.1, wallId: 'wall-int-living-east', style: 'single', swingDirection: 'inward', material: 'wood', color: '#A0784C' },
    ],
    windows: [
      { id: 'win-bed-nw-n', position: { x: 2.1, y: 0 }, width: 1.5, height: 1.4, sillHeight: 0.9, wallId: 'wall-ext-n', style: 'double-hung', panes: 2, material: 'vinyl', color: '#FFFFFF' },
      { id: 'win-bed-nw-w', position: { x: 0, y: 1.7 }, width: 1.4, height: 1.4, sillHeight: 0.9, wallId: 'wall-ext-w', style: 'casement', panes: 2, material: 'vinyl', color: '#FFFFFF' },
      { id: 'win-hallway-w', position: { x: 0, y: 6.2 }, width: 1.2, height: 1.4, sillHeight: 0.9, wallId: 'wall-ext-w', style: 'casement', panes: 1, material: 'vinyl', color: '#FFFFFF' },
      { id: 'win-bed-ne-n', position: { x: 12.2, y: 0 }, width: 1.6, height: 1.4, sillHeight: 0.9, wallId: 'wall-ext-n', style: 'double-hung', panes: 2, material: 'vinyl', color: '#FFFFFF' },
      { id: 'win-bed-ne-e', position: { x: 14.81, y: 1.7 }, width: 1.4, height: 1.4, sillHeight: 0.9, wallId: 'wall-ext-e', style: 'casement', panes: 2, material: 'vinyl', color: '#FFFFFF' },
      { id: 'win-bed-e-e', position: { x: 14.81, y: 5.2 }, width: 1.4, height: 1.4, sillHeight: 0.9, wallId: 'wall-ext-e', style: 'casement', panes: 2, material: 'vinyl', color: '#FFFFFF' },
      { id: 'win-bed-se-e', position: { x: 14.81, y: 8.8 }, width: 1.4, height: 1.4, sillHeight: 0.9, wallId: 'wall-ext-e', style: 'casement', panes: 2, material: 'vinyl', color: '#FFFFFF' },
      { id: 'win-bed-se-s', position: { x: 12.2, y: 11.30 }, width: 1.5, height: 1.4, sillHeight: 0.9, wallId: 'wall-ext-s-east', style: 'double-hung', panes: 2, material: 'vinyl', color: '#FFFFFF' },
      { id: 'win-wc2-n', position: { x: 7.25, y: 0 }, width: 1.0, height: 0.8, sillHeight: 1.5, wallId: 'wall-ext-n', style: 'casement', panes: 1, material: 'vinyl', color: '#FFFFFF' },
    ],
    rooms: [
      {
        id: 'room-living-kitchen',
        name: 'Living room - Kitchen',
        type: 'living_room',
        vertices: [{ x: 2.98, y: 4.65 }, { x: 9.62, y: 4.65 }, { x: 9.62, y: 9.22 }, { x: 2.98, y: 9.22 }],
        area: 25.91,
        wallIds: ['wall-int-hall-e', 'wall-int-living-north', 'wall-int-living-east', 'wall-ext-s-terrace'],
      },
      {
        id: 'room-hallway',
        name: 'Hallway',
        type: 'hallway',
        vertices: [{ x: 0, y: 3.50 }, { x: 2.98, y: 3.50 }, { x: 2.98, y: 9.22 }, { x: 0, y: 9.22 }],
        area: 13.33,
        wallIds: ['wall-ext-w', 'wall-int-hall-nw', 'wall-int-hall-e', 'wall-ext-hall-s'],
      },
      {
        id: 'room-porch',
        name: 'Entrance Porch',
        type: 'porch',
        vertices: [{ x: 0, y: 9.22 }, { x: 2.98, y: 9.22 }, { x: 2.98, y: 11.30 }, { x: 0, y: 11.30 }],
        area: 6.20,
        wallIds: ['wall-ext-hall-s', 'wall-ext-terrace-w', 'wall-ext-s-west', 'wall-ext-w'],
      },
      {
        id: 'room-bed-nw',
        name: 'Bedroom NW',
        type: 'bedroom',
        vertices: [{ x: 0, y: 0 }, { x: 4.25, y: 0 }, { x: 4.25, y: 3.50 }, { x: 0, y: 3.50 }],
        area: 13.11,
        wallIds: ['wall-ext-n', 'wall-int-bednw-furnace', 'wall-int-bednw-corridor', 'wall-int-hall-nw', 'wall-ext-w'],
      },
      {
        id: 'room-bed-ne',
        name: 'Bedroom NE',
        type: 'bedroom',
        vertices: [{ x: 8.20, y: 0 }, { x: 14.81, y: 0 }, { x: 14.81, y: 3.50 }, { x: 8.20, y: 3.50 }],
        area: 13.84,
        wallIds: ['wall-ext-n', 'wall-ext-e', 'wall-int-bedne-bede', 'wall-int-corridor-bedne', 'wall-int-wc2-bedne'],
      },
      {
        id: 'room-bed-e',
        name: 'Bedroom East',
        type: 'bedroom',
        vertices: [{ x: 9.62, y: 3.50 }, { x: 14.81, y: 3.50 }, { x: 14.81, y: 7.00 }, { x: 9.62, y: 7.00 }],
        area: 12.83,
        wallIds: ['wall-int-bedne-bede', 'wall-ext-e', 'wall-int-bede-bedse', 'wall-int-corridor-bede', 'wall-int-living-east'],
      },
      {
        id: 'room-bed-se',
        name: 'Bedroom SE',
        type: 'bedroom',
        vertices: [{ x: 9.62, y: 7.00 }, { x: 14.81, y: 7.00 }, { x: 14.81, y: 11.30 }, { x: 9.62, y: 11.30 }],
        area: 13.37,
        wallIds: ['wall-int-bede-bedse', 'wall-ext-e', 'wall-ext-s-east', 'wall-ext-terrace-e', 'wall-int-living-east'],
      },
      {
        id: 'room-wc-ensuite',
        name: 'WC & Bath',
        type: 'bathroom',
        vertices: [{ x: 6.30, y: 0 }, { x: 8.20, y: 0 }, { x: 8.20, y: 3.50 }, { x: 6.30, y: 3.50 }],
        area: 5.64,
        wallIds: ['wall-ext-n', 'wall-int-wc2-bedne', 'wall-int-wc2-corridor', 'wall-int-wc1-wc2'],
      },
      {
        id: 'room-wc-guest',
        name: 'WC Guest',
        type: 'bathroom',
        vertices: [{ x: 4.25, y: 1.70 }, { x: 6.30, y: 1.70 }, { x: 6.30, y: 3.50 }, { x: 4.25, y: 3.50 }],
        area: 3.93,
        wallIds: ['wall-int-furnace-wc1', 'wall-int-wc1-wc2', 'wall-int-wc1-corridor', 'wall-int-bednw-furnace'],
      },
      {
        id: 'room-furnace',
        name: 'Furnace room',
        type: 'utility_room',
        vertices: [{ x: 4.25, y: 0 }, { x: 6.30, y: 0 }, { x: 6.30, y: 1.70 }, { x: 4.25, y: 1.70 }],
        area: 3.75,
        wallIds: ['wall-ext-n', 'wall-int-wc1-wc2', 'wall-int-furnace-wc1', 'wall-int-bednw-furnace'],
      },
      {
        id: 'room-corridor-n',
        name: 'Corridor North',
        type: 'hallway',
        vertices: [{ x: 2.98, y: 3.50 }, { x: 9.62, y: 3.50 }, { x: 9.62, y: 4.65 }, { x: 2.98, y: 4.65 }],
        area: 16.71,
        wallIds: ['wall-int-bednw-corridor', 'wall-int-wc1-corridor', 'wall-int-wc2-corridor', 'wall-int-corridor-bedne', 'wall-int-living-north', 'wall-int-corridor-living-return', 'wall-int-corridor-bede'],
      },
      {
        id: 'room-terrace',
        name: 'Covered Terrace',
        type: 'patio',
        vertices: [{ x: 2.98, y: 9.22 }, { x: 9.62, y: 9.22 }, { x: 9.62, y: 11.30 }, { x: 2.98, y: 11.30 }],
        area: 22.53,
        wallIds: ['wall-ext-s-terrace', 'wall-ext-terrace-w', 'wall-ext-terrace-e'],
      },
    ],
    furniture: [
      // 1. Living Room & Kitchen (Sofa correctly facing EAST towards TV Unit!)
      { id: 'f-sofa', type: 'sofa', position: { x: 7.2, y: 6.8 }, rotation: 90, width: 2.4, depth: 1.0, height: 0.85, room: 'Living room - Kitchen' },
      { id: 'f-tv-unit', type: 'tv_unit', position: { x: 9.4, y: 6.8 }, rotation: 270, width: 2.2, depth: 0.45, height: 0.5, room: 'Living room - Kitchen' },
      { id: 'f-coffee-table', type: 'coffee_table', position: { x: 8.1, y: 6.8 }, rotation: 90, width: 1.2, depth: 0.6, height: 0.42, room: 'Living room - Kitchen' },
      { id: 'f-dining-table', type: 'dining_table', position: { x: 4.8, y: 6.8 }, rotation: 90, width: 2.0, depth: 1.0, height: 0.76, room: 'Living room - Kitchen' },
      { id: 'f-kitchen-counter', type: 'kitchen_counter', position: { x: 3.4, y: 5.5 }, rotation: 90, width: 2.2, depth: 0.65, height: 0.9, room: 'Living room - Kitchen' },
      { id: 'f-kitchen-island', type: 'kitchen_counter', position: { x: 4.2, y: 4.85 }, rotation: 0, width: 1.8, depth: 0.65, height: 0.9, room: 'Living room - Kitchen' },
      { id: 'f-plant-living', type: 'plant', position: { x: 8.8, y: 8.6 }, rotation: 0, width: 0.5, depth: 0.5, height: 1.2, room: 'Living room - Kitchen' },

      // 2. Hallway Built-in Wardrobe / Coat Storage
      { id: 'f-ward-hall', type: 'wardrobe', position: { x: 2.7, y: 7.0 }, rotation: 270, width: 2.2, depth: 0.55, height: 2.3, room: 'Hallway' },

      // 3. North-West Bedroom (Headboard at North wall, wardrobe facing North)
      { id: 'f-bed-nw', type: 'bed_double', position: { x: 2.1, y: 1.4 }, rotation: 0, width: 2.0, depth: 1.8, height: 0.95, room: 'Bedroom NW' },
      { id: 'f-ward-nw', type: 'wardrobe', position: { x: 2.1, y: 3.25 }, rotation: 180, width: 1.8, depth: 0.6, height: 2.2, room: 'Bedroom NW' },

      // 4. North-East Bedroom (Headboard at North wall, wardrobe facing North)
      { id: 'f-bed-ne', type: 'bed_double', position: { x: 12.2, y: 1.4 }, rotation: 0, width: 2.0, depth: 1.8, height: 0.95, room: 'Bedroom NE' },
      { id: 'f-ward-ne', type: 'wardrobe', position: { x: 12.2, y: 3.25 }, rotation: 180, width: 1.8, depth: 0.6, height: 2.2, room: 'Bedroom NE' },

      // 5. East Bedroom (Headboard at East wall, bed extending West into room!)
      { id: 'f-bed-e', type: 'bed_double', position: { x: 13.5, y: 5.2 }, rotation: 270, width: 2.0, depth: 1.8, height: 0.95, room: 'Bedroom East' },
      { id: 'f-ward-e', type: 'wardrobe', position: { x: 11.8, y: 3.75 }, rotation: 0, width: 1.8, depth: 0.6, height: 2.2, room: 'Bedroom East' },
      { id: 'f-desk-e', type: 'desk', position: { x: 13.8, y: 6.5 }, rotation: 180, width: 1.2, depth: 0.6, height: 0.75, room: 'Bedroom East' },

      // 6. South-East Bedroom (Headboard at North partition, desk facing East, wardrobe facing West)
      { id: 'f-bed-se', type: 'bed_double', position: { x: 12.2, y: 8.4 }, rotation: 0, width: 2.0, depth: 1.8, height: 0.95, room: 'Bedroom SE' },
      { id: 'f-ward-se', type: 'wardrobe', position: { x: 14.4, y: 9.0 }, rotation: 270, width: 1.8, depth: 0.6, height: 2.2, room: 'Bedroom SE' },
      { id: 'f-desk-se', type: 'desk', position: { x: 10.3, y: 8.8 }, rotation: 90, width: 1.2, depth: 0.6, height: 0.75, room: 'Bedroom SE' },
      { id: 'f-tv-se', type: 'tv_unit', position: { x: 12.2, y: 11.0 }, rotation: 180, width: 1.6, depth: 0.4, height: 0.5, room: 'Bedroom SE' },

      // 7. Main WC (Bathtub at North wall, toilet facing West, vanity facing East)
      { id: 'f-bath', type: 'bathtub', position: { x: 7.25, y: 0.6 }, rotation: 0, width: 1.7, depth: 0.75, height: 0.6, room: 'WC & Bath' },
      { id: 'f-toilet-main', type: 'toilet', position: { x: 8.0, y: 2.7 }, rotation: 270, width: 0.7, depth: 0.45, height: 0.78, room: 'WC & Bath' },
      { id: 'f-sink-main', type: 'sink', position: { x: 6.5, y: 2.7 }, rotation: 90, width: 0.8, depth: 0.5, height: 0.85, room: 'WC & Bath' },

      // 8. Guest WC (Toilet, vanity basin, and washing machine appliance)
      { id: 'f-toilet-guest', type: 'toilet', position: { x: 6.1, y: 2.7 }, rotation: 270, width: 0.7, depth: 0.45, height: 0.78, room: 'WC Guest' },
      { id: 'f-sink-guest', type: 'sink', position: { x: 4.5, y: 2.0 }, rotation: 90, width: 0.6, depth: 0.45, height: 0.85, room: 'WC Guest' },
      { id: 'f-washer-guest', type: 'washing_machine', position: { x: 5.8, y: 2.0 }, rotation: 0, width: 0.65, depth: 0.65, height: 0.85, room: 'WC Guest' },

      // 9. Furnace & Mechanical Room
      { id: 'f-furnace', type: 'furnace', position: { x: 5.2, y: 0.8 }, rotation: 0, width: 0.8, depth: 0.7, height: 1.6, room: 'Furnace room' },

      // 10. Covered Terrace (Outdoor lounge sofa in SE, dining in center, summer kitchen counter in West)
      { id: 'f-terrace-sofa', type: 'sofa', position: { x: 9.1, y: 10.3 }, rotation: 270, width: 1.8, depth: 0.9, height: 0.8, room: 'Covered Terrace' },
      { id: 'f-terrace-dining', type: 'dining_table', position: { x: 6.3, y: 10.3 }, rotation: 0, width: 2.0, depth: 1.0, height: 0.75, room: 'Covered Terrace' },
      { id: 'f-terrace-kitchen', type: 'kitchen_counter', position: { x: 3.4, y: 10.3 }, rotation: 90, width: 1.6, depth: 0.65, height: 0.9, room: 'Covered Terrace' },

      // 11. Entrance Porch (Structural corner column)
      { id: 'f-porch-column', type: 'column', position: { x: 0.25, y: 11.1 }, rotation: 0, width: 0.35, depth: 0.35, height: 2.8, room: 'Entrance Porch' },
    ],
    roof: {
      type: 'gable',
      pitch: 28,
      overhang: 0.6,
      material: 'asphalt_shingle',
      color: '#3C4048',
    },
    staircases: [],
    confidence: 0.98,
    notes: [
      'Successfully reconstructed architectural layout from CAD blueprint (14.81m × 11.30m).',
      'Premises area 122.42 m² + Covered terrace 22.53 m² fully mapped with all 25 structural walls.',
      'Extracted 12 functional zones including Entrance Porch with structural corner column and North Corridors.',
      'Identified all 30 furniture & sanitary fixtures including hallway wardrobe, laundry washer, and terrace outdoor kitchen.',
      'Calibrated furniture orientations: living sofa faces East toward TV unit, beds align to headboard walls.',
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

      if (body.isDemo || body.image === 'demo' || (base64Image && base64Image.length < 500)) {
        const mockAnalysis = getMockHouseAnalysis();
        return NextResponse.json<AnalyzeResponse>({
          success: true,
          analysis: mockAnalysis,
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

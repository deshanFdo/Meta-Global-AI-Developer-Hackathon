import type { HouseAnalysis } from '@/types';

/**
 * 1. Modern Scandinavian Villa (122.42 m² premises + 22.53 m² covered terrace)
 * 4 Bedrooms, 2 Bathrooms, Furnace Room, North Corridors, Covered Outdoor Terrace
 */
export function getScandinavianVillaAnalysis(): HouseAnalysis {
  return {
    id: 'archetype-villa',
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
      { id: 'wall-ext-n', start: { x: 0, y: 0 }, end: { x: 14.81, y: 0 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-e', start: { x: 14.81, y: 0 }, end: { x: 14.81, y: 11.30 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-s-east', start: { x: 14.81, y: 11.30 }, end: { x: 9.62, y: 11.30 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-terrace-e', start: { x: 9.62, y: 11.30 }, end: { x: 9.62, y: 9.22 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-s-terrace', start: { x: 9.62, y: 9.22 }, end: { x: 2.98, y: 9.22 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-terrace-w', start: { x: 2.98, y: 9.22 }, end: { x: 2.98, y: 11.30 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-s-west', start: { x: 2.98, y: 11.30 }, end: { x: 0, y: 11.30 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-w', start: { x: 0, y: 11.30 }, end: { x: 0, y: 0 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },
      { id: 'wall-ext-hall-s', start: { x: 0, y: 9.22 }, end: { x: 2.98, y: 9.22 }, thickness: 0.28, height: 2.8, material: 'stucco', color: '#ECEAE4', isExterior: true },

      { id: 'wall-int-hall-nw', start: { x: 0, y: 3.50 }, end: { x: 2.98, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-hall-e', start: { x: 2.98, y: 3.50 }, end: { x: 2.98, y: 9.22 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-bednw-corridor', start: { x: 2.98, y: 3.50 }, end: { x: 4.25, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-bednw-furnace', start: { x: 4.25, y: 0 }, end: { x: 4.25, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-furnace-wc1', start: { x: 4.25, y: 1.70 }, end: { x: 6.30, y: 1.70 }, thickness: 0.12, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-wc1-corridor', start: { x: 4.25, y: 3.50 }, end: { x: 6.30, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-wc1-wc2', start: { x: 6.30, y: 0 }, end: { x: 6.30, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-wc2-corridor', start: { x: 6.30, y: 3.50 }, end: { x: 8.20, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-wc2-bedne', start: { x: 8.20, y: 0 }, end: { x: 8.20, y: 3.50 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-living-north', start: { x: 2.98, y: 4.65 }, end: { x: 7.60, y: 4.65 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-corridor-living-return', start: { x: 7.60, y: 3.50 }, end: { x: 7.60, y: 4.65 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
      { id: 'wall-int-living-east', start: { x: 9.62, y: 4.65 }, end: { x: 9.62, y: 9.22 }, thickness: 0.15, height: 2.8, material: 'drywall', color: '#F7F6F2', isExterior: false },
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
      { id: 'room-living-kitchen', name: 'Living room - Kitchen', type: 'living_room', vertices: [{ x: 2.98, y: 4.65 }, { x: 9.62, y: 4.65 }, { x: 9.62, y: 9.22 }, { x: 2.98, y: 9.22 }], area: 25.91, wallIds: ['wall-int-hall-e', 'wall-int-living-north', 'wall-int-living-east', 'wall-ext-s-terrace'] },
      { id: 'room-hallway', name: 'Hallway', type: 'hallway', vertices: [{ x: 0, y: 3.50 }, { x: 2.98, y: 3.50 }, { x: 2.98, y: 9.22 }, { x: 0, y: 9.22 }], area: 13.33, wallIds: ['wall-ext-w', 'wall-int-hall-nw', 'wall-int-hall-e', 'wall-ext-hall-s'] },
      { id: 'room-porch', name: 'Entrance Porch', type: 'porch', vertices: [{ x: 0, y: 9.22 }, { x: 2.98, y: 9.22 }, { x: 2.98, y: 11.30 }, { x: 0, y: 11.30 }], area: 6.20, wallIds: ['wall-ext-hall-s', 'wall-ext-terrace-w', 'wall-ext-s-west', 'wall-ext-w'] },
      { id: 'room-bed-nw', name: 'Bedroom NW', type: 'bedroom', vertices: [{ x: 0, y: 0 }, { x: 4.25, y: 0 }, { x: 4.25, y: 3.50 }, { x: 0, y: 3.50 }], area: 13.11, wallIds: ['wall-ext-n', 'wall-int-bednw-furnace', 'wall-int-bednw-corridor', 'wall-int-hall-nw', 'wall-ext-w'] },
      { id: 'room-bed-ne', name: 'Bedroom NE', type: 'bedroom', vertices: [{ x: 8.20, y: 0 }, { x: 14.81, y: 0 }, { x: 14.81, y: 3.50 }, { x: 8.20, y: 3.50 }], area: 13.84, wallIds: ['wall-ext-n', 'wall-ext-e', 'wall-int-bedne-bede', 'wall-int-corridor-bedne', 'wall-int-wc2-bedne'] },
      { id: 'room-bed-e', name: 'Bedroom East', type: 'bedroom', vertices: [{ x: 9.62, y: 3.50 }, { x: 14.81, y: 3.50 }, { x: 14.81, y: 7.00 }, { x: 9.62, y: 7.00 }], area: 12.83, wallIds: ['wall-int-bedne-bede', 'wall-ext-e', 'wall-int-bede-bedse', 'wall-int-living-east', 'wall-int-corridor-bede'] },
      { id: 'room-bed-se', name: 'Bedroom SE', type: 'bedroom', vertices: [{ x: 9.62, y: 7.00 }, { x: 14.81, y: 7.00 }, { x: 14.81, y: 11.30 }, { x: 9.62, y: 11.30 }], area: 13.37, wallIds: ['wall-int-bede-bedse', 'wall-ext-e', 'wall-ext-s-east', 'wall-ext-terrace-e'] },
      { id: 'room-wc1', name: 'Guest WC', type: 'bathroom', vertices: [{ x: 4.25, y: 1.70 }, { x: 6.30, y: 1.70 }, { x: 6.30, y: 3.50 }, { x: 4.25, y: 3.50 }], area: 3.93, wallIds: ['wall-int-furnace-wc1', 'wall-int-wc1-wc2', 'wall-int-wc1-corridor', 'wall-int-bednw-furnace'] },
      { id: 'room-wc2', name: 'Master Bath', type: 'bathroom', vertices: [{ x: 6.30, y: 0 }, { x: 8.20, y: 0 }, { x: 8.20, y: 3.50 }, { x: 6.30, y: 3.50 }], area: 5.64, wallIds: ['wall-ext-n', 'wall-int-wc2-bedne', 'wall-int-wc2-corridor', 'wall-int-wc1-wc2'] },
      { id: 'room-furnace', name: 'Furnace room', type: 'utility_room', vertices: [{ x: 4.25, y: 0 }, { x: 6.30, y: 0 }, { x: 6.30, y: 1.70 }, { x: 4.25, y: 1.70 }], area: 3.75, wallIds: ['wall-ext-n', 'wall-int-wc1-wc2', 'wall-int-furnace-wc1', 'wall-int-bednw-furnace'] },
      { id: 'room-corridor-w', name: 'Corridor West', type: 'hallway', vertices: [{ x: 2.98, y: 3.50 }, { x: 7.60, y: 3.50 }, { x: 7.60, y: 4.65 }, { x: 2.98, y: 4.65 }], area: 6.25, wallIds: ['wall-int-bednw-corridor', 'wall-int-wc1-corridor', 'wall-int-wc2-corridor', 'wall-int-corridor-living-return', 'wall-int-living-north'] },
      { id: 'room-corridor-e', name: 'Corridor East', type: 'hallway', vertices: [{ x: 7.60, y: 3.50 }, { x: 9.62, y: 3.50 }, { x: 9.62, y: 4.65 }, { x: 7.60, y: 4.65 }], area: 10.46, wallIds: ['wall-int-corridor-bedne', 'wall-int-corridor-bede', 'wall-int-living-east', 'wall-int-corridor-living-return'] },
      { id: 'room-terrace', name: 'Covered Terrace', type: 'patio', vertices: [{ x: 2.98, y: 9.22 }, { x: 9.62, y: 9.22 }, { x: 9.62, y: 11.30 }, { x: 2.98, y: 11.30 }], area: 22.53, wallIds: ['wall-ext-s-terrace', 'wall-ext-terrace-e', 'wall-ext-terrace-w'] },
    ],
    furniture: [
      { id: 'f-bed-nw', type: 'bed_double', position: { x: 2.1, y: 2.1 }, rotation: 0, width: 1.8, depth: 2.0, height: 0.85, room: 'Bedroom NW' },
      { id: 'f-nightstand-nw-1', type: 'nightstand', position: { x: 1.0, y: 1.3 }, rotation: 0, width: 0.5, depth: 0.45, height: 0.55, room: 'Bedroom NW' },
      { id: 'f-nightstand-nw-2', type: 'nightstand', position: { x: 3.2, y: 1.3 }, rotation: 0, width: 0.5, depth: 0.45, height: 0.55, room: 'Bedroom NW' },
      { id: 'f-wardrobe-nw', type: 'wardrobe', position: { x: 2.1, y: 3.2 }, rotation: 180, width: 1.8, depth: 0.6, height: 2.2, room: 'Bedroom NW' },
      { id: 'f-bed-ne', type: 'bed_double', position: { x: 12.2, y: 2.1 }, rotation: 0, width: 1.8, depth: 2.0, height: 0.85, room: 'Bedroom NE' },
      { id: 'f-nightstand-ne-1', type: 'nightstand', position: { x: 11.1, y: 1.3 }, rotation: 0, width: 0.5, depth: 0.45, height: 0.55, room: 'Bedroom NE' },
      { id: 'f-nightstand-ne-2', type: 'nightstand', position: { x: 13.3, y: 1.3 }, rotation: 0, width: 0.5, depth: 0.45, height: 0.55, room: 'Bedroom NE' },
      { id: 'f-wardrobe-ne', type: 'wardrobe', position: { x: 12.2, y: 3.2 }, rotation: 180, width: 1.8, depth: 0.6, height: 2.2, room: 'Bedroom NE' },
      { id: 'f-bed-e', type: 'bed_double', position: { x: 12.0, y: 5.2 }, rotation: 270, width: 2.0, depth: 1.8, height: 0.85, room: 'Bedroom East' },
      { id: 'f-wardrobe-e', type: 'wardrobe', position: { x: 12.0, y: 3.8 }, rotation: 0, width: 1.8, depth: 0.6, height: 2.2, room: 'Bedroom East' },
      { id: 'f-desk-e', type: 'desk', position: { x: 13.2, y: 6.5 }, rotation: 270, width: 1.2, depth: 0.65, height: 0.75, room: 'Bedroom East' },
      { id: 'f-bed-se', type: 'bed_double', position: { x: 12.0, y: 9.3 }, rotation: 180, width: 1.8, depth: 2.0, height: 0.85, room: 'Bedroom SE' },
      { id: 'f-nightstand-se-1', type: 'nightstand', position: { x: 10.9, y: 10.1 }, rotation: 180, width: 0.5, depth: 0.45, height: 0.55, room: 'Bedroom SE' },
      { id: 'f-nightstand-se-2', type: 'nightstand', position: { x: 13.1, y: 10.1 }, rotation: 180, width: 0.5, depth: 0.45, height: 0.55, room: 'Bedroom SE' },
      { id: 'f-desk-se', type: 'desk', position: { x: 10.5, y: 7.7 }, rotation: 90, width: 1.2, depth: 0.65, height: 0.75, room: 'Bedroom SE' },
      { id: 'f-wardrobe-se', type: 'wardrobe', position: { x: 12.0, y: 7.4 }, rotation: 0, width: 1.8, depth: 0.6, height: 2.2, room: 'Bedroom SE' },
      { id: 'f-couch', type: 'sofa', position: { x: 6.8, y: 6.8 }, rotation: 90, width: 2.8, depth: 0.95, height: 0.85, room: 'Living room - Kitchen' },
      { id: 'f-tv-unit', type: 'tv_unit', position: { x: 9.3, y: 6.8 }, rotation: 270, width: 2.4, depth: 0.45, height: 0.55, room: 'Living room - Kitchen' },
      { id: 'f-coffee-table', type: 'coffee_table', position: { x: 7.8, y: 6.8 }, rotation: 90, width: 1.2, depth: 0.65, height: 0.42, room: 'Living room - Kitchen' },
      { id: 'f-plant-living', type: 'plant', position: { x: 9.1, y: 8.8 }, rotation: 0, width: 0.6, depth: 0.6, height: 1.1, room: 'Living room - Kitchen' },
      { id: 'f-dining-table', type: 'dining_table', position: { x: 4.8, y: 6.8 }, rotation: 0, width: 1.0, depth: 1.8, height: 0.75, room: 'Living room - Kitchen' },
      { id: 'f-kitchen-counter', type: 'kitchen_counter', position: { x: 3.4, y: 6.8 }, rotation: 90, width: 3.4, depth: 0.65, height: 0.9, room: 'Living room - Kitchen' },
      { id: 'f-bathtub', type: 'bathtub', position: { x: 7.25, y: 0.6 }, rotation: 0, width: 1.7, depth: 0.75, height: 0.6, room: 'Master Bath' },
      { id: 'f-sink-wc2', type: 'sink', position: { x: 6.7, y: 2.2 }, rotation: 90, width: 0.7, depth: 0.5, height: 0.85, room: 'Master Bath' },
      { id: 'f-toilet-wc2', type: 'toilet', position: { x: 6.7, y: 3.1 }, rotation: 90, width: 0.65, depth: 0.45, height: 0.78, room: 'Master Bath' },
      { id: 'f-toilet-wc1', type: 'toilet', position: { x: 5.6, y: 3.1 }, rotation: 270, width: 0.65, depth: 0.45, height: 0.78, room: 'Guest WC' },
      { id: 'f-sink-wc1', type: 'sink', position: { x: 5.6, y: 2.3 }, rotation: 270, width: 0.65, depth: 0.45, height: 0.85, room: 'Guest WC' },
      { id: 'f-wardrobe-hallway', type: 'wardrobe', position: { x: 2.5, y: 6.3 }, rotation: 270, width: 3.2, depth: 0.6, height: 2.2, room: 'Hallway' },
      { id: 'f-furnace-unit', type: 'furnace', position: { x: 5.2, y: 0.8 }, rotation: 0, width: 0.9, depth: 0.6, height: 1.6, room: 'Furnace room' },
      { id: 'f-terrace-table', type: 'dining_table', position: { x: 6.3, y: 10.3 }, rotation: 0, width: 1.0, depth: 1.8, height: 0.75, room: 'Covered Terrace' },
      { id: 'f-terrace-sofa', type: 'sofa', position: { x: 8.8, y: 10.3 }, rotation: 270, width: 1.6, depth: 0.85, height: 0.8, room: 'Covered Terrace' },
      { id: 'f-terrace-kitchen', type: 'kitchen_counter', position: { x: 3.4, y: 10.3 }, rotation: 90, width: 1.6, depth: 0.65, height: 0.9, room: 'Covered Terrace' },
      { id: 'f-porch-column', type: 'column', position: { x: 0.25, y: 11.1 }, rotation: 0, width: 0.35, depth: 0.35, height: 2.8, room: 'Entrance Porch' },
    ],
    roof: { type: 'gable', pitch: 28, overhang: 0.6, material: 'asphalt_shingle', color: '#3C4048' },
    staircases: [],
    confidence: 0.98,
    notes: [
      'Modern Scandinavian Villa (14.81m × 11.30m) reconstructed from CAD blueprint.',
      '4 full bedrooms with calibrated double beds, nightstands, and wardrobes.',
      'Covered outdoor terrace with exterior kitchen and lounge area.',
      'Central MEP wet-core grouping for energy efficiency.',
    ],
  };
}

/**
 * 2. Industrial Urban Loft (74.20 m²)
 * High-ceiling open-concept loft with kitchen island, master suite, luxury bath, and terrace balcony
 */
export function getUrbanLoftAnalysis(): HouseAnalysis {
  return {
    id: 'archetype-loft',
    metadata: {
      style: 'Industrial Urban Loft',
      floors: 1,
      totalArea: 74.20,
      overallWidth: 10.50,
      overallDepth: 7.20,
      wallHeight: 3.4,
      scale: 50.0,
    },
    walls: [
      // Exterior boundary
      { id: 'loft-wall-n', start: { x: 0, y: 0 }, end: { x: 10.50, y: 0 }, thickness: 0.28, height: 3.4, material: 'concrete', color: '#D1D5DB', isExterior: true },
      { id: 'loft-wall-e', start: { x: 10.50, y: 0 }, end: { x: 10.50, y: 7.20 }, thickness: 0.28, height: 3.4, material: 'brick', color: '#991B1B', isExterior: true },
      { id: 'loft-wall-s', start: { x: 10.50, y: 7.20 }, end: { x: 0, y: 7.20 }, thickness: 0.28, height: 3.4, material: 'concrete', color: '#D1D5DB', isExterior: true },
      { id: 'loft-wall-w', start: { x: 0, y: 7.20 }, end: { x: 0, y: 0 }, thickness: 0.28, height: 3.4, material: 'concrete', color: '#D1D5DB', isExterior: true },

      // Interior partitions
      { id: 'loft-wall-bed-w', start: { x: 6.50, y: 0 }, end: { x: 6.50, y: 5.40 }, thickness: 0.15, height: 3.4, material: 'drywall', color: '#1F2937', isExterior: false },
      { id: 'loft-wall-bath-s', start: { x: 6.50, y: 3.60 }, end: { x: 10.50, y: 3.60 }, thickness: 0.15, height: 3.4, material: 'drywall', color: '#F3F4F6', isExterior: false },
      { id: 'loft-wall-balcony-n', start: { x: 4.20, y: 5.40 }, end: { x: 10.50, y: 5.40 }, thickness: 0.22, height: 3.4, material: 'glass', color: '#E0F2FE', isExterior: true },
    ],
    doors: [
      { id: 'loft-door-front', position: { x: 0, y: 2.0 }, width: 1.0, height: 2.4, wallId: 'loft-wall-w', style: 'single', swingDirection: 'inward', material: 'metal', color: '#111827' },
      { id: 'loft-door-bed', position: { x: 6.50, y: 2.2 }, width: 0.9, height: 2.4, wallId: 'loft-wall-bed-w', style: 'pocket', swingDirection: 'inward', material: 'wood', color: '#78350F' },
      { id: 'loft-door-bath', position: { x: 8.50, y: 3.60 }, width: 0.85, height: 2.4, wallId: 'loft-wall-bath-s', style: 'sliding', swingDirection: 'inward', material: 'glass', color: '#F3F4F6' },
      { id: 'loft-door-balcony', position: { x: 5.40, y: 5.40 }, width: 2.4, height: 2.8, wallId: 'loft-wall-balcony-n', style: 'sliding', swingDirection: 'outward', material: 'glass', color: '#FFFFFF' },
    ],
    windows: [
      { id: 'loft-win-living-n', position: { x: 3.20, y: 0 }, width: 3.0, height: 2.2, sillHeight: 0.8, wallId: 'loft-wall-n', style: 'fixed', panes: 3, material: 'aluminum', color: '#1E293B' },
      { id: 'loft-win-bed-n', position: { x: 8.50, y: 0 }, width: 2.2, height: 2.2, sillHeight: 0.8, wallId: 'loft-wall-n', style: 'casement', panes: 2, material: 'aluminum', color: '#1E293B' },
      { id: 'loft-win-balcony-glass', position: { x: 8.40, y: 5.40 }, width: 3.6, height: 2.8, sillHeight: 0.2, wallId: 'loft-wall-balcony-n', style: 'fixed', panes: 3, material: 'aluminum', color: '#1E293B' },
    ],
    rooms: [
      { id: 'loft-room-living', name: 'Open Living & Dining', type: 'living_room', vertices: [{ x: 0, y: 0 }, { x: 6.50, y: 0 }, { x: 6.50, y: 5.40 }, { x: 0, y: 5.40 }], area: 35.10, wallIds: ['loft-wall-n', 'loft-wall-bed-w', 'loft-wall-w'] },
      { id: 'loft-room-kitchen', name: 'Gourmet Kitchen', type: 'kitchen', vertices: [{ x: 0, y: 5.40 }, { x: 4.20, y: 5.40 }, { x: 4.20, y: 7.20 }, { x: 0, y: 7.20 }], area: 7.56, wallIds: ['loft-wall-w', 'loft-wall-s'] },
      { id: 'loft-room-balcony', name: 'Terrace Balcony', type: 'balcony', vertices: [{ x: 4.20, y: 5.40 }, { x: 10.50, y: 5.40 }, { x: 10.50, y: 7.20 }, { x: 4.20, y: 7.20 }], area: 11.34, wallIds: ['loft-wall-balcony-n', 'loft-wall-e', 'loft-wall-s'] },
      { id: 'loft-room-bed', name: 'Master Suite', type: 'bedroom', vertices: [{ x: 6.50, y: 0 }, { x: 10.50, y: 0 }, { x: 10.50, y: 3.60 }, { x: 6.50, y: 3.60 }], area: 14.40, wallIds: ['loft-wall-n', 'loft-wall-e', 'loft-wall-bath-s', 'loft-wall-bed-w'] },
      { id: 'loft-room-bath', name: 'Spa En-Suite', type: 'bathroom', vertices: [{ x: 6.50, y: 3.60 }, { x: 10.50, y: 3.60 }, { x: 10.50, y: 5.40 }, { x: 6.50, y: 5.40 }], area: 7.20, wallIds: ['loft-wall-bath-s', 'loft-wall-e', 'loft-wall-balcony-n', 'loft-wall-bed-w'] },
    ],
    furniture: [
      { id: 'loft-f-sofa', type: 'sofa', position: { x: 3.2, y: 2.4 }, rotation: 90, width: 2.8, depth: 1.0, height: 0.85, room: 'Open Living & Dining' },
      { id: 'loft-f-tv', type: 'tv_unit', position: { x: 6.2, y: 2.4 }, rotation: 270, width: 2.2, depth: 0.45, height: 0.6, room: 'Open Living & Dining' },
      { id: 'loft-f-coffee', type: 'coffee_table', position: { x: 4.4, y: 2.4 }, rotation: 90, width: 1.2, depth: 0.7, height: 0.42, room: 'Open Living & Dining' },
      { id: 'loft-f-dining', type: 'dining_table', position: { x: 2.8, y: 4.4 }, rotation: 0, width: 1.8, depth: 0.95, height: 0.75, room: 'Open Living & Dining' },
      { id: 'loft-f-island', type: 'kitchen_counter', position: { x: 1.8, y: 6.2 }, rotation: 0, width: 2.4, depth: 0.9, height: 0.92, room: 'Gourmet Kitchen' },
      { id: 'loft-f-bed', type: 'bed_double', position: { x: 8.5, y: 1.8 }, rotation: 0, width: 2.0, depth: 2.1, height: 0.9, room: 'Master Suite' },
      { id: 'loft-f-wardrobe', type: 'wardrobe', position: { x: 7.1, y: 1.8 }, rotation: 90, width: 2.2, depth: 0.65, height: 2.4, room: 'Master Suite' },
      { id: 'loft-f-tub', type: 'bathtub', position: { x: 9.5, y: 4.5 }, rotation: 90, width: 1.8, depth: 0.8, height: 0.62, room: 'Spa En-Suite' },
      { id: 'loft-f-vanity', type: 'sink', position: { x: 7.5, y: 4.2 }, rotation: 0, width: 1.4, depth: 0.55, height: 0.88, room: 'Spa En-Suite' },
      { id: 'loft-f-toilet', type: 'toilet', position: { x: 7.5, y: 5.0 }, rotation: 180, width: 0.65, depth: 0.45, height: 0.78, room: 'Spa En-Suite' },
      { id: 'loft-f-balcony-table', type: 'dining_table', position: { x: 7.2, y: 6.3 }, rotation: 0, width: 1.4, depth: 0.8, height: 0.75, room: 'Terrace Balcony' },
    ],
    roof: { type: 'flat', pitch: 0, overhang: 0.4, material: 'metal', color: '#1F2937' },
    staircases: [],
    confidence: 0.97,
    notes: [
      'Industrial Urban Loft (10.50m × 7.20m, 74.20 m²) with 3.4m high ceilings.',
      'Double-height open living space with polished concrete and exposed brick.',
      'Spacious master en-suite with freestanding soaking tub and glass partition.',
      'Full south-facing terrace balcony with floor-to-ceiling glass wall.',
    ],
  };
}

/**
 * 3. Eco Timber Cabin (42.50 m²)
 * Sustainable Scandinavian micro-home with cast-iron wood stove, vaulted ceiling, and cedar wrap-around deck
 */
export function getEcoCabinAnalysis(): HouseAnalysis {
  return {
    id: 'archetype-eco-cabin',
    metadata: {
      style: 'Eco Timber Micro-Cabin',
      floors: 1,
      totalArea: 42.50,
      overallWidth: 7.50,
      overallDepth: 5.80,
      wallHeight: 2.9,
      scale: 50.0,
    },
    walls: [
      { id: 'cabin-wall-n', start: { x: 0, y: 0 }, end: { x: 7.50, y: 0 }, thickness: 0.25, height: 2.9, material: 'wood', color: '#92400E', isExterior: true },
      { id: 'cabin-wall-e', start: { x: 7.50, y: 0 }, end: { x: 7.50, y: 5.80 }, thickness: 0.25, height: 2.9, material: 'wood', color: '#92400E', isExterior: true },
      { id: 'cabin-wall-s', start: { x: 7.50, y: 5.80 }, end: { x: 0, y: 5.80 }, thickness: 0.25, height: 2.9, material: 'wood', color: '#92400E', isExterior: true },
      { id: 'cabin-wall-w', start: { x: 0, y: 5.80 }, end: { x: 0, y: 0 }, thickness: 0.25, height: 2.9, material: 'wood', color: '#92400E', isExterior: true },

      { id: 'cabin-wall-deck-n', start: { x: 0, y: 3.80 }, end: { x: 4.50, y: 3.80 }, thickness: 0.22, height: 2.9, material: 'glass', color: '#FEF3C7', isExterior: true },
      { id: 'cabin-wall-bed-w', start: { x: 4.50, y: 0 }, end: { x: 4.50, y: 3.80 }, thickness: 0.12, height: 2.9, material: 'wood', color: '#D97706', isExterior: false },
      { id: 'cabin-wall-bath-n', start: { x: 4.50, y: 3.80 }, end: { x: 7.50, y: 3.80 }, thickness: 0.15, height: 2.9, material: 'wood', color: '#D97706', isExterior: false },
    ],
    doors: [
      { id: 'cabin-door-deck', position: { x: 2.2, y: 3.80 }, width: 1.8, height: 2.2, wallId: 'cabin-wall-deck-n', style: 'sliding', swingDirection: 'outward', material: 'glass', color: '#FFFFFF' },
      { id: 'cabin-door-bed', position: { x: 4.50, y: 2.0 }, width: 0.85, height: 2.1, wallId: 'cabin-wall-bed-w', style: 'pocket', swingDirection: 'inward', material: 'wood', color: '#78350F' },
      { id: 'cabin-door-bath', position: { x: 5.80, y: 3.80 }, width: 0.8, height: 2.1, wallId: 'cabin-wall-bath-n', style: 'single', swingDirection: 'inward', material: 'wood', color: '#78350F' },
    ],
    windows: [
      { id: 'cabin-win-living-w', position: { x: 0, y: 1.8 }, width: 1.6, height: 1.5, sillHeight: 0.8, wallId: 'cabin-wall-w', style: 'casement', panes: 2, material: 'wood', color: '#78350F' },
      { id: 'cabin-win-living-n', position: { x: 2.2, y: 0 }, width: 1.8, height: 1.5, sillHeight: 0.8, wallId: 'cabin-wall-n', style: 'casement', panes: 2, material: 'wood', color: '#78350F' },
      { id: 'cabin-win-bed-e', position: { x: 7.50, y: 1.8 }, width: 1.6, height: 1.5, sillHeight: 0.8, wallId: 'cabin-wall-e', style: 'casement', panes: 2, material: 'wood', color: '#78350F' },
    ],
    rooms: [
      { id: 'cabin-room-lounge', name: 'Vaulted Hearth Lounge', type: 'living_room', vertices: [{ x: 0, y: 0 }, { x: 4.50, y: 0 }, { x: 4.50, y: 3.80 }, { x: 0, y: 3.80 }], area: 17.10, wallIds: ['cabin-wall-n', 'cabin-wall-bed-w', 'cabin-wall-deck-n', 'cabin-wall-w'] },
      { id: 'cabin-room-bed', name: 'Timber Bed Alcove', type: 'bedroom', vertices: [{ x: 4.50, y: 0 }, { x: 7.50, y: 0 }, { x: 7.50, y: 3.80 }, { x: 4.50, y: 3.80 }], area: 11.40, wallIds: ['cabin-wall-n', 'cabin-wall-e', 'cabin-wall-bath-n', 'cabin-wall-bed-w'] },
      { id: 'cabin-room-bath', name: 'Cedar Spa Bath', type: 'bathroom', vertices: [{ x: 4.50, y: 3.80 }, { x: 7.50, y: 3.80 }, { x: 7.50, y: 5.80 }, { x: 4.50, y: 5.80 }], area: 6.00, wallIds: ['cabin-wall-bath-n', 'cabin-wall-e', 'cabin-wall-s'] },
      { id: 'cabin-room-deck', name: 'Covered Cedar Deck', type: 'porch', vertices: [{ x: 0, y: 3.80 }, { x: 4.50, y: 3.80 }, { x: 4.50, y: 5.80 }, { x: 0, y: 5.80 }], area: 9.00, wallIds: ['cabin-wall-deck-n', 'cabin-wall-s', 'cabin-wall-w'] },
    ],
    furniture: [
      { id: 'cabin-f-stove', type: 'furnace', position: { x: 0.8, y: 0.8 }, rotation: 0, width: 0.6, depth: 0.6, height: 1.1, room: 'Vaulted Hearth Lounge' },
      { id: 'cabin-f-sofa', type: 'sofa', position: { x: 2.6, y: 1.8 }, rotation: 0, width: 2.0, depth: 0.9, height: 0.8, room: 'Vaulted Hearth Lounge' },
      { id: 'cabin-f-coffee', type: 'coffee_table', position: { x: 2.6, y: 2.8 }, rotation: 0, width: 1.0, depth: 0.55, height: 0.4, room: 'Vaulted Hearth Lounge' },
      { id: 'cabin-f-kitchen', type: 'kitchen_counter', position: { x: 0.5, y: 2.6 }, rotation: 90, width: 2.0, depth: 0.6, height: 0.9, room: 'Vaulted Hearth Lounge' },
      { id: 'cabin-f-bed', type: 'bed_double', position: { x: 6.0, y: 1.8 }, rotation: 0, width: 1.8, depth: 2.0, height: 0.8, room: 'Timber Bed Alcove' },
      { id: 'cabin-f-wardrobe', type: 'wardrobe', position: { x: 6.0, y: 3.3 }, rotation: 180, width: 1.6, depth: 0.55, height: 2.1, room: 'Timber Bed Alcove' },
      { id: 'cabin-f-shower', type: 'bathtub', position: { x: 6.5, y: 5.0 }, rotation: 90, width: 1.2, depth: 0.85, height: 0.5, room: 'Cedar Spa Bath' },
      { id: 'cabin-f-vanity', type: 'sink', position: { x: 5.2, y: 4.4 }, rotation: 0, width: 0.8, depth: 0.5, height: 0.85, room: 'Cedar Spa Bath' },
      { id: 'cabin-f-toilet', type: 'toilet', position: { x: 5.2, y: 5.2 }, rotation: 180, width: 0.6, depth: 0.45, height: 0.78, room: 'Cedar Spa Bath' },
      { id: 'cabin-f-deck-chair1', type: 'chair', position: { x: 1.5, y: 4.8 }, rotation: 0, width: 0.75, depth: 0.8, height: 0.85, room: 'Covered Cedar Deck' },
      { id: 'cabin-f-deck-chair2', type: 'chair', position: { x: 3.0, y: 4.8 }, rotation: 0, width: 0.75, depth: 0.8, height: 0.85, room: 'Covered Cedar Deck' },
    ],
    roof: { type: 'gable', pitch: 35, overhang: 0.7, material: 'metal', color: '#1E293B' },
    staircases: [],
    confidence: 0.96,
    notes: [
      'Eco Timber Micro-Cabin (7.50m × 5.80m, 42.50 m²) with vaulted ceiling.',
      'Features a cast-iron wood hearth, galley kitchen, and sheltered cedar deck.',
      'Optimized thermal envelope with triple-glazed timber casement windows.',
    ],
  };
}


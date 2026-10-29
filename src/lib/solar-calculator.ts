import type { SolarStudySettings } from '@/types';

export interface SolarPosition {
  altitude: number; // degrees above horizon (0 to 90)
  azimuth: number; // degrees from North (0 = N, 90 = E, 180 = S, 270 = W)
  position3D: [number, number, number]; // Three.js light coordinate
  color: string; // hex color temperature
  intensity: number;
  isNight: boolean;
  shadingActive: boolean; // whether South terrace roof is actively shading living room
}

/**
 * Computes solar geometry (Altitude, Azimuth, and 3D Vector)
 * based on solar time, season, and latitude.
 */
export function calculateSolarPosition(settings: SolarStudySettings): SolarPosition {
  const { timeOfDay, season, latitude } = settings;

  // 1. Solar declination angle delta
  let declinationDeg = 0;
  if (season === 'summer') declinationDeg = 23.45;
  if (season === 'winter') declinationDeg = -23.45;

  const latRad = (latitude * Math.PI) / 180;
  const decRad = (declinationDeg * Math.PI) / 180;

  // 2. Solar hour angle H (-180 to +180 deg, 0 at solar noon 12:00)
  const hourAngleDeg = (timeOfDay - 12.0) * 15.0;
  const hRad = (hourAngleDeg * Math.PI) / 180;

  // 3. Solar altitude angle alpha: sin(alpha) = sin(lat)*sin(dec) + cos(lat)*cos(dec)*cos(H)
  const sinAlpha = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hRad);
  const alphaRad = Math.asin(Math.max(-1, Math.min(1, sinAlpha)));
  const altitudeDeg = (alphaRad * 180) / Math.PI;

  // 4. Solar azimuth angle gamma
  const cosAlpha = Math.cos(alphaRad);
  let azimuthDeg = 180; // default south

  if (cosAlpha > 0.001) {
    const cosGamma = (Math.sin(alphaRad) * Math.sin(latRad) - Math.sin(decRad)) / (cosAlpha * Math.cos(latRad));
    const gammaRad = Math.acos(Math.max(-1, Math.min(1, cosGamma)));
    azimuthDeg = (gammaRad * 180) / Math.PI;

    // Adjust for morning vs afternoon: before noon sun is East of South
    if (hourAngleDeg < 0) {
      azimuthDeg = 180 - azimuthDeg; // East of South
    } else {
      azimuthDeg = 180 + azimuthDeg; // West of South
    }
  }

  const isNight = altitudeDeg <= 0;

  // 5. 3D Light Coordinate in Three.js (+X = East, +Z = South, +Y = Up)
  const radius = 35;
  const azRad = (azimuthDeg * Math.PI) / 180;

  // In Three.js: Azimuth 0 = North (-Z), 90 = East (+X), 180 = South (+Z), 270 = West (-X)
  const x = radius * Math.cos(alphaRad) * Math.sin(azRad);
  const z = radius * Math.cos(alphaRad) * -Math.cos(azRad);
  const y = Math.max(0.5, radius * Math.sin(alphaRad));

  // 6. Dynamic color temperature and intensity
  let color = '#FFF8EE';
  let intensity = 1.6;

  if (isNight) {
    color = '#152035';
    intensity = 0.2;
  } else if (altitudeDeg < 12) {
    // Sunrise / Sunset golden-orange
    color = '#FF8C42';
    intensity = 0.9;
  } else if (altitudeDeg < 30) {
    // Early morning / late afternoon warm amber
    color = '#FFE2A0';
    intensity = 1.35;
  } else {
    // High sun bright neutral daylight (5500K)
    color = '#FFFFF5';
    intensity = 1.7;
  }

  // 7. Shading test: In summer midday (alt > 50, sun from South azimuth 150-210),
  // the covered terrace overhang (2.08m projection) actively shades the living room glass!
  const shadingActive = season === 'summer' && altitudeDeg > 50 && azimuthDeg >= 140 && azimuthDeg <= 220;

  return {
    altitude: Math.max(0, altitudeDeg),
    azimuth: (azimuthDeg + 360) % 360,
    position3D: [x, y, z],
    color,
    intensity,
    isNight,
    shadingActive,
  };
}


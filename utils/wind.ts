import type { WindComponents } from './types';

/**
 * Calculate wind components (headwind/tailwind and crosswind)
 */
export function calculateWindComponents(
  runwayDirection: number,
  windDirection: number,
  windSpeed: number
): WindComponents {
  // Calculate the angle difference
  let angleDiff = windDirection - runwayDirection;
  
  // Normalize to -180 to 180
  while (angleDiff > 180) angleDiff -= 360;
  while (angleDiff < -180) angleDiff += 360;
  
  // Convert to radians
  const angleRad = (angleDiff * Math.PI) / 180;
  
  // Headwind component (positive = headwind, negative = tailwind)
  const headwind = windSpeed * Math.cos(angleRad);
  
  // Crosswind component (always positive)
  const crosswind = Math.abs(windSpeed * Math.sin(angleRad));
  
  return {
    headwind: headwind > 0 ? headwind : 0,
    tailwind: headwind < 0 ? Math.abs(headwind) : 0,
    crosswind,
  };
}


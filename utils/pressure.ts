/**
 * Calculate pressure altitude from elevation and QNH
 * Formula: PA = Elevation + (1013.25 - QNH) * 30
 */
export function calculatePressureAltitude(
  elevation: number,
  qnh: number
): number {
  return elevation + (1013.25 - qnh) * 30;
}


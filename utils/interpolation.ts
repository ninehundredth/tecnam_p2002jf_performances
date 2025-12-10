/**
 * Linear interpolation between two values
 */
export function interpolate(x: number, x1: number, x2: number, y1: number, y2: number): number {
  if (x2 === x1) return y1;
  return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
}

/**
 * Bilinear interpolation in 2D
 */
export function bilinearInterpolate(
  x: number, y: number,
  x1: number, x2: number,
  y1: number, y2: number,
  q11: number, q12: number,
  q21: number, q22: number
): number {
  const r1 = interpolate(x, x1, x2, q11, q21);
  const r2 = interpolate(x, x1, x2, q12, q22);
  return interpolate(y, y1, y2, r1, r2);
}

/**
 * Trilinear interpolation in 3D (weight, pressure altitude, temperature)
 */
export function trilinearInterpolate(
  weight: number,
  pressureAlt: number,
  temperature: number,
  w1: number, w2: number,
  pa1: number, pa2: number,
  t1: number, t2: number,
  values: number[][][]
): number {
  // values[weight][pressureAlt][temperature]
  const v111 = values[0][0][0];
  const v112 = values[0][0][1];
  const v121 = values[0][1][0];
  const v122 = values[0][1][1];
  const v211 = values[1][0][0];
  const v212 = values[1][0][1];
  const v221 = values[1][1][0];
  const v222 = values[1][1][1];

  // Interpolate along temperature axis first
  const c11 = interpolate(temperature, t1, t2, v111, v112);
  const c12 = interpolate(temperature, t1, t2, v121, v122);
  const c21 = interpolate(temperature, t1, t2, v211, v212);
  const c22 = interpolate(temperature, t1, t2, v221, v222);

  // Then interpolate along pressure altitude axis
  const c1 = interpolate(pressureAlt, pa1, pa2, c11, c12);
  const c2 = interpolate(pressureAlt, pa1, pa2, c21, c22);

  // Finally interpolate along weight axis
  return interpolate(weight, w1, w2, c1, c2);
}


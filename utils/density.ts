/**
 * Calculate density altitude from pressure altitude and temperature
 * Formula based on standard atmosphere model
 * DA = PA + (118.8 * (OAT - ISA_Temp))
 * Where ISA_Temp = 15 - (PA / 1000 * 2)
 */
export function calculateDensityAltitude(
  pressureAltitude: number,
  temperature: number // OAT in Celsius
): number {
  // ISA temperature at given pressure altitude
  // ISA lapse rate is approximately 2°C per 1000ft
  const isaTemperature = 15 - (pressureAltitude / 1000) * 2;
  
  // Density altitude = pressure altitude + (118.8 * temperature deviation from ISA)
  const temperatureDeviation = temperature - isaTemperature;
  const densityAltitude = pressureAltitude + (118.8 * temperatureDeviation);
  
  return densityAltitude;
}

/**
 * Calculate density ratio (density at altitude / density at sea level)
 * This is used for KTAS to KIAS conversion
 * Simplified formula: density_ratio ≈ (288.15 / (OAT + 273.15)) * (pressure / 1013.25)
 * For aviation purposes, we can use: density_ratio ≈ (288.15 / (OAT + 273.15)) * exp(-PA / 22000)
 * Or more accurately using the standard atmosphere model
 */
export function calculateDensityRatio(
  pressureAltitude: number,
  temperature: number // OAT in Celsius
): number {
  // Convert temperature to Kelvin
  const tempKelvin = temperature + 273.15;
  const seaLevelTempKelvin = 288.15; // 15°C
  
  // Standard sea level pressure in hPa
  const seaLevelPressure = 1013.25;
  
  // Calculate pressure at altitude using barometric formula
  // P = P0 * (1 - (L * h) / T0)^(g * M / (R * L))
  // Simplified approximation: P ≈ P0 * exp(-h / 8434.5) where h is in meters
  // Converting to feet: P ≈ P0 * exp(-h_ft / 27500)
  const pressureAltitudeMeters = pressureAltitude * 0.3048;
  const pressureAtAltitude = seaLevelPressure * Math.exp(-pressureAltitudeMeters / 8434.5);
  
  // Density ratio = (P / P0) * (T0 / T)
  const densityRatio = (pressureAtAltitude / seaLevelPressure) * (seaLevelTempKelvin / tempKelvin);
  
  return densityRatio;
}

/**
 * Convert KTAS (True Airspeed) to KIAS (Indicated Airspeed)
 * Formula: KIAS = KTAS * sqrt(density_ratio)
 */
export function convertKtasToKias(
  ktas: number,
  pressureAltitude: number,
  temperature: number
): number {
  const densityRatio = calculateDensityRatio(pressureAltitude, temperature);
  const kias = ktas * Math.sqrt(densityRatio);
  return kias;
}

/**
 * Convert KIAS (Indicated Airspeed) to KTAS (True Airspeed)
 * Formula: KTAS = KIAS / sqrt(density_ratio)
 */
export function convertKiasToKtas(
  kias: number,
  pressureAltitude: number,
  temperature: number
): number {
  const densityRatio = calculateDensityRatio(pressureAltitude, temperature);
  const ktas = kias / Math.sqrt(densityRatio);
  return ktas;
}


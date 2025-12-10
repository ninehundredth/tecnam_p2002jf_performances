import type {
  CalculationInputs,
  WindComponents,
  CorrectionInfo,
  CalculationType,
} from './types';

export interface CorrectionFactors {
  headwindPerKt: number;
  tailwindPerKt: number;
  pavedRunwayPercent: number;
  slopePercentPerSlope: number;
}

/**
 * Get correction factors based on calculation type
 */
export function getCorrectionFactors(calculationType: CalculationType): CorrectionFactors {
  const isTakeoff = calculationType === 'takeoff';
  return {
    headwindPerKt: isTakeoff ? -2.5 : -5,
    tailwindPerKt: isTakeoff ? 10 : 11,
    pavedRunwayPercent: isTakeoff ? -6 : -2,
    slopePercentPerSlope: isTakeoff ? 5 : -2.5,
  };
}

/**
 * Apply corrections to base distances
 */
export function applyCorrections(
  baseGroundRoll: number,
  baseOver50ft: number,
  inputs: CalculationInputs,
  windComponents: WindComponents,
  factors: CorrectionFactors
): {
  groundRoll: number;
  over50ft: number;
  correctionsGroundRoll: CorrectionInfo;
  correctionsOver50ft: CorrectionInfo;
} {
  let groundRoll = baseGroundRoll;
  let over50ft = baseOver50ft;
  
  // Track corrections separately for ground roll and over 50ft
  const correctionsGroundRoll: CorrectionInfo = {
    wind: { type: 'none', value: 0, correction: 0 },
    surface: { type: inputs.runwaySurface, correctionPercent: 0, correctionMeters: 0 },
    slope: { value: inputs.runwaySlope, correctionPercent: 0, correctionMeters: 0 },
  };
  
  const correctionsOver50ft: CorrectionInfo = {
    wind: { type: 'none', value: 0, correction: 0 },
    surface: { type: inputs.runwaySurface, correctionPercent: 0, correctionMeters: 0 },
    slope: { value: inputs.runwaySlope, correctionPercent: 0, correctionMeters: 0 },
  };
  
  // Wind correction (applied to both ground roll and over 50ft)
  if (windComponents.headwind > 0) {
    const windCorrection = windComponents.headwind * factors.headwindPerKt;
    groundRoll += windCorrection;
    over50ft += windCorrection;
    correctionsGroundRoll.wind = {
      type: 'headwind',
      value: windComponents.headwind,
      correction: windCorrection,
    };
    correctionsOver50ft.wind = {
      type: 'headwind',
      value: windComponents.headwind,
      correction: windCorrection,
    };
  } else if (windComponents.tailwind > 0) {
    const windCorrection = windComponents.tailwind * factors.tailwindPerKt;
    groundRoll += windCorrection;
    over50ft += windCorrection;
    correctionsGroundRoll.wind = {
      type: 'tailwind',
      value: windComponents.tailwind,
      correction: windCorrection,
    };
    correctionsOver50ft.wind = {
      type: 'tailwind',
      value: windComponents.tailwind,
      correction: windCorrection,
    };
  }
  
  // Paved runway correction (applied to both ground roll and over 50ft)
  if (inputs.runwaySurface === 'concrete' || inputs.runwaySurface === 'asphalt') {
    const surfaceCorrectionPercent = factors.pavedRunwayPercent;
    const surfaceMultiplier = 1 + (surfaceCorrectionPercent / 100);
    const surfaceCorrectionMetersGroundRoll = baseGroundRoll * Math.abs(surfaceCorrectionPercent / 100);
    const surfaceCorrectionMetersOver50ft = baseOver50ft * Math.abs(surfaceCorrectionPercent / 100);
    groundRoll *= surfaceMultiplier;
    over50ft *= surfaceMultiplier;
    correctionsGroundRoll.surface = {
      type: inputs.runwaySurface,
      correctionPercent: surfaceCorrectionPercent,
      correctionMeters: surfaceCorrectionMetersGroundRoll,
    };
    correctionsOver50ft.surface = {
      type: inputs.runwaySurface,
      correctionPercent: surfaceCorrectionPercent,
      correctionMeters: surfaceCorrectionMetersOver50ft,
    };
  }
  
  // Runway slope correction (applied to both)
  // For takeoff: positive slope = uphill (increases distance) → +5% per +1% slope
  // For landing: positive slope = uphill (decreases distance) → -2.5% per +1% slope
  const slopeCorrectionPercent = inputs.runwaySlope * factors.slopePercentPerSlope;
  const slopeMultiplier = 1 + (slopeCorrectionPercent / 100);
  const slopeCorrectionMetersGroundRoll = baseGroundRoll * (slopeMultiplier - 1);
  const slopeCorrectionMetersOver50ft = baseOver50ft * (slopeMultiplier - 1);
  groundRoll *= slopeMultiplier;
  over50ft *= slopeMultiplier;
  correctionsGroundRoll.slope = {
    value: inputs.runwaySlope,
    correctionPercent: slopeCorrectionPercent,
    correctionMeters: slopeCorrectionMetersGroundRoll,
  };
  correctionsOver50ft.slope = {
    value: inputs.runwaySlope,
    correctionPercent: slopeCorrectionPercent,
    correctionMeters: slopeCorrectionMetersOver50ft,
  };
  
  // Ensure non-negative values
  groundRoll = Math.max(0, groundRoll);
  over50ft = Math.max(0, over50ft);
  
  return {
    groundRoll,
    over50ft,
    correctionsGroundRoll,
    correctionsOver50ft,
  };
}


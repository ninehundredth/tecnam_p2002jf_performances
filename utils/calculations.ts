import type {
  CalculationInputs,
  CalculationResults,
  CalculationType,
  CalculationDebugInfo,
  CorrectionInfo,
  RateOfClimbInputs,
  RateOfClimbResults,
  CruiseInputs,
  CruiseResults,
} from './types';
import { calculateWindComponents } from './wind';
import { calculatePressureAltitude } from './pressure';
import { calculateDensityAltitude, calculateDensityRatio, convertKtasToKias, convertKiasToKtas } from './density';
import { getDistanceFromTable, getRateOfClimbFromTable, getCruisePerformanceFromTable, getCruisePerformanceFromTableByRpm } from './performance-table';
import { getCorrectionFactors, applyCorrections } from './corrections';

/**
 * Main calculation function for takeoff or landing
 */
export function calculatePerformance(
  inputs: CalculationInputs,
  calculationType: CalculationType = 'takeoff',
  includeDebug: boolean = false
): CalculationResults {
  // Calculate pressure altitude
  const pressureAltitude = calculatePressureAltitude(
    inputs.runwayElevation,
    inputs.qnh
  );
  
  // Calculate wind components
  const windComponents = calculateWindComponents(
    inputs.runwayDirection,
    inputs.windDirection,
    inputs.windSpeed
  );
  
  // Get base distances from table with debug info
  const debugGroundRoll = includeDebug ? {
    info: {
      inputWeight: 0,
      inputPressureAlt: 0,
      inputTemperature: 0,
      clampedWeight: 0,
      clampedPressureAlt: 0,
      clampedTemperature: 0,
      weightBounds: { w1: 0, w2: 0, w1Idx: 0, w2Idx: 0 },
      pressureAltBounds: { pa1: 0, pa2: 0, pa1Idx: 0, pa2Idx: 0 },
      temperatureBounds: { t1: 0, t2: 0, t1Idx: 0, t2Idx: 0 },
      cornerValues: {},
      interpolationSteps: [] as string[],
      corrections: undefined as CorrectionInfo | undefined,
    },
    steps: [] as string[],
  } : undefined;
  
  const debugOver50ft = includeDebug ? {
    info: {
      inputWeight: 0,
      inputPressureAlt: 0,
      inputTemperature: 0,
      clampedWeight: 0,
      clampedPressureAlt: 0,
      clampedTemperature: 0,
      weightBounds: { w1: 0, w2: 0, w1Idx: 0, w2Idx: 0 },
      pressureAltBounds: { pa1: 0, pa2: 0, pa1Idx: 0, pa2Idx: 0 },
      temperatureBounds: { t1: 0, t2: 0, t1Idx: 0, t2Idx: 0 },
      cornerValues: {},
      interpolationSteps: [] as string[],
      corrections: undefined as CorrectionInfo | undefined,
    },
    steps: [] as string[],
  } : undefined;
  
  const baseGroundRoll = getDistanceFromTable(
    inputs.weight,
    pressureAltitude,
    inputs.temperature,
    'ground_roll',
    debugGroundRoll,
    true,
    calculationType
  );
  
  const baseOver50ft = getDistanceFromTable(
    inputs.weight,
    pressureAltitude,
    inputs.temperature,
    'over_50ft',
    debugOver50ft,
    true,
    calculationType
  );
  
  // Get correction factors and apply corrections
  const factors = getCorrectionFactors(calculationType);
  const {
    groundRoll,
    over50ft,
    correctionsGroundRoll,
    correctionsOver50ft,
  } = applyCorrections(
    baseGroundRoll,
    baseOver50ft,
    inputs,
    windComponents,
    factors
  );
  
  const result: CalculationResults = {
    pressureAltitude,
    windComponents,
    groundRoll: Math.round(groundRoll),
    over50ft: Math.round(over50ft),
    baseGroundRoll: Math.round(baseGroundRoll),
    baseOver50ft: Math.round(baseOver50ft),
  };
  
  if (includeDebug && debugGroundRoll && debugOver50ft) {
    // Copy steps to interpolationSteps
    debugGroundRoll.info.interpolationSteps = debugGroundRoll.steps;
    debugOver50ft.info.interpolationSteps = debugOver50ft.steps;
    
    // Add corrections to debug info (separate for each)
    debugGroundRoll.info.corrections = correctionsGroundRoll;
    debugOver50ft.info.corrections = correctionsOver50ft;
    
    // Add correction steps to debug (separate for ground roll and over 50ft)
    const correctionStepsGroundRoll: string[] = [];
    correctionStepsGroundRoll.push(`Base value: ${baseGroundRoll.toFixed(1)}m`);
    
    if (correctionsGroundRoll.wind.type !== 'none') {
      correctionStepsGroundRoll.push(`Wind correction (${correctionsGroundRoll.wind.type} ${correctionsGroundRoll.wind.value.toFixed(1)}kt): ${correctionsGroundRoll.wind.correction > 0 ? '+' : ''}${correctionsGroundRoll.wind.correction.toFixed(1)}m`);
    } else {
      correctionStepsGroundRoll.push(`Wind correction: none`);
    }
    
    if (correctionsGroundRoll.surface.correctionPercent !== 0) {
      correctionStepsGroundRoll.push(`Surface correction (${correctionsGroundRoll.surface.type}): ${correctionsGroundRoll.surface.correctionPercent}% (${correctionsGroundRoll.surface.correctionMeters > 0 ? '-' : ''}${Math.abs(correctionsGroundRoll.surface.correctionMeters).toFixed(1)}m)`);
    } else {
      correctionStepsGroundRoll.push(`Surface correction (${correctionsGroundRoll.surface.type}): none`);
    }
    
    if (correctionsGroundRoll.slope.value !== 0) {
      const slopeSign = correctionsGroundRoll.slope.correctionMeters > 0 ? '+' : '';
      correctionStepsGroundRoll.push(`Slope correction (${correctionsGroundRoll.slope.value > 0 ? 'uphill' : 'downhill'} ${Math.abs(correctionsGroundRoll.slope.value)}%): ${correctionsGroundRoll.slope.correctionPercent > 0 ? '+' : ''}${correctionsGroundRoll.slope.correctionPercent}% (${slopeSign}${correctionsGroundRoll.slope.correctionMeters.toFixed(1)}m)`);
    } else {
      correctionStepsGroundRoll.push(`Slope correction: none`);
    }
    
    correctionStepsGroundRoll.push(`Final value: ${groundRoll.toFixed(1)}m`);
    
    const correctionStepsOver50ft: string[] = [];
    correctionStepsOver50ft.push(`Base value: ${baseOver50ft.toFixed(1)}m`);
    
    if (correctionsOver50ft.wind.type !== 'none') {
      correctionStepsOver50ft.push(`Wind correction (${correctionsOver50ft.wind.type} ${correctionsOver50ft.wind.value.toFixed(1)}kt): ${correctionsOver50ft.wind.correction > 0 ? '+' : ''}${correctionsOver50ft.wind.correction.toFixed(1)}m`);
    } else {
      correctionStepsOver50ft.push(`Wind correction: none`);
    }
    
    if (correctionsOver50ft.surface.correctionPercent !== 0) {
      correctionStepsOver50ft.push(`Surface correction (${correctionsOver50ft.surface.type}): ${correctionsOver50ft.surface.correctionPercent}% (${correctionsOver50ft.surface.correctionMeters > 0 ? '-' : ''}${Math.abs(correctionsOver50ft.surface.correctionMeters).toFixed(1)}m)`);
    } else {
      correctionStepsOver50ft.push(`Surface correction (${correctionsOver50ft.surface.type}): none`);
    }
    
    if (correctionsOver50ft.slope.value !== 0) {
      const slopeSign = correctionsOver50ft.slope.correctionMeters > 0 ? '+' : '';
      correctionStepsOver50ft.push(`Slope correction (${correctionsOver50ft.slope.value > 0 ? 'uphill' : 'downhill'} ${Math.abs(correctionsOver50ft.slope.value)}%): ${correctionsOver50ft.slope.correctionPercent > 0 ? '+' : ''}${correctionsOver50ft.slope.correctionPercent}% (${slopeSign}${correctionsOver50ft.slope.correctionMeters.toFixed(1)}m)`);
    } else {
      correctionStepsOver50ft.push(`Slope correction: none`);
    }
    
    correctionStepsOver50ft.push(`Final value: ${over50ft.toFixed(1)}m`);
    
    debugGroundRoll.info.interpolationSteps = [...debugGroundRoll.steps, ...correctionStepsGroundRoll];
    debugOver50ft.info.interpolationSteps = [...debugOver50ft.steps, ...correctionStepsOver50ft];
    
    result.debug = {
      groundRoll: debugGroundRoll.info,
      over50ft: debugOver50ft.info,
    };
  }
  
  return result;
}

/**
 * Main calculation function for takeoff (backward compatibility)
 */
export function calculateTakeoffPerformance(
  inputs: CalculationInputs,
  includeDebug: boolean = false
): CalculationResults {
  return calculatePerformance(inputs, 'takeoff', includeDebug);
}

/**
 * Main calculation function for landing
 */
export function calculateLandingPerformance(
  inputs: CalculationInputs,
  includeDebug: boolean = false
): CalculationResults {
  return calculatePerformance(inputs, 'landing', includeDebug);
}

/**
 * Calculate takeoff rate of climb
 */
export function calculateTakeoffRateOfClimb(
  inputs: RateOfClimbInputs,
  includeDebug: boolean = false
): RateOfClimbResults {
  // Calculate pressure altitude from elevation and QNH
  const pressureAltitude = calculatePressureAltitude(
    inputs.elevation,
    inputs.qnh
  );
  
  // Get debug info if requested
  const debugInfo = includeDebug ? {
    info: {
      inputWeight: 0,
      inputPressureAlt: 0,
      inputTemperature: 0,
      clampedWeight: 0,
      clampedPressureAlt: 0,
      clampedTemperature: 0,
      weightBounds: { w1: 0, w2: 0, w1Idx: 0, w2Idx: 0 },
      pressureAltBounds: { pa1: 0, pa2: 0, pa1Idx: 0, pa2Idx: 0 },
      temperatureBounds: { t1: 0, t2: 0, t1Idx: 0, t2Idx: 0 },
      cornerValues: {},
      interpolationSteps: [] as string[],
      corrections: undefined,
    },
    steps: [] as string[],
  } : undefined;
  
  // Get rate of climb from table (climb speed is automatically determined from table based on pressure altitude)
  const { rateOfClimb, climbSpeed } = getRateOfClimbFromTable(
    inputs.weight,
    pressureAltitude,
    inputs.temperature,
    debugInfo
  );
  
  const result: RateOfClimbResults = {
    pressureAltitude,
    rateOfClimb: Math.round(rateOfClimb),
    baseRateOfClimb: Math.round(rateOfClimb),
    climbSpeed,
  };
  
  if (includeDebug && debugInfo) {
    debugInfo.info.interpolationSteps = debugInfo.steps;
    result.debug = debugInfo.info;
  }
  
  return result;
}

/**
 * Calculate cruise performance
 */
export function calculateCruisePerformance(
  inputs: CruiseInputs,
  includeDebug: boolean = false
): CruiseResults {
  // Calculate pressure altitude from elevation and QNH
  const pressureAltitude = calculatePressureAltitude(
    inputs.elevation,
    inputs.qnh
  );
  
  // Calculate density altitude
  const densityAltitude = calculateDensityAltitude(
    pressureAltitude,
    inputs.temperature
  );
  
  // Calculate density ratio for conversions
  const densityRatio = calculateDensityRatio(
    pressureAltitude,
    inputs.temperature
  );
  
  // Debug info
  const debugSteps: string[] = [];
  const debugInfo = includeDebug ? { steps: debugSteps } : undefined;
  
  let tablePerformance: { ktas: number; fuelConsumption: number; powerPercent: number; rpm?: number };
  let calculatedKtas: number;
  let inputKias: number;
  
  if (inputs.inputMode === 'rpm') {
    // Lookup by RPM
    if (!inputs.rpm) {
      throw new Error('RPM is required when input mode is RPM');
    }
    const rpmResult = getCruisePerformanceFromTableByRpm(
      pressureAltitude,
      inputs.temperature,
      inputs.rpm,
      debugInfo
    );
    tablePerformance = rpmResult;
    calculatedKtas = rpmResult.ktas;
    // Convert KTAS to KIAS for display
    inputKias = convertKtasToKias(calculatedKtas, pressureAltitude, inputs.temperature);
    
    if (includeDebug) {
      debugSteps.push(`Density altitude: ${densityAltitude.toFixed(0)}ft`);
      debugSteps.push(`Density ratio: ${densityRatio.toFixed(4)}`);
      debugSteps.push(`KTAS to KIAS conversion: ${calculatedKtas}kt * sqrt(${densityRatio.toFixed(4)}) = ${inputKias.toFixed(1)}kt`);
    }
  } else if (inputs.inputMode === 'kias') {
    // Input is KIAS, convert to KTAS for table lookup
    if (!inputs.kias) {
      throw new Error('KIAS is required when input mode is KIAS');
    }
    calculatedKtas = convertKiasToKtas(
      inputs.kias,
      pressureAltitude,
      inputs.temperature
    );
    inputKias = inputs.kias;
    
    if (includeDebug) {
      debugSteps.push(`Density altitude: ${densityAltitude.toFixed(0)}ft`);
      debugSteps.push(`Density ratio: ${densityRatio.toFixed(4)}`);
      debugSteps.push(`KIAS to KTAS conversion: ${inputs.kias}kt / sqrt(${densityRatio.toFixed(4)}) = ${calculatedKtas.toFixed(1)}kt`);
    }
    
    // Get cruise performance from table using calculated KTAS
    tablePerformance = getCruisePerformanceFromTable(
      pressureAltitude,
      inputs.temperature,
      calculatedKtas,
      debugInfo
    );
  } else {
    // Input is KTAS, use directly for table lookup
    if (!inputs.ktas) {
      throw new Error('KTAS is required when input mode is KTAS');
    }
    calculatedKtas = inputs.ktas;
    // Convert KTAS to KIAS for display
    inputKias = convertKtasToKias(calculatedKtas, pressureAltitude, inputs.temperature);
    
    if (includeDebug) {
      debugSteps.push(`Density altitude: ${densityAltitude.toFixed(0)}ft`);
      debugSteps.push(`Density ratio: ${densityRatio.toFixed(4)}`);
      debugSteps.push(`KTAS to KIAS conversion: ${calculatedKtas}kt * sqrt(${densityRatio.toFixed(4)}) = ${inputKias.toFixed(1)}kt`);
    }
    
    // Get cruise performance from table using input KTAS
    tablePerformance = getCruisePerformanceFromTable(
      pressureAltitude,
      inputs.temperature,
      calculatedKtas,
      debugInfo
    );
  }
  
  // Determine ISA condition for debug
  const isaTemp = 15 - (pressureAltitude / 1000) * 2;
  const tempDeviation = inputs.temperature - isaTemp;
  let isaCondition: string;
  if (tempDeviation <= -20) {
    isaCondition = 'ISA-30';
  } else if (tempDeviation >= 20) {
    isaCondition = 'ISA+30';
  } else {
    isaCondition = 'ISA';
  }
  
  const result: CruiseResults = {
    pressureAltitude,
    densityAltitude,
    ktas: Math.round(calculatedKtas * 10) / 10, // Round to 1 decimal
    kias: Math.round(inputKias * 10) / 10, // Round to 1 decimal
    fuelConsumption: tablePerformance.fuelConsumption,
    powerPercent: tablePerformance.powerPercent,
    rpm: tablePerformance.rpm,
  };
  
  if (includeDebug) {
    result.debug = {
      pressureAltitude,
      densityAltitude,
      densityRatio,
      isaCondition,
      conversionSteps: debugSteps,
    };
  }
  
  return result;
}

// Re-export types for convenience
export type {
  CalculationInputs,
  CalculationResults,
  CalculationType,
  RunwaySurface,
  WindComponents,
  CorrectionInfo,
  RateOfClimbInputs,
  RateOfClimbResults,
  ClimbSpeed,
  CruiseInputs,
  CruiseResults,
  CruiseInputMode,
} from './types';

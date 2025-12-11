import takeoffData from '../data/takeoff_distance.json';
import landingData from '../data/landing_distance.json';
import rateOfClimbData from '../data/takeoff_rate_of_climb.json';
import cruisePerformanceData from '../data/cruise_performance.json';
import type {
  CalculationType,
  SegmentType,
  CalculationDebugInfo,
  PerformanceData,
  RateOfClimbData,
  RateOfClimbDataRow,
  ClimbSpeed,
  CruisePerformanceData,
  CruisePerformanceRow,
} from './types';
import { trilinearInterpolate } from './interpolation';

/**
 * Get distance from performance table with interpolation
 */
export function getDistanceFromTable(
  weight: number,
  pressureAlt: number,
  temperature: number,
  segment: SegmentType,
  debug?: { info: CalculationDebugInfo; steps: string[] },
  allowExtrapolation: boolean = true,
  calculationType: CalculationType = 'takeoff'
): number {
  const data = (calculationType === 'takeoff' ? takeoffData : landingData) as PerformanceData;
  const weights = data.weights;
  const availableWeights = weights.map(w => w.weight_kg).sort((a, b) => a - b);
  const availableTemps = [-25, 0, 15, 25, 50];
  
  // Get all pressure altitudes from the first weight (they should be the same for all weights)
  const allPAs = weights[0].rows
    .filter(r => r.segment === segment)
    .map(r => r.pressure_alt_ft)
    .sort((a, b) => a - b);
  
  const maxTableWeight = availableWeights[availableWeights.length - 1]; // Should be 580
  const minTableWeight = availableWeights[0]; // Should be 500
  const maxExtrapolatedWeight = 600; // Allow extrapolation up to 600kg
  
  // Clamp weight: allow up to 600kg for extrapolation, but not below minimum
  const clampedWeight = Math.max(minTableWeight, Math.min(maxExtrapolatedWeight, weight));
  const clampedTemp = Math.max(availableTemps[0], Math.min(availableTemps[availableTemps.length - 1], temperature));
  const clampedPA = Math.max(allPAs[0], Math.min(allPAs[allPAs.length - 1], pressureAlt));
  
  // Check if weight is in extrapolation range (580-600kg)
  const useExtrapolation = clampedWeight > maxTableWeight && clampedWeight <= maxExtrapolatedWeight;
  
  // Check for exact matches (using clamped values, but only if not extrapolating)
  const exactWeight = !useExtrapolation ? availableWeights.find(w => w === clampedWeight) : undefined;
  const exactTemp = availableTemps.find(t => t === clampedTemp);
  const exactPA = allPAs.find(pa => pa === clampedPA);
  
  // If we have exact matches for all three, return the table value directly
  if (exactWeight !== undefined && exactTemp !== undefined && exactPA !== undefined) {
    const weightData = weights.find(w => w.weight_kg === exactWeight)!;
    const row = weightData.rows.find(r => 
      r.segment === segment && r.pressure_alt_ft === exactPA
    );
    if (row) {
      const tempKey = exactTemp.toString();
      const value = row.distance_m[tempKey as keyof typeof row.distance_m];
      if (debug) {
        debug.steps.push(`Exact match found: Weight=${exactWeight}kg, PA=${exactPA}ft, Temp=${exactTemp}°C → ${value}m`);
      }
      return value || 0;
    }
  }
  
  if (debug) {
    debug.info.inputWeight = weight;
    debug.info.inputPressureAlt = pressureAlt;
    debug.info.inputTemperature = temperature;
    debug.info.clampedWeight = clampedWeight;
    debug.info.clampedPressureAlt = clampedPA;
    debug.info.clampedTemperature = clampedTemp;
    debug.steps.push(`Input: Weight=${weight}kg, PA=${pressureAlt}ft, Temp=${temperature}°C`);
    debug.steps.push(`Clamped: Weight=${clampedWeight}kg, PA=${clampedPA}ft, Temp=${clampedTemp}°C`);
    if (useExtrapolation) {
      debug.steps.push(`Weight ${clampedWeight}kg is above table maximum (${maxTableWeight}kg) - using extrapolation from 550kg and 580kg data`);
    }
  }
  
  // Handle extrapolation for weights 580-600kg
  if (useExtrapolation && allowExtrapolation) {
    // For extrapolation, we need values at 550kg and 580kg
    // We'll calculate these using the same interpolation logic, then extrapolate
    const weight550 = 550;
    const weight580 = 580;
    
    // Get value at 550kg (disable extrapolation to prevent recursion)
    const value550 = getDistanceFromTable(
      weight550,
      clampedPA,
      clampedTemp,
      segment,
      undefined, // No debug for intermediate calculations
      false, // Disable extrapolation to prevent recursion
      calculationType
    );
    
    // Get value at 580kg (disable extrapolation to prevent recursion)
    const value580 = getDistanceFromTable(
      weight580,
      clampedPA,
      clampedTemp,
      segment,
      undefined, // No debug for intermediate calculations
      false, // Disable extrapolation to prevent recursion
      calculationType
    );
    
    // Linear extrapolation: V = V580 + (V580 - V550) * (W - 580) / (580 - 550)
    // Simplified: V = V580 + (V580 - V550) * (W - 580) / 30
    const extrapolatedValue = value580 + (value580 - value550) * (clampedWeight - weight580) / (weight580 - weight550);
    
    if (debug) {
      debug.steps.push(`Extrapolation: Value at 550kg = ${value550.toFixed(1)}m, Value at 580kg = ${value580.toFixed(1)}m`);
      debug.steps.push(`Extrapolation factor: (${clampedWeight} - ${weight580}) / (${weight580} - ${weight550}) = ${((clampedWeight - weight580) / (weight580 - weight550)).toFixed(3)}`);
      debug.steps.push(`Extrapolated value: ${value580.toFixed(1)} + (${value580.toFixed(1)} - ${value550.toFixed(1)}) * ${((clampedWeight - weight580) / (weight580 - weight550)).toFixed(3)} = ${extrapolatedValue.toFixed(1)}m`);
    }
    
    return extrapolatedValue;
  }
  
  // Find bounding weights - if exact match, use only that weight
  // Note: We need to find the actual weight data objects, not just indices
  let w1 = availableWeights[0];
  let w2 = availableWeights[availableWeights.length - 1];
  let w1DataIdx = weights.findIndex(w => w.weight_kg === availableWeights[0]);
  let w2DataIdx = weights.findIndex(w => w.weight_kg === availableWeights[availableWeights.length - 1]);
  let useWeightInterpolation = true;
  
  // Check if weight matches exactly (using clamped value)
  if (exactWeight !== undefined) {
    // Exact match - use only this weight, no interpolation
    w1 = exactWeight;
    w2 = exactWeight;
    w1DataIdx = weights.findIndex(w => w.weight_kg === exactWeight);
    w2DataIdx = w1DataIdx; // Same as w1
    useWeightInterpolation = false;
    if (debug) {
      debug.steps.push(`Exact weight match: ${exactWeight}kg (no weight interpolation)`);
    }
  } else {
    // Find bounding weights for interpolation
    for (let i = 0; i < availableWeights.length - 1; i++) {
      if (clampedWeight >= availableWeights[i] && clampedWeight <= availableWeights[i + 1]) {
        w1 = availableWeights[i];
        w2 = availableWeights[i + 1];
        w1DataIdx = weights.findIndex(w => w.weight_kg === w1);
        w2DataIdx = weights.findIndex(w => w.weight_kg === w2);
        break;
      }
    }
  }
  
  if (debug) {
    debug.info.weightBounds = { w1, w2, w1Idx: w1DataIdx, w2Idx: w2DataIdx };
    if (useWeightInterpolation) {
      debug.steps.push(`Weight bounds: ${w1}kg (data idx ${w1DataIdx}) to ${w2}kg (data idx ${w2DataIdx})`);
    } else {
      debug.steps.push(`Weight: ${w1}kg (data idx ${w1DataIdx}) - exact match, no interpolation`);
    }
  }
  
  // Find bounding temperatures - if exact match, use only that temperature
  let t1 = availableTemps[0];
  let t2 = availableTemps[availableTemps.length - 1];
  let t1Idx = 0;
  let t2Idx = availableTemps.length - 1;
  let useTempInterpolation = true;
  
  // Check if temperature matches exactly
  const exactTempIdx = availableTemps.findIndex(t => t === clampedTemp);
  if (exactTempIdx !== -1) {
    // Exact match - use only this temperature, no interpolation
    t1Idx = exactTempIdx;
    t2Idx = exactTempIdx;
    t1 = availableTemps[t1Idx];
    t2 = availableTemps[t1Idx]; // Same as t1
    useTempInterpolation = false;
    if (debug) {
      debug.steps.push(`Exact temperature match: ${clampedTemp}°C (no temperature interpolation)`);
    }
  } else {
    // Find bounding temperatures for interpolation
    for (let i = 0; i < availableTemps.length - 1; i++) {
      if (clampedTemp >= availableTemps[i] && clampedTemp <= availableTemps[i + 1]) {
        t1 = availableTemps[i];
        t2 = availableTemps[i + 1];
        t1Idx = i;
        t2Idx = i + 1;
        break;
      }
    }
  }
  
  if (debug) {
    debug.info.temperatureBounds = { t1, t2, t1Idx, t2Idx };
    if (useTempInterpolation) {
      debug.steps.push(`Temperature bounds: ${t1}°C (idx ${t1Idx}) to ${t2}°C (idx ${t2Idx})`);
    } else {
      debug.steps.push(`Temperature: ${t1}°C (idx ${t1Idx}) - exact match, no interpolation`);
    }
  }
  
  // Find bounding pressure altitudes - if exact match, use only that PA
  const weight1Data = weights[w1DataIdx];
  const weight2Data = weights[w2DataIdx];
  
  const pa1Data = weight1Data.rows.filter(r => r.segment === segment);
  const pa2Data = weight2Data.rows.filter(r => r.segment === segment);
  
  const availablePAs = pa1Data.map(r => r.pressure_alt_ft).sort((a, b) => a - b);
  
  let pa1 = availablePAs[0];
  let pa2 = availablePAs[availablePAs.length - 1];
  let pa1Idx = 0;
  let pa2Idx = availablePAs.length - 1;
  let usePAInterpolation = true;
  
  // Check if pressure altitude matches exactly
  const exactPAIdx = availablePAs.findIndex(pa => pa === clampedPA);
  if (exactPAIdx !== -1) {
    // Exact match - use only this PA, no interpolation
    pa1Idx = exactPAIdx;
    pa2Idx = exactPAIdx;
    pa1 = availablePAs[pa1Idx];
    pa2 = availablePAs[pa1Idx]; // Same as pa1
    usePAInterpolation = false;
    if (debug) {
      debug.steps.push(`Exact pressure altitude match: ${clampedPA}ft (no PA interpolation)`);
    }
  } else {
    // Find the correct pressure altitude bounds for interpolation
    for (let i = 0; i < availablePAs.length - 1; i++) {
      if (clampedPA >= availablePAs[i] && clampedPA <= availablePAs[i + 1]) {
        pa1 = availablePAs[i];
        pa2 = availablePAs[i + 1];
        pa1Idx = i;
        pa2Idx = i + 1;
        break;
      }
    }
  }
  
  if (debug) {
    debug.info.pressureAltBounds = { pa1, pa2, pa1Idx, pa2Idx };
    if (usePAInterpolation) {
      debug.steps.push(`Pressure altitude bounds: ${pa1}ft (idx ${pa1Idx}) to ${pa2}ft (idx ${pa2Idx})`);
    } else {
      debug.steps.push(`Pressure altitude: ${pa1}ft (idx ${pa1Idx}) - exact match, no interpolation`);
    }
  }
  
  // If all three dimensions are exact matches, return the value directly
  if (!useWeightInterpolation && !useTempInterpolation && !usePAInterpolation) {
    const weightData = weights[w1DataIdx];
    const row = weightData.rows.find(r => 
      r.segment === segment && r.pressure_alt_ft === pa1
    );
    if (row) {
      const tempKey = t1.toString();
      const value = row.distance_m[tempKey as keyof typeof row.distance_m] || 0;
      if (debug) {
        debug.steps.push(`All dimensions exact match: Weight=${w1}kg, PA=${pa1}ft, Temp=${t1}°C → ${value}m`);
      }
      return value;
    }
  }
  
  // Get the corner values needed for interpolation
  const getValue = (wDataIdx: number, paIdx: number, tIdx: number): number => {
    const weightData = weights[wDataIdx];
    const targetPA = availablePAs[paIdx];
    const row = weightData.rows.find(r => 
      r.segment === segment && r.pressure_alt_ft === targetPA
    );
    if (!row) {
      if (debug) {
        debug.steps.push(`ERROR: No row found for weight=${weights[wDataIdx].weight_kg}kg, PA=${targetPA}ft, segment=${segment}`);
      }
      return 0;
    }
    const tempKey = availableTemps[tIdx].toString();
    const value = row.distance_m[tempKey as keyof typeof row.distance_m] || 0;
    if (debug) {
      const cornerKey = `W${wDataIdx}PA${paIdx}T${tIdx}`;
      debug.info.cornerValues[cornerKey] = value;
      debug.steps.push(`Corner ${cornerKey}: Weight=${weights[wDataIdx].weight_kg}kg, PA=${targetPA}ft, Temp=${availableTemps[tIdx]}°C → ${value}m`);
    }
    return value;
  };
  
  // Build the 2x2x2 values array
  // If a dimension doesn't need interpolation, both indices are the same
  // The interpolation functions handle w1===w2, t1===t2, or pa1===pa2 correctly
  const values: number[][][] = [
    [
      [
        getValue(w1DataIdx, pa1Idx, t1Idx),
        getValue(w1DataIdx, pa1Idx, t2Idx)
      ],
      [
        getValue(w1DataIdx, pa2Idx, t1Idx),
        getValue(w1DataIdx, pa2Idx, t2Idx)
      ]
    ],
    [
      [
        getValue(w2DataIdx, pa1Idx, t1Idx),
        getValue(w2DataIdx, pa1Idx, t2Idx)
      ],
      [
        getValue(w2DataIdx, pa2Idx, t1Idx),
        getValue(w2DataIdx, pa2Idx, t2Idx)
      ]
    ]
  ];
  
  // Use trilinear interpolation - it handles exact matches correctly
  // (when w1===w2, t1===t2, or pa1===pa2, interpolation reduces appropriately)
  const result = trilinearInterpolate(
    clampedWeight, clampedPA, clampedTemp,
    w1, w2, pa1, pa2, t1, t2, values
  );
  
  if (debug) {
    const interpolationType = 
      !useWeightInterpolation && !useTempInterpolation && !usePAInterpolation ? 'Exact match (no interpolation)' :
      !useWeightInterpolation && !useTempInterpolation ? 'PA interpolation only' :
      !useWeightInterpolation && !usePAInterpolation ? 'Temperature interpolation only' :
      !useTempInterpolation && !usePAInterpolation ? 'Weight interpolation only' :
      !useWeightInterpolation ? 'Bilinear (PA + Temp)' :
      !useTempInterpolation ? 'Bilinear (Weight + PA)' :
      !usePAInterpolation ? 'Bilinear (Weight + Temp)' :
      'Trilinear (Weight + PA + Temp)';
    debug.steps.push(`${interpolationType} result: ${result.toFixed(2)}m`);
  }
  
  return result;
}

/**
 * Get rate of climb from performance table with interpolation
 * Climb speed (vy_kias) is automatically determined from the table based on pressure altitude
 * Returns both rate of climb and climb speed
 */
export function getRateOfClimbFromTable(
  weight: number,
  pressureAlt: number,
  temperature: number,
  debug?: { info: CalculationDebugInfo; steps: string[] }
): { rateOfClimb: number; climbSpeed: number } {
  const data = rateOfClimbData as RateOfClimbData;
  const weights = data.weights;
  const availableWeights = weights.map(w => w.weight_kg).sort((a, b) => a - b);
  const availableTemps = [-25, 0, 15, 25, 50];
  
  // Get all pressure altitudes from the first weight (they should be the same for all weights)
  const allPAs = weights[0].rows.map(r => r.pressure_alt_ft).sort((a, b) => a - b);
  
  const maxTableWeight = availableWeights[availableWeights.length - 1]; // Should be 580
  const minTableWeight = availableWeights[0]; // Should be 500
  const maxExtrapolatedWeight = 600; // Allow extrapolation up to 600kg
  
  // Clamp weight: allow up to 600kg for extrapolation, but not below minimum
  const clampedWeight = Math.max(minTableWeight, Math.min(maxExtrapolatedWeight, weight));
  const clampedTemp = Math.max(availableTemps[0], Math.min(availableTemps[availableTemps.length - 1], temperature));
  const clampedPA = allPAs.length > 0 
    ? Math.max(allPAs[0], Math.min(allPAs[allPAs.length - 1], pressureAlt))
    : pressureAlt;
  
  // Check if weight is in extrapolation range (580-600kg)
  const useExtrapolation = clampedWeight > maxTableWeight && clampedWeight <= maxExtrapolatedWeight;
  
  if (debug) {
    debug.info.inputWeight = weight;
    debug.info.inputPressureAlt = pressureAlt;
    debug.info.inputTemperature = temperature;
    debug.info.clampedWeight = clampedWeight;
    debug.info.clampedPressureAlt = clampedPA;
    debug.info.clampedTemperature = clampedTemp;
    debug.steps.push(`Input: Weight=${weight}kg, PA=${pressureAlt}ft, Temp=${temperature}°C`);
    debug.steps.push(`Clamped: Weight=${clampedWeight}kg, PA=${clampedPA}ft, Temp=${clampedTemp}°C`);
    if (useExtrapolation) {
      debug.steps.push(`Weight ${clampedWeight}kg is above table maximum (${maxTableWeight}kg) - using extrapolation`);
    }
  }
  
  // Find weight bounds
  let w1 = availableWeights[0];
  let w2 = availableWeights[availableWeights.length - 1];
  let w1DataIdx = 0;
  let w2DataIdx = availableWeights.length - 1;
  let useWeightInterpolation = true;
  
  const exactWeight = !useExtrapolation ? availableWeights.find(w => w === clampedWeight) : undefined;
  if (exactWeight !== undefined) {
    w1 = exactWeight;
    w2 = exactWeight;
    w1DataIdx = availableWeights.indexOf(exactWeight);
    w2DataIdx = w1DataIdx;
    useWeightInterpolation = false;
    if (debug) {
      debug.steps.push(`Exact weight match: ${exactWeight}kg (no weight interpolation)`);
    }
  } else {
    // Find bounding weights
    for (let i = 0; i < availableWeights.length - 1; i++) {
      if (clampedWeight >= availableWeights[i] && clampedWeight <= availableWeights[i + 1]) {
        w1 = availableWeights[i];
        w2 = availableWeights[i + 1];
        w1DataIdx = i;
        w2DataIdx = i + 1;
        break;
      }
    }
  }
  
  if (debug) {
    debug.info.weightBounds = { w1, w2, w1Idx: w1DataIdx, w2Idx: w2DataIdx };
    if (useWeightInterpolation) {
      debug.steps.push(`Weight bounds: ${w1}kg (idx ${w1DataIdx}) to ${w2}kg (idx ${w2DataIdx})`);
    }
  }
  
  // Find temperature bounds
  let t1 = availableTemps[0];
  let t2 = availableTemps[availableTemps.length - 1];
  let t1Idx = 0;
  let t2Idx = availableTemps.length - 1;
  let useTempInterpolation = true;
  
  const exactTemp = availableTemps.find(t => t === clampedTemp);
  if (exactTemp !== undefined) {
    t1 = exactTemp;
    t2 = exactTemp;
    t1Idx = availableTemps.indexOf(exactTemp);
    t2Idx = t1Idx;
    useTempInterpolation = false;
    if (debug) {
      debug.steps.push(`Exact temperature match: ${exactTemp}°C (no temp interpolation)`);
    }
  } else {
    for (let i = 0; i < availableTemps.length - 1; i++) {
      if (clampedTemp >= availableTemps[i] && clampedTemp <= availableTemps[i + 1]) {
        t1 = availableTemps[i];
        t2 = availableTemps[i + 1];
        t1Idx = i;
        t2Idx = i + 1;
        break;
      }
    }
  }
  
  if (debug) {
    debug.info.temperatureBounds = { t1, t2, t1Idx, t2Idx };
    if (useTempInterpolation) {
      debug.steps.push(`Temperature bounds: ${t1}°C (idx ${t1Idx}) to ${t2}°C (idx ${t2Idx})`);
    }
  }
  
  // Find pressure altitude bounds
  const weight1Data = weights[w1DataIdx];
  const weight2Data = weights[w2DataIdx];
  
  const availablePAs = allPAs;
  
  let pa1 = availablePAs[0];
  let pa2 = availablePAs[availablePAs.length - 1];
  let pa1Idx = 0;
  let pa2Idx = availablePAs.length - 1;
  let usePAInterpolation = true;
  
  const exactPAIdx = availablePAs.findIndex(pa => pa === clampedPA);
  if (exactPAIdx !== -1) {
    pa1Idx = exactPAIdx;
    pa2Idx = exactPAIdx;
    pa1 = availablePAs[pa1Idx];
    pa2 = availablePAs[pa1Idx];
    usePAInterpolation = false;
    if (debug) {
      debug.steps.push(`Exact pressure altitude match: ${clampedPA}ft (no PA interpolation)`);
    }
  } else {
    for (let i = 0; i < availablePAs.length - 1; i++) {
      if (clampedPA >= availablePAs[i] && clampedPA <= availablePAs[i + 1]) {
        pa1 = availablePAs[i];
        pa2 = availablePAs[i + 1];
        pa1Idx = i;
        pa2Idx = i + 1;
        break;
      }
    }
  }
  
  if (debug) {
    debug.info.pressureAltBounds = { pa1, pa2, pa1Idx, pa2Idx };
    if (usePAInterpolation) {
      debug.steps.push(`Pressure altitude bounds: ${pa1}ft (idx ${pa1Idx}) to ${pa2}ft (idx ${pa2Idx})`);
    }
  }
  
  // Get the corner values needed for interpolation
  const getValue = (wDataIdx: number, paIdx: number, tIdx: number): number => {
    const weightData = weights[wDataIdx];
    const targetPA = availablePAs[paIdx];
    const row = weightData.rows.find(r => r.pressure_alt_ft === targetPA);
    if (!row) {
      if (debug) {
        debug.steps.push(`ERROR: No row found for weight=${weights[wDataIdx].weight_kg}kg, PA=${targetPA}ft`);
      }
      return 0;
    }
    const tempKey = availableTemps[tIdx].toString();
    const value = row.rate_of_climb_ft_per_min[tempKey as keyof typeof row.rate_of_climb_ft_per_min] || 0;
    if (debug) {
      const cornerKey = `W${wDataIdx}PA${paIdx}T${tIdx}`;
      debug.info.cornerValues[cornerKey] = value;
      const vyKias = row.vy_kias;
      debug.steps.push(`Corner ${cornerKey}: Weight=${weights[wDataIdx].weight_kg}kg, PA=${targetPA}ft (${vyKias}kt), Temp=${availableTemps[tIdx]}°C → ${value} ft/min`);
    }
    return value;
  };
  
  // Build the 2x2x2 values array
  const values: number[][][] = [
    [
      [
        getValue(w1DataIdx, pa1Idx, t1Idx),
        getValue(w1DataIdx, pa1Idx, t2Idx)
      ],
      [
        getValue(w1DataIdx, pa2Idx, t1Idx),
        getValue(w1DataIdx, pa2Idx, t2Idx)
      ]
    ],
    [
      [
        getValue(w2DataIdx, pa1Idx, t1Idx),
        getValue(w2DataIdx, pa1Idx, t2Idx)
      ],
      [
        getValue(w2DataIdx, pa2Idx, t1Idx),
        getValue(w2DataIdx, pa2Idx, t2Idx)
      ]
    ]
  ];
  
  // Use trilinear interpolation
  const rateOfClimb = trilinearInterpolate(
    clampedWeight, clampedPA, clampedTemp,
    w1, w2, pa1, pa2, t1, t2, values
  );
  
  // Determine climb speed (vy_kias) based on pressure altitude
  // Use the climb speed from the row that matches the pressure altitude
  // If interpolating between PAs, use the speed from the closest or interpolate
  let climbSpeed: number;
  if (!usePAInterpolation) {
    // Exact match - use the speed from that row
    const weightData = weights[w1DataIdx];
    const row = weightData.rows.find(r => r.pressure_alt_ft === pa1);
    climbSpeed = row ? row.vy_kias : 66; // Default to 66 if not found
  } else {
    // Interpolating between PAs - use the speed from the lower PA (pa1)
    // This is the standard approach as climb speed typically decreases with altitude
    const weightData = weights[w1DataIdx];
    const row = weightData.rows.find(r => r.pressure_alt_ft === pa1);
    climbSpeed = row ? row.vy_kias : 66; // Default to 66 if not found
  }
  
  if (debug) {
    const interpolationType = 
      !useWeightInterpolation && !useTempInterpolation && !usePAInterpolation ? 'Exact match (no interpolation)' :
      !useWeightInterpolation && !useTempInterpolation ? 'PA interpolation only' :
      !useWeightInterpolation && !usePAInterpolation ? 'Temperature interpolation only' :
      !useTempInterpolation && !usePAInterpolation ? 'Weight interpolation only' :
      !useWeightInterpolation ? 'Bilinear (PA + Temp)' :
      !useTempInterpolation ? 'Bilinear (Weight + PA)' :
      !usePAInterpolation ? 'Bilinear (Weight + Temp)' :
      'Trilinear (Weight + PA + Temp)';
    debug.steps.push(`${interpolationType} result: ${rateOfClimb.toFixed(2)} ft/min`);
    debug.steps.push(`Climb speed (Vy): ${climbSpeed} kt`);
  }
  
  return { rateOfClimb, climbSpeed };
}

/**
 * Get cruise performance from table based on pressure altitude, temperature, and RPM
 * Returns KTAS, fuel consumption, and power percentage
 */
export function getCruisePerformanceFromTableByRpm(
  pressureAlt: number,
  temperature: number,
  rpm: number,
  debug?: { steps: string[] }
): { ktas: number; fuelConsumption: number; powerPercent: number; rpm: number } {
  const data = cruisePerformanceData as CruisePerformanceData;
  const pressureAltitudes = data.pressure_altitudes;
  
  // Determine ISA condition based on temperature
  const isaTemp = 15 - (pressureAlt / 1000) * 2;
  const tempDeviation = temperature - isaTemp;
  
  let isaCondition: 'isa_minus_30' | 'isa' | 'isa_plus_30';
  if (tempDeviation <= -20) {
    isaCondition = 'isa_minus_30';
  } else if (tempDeviation >= 20) {
    isaCondition = 'isa_plus_30';
  } else {
    isaCondition = 'isa';
  }
  
  if (debug) {
    debug.steps.push(`Pressure altitude: ${pressureAlt.toFixed(0)}ft`);
    debug.steps.push(`ISA temperature at ${pressureAlt.toFixed(0)}ft: ${isaTemp.toFixed(1)}°C`);
    debug.steps.push(`Actual temperature: ${temperature}°C (deviation: ${tempDeviation.toFixed(1)}°C)`);
    debug.steps.push(`Using ISA condition: ${isaCondition}`);
    debug.steps.push(`Looking up RPM: ${rpm}`);
  }
  
  // Find the pressure altitude in the table
  const availablePAs = pressureAltitudes.map(pa => pa.pressure_alt_ft).sort((a, b) => a - b);
  const clampedPA = Math.max(availablePAs[0], Math.min(availablePAs[availablePAs.length - 1], pressureAlt));
  
  // Find the closest pressure altitude entry
  let paData = pressureAltitudes.find(pa => pa.pressure_alt_ft === clampedPA);
  if (!paData) {
    let closestPA = availablePAs[0];
    let minDiff = Math.abs(availablePAs[0] - clampedPA);
    for (const pa of availablePAs) {
      const diff = Math.abs(pa - clampedPA);
      if (diff < minDiff) {
        minDiff = diff;
        closestPA = pa;
      }
    }
    paData = pressureAltitudes.find(pa => pa.pressure_alt_ft === closestPA);
  }
  
  if (!paData) {
    if (debug) {
      debug.steps.push(`ERROR: No pressure altitude data found for ${clampedPA}ft`);
    }
    return { ktas: 0, fuelConsumption: 0, powerPercent: 0, rpm: 0 };
  }
  
  // Find the row with the closest RPM match
  let bestMatch: CruisePerformanceRow | null = null;
  let minRpmDiff = Infinity;
  
  for (const row of paData.rows) {
    const diff = Math.abs(row.rpm - rpm);
    if (diff < minRpmDiff) {
      minRpmDiff = diff;
      bestMatch = row;
    }
  }
  
  if (!bestMatch) {
    if (debug) {
      debug.steps.push(`ERROR: No matching row found for RPM ${rpm}`);
    }
    return { ktas: 0, fuelConsumption: 0, powerPercent: 0, rpm: 0 };
  }
  
  const performance = bestMatch[isaCondition];
  
  if (debug) {
    debug.steps.push(`Found match: RPM ${bestMatch.rpm} (target: ${rpm}, diff: ${minRpmDiff})`);
    debug.steps.push(`KTAS: ${performance.ktas}kt`);
    debug.steps.push(`Fuel consumption: ${performance.fuel_flow_lph} LPH`);
    debug.steps.push(`Power: ${performance.power_percent}%`);
  }
  
  return {
    ktas: performance.ktas,
    fuelConsumption: performance.fuel_flow_lph,
    powerPercent: performance.power_percent,
    rpm: bestMatch.rpm,
  };
}

/**
 * Get cruise performance from table based on pressure altitude, temperature, and KTAS
 * Returns KTAS, fuel consumption, and power percentage
 */
export function getCruisePerformanceFromTable(
  pressureAlt: number,
  temperature: number,
  ktas: number,
  debug?: { steps: string[] }
): { ktas: number; fuelConsumption: number; powerPercent: number; rpm?: number } {
  const data = cruisePerformanceData as CruisePerformanceData;
  const pressureAltitudes = data.pressure_altitudes;
  
  // Determine ISA condition based on temperature
  // ISA temperature at pressure altitude: ISA = 15 - (PA/1000 * 2)
  const isaTemp = 15 - (pressureAlt / 1000) * 2;
  const tempDeviation = temperature - isaTemp;
  
  let isaCondition: 'isa_minus_30' | 'isa' | 'isa_plus_30';
  if (tempDeviation <= -20) {
    isaCondition = 'isa_minus_30';
  } else if (tempDeviation >= 20) {
    isaCondition = 'isa_plus_30';
  } else {
    isaCondition = 'isa';
  }
  
  if (debug) {
    debug.steps.push(`Pressure altitude: ${pressureAlt.toFixed(0)}ft`);
    debug.steps.push(`ISA temperature at ${pressureAlt.toFixed(0)}ft: ${isaTemp.toFixed(1)}°C`);
    debug.steps.push(`Actual temperature: ${temperature}°C (deviation: ${tempDeviation.toFixed(1)}°C)`);
    debug.steps.push(`Using ISA condition: ${isaCondition}`);
  }
  
  // Find the pressure altitude in the table
  const availablePAs = pressureAltitudes.map(pa => pa.pressure_alt_ft).sort((a, b) => a - b);
  const clampedPA = Math.max(availablePAs[0], Math.min(availablePAs[availablePAs.length - 1], pressureAlt));
  
  // Find the closest pressure altitude entry
  let paData = pressureAltitudes.find(pa => pa.pressure_alt_ft === clampedPA);
  if (!paData) {
    // Find the closest one
    let closestPA = availablePAs[0];
    let minDiff = Math.abs(availablePAs[0] - clampedPA);
    for (const pa of availablePAs) {
      const diff = Math.abs(pa - clampedPA);
      if (diff < minDiff) {
        minDiff = diff;
        closestPA = pa;
      }
    }
    paData = pressureAltitudes.find(pa => pa.pressure_alt_ft === closestPA);
  }
  
  if (!paData) {
    if (debug) {
      debug.steps.push(`ERROR: No pressure altitude data found for ${clampedPA}ft`);
    }
    return { ktas: 0, fuelConsumption: 0, powerPercent: 0 };
  }
  
  // Find the row with the closest KTAS match
  let bestMatch: CruisePerformanceRow | null = null;
  let bestRpm: number | undefined;
  let minKtasDiff = Infinity;
  
  for (const row of paData.rows) {
    const rowKtas = row[isaCondition].ktas;
    const diff = Math.abs(rowKtas - ktas);
    if (diff < minKtasDiff) {
      minKtasDiff = diff;
      bestMatch = row;
      bestRpm = row.rpm;
    }
  }
  
  if (!bestMatch) {
    if (debug) {
      debug.steps.push(`ERROR: No matching row found for KTAS ${ktas}`);
    }
    return { ktas: 0, fuelConsumption: 0, powerPercent: 0 };
  }
  
  const performance = bestMatch[isaCondition];
  
  if (debug) {
    debug.steps.push(`Found match: RPM ${bestRpm}, KTAS ${performance.ktas}kt (target: ${ktas}kt, diff: ${minKtasDiff.toFixed(1)}kt)`);
    debug.steps.push(`Fuel consumption: ${performance.fuel_flow_lph} LPH`);
    debug.steps.push(`Power: ${performance.power_percent}%`);
  }
  
  return {
    ktas: performance.ktas,
    fuelConsumption: performance.fuel_flow_lph,
    powerPercent: performance.power_percent,
    rpm: bestRpm,
  };
}


import takeoffData from '../data/takeoff_distance.json';
import landingData from '../data/landing_distance.json';
import type {
  CalculationType,
  SegmentType,
  CalculationDebugInfo,
  PerformanceData,
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


export type RunwaySurface = 'grass' | 'concrete' | 'asphalt';
export type CalculationType = 'takeoff' | 'landing';
export type SegmentType = 'ground_roll' | 'over_50ft';

export interface CalculationInputs {
  weight: number;
  runwaySurface: RunwaySurface;
  windDirection: number;
  windSpeed: number;
  runwaySlope: number;
  temperature: number;
  runwayElevation: number;
  qnh: number;
  runwayDirection: number;
}

export interface WindComponents {
  headwind: number; // in knots
  tailwind: number; // in knots
  crosswind: number; // in knots
}

export interface CorrectionInfo {
  wind: {
    type: 'headwind' | 'tailwind' | 'none';
    value: number; // in knots
    correction: number; // in meters
  };
  surface: {
    type: 'grass' | 'concrete' | 'asphalt';
    correctionPercent: number; // percentage change
    correctionMeters: number; // actual correction in meters
  };
  slope: {
    value: number; // percentage
    correctionPercent: number; // percentage change
    correctionMeters: number; // actual correction in meters
  };
}

export interface CalculationDebugInfo {
  inputWeight: number;
  inputPressureAlt: number;
  inputTemperature: number;
  clampedWeight: number;
  clampedPressureAlt: number;
  clampedTemperature: number;
  weightBounds: { w1: number; w2: number; w1Idx: number; w2Idx: number };
  pressureAltBounds: { pa1: number; pa2: number; pa1Idx: number; pa2Idx: number };
  temperatureBounds: { t1: number; t2: number; t1Idx: number; t2Idx: number };
  cornerValues: {
    [key: string]: number;
  };
  interpolationSteps: string[];
  corrections?: CorrectionInfo;
}

export interface CalculationResults {
  pressureAltitude: number;
  windComponents: WindComponents;
  groundRoll: number;
  over50ft: number;
  baseGroundRoll: number;
  baseOver50ft: number;
  debug?: {
    groundRoll: CalculationDebugInfo;
    over50ft: CalculationDebugInfo;
  };
}

// Internal types for performance data
export interface PerformanceDataRow {
  pressure_alt_ft: number;
  pressure_alt_label?: string;
  segment: SegmentType;
  distance_m: {
    [key: string]: number;
  };
}

export interface PerformanceDataWeight {
  weight_kg: number;
  rows: PerformanceDataRow[];
}

export interface PerformanceData {
  weights: PerformanceDataWeight[];
  source?: {
    corrections?: {
      headwind?: string;
      tailwind?: string;
      paved_runway?: string;
      runway_slope?: string;
    };
  };
}


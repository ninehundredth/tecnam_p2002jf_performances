export type RunwaySurface = 'grass' | 'concrete' | 'asphalt';
export type CalculationType = 'takeoff' | 'landing';
export type SegmentType = 'ground_roll' | 'over_50ft';
export type ClimbSpeed = 64 | 65 | 66;

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

// Rate of climb types
export interface RateOfClimbInputs {
  weight: number;
  elevation: number; // Runway elevation in feet
  temperature: number;
  qnh: number;
}

export interface RateOfClimbResults {
  pressureAltitude: number;
  rateOfClimb: number; // ft/min
  baseRateOfClimb: number; // ft/min (before any corrections, if needed)
  climbSpeed: number; // kias (best rate of climb speed)
  debug?: CalculationDebugInfo;
}

// Cruise performance types
export type CruiseInputMode = 'kias' | 'ktas' | 'rpm';

export interface CruiseInputs {
  elevation: number; // Cruise altitude in feet
  temperature: number; // OAT at cruise altitude
  qnh: number;
  inputMode: CruiseInputMode;
  kias?: number; // Indicated airspeed in knots (if inputMode is 'kias')
  ktas?: number; // True airspeed in knots (if inputMode is 'ktas')
  rpm?: number; // Engine RPM (if inputMode is 'rpm')
}

export interface CruiseResults {
  pressureAltitude: number;
  densityAltitude: number;
  ktas: number; // True airspeed from table
  kias: number; // Indicated airspeed (converted from KTAS)
  fuelConsumption: number; // LPH (liters per hour)
  powerPercent: number; // Engine power percentage
  rpm?: number; // RPM setting (if found)
  debug?: {
    pressureAltitude: number;
    densityAltitude: number;
    densityRatio: number;
    isaCondition: string;
    conversionSteps: string[];
  };
}

// Internal types for cruise performance data
export interface CruisePerformanceRow {
  rpm: number;
  isa_minus_30: { power_percent: number; ktas: number; fuel_flow_lph: number };
  isa: { power_percent: number; ktas: number; fuel_flow_lph: number };
  isa_plus_30: { power_percent: number; ktas: number; fuel_flow_lph: number };
}

export interface CruisePerformanceData {
  table: string;
  source: {
    aircraft: string;
    section: string;
    subsection?: string;
    weight_kg: number;
    temperatures: string[];
  };
  pressure_altitudes: Array<{
    pressure_alt_ft: number;
    rows: CruisePerformanceRow[];
  }>;
}

// Internal types for rate of climb data
export interface RateOfClimbDataRow {
  pressure_alt_ft: number;
  pressure_alt_label?: string;
  vy_kias: number;
  rate_of_climb_ft_per_min: {
    [key: string]: number;
  };
}

export interface RateOfClimbDataWeight {
  weight_kg: number;
  rows: RateOfClimbDataRow[];
}

export interface RateOfClimbData {
  weights: RateOfClimbDataWeight[];
  source?: {
    [key: string]: any;
  };
}


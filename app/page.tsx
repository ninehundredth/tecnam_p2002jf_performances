'use client';

import { useState } from 'react';
import {
  calculateTakeoffPerformance,
  calculateLandingPerformance,
  calculateTakeoffRateOfClimb,
  calculateCruisePerformance,
  type CalculationInputs,
  type RunwaySurface,
  type CalculationType,
  type ClimbSpeed,
  type RateOfClimbInputs,
  type RateOfClimbResults,
  type CruiseInputs,
  type CruiseResults,
} from '../utils/calculations';
import { getAssetPath } from '../utils/paths';

interface InputState {
  weight: string;
  runwaySurface: RunwaySurface;
  windDirection: string;
  windSpeed: string;
  runwaySlope: string;
  temperature: string;
  runwayElevation: string;
  qnh: string;
  runwayDirection: string;
}

interface FieldValidation {
  weight: { min: number; max: number };
  windDirection: { min: number; max: number };
  windSpeed: { min: number; max: number };
  runwaySlope: { min: number; max: number };
  temperature: { min: number; max: number };
  runwayElevation: { min: number; max: number };
  qnh: { min: number; max: number };
  runwayDirection: { min: number; max: number };
}

const validation: FieldValidation = {
  weight: { min: 380, max: 600 },
  windDirection: { min: 0, max: 360 },
  windSpeed: { min: 0, max: 100 },
  runwaySlope: { min: -15, max: 15 },
  temperature: { min: -30, max: 60 },
  runwayElevation: { min: -500, max: 15000 },
  qnh: { min: 700, max: 1200 },
  runwayDirection: { min: 0, max: 360 },
};

type CalculationMode = CalculationType | 'rateOfClimb' | 'cruise';

export default function Home() {
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('takeoff');
  const [inputs, setInputs] = useState<InputState>({
    weight: '550',
    runwaySurface: 'grass',
    windDirection: '0',
    windSpeed: '0',
    runwaySlope: '0',
    temperature: '15',
    runwayElevation: '0',
    qnh: '1013',
    runwayDirection: '0',
  });

  // Rate of climb specific inputs
  const [rateOfClimbInputs, setRateOfClimbInputs] = useState({
    weight: '550',
    elevation: '0',
    temperature: '15',
    qnh: '1013',
  });

  // Cruise specific inputs
  const [cruiseInputs, setCruiseInputs] = useState({
    inputMode: 'kias' as 'kias' | 'ktas' | 'rpm',
    elevation: '2000',
    temperature: '15',
    qnh: '1013',
    kias: '90',
    ktas: '100',
    rpm: '2300',
  });

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [touchedRateOfClimbFields, setTouchedRateOfClimbFields] = useState<Set<string>>(new Set());
  const [touchedCruiseFields, setTouchedCruiseFields] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ReturnType<typeof calculateTakeoffPerformance> | null>(null);
  const [rateOfClimbResults, setRateOfClimbResults] = useState<RateOfClimbResults | null>(null);
  const [cruiseResults, setCruiseResults] = useState<CruiseResults | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Handle mode change and clear results
  const handleModeChange = (mode: CalculationMode) => {
    setCalculationMode(mode);
    setResults(null);
    setRateOfClimbResults(null);
    setCruiseResults(null);
    setShowDebug(false);
  };

  const validateField = (field: keyof InputState, value: string): boolean => {
    if (field === 'runwaySurface') return true; // Select field is always valid
    
    if (value === '' || value === null || value === undefined) {
      return false;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return false;
    }

    const fieldValidation = validation[field as keyof FieldValidation];
    if (fieldValidation) {
      return numValue >= fieldValidation.min && numValue <= fieldValidation.max;
    }

    return true;
  };

  const isFieldValid = (field: keyof InputState): boolean => {
    return validateField(field, inputs[field]);
  };

  const isFormValid = (): boolean => {
    return Object.keys(inputs).every(key => isFieldValid(key as keyof InputState));
  };

  const handleInputChange = (field: keyof InputState, value: string) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleInputBlur = (field: keyof InputState) => {
    setTouchedFields((prev) => new Set(prev).add(field));
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const isRateOfClimbFormValid = (): boolean => {
    const weight = parseFloat(rateOfClimbInputs.weight);
    const elevation = parseFloat(rateOfClimbInputs.elevation);
    const temperature = parseFloat(rateOfClimbInputs.temperature);
    const qnh = parseFloat(rateOfClimbInputs.qnh);
    
    return (
      !isNaN(weight) && weight >= 380 && weight <= 600 &&
      !isNaN(elevation) && elevation >= -100 && elevation <= 15000 &&
      !isNaN(temperature) && temperature >= -30 && temperature <= 50 &&
      !isNaN(qnh) && qnh >= 700 && qnh <= 1200
    );
  };

  const isCruiseFormValid = (): boolean => {
    const elevation = parseFloat(cruiseInputs.elevation);
    const temperature = parseFloat(cruiseInputs.temperature);
    const qnh = parseFloat(cruiseInputs.qnh);
    const kias = parseFloat(cruiseInputs.kias);
    const ktas = parseFloat(cruiseInputs.ktas);
    const rpm = parseFloat(cruiseInputs.rpm);
    
    const baseValid = (
      !isNaN(elevation) && elevation >= -100 && elevation <= 15000 &&
      !isNaN(temperature) && temperature >= -30 && temperature <= 60 &&
      !isNaN(qnh) && qnh >= 700 && qnh <= 1200
    );
    
    if (cruiseInputs.inputMode === 'kias') {
      return baseValid && !isNaN(kias) && kias >= 50 && kias <= 150;
    } else if (cruiseInputs.inputMode === 'ktas') {
      return baseValid && !isNaN(ktas) && ktas >= 50 && ktas <= 150;
    } else {
      return baseValid && !isNaN(rpm) && rpm >= 2000 && rpm <= 2400;
    }
  };

  const handleCalculate = () => {
    if (calculationMode === 'rateOfClimb') {
      if (!isRateOfClimbFormValid()) {
        return;
      }

      try {
        const rocInputs: RateOfClimbInputs = {
          weight: parseFloat(rateOfClimbInputs.weight),
          elevation: parseFloat(rateOfClimbInputs.elevation),
          temperature: parseFloat(rateOfClimbInputs.temperature),
          qnh: parseFloat(rateOfClimbInputs.qnh),
        };
        
        const calculated = calculateTakeoffRateOfClimb(rocInputs, true);
        setRateOfClimbResults(calculated);
        setResults(null);
        setCruiseResults(null);
      } catch (error) {
        console.error('Calculation error:', error);
        alert('Error calculating rate of climb. Please check your inputs.');
      }
    } else if (calculationMode === 'cruise') {
      if (!isCruiseFormValid()) {
        return;
      }

      try {
        const cruiseInputsData: CruiseInputs = {
          elevation: parseFloat(cruiseInputs.elevation),
          temperature: parseFloat(cruiseInputs.temperature),
          qnh: parseFloat(cruiseInputs.qnh),
          inputMode: cruiseInputs.inputMode,
          kias: cruiseInputs.inputMode === 'kias' ? parseFloat(cruiseInputs.kias) : undefined,
          ktas: cruiseInputs.inputMode === 'ktas' ? parseFloat(cruiseInputs.ktas) : undefined,
          rpm: cruiseInputs.inputMode === 'rpm' ? parseFloat(cruiseInputs.rpm) : undefined,
        };
        
        const calculated = calculateCruisePerformance(cruiseInputsData, true);
        setCruiseResults(calculated);
        setResults(null);
        setRateOfClimbResults(null);
      } catch (error) {
        console.error('Calculation error:', error);
        alert('Error calculating cruise performance. Please check your inputs.');
      }
    } else {
      if (!isFormValid()) {
        return;
      }

      try {
        const calculationInputs: CalculationInputs = {
          weight: parseFloat(inputs.weight),
          runwaySurface: inputs.runwaySurface,
          windDirection: parseFloat(inputs.windDirection),
          windSpeed: parseFloat(inputs.windSpeed),
          runwaySlope: parseFloat(inputs.runwaySlope),
          temperature: parseFloat(inputs.temperature),
          runwayElevation: parseFloat(inputs.runwayElevation),
          qnh: parseFloat(inputs.qnh),
          runwayDirection: parseFloat(inputs.runwayDirection),
        };
        
        const calculated = calculationMode === 'takeoff'
          ? calculateTakeoffPerformance(calculationInputs, true)
          : calculateLandingPerformance(calculationInputs, true);
        setResults(calculated);
        setRateOfClimbResults(null);
        setCruiseResults(null);
      } catch (error) {
        console.error('Calculation error:', error);
        alert(`Error calculating ${calculationMode} performance. Please check your inputs.`);
      }
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Tecnam P2002JF</h1>
        <p>Performance Calculator</p>
        {/* Web version - show buttons in header on larger screens */}
        <div className="mode-selector-container">
          <button
            onClick={() => handleModeChange('takeoff')}
            className={`mode-button ${calculationMode === 'takeoff' ? 'mode-button-active' : 'mode-button-inactive'}`}
          >
            <img src={getAssetPath('/takeoff.svg')} alt="Takeoff" className="mode-button-icon" />
            <span>Takeoff</span>
          </button>
          <button
            onClick={() => handleModeChange('landing')}
            className={`mode-button ${calculationMode === 'landing' ? 'mode-button-active' : 'mode-button-inactive'}`}
          >
            <img src={getAssetPath('/landing.svg')} alt="Landing" className="mode-button-icon" />
            <span>Landing</span>
          </button>
          <button
            onClick={() => handleModeChange('rateOfClimb')}
            className={`mode-button ${calculationMode === 'rateOfClimb' ? 'mode-button-active' : 'mode-button-inactive'}`}
          >
            <img src={getAssetPath('/climb.svg')} alt="Rate of Climb" className="mode-button-icon" />
            <span>Rate of Climb</span>
          </button>
          <button
            onClick={() => handleModeChange('cruise')}
            className={`mode-button ${calculationMode === 'cruise' ? 'mode-button-active' : 'mode-button-inactive'}`}
          >
            <img src={getAssetPath('/cruise.svg')} alt="Cruise" className="mode-button-icon" />
            <span>Cruise</span>
          </button>
        </div>
      </div>

      <div className="content">
        {calculationMode === 'rateOfClimb' ? (
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="roc-weight">Aircraft Weight (kg)</label>
              <input
                id="roc-weight"
                type="number"
                inputMode="decimal"
                min={380}
                max={600}
                step="0.1"
                value={rateOfClimbInputs.weight}
                onChange={(e) => setRateOfClimbInputs(prev => ({ ...prev, weight: e.target.value }))}
                onBlur={() => setTouchedRateOfClimbFields(prev => new Set(prev).add('weight'))}
                onFocus={(e) => e.target.select()}
                className={touchedRateOfClimbFields.has('weight') && (isNaN(parseFloat(rateOfClimbInputs.weight)) || parseFloat(rateOfClimbInputs.weight) < 380 || parseFloat(rateOfClimbInputs.weight) > 600) ? 'invalid' : ''}
              />
              {touchedRateOfClimbFields.has('weight') && (isNaN(parseFloat(rateOfClimbInputs.weight)) || parseFloat(rateOfClimbInputs.weight) < 380 || parseFloat(rateOfClimbInputs.weight) > 600) && (
                <span className="error-message">
                  Must be between 380 and 600 kg
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="roc-elevation">Elevation (ft)</label>
              <input
                id="roc-elevation"
                type="number"
                inputMode="numeric"
                min={-100}
                max={15000}
                step="1"
                value={rateOfClimbInputs.elevation}
                onChange={(e) => setRateOfClimbInputs(prev => ({ ...prev, elevation: e.target.value }))}
                onBlur={() => setTouchedRateOfClimbFields(prev => new Set(prev).add('elevation'))}
                onFocus={(e) => e.target.select()}
                className={touchedRateOfClimbFields.has('elevation') && (isNaN(parseFloat(rateOfClimbInputs.elevation)) || parseFloat(rateOfClimbInputs.elevation) < -100 || parseFloat(rateOfClimbInputs.elevation) > 15000) ? 'invalid' : ''}
              />
              {touchedRateOfClimbFields.has('elevation') && (isNaN(parseFloat(rateOfClimbInputs.elevation)) || parseFloat(rateOfClimbInputs.elevation) < -100 || parseFloat(rateOfClimbInputs.elevation) > 15000) && (
                <span className="error-message">
                  Must be between -100 and 15000 ft
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="roc-temperature">Temperature (°C)</label>
              <input
                id="roc-temperature"
                type="number"
                inputMode="decimal"
                min={-30}
                max={50}
                step="0.1"
                value={rateOfClimbInputs.temperature}
                onChange={(e) => setRateOfClimbInputs(prev => ({ ...prev, temperature: e.target.value }))}
                onBlur={() => setTouchedRateOfClimbFields(prev => new Set(prev).add('temperature'))}
                onFocus={(e) => e.target.select()}
                className={touchedRateOfClimbFields.has('temperature') && (isNaN(parseFloat(rateOfClimbInputs.temperature)) || parseFloat(rateOfClimbInputs.temperature) < -30 || parseFloat(rateOfClimbInputs.temperature) > 50) ? 'invalid' : ''}
              />
              {touchedRateOfClimbFields.has('temperature') && (isNaN(parseFloat(rateOfClimbInputs.temperature)) || parseFloat(rateOfClimbInputs.temperature) < -30 || parseFloat(rateOfClimbInputs.temperature) > 50) && (
                <span className="error-message">
                  Must be between -30 and 50°C
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="roc-qnh">QNH (hPa)</label>
              <input
                id="roc-qnh"
                type="number"
                inputMode="numeric"
                min={700}
                max={1200}
                step="1"
                value={rateOfClimbInputs.qnh}
                onChange={(e) => setRateOfClimbInputs(prev => ({ ...prev, qnh: e.target.value }))}
                onBlur={() => setTouchedRateOfClimbFields(prev => new Set(prev).add('qnh'))}
                onFocus={(e) => e.target.select()}
                className={touchedRateOfClimbFields.has('qnh') && (isNaN(parseFloat(rateOfClimbInputs.qnh)) || parseFloat(rateOfClimbInputs.qnh) < 700 || parseFloat(rateOfClimbInputs.qnh) > 1200) ? 'invalid' : ''}
              />
              {touchedRateOfClimbFields.has('qnh') && (isNaN(parseFloat(rateOfClimbInputs.qnh)) || parseFloat(rateOfClimbInputs.qnh) < 700 || parseFloat(rateOfClimbInputs.qnh) > 1200) && (
                <span className="error-message">
                  Must be between 700 and 1200 hPa
                </span>
              )}
            </div>
          </div>
        ) : calculationMode === 'cruise' ? (
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="cruise-inputMode">Input Mode</label>
              <select
                id="cruise-inputMode"
                value={cruiseInputs.inputMode}
                onChange={(e) => setCruiseInputs(prev => ({ ...prev, inputMode: e.target.value as 'kias' | 'ktas' | 'rpm' }))}
              >
                <option value="kias">KIAS (Indicated Airspeed)</option>
                <option value="ktas">KTAS (True Airspeed)</option>
                <option value="rpm">RPM (Propeller RPM)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="cruise-elevation">Cruise Altitude (ft)</label>
              <input
                id="cruise-elevation"
                type="number"
                inputMode="numeric"
                min={-100}
                max={15000}
                step="1"
                value={cruiseInputs.elevation}
                onChange={(e) => setCruiseInputs(prev => ({ ...prev, elevation: e.target.value }))}
                onBlur={() => setTouchedCruiseFields(prev => new Set(prev).add('elevation'))}
                onFocus={(e) => e.target.select()}
                className={touchedCruiseFields.has('elevation') && (isNaN(parseFloat(cruiseInputs.elevation)) || parseFloat(cruiseInputs.elevation) < -100 || parseFloat(cruiseInputs.elevation) > 15000) ? 'invalid' : ''}
              />
              {touchedCruiseFields.has('elevation') && (isNaN(parseFloat(cruiseInputs.elevation)) || parseFloat(cruiseInputs.elevation) < -100 || parseFloat(cruiseInputs.elevation) > 15000) && (
                <span className="error-message">
                  Must be between -100 and 15000 ft
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="cruise-temperature">Temperature (°C)</label>
              <input
                id="cruise-temperature"
                type="number"
                inputMode="decimal"
                min={-30}
                max={60}
                step="0.1"
                value={cruiseInputs.temperature}
                onChange={(e) => setCruiseInputs(prev => ({ ...prev, temperature: e.target.value }))}
                onBlur={() => setTouchedCruiseFields(prev => new Set(prev).add('temperature'))}
                onFocus={(e) => e.target.select()}
                className={touchedCruiseFields.has('temperature') && (isNaN(parseFloat(cruiseInputs.temperature)) || parseFloat(cruiseInputs.temperature) < -30 || parseFloat(cruiseInputs.temperature) > 60) ? 'invalid' : ''}
              />
              {touchedCruiseFields.has('temperature') && (isNaN(parseFloat(cruiseInputs.temperature)) || parseFloat(cruiseInputs.temperature) < -30 || parseFloat(cruiseInputs.temperature) > 60) && (
                <span className="error-message">
                  Must be between -30 and 60°C
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="cruise-qnh">QNH (hPa)</label>
              <input
                id="cruise-qnh"
                type="number"
                inputMode="numeric"
                min={700}
                max={1200}
                step="1"
                value={cruiseInputs.qnh}
                onChange={(e) => setCruiseInputs(prev => ({ ...prev, qnh: e.target.value }))}
                onBlur={() => setTouchedCruiseFields(prev => new Set(prev).add('qnh'))}
                onFocus={(e) => e.target.select()}
                className={touchedCruiseFields.has('qnh') && (isNaN(parseFloat(cruiseInputs.qnh)) || parseFloat(cruiseInputs.qnh) < 700 || parseFloat(cruiseInputs.qnh) > 1200) ? 'invalid' : ''}
              />
              {touchedCruiseFields.has('qnh') && (isNaN(parseFloat(cruiseInputs.qnh)) || parseFloat(cruiseInputs.qnh) < 700 || parseFloat(cruiseInputs.qnh) > 1200) && (
                <span className="error-message">
                  Must be between 700 and 1200 hPa
                </span>
              )}
            </div>

            {cruiseInputs.inputMode === 'kias' && (
              <div className="form-group">
                <label htmlFor="cruise-kias">KIAS (Indicated Airspeed)</label>
                <input
                  id="cruise-kias"
                  type="number"
                  inputMode="decimal"
                  min={50}
                  max={150}
                  step="0.1"
                  value={cruiseInputs.kias}
                  onChange={(e) => setCruiseInputs(prev => ({ ...prev, kias: e.target.value }))}
                  onBlur={() => setTouchedCruiseFields(prev => new Set(prev).add('kias'))}
                  onFocus={(e) => e.target.select()}
                  className={touchedCruiseFields.has('kias') && (isNaN(parseFloat(cruiseInputs.kias)) || parseFloat(cruiseInputs.kias) < 50 || parseFloat(cruiseInputs.kias) > 150) ? 'invalid' : ''}
                />
                {touchedCruiseFields.has('kias') && (isNaN(parseFloat(cruiseInputs.kias)) || parseFloat(cruiseInputs.kias) < 50 || parseFloat(cruiseInputs.kias) > 150) && (
                  <span className="error-message">
                    Must be between 50 and 150 knots
                  </span>
                )}
              </div>
            )}

            {cruiseInputs.inputMode === 'ktas' && (
              <div className="form-group">
                <label htmlFor="cruise-ktas">KTAS (True Airspeed)</label>
                <input
                  id="cruise-ktas"
                  type="number"
                  inputMode="decimal"
                  min={50}
                  max={150}
                  step="0.1"
                  value={cruiseInputs.ktas}
                  onChange={(e) => setCruiseInputs(prev => ({ ...prev, ktas: e.target.value }))}
                  onBlur={() => setTouchedCruiseFields(prev => new Set(prev).add('ktas'))}
                  onFocus={(e) => e.target.select()}
                  className={touchedCruiseFields.has('ktas') && (isNaN(parseFloat(cruiseInputs.ktas)) || parseFloat(cruiseInputs.ktas) < 50 || parseFloat(cruiseInputs.ktas) > 150) ? 'invalid' : ''}
                />
                {touchedCruiseFields.has('ktas') && (isNaN(parseFloat(cruiseInputs.ktas)) || parseFloat(cruiseInputs.ktas) < 50 || parseFloat(cruiseInputs.ktas) > 150) && (
                  <span className="error-message">
                    Must be between 50 and 150 knots
                  </span>
                )}
              </div>
            )}

            {cruiseInputs.inputMode === 'rpm' && (
              <div className="form-group">
                <label htmlFor="cruise-rpm">RPM (Propeller RPM)</label>
                <input
                  id="cruise-rpm"
                  type="number"
                  inputMode="numeric"
                  min={2000}
                  max={2400}
                  step="1"
                  value={cruiseInputs.rpm}
                  onChange={(e) => setCruiseInputs(prev => ({ ...prev, rpm: e.target.value }))}
                  onBlur={() => setTouchedCruiseFields(prev => new Set(prev).add('rpm'))}
                  onFocus={(e) => e.target.select()}
                  className={touchedCruiseFields.has('rpm') && (isNaN(parseFloat(cruiseInputs.rpm)) || parseFloat(cruiseInputs.rpm) < 2000 || parseFloat(cruiseInputs.rpm) > 2400) ? 'invalid' : ''}
                />
                {touchedCruiseFields.has('rpm') && (isNaN(parseFloat(cruiseInputs.rpm)) || parseFloat(cruiseInputs.rpm) < 2000 || parseFloat(cruiseInputs.rpm) > 2400) && (
                  <span className="error-message">
                    Must be between 2000 and 2400 RPM
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="weight">Aircraft Weight (kg)</label>
            <input
              id="weight"
              type="number"
              inputMode="decimal"
              min={validation.weight.min}
              max={validation.weight.max}
              step="0.1"
              value={inputs.weight}
              onChange={(e) => handleInputChange('weight', e.target.value)}
              onBlur={() => handleInputBlur('weight')}
              onFocus={handleInputFocus}
              className={touchedFields.has('weight') && !isFieldValid('weight') ? 'invalid' : ''}
            />
            {touchedFields.has('weight') && !isFieldValid('weight') && (
              <span className="error-message">
                Must be between {validation.weight.min} and {validation.weight.max} kg
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="runwaySurface">Runway Surface</label>
            <select
              id="runwaySurface"
              value={inputs.runwaySurface}
              onChange={(e) => handleInputChange('runwaySurface', e.target.value)}
            >
              <option value="grass">Grass</option>
              <option value="concrete">Concrete</option>
              <option value="asphalt">Asphalt</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="windDirection">Wind Direction (magnetic, degrees)</label>
            <input
              id="windDirection"
              type="number"
              inputMode="numeric"
              min={validation.windDirection.min}
              max={validation.windDirection.max}
              step="1"
              value={inputs.windDirection}
              onChange={(e) => handleInputChange('windDirection', e.target.value)}
              onBlur={() => handleInputBlur('windDirection')}
              onFocus={handleInputFocus}
              className={touchedFields.has('windDirection') && !isFieldValid('windDirection') ? 'invalid' : ''}
            />
            {touchedFields.has('windDirection') && !isFieldValid('windDirection') && (
              <span className="error-message">
                Must be between {validation.windDirection.min} and {validation.windDirection.max} degrees
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="windSpeed">Wind Speed (knots)</label>
            <input
              id="windSpeed"
              type="number"
              inputMode="decimal"
              min={validation.windSpeed.min}
              max={validation.windSpeed.max}
              step="0.1"
              value={inputs.windSpeed}
              onChange={(e) => handleInputChange('windSpeed', e.target.value)}
              onBlur={() => handleInputBlur('windSpeed')}
              onFocus={handleInputFocus}
              className={touchedFields.has('windSpeed') && !isFieldValid('windSpeed') ? 'invalid' : ''}
            />
            {touchedFields.has('windSpeed') && !isFieldValid('windSpeed') && (
              <span className="error-message">
                Must be between {validation.windSpeed.min} and {validation.windSpeed.max} knots
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="runwaySlope">Runway Slope (%)</label>
            <input
              id="runwaySlope"
              type="number"
              inputMode="decimal"
              min={validation.runwaySlope.min}
              max={validation.runwaySlope.max}
              step="0.1"
              value={inputs.runwaySlope}
              onChange={(e) => handleInputChange('runwaySlope', e.target.value)}
              onBlur={() => handleInputBlur('runwaySlope')}
              onFocus={handleInputFocus}
              placeholder="Positive = uphill"
              className={touchedFields.has('runwaySlope') && !isFieldValid('runwaySlope') ? 'invalid' : ''}
            />
            {touchedFields.has('runwaySlope') && !isFieldValid('runwaySlope') && (
              <span className="error-message">
                Must be between {validation.runwaySlope.min} and {validation.runwaySlope.max}%
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="temperature">Temperature (°C)</label>
            <input
              id="temperature"
              type="number"
              inputMode="decimal"
              min={validation.temperature.min}
              max={validation.temperature.max}
              step="0.1"
              value={inputs.temperature}
              onChange={(e) => handleInputChange('temperature', e.target.value)}
              onBlur={() => handleInputBlur('temperature')}
              onFocus={handleInputFocus}
              className={touchedFields.has('temperature') && !isFieldValid('temperature') ? 'invalid' : ''}
            />
            {touchedFields.has('temperature') && !isFieldValid('temperature') && (
              <span className="error-message">
                Must be between {validation.temperature.min} and {validation.temperature.max}°C
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="runwayElevation">Runway Elevation AMSL (ft)</label>
            <input
              id="runwayElevation"
              type="number"
              inputMode="numeric"
              min={validation.runwayElevation.min}
              max={validation.runwayElevation.max}
              step="1"
              value={inputs.runwayElevation}
              onChange={(e) => handleInputChange('runwayElevation', e.target.value)}
              onBlur={() => handleInputBlur('runwayElevation')}
              onFocus={handleInputFocus}
              className={touchedFields.has('runwayElevation') && !isFieldValid('runwayElevation') ? 'invalid' : ''}
            />
            {touchedFields.has('runwayElevation') && !isFieldValid('runwayElevation') && (
              <span className="error-message">
                Must be between {validation.runwayElevation.min} and {validation.runwayElevation.max} ft
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="qnh">QNH (hPa)</label>
            <input
              id="qnh"
              type="number"
              inputMode="numeric"
              min={validation.qnh.min}
              max={validation.qnh.max}
              step="1"
              value={inputs.qnh}
              onChange={(e) => handleInputChange('qnh', e.target.value)}
              onBlur={() => handleInputBlur('qnh')}
              onFocus={handleInputFocus}
              className={touchedFields.has('qnh') && !isFieldValid('qnh') ? 'invalid' : ''}
            />
            {touchedFields.has('qnh') && !isFieldValid('qnh') && (
              <span className="error-message">
                Must be between {validation.qnh.min} and {validation.qnh.max} hPa
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="runwayDirection">Runway Direction (magnetic, degrees)</label>
            <input
              id="runwayDirection"
              type="number"
              inputMode="numeric"
              min={validation.runwayDirection.min}
              max={validation.runwayDirection.max}
              step="1"
              value={inputs.runwayDirection}
              onChange={(e) => handleInputChange('runwayDirection', e.target.value)}
              onBlur={() => handleInputBlur('runwayDirection')}
              onFocus={handleInputFocus}
              className={touchedFields.has('runwayDirection') && !isFieldValid('runwayDirection') ? 'invalid' : ''}
            />
            {touchedFields.has('runwayDirection') && !isFieldValid('runwayDirection') && (
              <span className="error-message">
                Must be between {validation.runwayDirection.min} and {validation.runwayDirection.max} degrees
              </span>
            )}
          </div>
        </div>
        )}

        <div className="calculate-button-wrapper">
          <button
            onClick={handleCalculate}
            disabled={
              calculationMode === 'rateOfClimb' ? !isRateOfClimbFormValid() :
              calculationMode === 'cruise' ? !isCruiseFormValid() :
              !isFormValid()
            }
            className={`calculate-button ${
              (
                calculationMode === 'rateOfClimb' ? isRateOfClimbFormValid() :
                calculationMode === 'cruise' ? isCruiseFormValid() :
                isFormValid()
              ) ? 'calculate-button-enabled' : 'calculate-button-disabled'
            }`}
          >
          Calculate {
            calculationMode === 'takeoff' ? 'Takeoff' :
            calculationMode === 'landing' ? 'Landing' :
            calculationMode === 'rateOfClimb' ? 'Rate of Climb' :
            'Cruise'
          } Performance
          </button>
        </div>

        {rateOfClimbResults && (
          <div className="results">
            <h2>Rate of Climb Results</h2>
            
            <div className="results-grid">
              <div className="result-item">
                <label>Rate of Climb</label>
                <div>
                  <span className="value">{rateOfClimbResults.rateOfClimb}</span>
                  <span className="unit">ft/min</span>
                </div>
              </div>

              <div className="result-item">
                <label>Climb Speed (Vy)</label>
                <div>
                  <span className="value">{rateOfClimbResults.climbSpeed}</span>
                  <span className="unit">kt</span>
                </div>
              </div>

              <div className="result-item">
                <label>Pressure Altitude</label>
                <div>
                  <span className="value">{Math.round(rateOfClimbResults.pressureAltitude)}</span>
                  <span className="unit">ft</span>
                </div>
              </div>
            </div>

            {rateOfClimbResults.debug && (
              <div className="debug-wrapper">
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className={`debug-toggle-button ${showDebug ? 'debug-toggle-button-expanded' : ''}`}
                >
                  {showDebug ? '▼' : '▶'} Debug Information
                </button>

                {showDebug && (
                  <div className="debug-container">
                    <div>
                      <h4 className="debug-section-heading">Rate of Climb Calculation</h4>
                      <div className="debug-info-box">
                        <strong>Input:</strong> Weight={rateOfClimbResults.debug.inputWeight}kg, 
                        PA={rateOfClimbResults.debug.inputPressureAlt.toFixed(1)}ft, 
                        Temp={rateOfClimbResults.debug.inputTemperature}°C
                      </div>
                      <div className="debug-info-box">
                        <strong>Clamped:</strong> Weight={rateOfClimbResults.debug.clampedWeight}kg, 
                        PA={rateOfClimbResults.debug.clampedPressureAlt.toFixed(1)}ft, 
                        Temp={rateOfClimbResults.debug.clampedTemperature}°C
                      </div>
                      <div className="debug-info-box">
                        <strong>Bounds:</strong> Weight {rateOfClimbResults.debug.weightBounds.w1}-{rateOfClimbResults.debug.weightBounds.w2}kg, 
                        PA {rateOfClimbResults.debug.pressureAltBounds.pa1}-{rateOfClimbResults.debug.pressureAltBounds.pa2}ft, 
                        Temp {rateOfClimbResults.debug.temperatureBounds.t1}-{rateOfClimbResults.debug.temperatureBounds.t2}°C
                      </div>
                      {rateOfClimbResults.debug.interpolationSteps && rateOfClimbResults.debug.interpolationSteps.length > 0 && (
                        <div className="debug-info-box debug-info-box-last">
                          <strong>Calculation Steps:</strong>
                          <ul className="debug-list">
                            {rateOfClimbResults.debug.interpolationSteps.map((step, idx) => (
                              <li key={idx} className="debug-list-item">{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {cruiseResults && (
          <div className="results">
            <h2>Cruise Performance Results</h2>
            
            <div className="results-grid">
              <div className="result-item">
                <label>KIAS (Indicated Airspeed)</label>
                <div>
                  <span className="value">{cruiseResults.kias}</span>
                  <span className="unit">kt</span>
                </div>
              </div>

              <div className="result-item">
                <label>KTAS (True Airspeed)</label>
                <div>
                  <span className="value">{cruiseResults.ktas}</span>
                  <span className="unit">kt</span>
                </div>
              </div>

              <div className="result-item">
                <label>Fuel Consumption</label>
                <div>
                  <span className="value">{cruiseResults.fuelConsumption}</span>
                  <span className="unit">LPH</span>
                </div>
              </div>

              <div className="result-item">
                <label>Engine Power</label>
                <div>
                  <span className="value">{cruiseResults.powerPercent}</span>
                  <span className="unit">%</span>
                </div>
              </div>

              {cruiseResults.rpm && (
                <div className="result-item">
                  <label>RPM</label>
                  <div>
                    <span className="value">{cruiseResults.rpm}</span>
                    <span className="unit">rpm</span>
                  </div>
                </div>
              )}

              <div className="result-item">
                <label>Pressure Altitude</label>
                <div>
                  <span className="value">{Math.round(cruiseResults.pressureAltitude)}</span>
                  <span className="unit">ft</span>
                </div>
              </div>

              <div className="result-item">
                <label>Density Altitude</label>
                <div>
                  <span className="value">{Math.round(cruiseResults.densityAltitude)}</span>
                  <span className="unit">ft</span>
                </div>
              </div>
            </div>

            {cruiseResults.debug && (
              <div className="debug-wrapper">
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className={`debug-toggle-button ${showDebug ? 'debug-toggle-button-expanded' : ''}`}
                >
                  {showDebug ? '▼' : '▶'} Debug Information
                </button>

                {showDebug && (
                  <div className="debug-container">
                    <div>
                      <h4 className="debug-section-heading">Cruise Performance Calculation</h4>
                      <div className="debug-info-box">
                        <strong>Pressure Altitude:</strong> {cruiseResults.debug.pressureAltitude.toFixed(0)}ft
                      </div>
                      <div className="debug-info-box">
                        <strong>Density Altitude:</strong> {cruiseResults.debug.densityAltitude.toFixed(0)}ft
                      </div>
                      <div className="debug-info-box">
                        <strong>ISA Condition:</strong> {cruiseResults.debug.isaCondition}
                      </div>
                      <div className="debug-info-box">
                        <strong>Density Ratio:</strong> {cruiseResults.debug.densityRatio.toFixed(4)}
                      </div>
                      {cruiseResults.debug.conversionSteps && cruiseResults.debug.conversionSteps.length > 0 && (
                        <div className="debug-info-box debug-info-box-last">
                          <strong>Calculation Steps:</strong>
                          <ul className="debug-list">
                            {cruiseResults.debug.conversionSteps.map((step, idx) => (
                              <li key={idx} className="debug-list-item">{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {results && (
          <div className="results">
            <h2>Results</h2>
            
            <div className="results-grid">
              <div className="result-item">
                <label>Ground Roll</label>
                <div>
                  <span className="value">{results.groundRoll}</span>
                  <span className="unit">m</span>
                </div>
              </div>

              <div className="result-item">
                <label>{calculationMode === 'takeoff' ? 'Distance to 50 ft AGL' : 'Distance from 50 ft AGL'}</label>
                <div>
                  <span className="value">{results.over50ft}</span>
                  <span className="unit">m</span>
                </div>
              </div>

              <div className="result-item">
                <label>Pressure Altitude</label>
                <div>
                  <span className="value">{Math.round(results.pressureAltitude)}</span>
                  <span className="unit">ft</span>
                </div>
              </div>
            </div>

            <div className="wind-info">
              <h3>Wind Components</h3>
              <div className="wind-components">
                <div className="wind-component">
                  <label>Headwind</label>
                  <div className="value">
                    {results.windComponents.headwind.toFixed(1)} <span className="unit-text">kt</span>
                  </div>
                </div>
                <div className="wind-component">
                  <label>Tailwind</label>
                  <div className="value">
                    {results.windComponents.tailwind.toFixed(1)} <span className="unit-text">kt</span>
                  </div>
                </div>
                <div className="wind-component">
                  <label>Crosswind</label>
                  <div className="value">
                    {results.windComponents.crosswind.toFixed(1)} <span className="unit-text">kt</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="base-values-box">
              <strong>Base Values (before corrections):</strong>
              <div className="base-values-content">
                Ground Roll: {results.baseGroundRoll} m | Over 50ft: {results.baseOver50ft} m
              </div>
            </div>

            {results.debug && (
              <div className="debug-wrapper">
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className={`debug-toggle-button ${showDebug ? 'debug-toggle-button-expanded' : ''}`}
                >
                  {showDebug ? '▼' : '▶'} Debug Information
                </button>

                {showDebug && (
                  <div className="debug-container">
                    <div className="debug-section-spacing">
                      <h4 className="debug-section-heading">Ground Roll Calculation</h4>
                      <div className="debug-info-box">
                        <strong>Input:</strong> Weight={results.debug.groundRoll.inputWeight}kg, 
                        PA={results.debug.groundRoll.inputPressureAlt.toFixed(1)}ft, 
                        Temp={results.debug.groundRoll.inputTemperature}°C
                      </div>
                      <div className="debug-info-box">
                        <strong>Clamped:</strong> Weight={results.debug.groundRoll.clampedWeight}kg, 
                        PA={results.debug.groundRoll.clampedPressureAlt.toFixed(1)}ft, 
                        Temp={results.debug.groundRoll.clampedTemperature}°C
                      </div>
                      <div className="debug-info-box">
                        <strong>Bounds:</strong> Weight {results.debug.groundRoll.weightBounds.w1}-{results.debug.groundRoll.weightBounds.w2}kg, 
                        PA {results.debug.groundRoll.pressureAltBounds.pa1}-{results.debug.groundRoll.pressureAltBounds.pa2}ft, 
                        Temp {results.debug.groundRoll.temperatureBounds.t1}-{results.debug.groundRoll.temperatureBounds.t2}°C
                      </div>
                      {results.debug.groundRoll.corrections && (
                        <div className="debug-info-box">
                          <strong>Corrections Applied:</strong>
                          <div className="debug-corrections-detail">
                            <div>Wind: {results.debug.groundRoll.corrections.wind.type === 'none' 
                              ? 'None' 
                              : `${results.debug.groundRoll.corrections.wind.type} ${results.debug.groundRoll.corrections.wind.value.toFixed(1)}kt → ${results.debug.groundRoll.corrections.wind.correction > 0 ? '+' : ''}${results.debug.groundRoll.corrections.wind.correction.toFixed(1)}m`}</div>
                            <div>Surface: {results.debug.groundRoll.corrections.surface.type} 
                              {results.debug.groundRoll.corrections.surface.correctionPercent !== 0 
                                ? ` → ${results.debug.groundRoll.corrections.surface.correctionPercent}% (${results.debug.groundRoll.corrections.surface.correctionMeters > 0 ? '-' : ''}${Math.abs(results.debug.groundRoll.corrections.surface.correctionMeters).toFixed(1)}m)` 
                                : ' (no correction)'}</div>
                            <div>Slope: {results.debug.groundRoll.corrections.slope.value === 0 
                              ? 'None' 
                              : `${results.debug.groundRoll.corrections.slope.value > 0 ? 'Uphill' : 'Downhill'} ${Math.abs(results.debug.groundRoll.corrections.slope.value)}% → ${results.debug.groundRoll.corrections.slope.correctionPercent > 0 ? '+' : ''}${results.debug.groundRoll.corrections.slope.correctionPercent}% (${results.debug.groundRoll.corrections.slope.correctionMeters > 0 ? '+' : ''}${results.debug.groundRoll.corrections.slope.correctionMeters.toFixed(1)}m)`}</div>
                          </div>
                        </div>
                      )}
                      {results.debug.groundRoll.interpolationSteps && results.debug.groundRoll.interpolationSteps.length > 0 && (
                        <div className="debug-info-box debug-info-box-last">
                          <strong>Calculation Steps:</strong>
                          <ul className="debug-list">
                            {results.debug.groundRoll.interpolationSteps.map((step, idx) => (
                              <li key={idx} className="debug-list-item">{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="debug-section-heading">Over 50ft Calculation</h4>
                      <div className="debug-info-box">
                        <strong>Input:</strong> Weight={results.debug.over50ft.inputWeight}kg, 
                        PA={results.debug.over50ft.inputPressureAlt.toFixed(1)}ft, 
                        Temp={results.debug.over50ft.inputTemperature}°C
                      </div>
                      <div className="debug-info-box">
                        <strong>Clamped:</strong> Weight={results.debug.over50ft.clampedWeight}kg, 
                        PA={results.debug.over50ft.clampedPressureAlt.toFixed(1)}ft, 
                        Temp={results.debug.over50ft.clampedTemperature}°C
                      </div>
                      <div className="debug-info-box">
                        <strong>Bounds:</strong> Weight {results.debug.over50ft.weightBounds.w1}-{results.debug.over50ft.weightBounds.w2}kg, 
                        PA {results.debug.over50ft.pressureAltBounds.pa1}-{results.debug.over50ft.pressureAltBounds.pa2}ft, 
                        Temp {results.debug.over50ft.temperatureBounds.t1}-{results.debug.over50ft.temperatureBounds.t2}°C
                      </div>
                      {results.debug.over50ft.corrections && (
                        <div className="debug-info-box">
                          <strong>Corrections Applied:</strong>
                          <div className="debug-corrections-detail">
                            <div>Wind: {results.debug.over50ft.corrections.wind.type === 'none' 
                              ? 'None' 
                              : `${results.debug.over50ft.corrections.wind.type} ${results.debug.over50ft.corrections.wind.value.toFixed(1)}kt → ${results.debug.over50ft.corrections.wind.correction > 0 ? '+' : ''}${results.debug.over50ft.corrections.wind.correction.toFixed(1)}m`}</div>
                            <div>Surface: {results.debug.over50ft.corrections.surface.type} 
                              {results.debug.over50ft.corrections.surface.correctionPercent !== 0 
                                ? ` → ${results.debug.over50ft.corrections.surface.correctionPercent}% (${results.debug.over50ft.corrections.surface.correctionMeters > 0 ? '-' : ''}${Math.abs(results.debug.over50ft.corrections.surface.correctionMeters).toFixed(1)}m)` 
                                : ' (no correction)'}</div>
                            <div>Slope: {results.debug.over50ft.corrections.slope.value === 0 
                              ? 'None' 
                              : `${results.debug.over50ft.corrections.slope.value > 0 ? 'Uphill' : 'Downhill'} ${Math.abs(results.debug.over50ft.corrections.slope.value)}% → ${results.debug.over50ft.corrections.slope.correctionPercent > 0 ? '+' : ''}${results.debug.over50ft.corrections.slope.correctionPercent}% (${results.debug.over50ft.corrections.slope.correctionMeters > 0 ? '+' : ''}${results.debug.over50ft.corrections.slope.correctionMeters.toFixed(1)}m)`}</div>
                          </div>
                        </div>
                      )}
                      {results.debug.over50ft.interpolationSteps && results.debug.over50ft.interpolationSteps.length > 0 && (
                        <div className="debug-info-box debug-info-box-last">
                          <strong>Calculation Steps:</strong>
                          <ul className="debug-list">
                            {results.debug.over50ft.interpolationSteps.map((step, idx) => (
                              <li key={idx} className="debug-list-item">{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* iOS-style bottom tab bar */}
      <div className="ios-tab-bar">
        <button
          onClick={() => handleModeChange('takeoff')}
          className={`ios-tab-button ${calculationMode === 'takeoff' ? 'ios-tab-button-active' : ''}`}
        >
          <img src={getAssetPath('/takeoff.svg')} alt="Takeoff" className="ios-tab-icon" />
          <span className="ios-tab-label">Takeoff</span>
        </button>
        <button
          onClick={() => handleModeChange('landing')}
          className={`ios-tab-button ${calculationMode === 'landing' ? 'ios-tab-button-active' : ''}`}
        >
          <img src={getAssetPath('/landing.svg')} alt="Landing" className="ios-tab-icon" />
          <span className="ios-tab-label">Landing</span>
        </button>
        <button
          onClick={() => handleModeChange('rateOfClimb')}
          className={`ios-tab-button ${calculationMode === 'rateOfClimb' ? 'ios-tab-button-active' : ''}`}
        >
          <img src={getAssetPath('/climb.svg')} alt="Rate of Climb" className="ios-tab-icon" />
          <span className="ios-tab-label">Rate of Climb</span>
        </button>
        <button
          onClick={() => handleModeChange('cruise')}
          className={`ios-tab-button ${calculationMode === 'cruise' ? 'ios-tab-button-active' : ''}`}
        >
          <img src={getAssetPath('/cruise.svg')} alt="Cruise" className="ios-tab-icon" />
          <span className="ios-tab-label">Cruise</span>
        </button>
      </div>

      {/* Attribution footer */}
      <div className="attribution-footer">
        <p>
          Icons by{' '}
          <a
            href="https://dryicons.com/icon/departures-4359"
            target="_blank"
            rel="noopener noreferrer"
            className="attribution-link"
          >
            DryIcons
          </a>
        </p>
      </div>
    </div>
  );
}


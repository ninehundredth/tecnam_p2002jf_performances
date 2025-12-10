'use client';

import { useState } from 'react';
import {
  calculateTakeoffPerformance,
  calculateLandingPerformance,
  type CalculationInputs,
  type RunwaySurface,
  type CalculationType,
} from '../utils/calculations';

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

export default function Home() {
  const [calculationType, setCalculationType] = useState<CalculationType>('takeoff');
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

  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ReturnType<typeof calculateTakeoffPerformance> | null>(null);
  const [showDebug, setShowDebug] = useState(false);

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

  const handleCalculate = () => {
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
      
      const calculated = calculationType === 'takeoff'
        ? calculateTakeoffPerformance(calculationInputs, true)
        : calculateLandingPerformance(calculationInputs, true);
      setResults(calculated);
    } catch (error) {
      console.error('Calculation error:', error);
      alert(`Error calculating ${calculationType} performance. Please check your inputs.`);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Tecnam P2002JF</h1>
        <p>Performance Calculator</p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => setCalculationType('takeoff')}
            style={{
              padding: '0.5rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: calculationType === 'takeoff' ? 'white' : '#667eea',
              background: calculationType === 'takeoff' 
                ? 'rgba(255, 255, 255, 0.3)' 
                : 'rgba(255, 255, 255, 0.1)',
              border: '2px solid white',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Takeoff
          </button>
          <button
            onClick={() => setCalculationType('landing')}
            style={{
              padding: '0.5rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: calculationType === 'landing' ? 'white' : '#667eea',
              background: calculationType === 'landing' 
                ? 'rgba(255, 255, 255, 0.3)' 
                : 'rgba(255, 255, 255, 0.1)',
              border: '2px solid white',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Landing
          </button>
        </div>
      </div>

      <div className="content">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="weight">Aircraft Weight (kg)</label>
            <input
              id="weight"
              type="number"
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

        <button
          onClick={handleCalculate}
          disabled={!isFormValid()}
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '1.1rem',
            fontWeight: 600,
            color: 'white',
            background: isFormValid()
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : '#cccccc',
            border: 'none',
            borderRadius: '8px',
            cursor: isFormValid() ? 'pointer' : 'not-allowed',
            transition: 'transform 0.2s, box-shadow 0.2s',
            opacity: isFormValid() ? 1 : 0.6,
          }}
          onMouseEnter={(e) => {
            if (isFormValid()) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 20px rgba(102, 126, 234, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Calculate {calculationType === 'takeoff' ? 'Takeoff' : 'Landing'} Performance
        </button>

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
                <label>{calculationType === 'takeoff' ? 'Distance to 50 ft AGL' : 'Distance from 50 ft AGL'}</label>
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
                    {results.windComponents.headwind.toFixed(1)} <span style={{ fontSize: '0.8rem', color: '#999' }}>kt</span>
                  </div>
                </div>
                <div className="wind-component">
                  <label>Tailwind</label>
                  <div className="value">
                    {results.windComponents.tailwind.toFixed(1)} <span style={{ fontSize: '0.8rem', color: '#999' }}>kt</span>
                  </div>
                </div>
                <div className="wind-component">
                  <label>Crosswind</label>
                  <div className="value">
                    {results.windComponents.crosswind.toFixed(1)} <span style={{ fontSize: '0.8rem', color: '#999' }}>kt</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px', fontSize: '0.9rem', color: '#666' }}>
              <strong>Base Values (before corrections):</strong>
              <div style={{ marginTop: '0.5rem' }}>
                Ground Roll: {results.baseGroundRoll} m | Over 50ft: {results.baseOver50ft} m
              </div>
            </div>

            {results.debug && (
              <div style={{ marginTop: '1.5rem' }}>
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#667eea',
                    background: 'white',
                    border: '2px solid #667eea',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    marginBottom: showDebug ? '1rem' : 0,
                  }}
                >
                  {showDebug ? '▼' : '▶'} Debug Information
                </button>

                {showDebug && (
                  <div style={{
                    padding: '1rem',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                  }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ color: '#667eea', marginBottom: '0.5rem' }}>Ground Roll Calculation</h4>
                      <div style={{ background: 'white', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        <strong>Input:</strong> Weight={results.debug.groundRoll.inputWeight}kg, 
                        PA={results.debug.groundRoll.inputPressureAlt.toFixed(1)}ft, 
                        Temp={results.debug.groundRoll.inputTemperature}°C
                      </div>
                      <div style={{ background: 'white', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        <strong>Clamped:</strong> Weight={results.debug.groundRoll.clampedWeight}kg, 
                        PA={results.debug.groundRoll.clampedPressureAlt.toFixed(1)}ft, 
                        Temp={results.debug.groundRoll.clampedTemperature}°C
                      </div>
                      <div style={{ background: 'white', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        <strong>Bounds:</strong> Weight {results.debug.groundRoll.weightBounds.w1}-{results.debug.groundRoll.weightBounds.w2}kg, 
                        PA {results.debug.groundRoll.pressureAltBounds.pa1}-{results.debug.groundRoll.pressureAltBounds.pa2}ft, 
                        Temp {results.debug.groundRoll.temperatureBounds.t1}-{results.debug.groundRoll.temperatureBounds.t2}°C
                      </div>
                      {results.debug.groundRoll.corrections && (
                        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                          <strong>Corrections Applied:</strong>
                          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
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
                        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '4px' }}>
                          <strong>Calculation Steps:</strong>
                          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                            {results.debug.groundRoll.interpolationSteps.map((step, idx) => (
                              <li key={idx} style={{ marginBottom: '0.25rem' }}>{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 style={{ color: '#667eea', marginBottom: '0.5rem' }}>Over 50ft Calculation</h4>
                      <div style={{ background: 'white', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        <strong>Input:</strong> Weight={results.debug.over50ft.inputWeight}kg, 
                        PA={results.debug.over50ft.inputPressureAlt.toFixed(1)}ft, 
                        Temp={results.debug.over50ft.inputTemperature}°C
                      </div>
                      <div style={{ background: 'white', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        <strong>Clamped:</strong> Weight={results.debug.over50ft.clampedWeight}kg, 
                        PA={results.debug.over50ft.clampedPressureAlt.toFixed(1)}ft, 
                        Temp={results.debug.over50ft.clampedTemperature}°C
                      </div>
                      <div style={{ background: 'white', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        <strong>Bounds:</strong> Weight {results.debug.over50ft.weightBounds.w1}-{results.debug.over50ft.weightBounds.w2}kg, 
                        PA {results.debug.over50ft.pressureAltBounds.pa1}-{results.debug.over50ft.pressureAltBounds.pa2}ft, 
                        Temp {results.debug.over50ft.temperatureBounds.t1}-{results.debug.over50ft.temperatureBounds.t2}°C
                      </div>
                      {results.debug.over50ft.corrections && (
                        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                          <strong>Corrections Applied:</strong>
                          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
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
                        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '4px' }}>
                          <strong>Calculation Steps:</strong>
                          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                            {results.debug.over50ft.interpolationSteps.map((step, idx) => (
                              <li key={idx} style={{ marginBottom: '0.25rem' }}>{step}</li>
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
    </div>
  );
}


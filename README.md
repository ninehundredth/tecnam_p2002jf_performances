# Tecnam P2002JF Performance Calculator

A modern web application for calculating takeoff and landing performance for the Tecnam P2002JF aircraft. The calculator provides accurate ground roll and distance to/from 50 ft AGL calculations using multi-dimensional interpolation and comprehensive environmental corrections.

## Features

### Performance Calculations
- **Takeoff Performance**: Calculate ground roll and distance to 50 ft AGL
- **Landing Performance**: Calculate ground roll and distance from 50 ft AGL
- **Multi-dimensional Interpolation**: Interpolates across:
  - Weight: 380-600 kg (extrapolation up to 600 kg)
  - Pressure Altitude: 0-10,000 ft
  - Temperature: -30 to 60°C

### Wind Analysis
- **Automatic Wind Component Calculation**: Computes headwind, tailwind, and crosswind components from runway direction and wind conditions
- **Wind Corrections**: Applies corrections based on headwind/tailwind components

### Environmental Corrections
- **Wind Corrections**:
  - Takeoff: Headwind -2.5 m per knot, Tailwind +10 m per knot
  - Landing: Headwind -5 m per knot, Tailwind +11 m per knot
- **Runway Surface**:
  - Takeoff: Paved runway (concrete/asphalt) -6% to ground roll
  - Landing: Paved runway (concrete/asphalt) -2% to ground roll
- **Runway Slope**:
  - Takeoff: +5% to ground roll per +1% slope (uphill increases distance)
  - Landing: -2.5% to ground roll per +1% slope (uphill decreases distance)

### Additional Features
- **Pressure Altitude Calculation**: Automatically computes pressure altitude from runway elevation and QNH
- **Debug Mode**: Optional detailed debug information showing interpolation steps and corrections applied
- **Input Validation**: Real-time validation with helpful error messages
- **Responsive Design**: Modern, gradient-based UI that works on desktop and mobile devices

## Input Parameters

1. **Aircraft Weight** (kg) - Range: 380-600 kg
2. **Runway Surface** - Grass, Concrete, or Asphalt
3. **Wind Direction** (magnetic, degrees) - Range: 0-360°
4. **Wind Speed** (knots) - Range: 0-100 knots
5. **Runway Slope** (%) - Range: -15% to +15% (Positive = uphill)
6. **Temperature** (°C) - Range: -30 to 60°C
7. **Runway Elevation AMSL** (ft) - Range: -500 to 15,000 ft
8. **QNH** (hPa) - Range: 700-1200 hPa
9. **Runway Direction** (magnetic, degrees) - Range: 0-360°

## Output Results

For each calculation, the application provides:

- **Ground Roll** (meters): Distance required for ground roll
- **Distance to/from 50 ft AGL** (meters): 
  - Takeoff: Distance to reach 50 ft above ground level
  - Landing: Distance from 50 ft above ground level to touchdown
- **Pressure Altitude** (feet): Calculated pressure altitude
- **Wind Components**: Breakdown of headwind, tailwind, and crosswind components
- **Base Values**: Performance values before corrections are applied
- **Debug Information** (optional): Detailed calculation steps including:
  - Input values and clamped values
  - Interpolation bounds and corner values
  - Step-by-step interpolation calculations
  - All corrections applied with their effects

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Technology Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety and better developer experience
- **CSS** - Modern styling with gradients and responsive design
- **Client-side Calculations** - All calculations performed in the browser

## Project Structure

```
├── app/
│   ├── page.tsx          # Main application UI
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── data/
│   ├── takeoff_distance.json  # Takeoff performance data
│   ├── landing_distance.json  # Landing performance data
│   └── *.csv            # Source CSV data files
├── utils/
│   ├── calculations.ts  # Main calculation functions
│   ├── corrections.ts   # Correction factor application
│   ├── interpolation.ts # Multi-dimensional interpolation
│   ├── performance-table.ts # Performance table access
│   ├── pressure.ts      # Pressure altitude calculations
│   ├── wind.ts          # Wind component calculations
│   └── types.ts         # TypeScript type definitions
└── README.md
```

## Data Source

Performance data is based on the **Tecnam P2002JF Aircraft Flight Manual (AFM), Edition 3 Revision 17**, Section 5 - Performances.

The data includes:
- Performance tables for multiple weights (500-580 kg)
- Multiple pressure altitudes (0-10,000 ft)
- Multiple temperatures (-25, 0, 15, 25, 50°C)
- Separate data for takeoff and landing operations

## Calculation Methodology

1. **Pressure Altitude**: Calculated from runway elevation and QNH using standard atmospheric formulas
2. **Wind Components**: Computed using vector mathematics from runway heading and wind direction/speed
3. **Base Performance**: Retrieved from performance tables using trilinear interpolation across weight, pressure altitude, and temperature
4. **Corrections Applied**: Wind, surface, and slope corrections are applied sequentially to base values
5. **Extrapolation**: Weight values up to 600 kg are supported through extrapolation beyond the table maximum of 580 kg

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0). See the [LICENSE](LICENSE) file for details.

**Summary:**
- ✅ You are free to use, modify, and distribute this software
- ✅ You must include the original copyright notice and license
- ✅ If you modify and distribute, you must also license your work under GPL v3
- ✅ This ensures all derivative works remain open source

This project is for educational and flight planning purposes. Always refer to the official Aircraft Flight Manual for operational decisions.

## Disclaimer

This calculator is a tool to assist in flight planning. Pilots must verify all calculations against the official Aircraft Flight Manual and exercise proper judgment in flight operations. The authors assume no liability for the use or misuse of this software.

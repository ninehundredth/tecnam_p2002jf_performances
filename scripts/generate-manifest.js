const fs = require('fs');
const path = require('path');

// Get basePath from environment variable
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Read the template manifest
const manifestPath = path.join(__dirname, '../public/manifest.json.template');
const outputPath = path.join(__dirname, '../public/manifest.json');

// If template doesn't exist, create manifest with basePath
const manifest = {
  name: 'Tecnam P2002JF Performance Calculator',
  short_name: 'Tecnam P2002JF',
  description: 'Calculate takeoff, landing, rate of climb, and cruise performance for Tecnam P2002JF aircraft',
  start_url: `${basePath}/`,
  display: 'standalone',
  background_color: '#0693e3',
  theme_color: '#0693e3',
  orientation: 'portrait',
  icons: [
    {
      src: `${basePath}/icon-192.png`,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable'
    },
    {
      src: `${basePath}/icon-512.png`,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable'
    }
  ]
};

// Write the manifest
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
console.log(`Generated manifest.json with basePath: ${basePath || '(empty)'}`);


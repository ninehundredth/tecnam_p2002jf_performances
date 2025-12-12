import type { Metadata, Viewport } from 'next'
import './globals.css'

// Get basePath for asset paths
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

function getAssetPath(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}

export const metadata: Metadata = {
  title: 'Tecnam P2002JF Performance Calculator',
  description: 'Calculate takeoff, landing, rate of climb, and cruise performance for Tecnam P2002JF aircraft',
  manifest: getAssetPath('/manifest.json'),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tecnam P2002JF',
  },
  icons: {
    icon: [
      { url: getAssetPath('/icon-192.png'), sizes: '192x192', type: 'image/png' },
      { url: getAssetPath('/icon-512.png'), sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: getAssetPath('/icon-192.png'), sizes: '192x192', type: 'image/png' },
    ],
    shortcut: getAssetPath('/icon-192.png'),
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0693e3',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


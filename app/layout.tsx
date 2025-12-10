import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tecnam P2002JF Takeoff Performance Calculator',
  description: 'Calculate takeoff performance for Tecnam P2002JF aircraft',
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


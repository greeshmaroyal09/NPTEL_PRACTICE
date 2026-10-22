import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NPTEL Exam Practice',
  description: 'Practice NPTEL course questions and study course materials.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'NPTEL Practice', statusBarStyle: 'black-translucent' },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0b1012',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}

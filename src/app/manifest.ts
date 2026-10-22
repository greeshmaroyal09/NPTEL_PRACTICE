import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NPTEL Exam Practice',
    short_name: 'NPTEL Practice',
    description: 'Practice course MCQs and read weekly NPTEL study materials.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1012',
    theme_color: '#0b1012',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }
}

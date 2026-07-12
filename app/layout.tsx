import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'HousePadi | Immersive Property Inspection Platform',
  description: 'XR-powered virtual property inspection platform for homes, offices, and event venues across Nigeria.',
  openGraph: {
    title: 'HousePadi',
    description: 'XR-powered virtual property inspection platform for homes, offices, and event venues across Nigeria.',
    type: 'website',
  },
  icons: {
    icon: [
      { url: '/favicon-icon.png', type: 'image/png' },
      { url: '/favicon-icon.png', type: 'image/png', sizes: '180x180' },
      { url: '/favicon-icon.png', type: 'image/png', sizes: '512x512' }
    ],
    shortcut: '/favicon-icon.png',
    apple: [
      { url: '/favicon-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
  verification: {
    google: 'id7fkdWit7TaAc6i2pdIYNh44ekcsHNxvAWTU5-QvWM',
  },
}

export const viewport: Viewport = {
  themeColor: '#8b5cf6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark bg-background">
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

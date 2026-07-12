'use client'

import { Header } from '@/components/header'
import { ConsumerAuthProvider } from '@/components/explore/consumer-auth-provider'
import { Toaster } from '@/components/ui/sonner'
import { usePathname } from 'next/navigation'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isEmbed = pathname === '/embed' || pathname.startsWith('/embed/')

  return (
    <ConsumerAuthProvider>
      <div className="relative min-h-screen">
        {!isEmbed && <Header />}
        {children}
      </div>
      <Toaster position="bottom-right" theme="dark" closeButton />
    </ConsumerAuthProvider>
  )
}


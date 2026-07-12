'use client'

import { ConsumerAuthProvider } from '@/components/explore/consumer-auth-provider'
import { Toaster } from '@/components/ui/sonner'
import { useEffect } from 'react'

export default function ViewerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.documentElement.style.height = '100%'
    document.body.style.height = '100%'

    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.documentElement.style.height = ''
      document.body.style.height = ''
    }
  }, [])

  return (
    <ConsumerAuthProvider>
      <div className="w-screen h-screen overflow-hidden bg-neutral-950 fixed inset-0">
        {children}
      </div>
      <Toaster position="bottom-right" theme="dark" closeButton />
    </ConsumerAuthProvider>
  )
}

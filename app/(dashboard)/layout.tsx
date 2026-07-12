'use client'

import { Toaster } from '@/components/ui/sonner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black">
      {children}
      <Toaster position="bottom-right" theme="dark" closeButton />
    </div>
  )
}

'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DeveloperSidebar } from '@/components/developer-sidebar'
import { DashboardHeader } from '@/components/dashboard-header'
import { createClient } from '@/lib/supabase/client'

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [verifying, setVerifying] = useState(true)

  useEffect(() => {
    async function verifyRole() {
      if (!user) {
        setVerifying(false)
        router.push('/auth/login')
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error || !data || data.role !== 'DEVELOPER') {
        router.push('/auth/login?error=unauthorized')
      } else {
        setIsAuthorized(true)
      }
      setVerifying(false)
    }

    if (!authLoading) {
      verifyRole()
    }
  }, [user, authLoading, router])

  if (authLoading || verifying) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="w-12 h-12 border-t-2 border-r-2 border-white animate-spin"></div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-500">Verifying Clearance...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) return null

  return (
    <div className="flex min-h-screen bg-black overflow-x-hidden selection:bg-white selection:text-black">
      <DeveloperSidebar />
      <main className="flex-1 min-w-0 bg-[#050505] flex flex-col">
        <DashboardHeader />
        {/* Mobile Spacer for floating menu button */}
        <div className="h-16 lg:hidden shrink-0" />
        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-16">
          {children}
        </div>
      </main>
    </div>
  )
}

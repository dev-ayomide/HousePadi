'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import { Loader2 } from 'lucide-react'

function UploadBridgeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { consumer, loading: consumerLoading } = useConsumerAuth()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    async function evaluateRoute() {
      // Wait for consumer auth loading to settle
      if (consumerLoading) return

      const localUrl = searchParams.get('local_url') || ''
      const name = searchParams.get('name') || ''

      const { data: { user } } = await supabase.auth.getUser()

      // Build parameters string to forward
      const forwardParams = `prefill=true&local_url=${encodeURIComponent(localUrl)}&name=${encodeURIComponent(name)}`

      // 1. If Consumer profile is logged in
      if (consumer) {
        router.replace(`/consumer/products?${forwardParams}`)
        return
      }

      // 2. If standard Auth profile is logged in (dashboard users)
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile) {
          const role = (profile.role || '').toUpperCase()
          if (role === 'PRODUCT_VENDOR' || role === 'VENDOR') {
            router.replace(`/vendor/products?${forwardParams}`)
            return
          } else if (role === 'AGENT' || role === 'AGENCY') {
            router.replace(`/agent/listings/upload?${forwardParams}`)
            return
          } else if (role === 'CONSUMER') {
            router.replace(`/consumer/products?${forwardParams}`)
            return
          }
        }
      }

      // 3. Fallback: User is NOT logged in. Redirect to login.
      // We must encode the current bridge path + query params as the "next" destination
      const bridgePath = `/upload-bridge?local_url=${encodeURIComponent(localUrl)}&name=${encodeURIComponent(name)}`
      router.replace(`/auth/login?next=${encodeURIComponent(bridgePath)}`)
    }

    evaluateRoute()
  }, [consumer, consumerLoading, searchParams, router])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="bg-neutral-950/80 backdrop-blur-2xl border border-white/5 p-8 text-center space-y-4 max-w-sm">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">Verifying Session...</h2>
        <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Redirecting you to the appropriate 3D model upload form.</p>
      </div>
    </div>
  )
}

export default function UploadBridgePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    }>
      <UploadBridgeContent />
    </Suspense>
  )
}

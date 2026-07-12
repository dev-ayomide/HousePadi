'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { useToast } from '@/components/ui/use-toast'
import Particles from '@/components/Particles'
import { CheckCircle2, Store } from 'lucide-react'
import { verifyVendorOTP } from '@/app/actions/vendor-signup-actions'

function VendorVerifyContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const userId = searchParams.get('userId')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleVerify = async (code: string) => {
    if (!userId) {
      setError('Missing user identifier. Please sign up again.')
      return
    }

    if (code.length !== 6) return

    setError(null)
    setLoading(true)

    try {
      const result = await verifyVendorOTP(userId, code)
      
      if (result.success) {
        setSuccess(true)
        toast({
          title: 'Account Verified',
          description: 'Your vendor account has been verified successfully.',
        })
      } else {
        setError(result.error || 'Invalid verification code.')
      }
    } catch (err) {
      console.error(err)
      setError('A system error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="max-w-md w-full p-10 bg-neutral-900/40 border border-neutral-800 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-950/30 border border-emerald-900/50 flex items-center justify-center mx-auto rounded-full">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-light text-white tracking-tight">Account Verified</h2>
          <p className="text-sm text-neutral-400 font-light leading-relaxed">
            Welcome to HousePadi. Your vendor account is now fully active. We have sent a welcome email to your inbox.
          </p>
          <div className="pt-6">
            <Link href="/auth/login">
              <Button className="w-full bg-white text-black hover:bg-neutral-200 rounded-none h-12 uppercase tracking-widest text-xs font-bold">
                Proceed to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-x-hidden py-12">
      <div className="absolute inset-0 z-0 opacity-30">
        <Particles
          className="w-full h-full"
          particleColors={["#ffffff"]}
          particleCount={80}
          particleSpread={15}
          speed={0.02}
          particleBaseSize={60}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
        />
      </div>

      <div className="relative z-10 w-full max-w-[500px] px-6 mx-auto">
        <div className="bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 p-8 sm:p-12 space-y-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neutral-500 to-transparent opacity-50" />
          
          <div className="text-center space-y-4">
            <div className="mb-8 text-center flex flex-col items-center">
              <Link href="/">
                <img src="/logo.svg" alt="HousePadi Logo" className="h-16 w-auto mb-4 hover:opacity-80 transition-opacity" style={{ filter: 'brightness(0) invert(1)' }} />
              </Link>
            </div>
          </div>

          <div className="space-y-2 text-center">
            <div className="w-10 h-10 bg-neutral-950 border border-neutral-800 flex items-center justify-center mx-auto mb-3">
              <Store className="w-4 h-4 text-neutral-500" />
            </div>
            <h2 className="text-xl font-light text-white tracking-tight">Verify Your Account</h2>
            <p className="text-neutral-500 text-[9px] uppercase tracking-[0.2em] font-bold">Enter the 6-digit code sent to your email</p>
          </div>

          <div className="pt-6 pb-2 flex flex-col items-center space-y-8">
            {error && (
              <div className="w-full p-4 bg-red-950/20 border border-red-900/50 text-red-400 text-[10px] uppercase tracking-wider font-bold leading-relaxed text-center">
                {error}
              </div>
            )}

            <div className="flex justify-center">
              <InputOTP 
                maxLength={6} 
                onComplete={handleVerify}
                disabled={loading}
              >
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot 
                      key={index} 
                      index={index} 
                      className="w-12 h-14 bg-neutral-950 border-neutral-800 text-white text-xl rounded-none focus-visible:ring-1 focus-visible:ring-white transition-all"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            
            {loading && (
              <p className="text-[10px] uppercase tracking-widest text-neutral-400 animate-pulse">
                Verifying Code...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function VendorVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-t-2 border-white animate-spin"></div>
      </div>
    }>
      <VendorVerifyContent />
    </Suspense>
  )
}

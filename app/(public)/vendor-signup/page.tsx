'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import Particles from '@/components/Particles'
import { Store, CheckCircle2 } from 'lucide-react'
import { submitVendorSignup } from '@/app/actions/vendor-signup-actions'

export default function VendorSignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    try {
      const result = await submitVendorSignup(formData)
      if (result.success && result.userId) {
        toast({
          title: 'Verification Required',
          description: 'Please enter the code sent to your email.',
        })
        router.push(`/vendor-signup/verify?userId=${result.userId}`)
      } else {
        setError(result.error || 'An error occurred during submission.')
      }
    } catch (err) {
      console.error(err)
      setError('A system error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-x-hidden py-12">
      {/* Background Particles */}
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

      <div className="relative z-10 w-full max-w-[600px] px-6 mx-auto">
        <div className="bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 p-8 sm:p-12 space-y-8 shadow-2xl relative overflow-hidden group">
          {/* Subtle gradient light flare on top */}
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
            <h2 className="text-xl font-light text-white tracking-tight">Product Vendor Registration</h2>
            <p className="text-neutral-500 text-[9px] uppercase tracking-[0.2em] font-bold">Join as a seller to list furniture & fixtures</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {error && (
              <div className="p-4 bg-red-950/20 border border-red-900/50 text-red-400 text-[10px] uppercase tracking-wider font-bold leading-relaxed">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Business Name *</label>
                <Input
                  name="businessName"
                  type="text"
                  placeholder="e.g. Modern Furnishings"
                  required
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Email Address *</label>
                <Input
                  name="email"
                  type="email"
                  placeholder="vendor@example.com"
                  required
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Secure Password *</label>
                <Input
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Confirm Password *</label>
                <Input
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Phone Number *</label>
                <Input
                  name="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  required
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Business Address</label>
                <Input
                  name="address"
                  type="text"
                  placeholder="123 Main St, City"
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>
            </div>

            <div className="flex items-start space-x-3 pt-2">
              <input
                id="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded-none bg-neutral-950 border border-neutral-800 text-white accent-white focus:ring-1 focus:ring-neutral-700 cursor-pointer"
                required
              />
              <label htmlFor="terms" className="text-xs text-neutral-400 font-light select-none cursor-pointer leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" target="_blank" className="text-white hover:underline font-normal">
                  Terms and Conditions
                </Link>
                {' '}and{' '}
                <Link href="/privacy" target="_blank" className="text-white hover:underline font-normal">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 mt-4 bg-white text-black hover:bg-neutral-200 rounded-none text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={loading || !agreedToTerms}
            >
              {loading ? 'Creating Account...' : 'Create Vendor Account'}
            </Button>
          </form>

          <div className="pt-6 border-t border-neutral-800 text-center">
            <Link href="/auth/login" className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white transition-all">
              Already have an account? Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import Particles from '@/components/Particles'
import { Code, CheckCircle2 } from 'lucide-react'
import { sendDeveloperOTP, verifyDeveloperOTPAndRegister } from '@/app/actions/developer-actions'

export default function DeveloperSignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [step, setStep] = useState<'details' | 'otp' | 'success'>('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleSendOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)

    try {
      const result = await sendDeveloperOTP(email, fullName)
      if (result.success) {
        setStep('otp')
        toast({
          title: 'Verification Code Sent',
          description: 'Please check your email for the OTP code.',
        })
      } else {
        setError(result.error || 'Failed to send verification code.')
      }
    } catch (err) {
      setError('A system error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData()
    formData.append('fullName', fullName)
    formData.append('email', email)
    formData.append('password', password)
    formData.append('otp', otp)
    if (companyName) formData.append('companyName', companyName)

    try {
      const result = await verifyDeveloperOTPAndRegister(formData)
      if (result.success) {
        setStep('success')
        toast({
          title: 'Account Created',
          description: 'Your developer account has been registered successfully.',
        })
      } else {
        setError(result.error || 'Verification failed.')
      }
    } catch (err) {
      setError('A system error occurred during registration.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="max-w-md w-full p-10 bg-neutral-900/40 border border-neutral-800 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-950/30 border border-emerald-900/50 flex items-center justify-center mx-auto rounded-full">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-light text-white tracking-tight">Registration Complete</h2>
          <p className="text-sm text-neutral-400 font-light leading-relaxed">
            Welcome to the HousePadi Developer Portal. You can now log in to manage your API keys and integrate spatial technology into your applications.
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
              <Code className="w-4 h-4 text-neutral-500" />
            </div>
            <h2 className="text-xl font-light text-white tracking-tight">Developer Registration</h2>
            <p className="text-neutral-500 text-[9px] uppercase tracking-[0.2em] font-bold">
              {step === 'details' ? 'Create your API sandbox' : 'Verify your email address'}
            </p>
          </div>

          {step === 'details' ? (
            <form onSubmit={handleSendOTP} className="space-y-6 pt-4">
              {error && (
                <div className="p-4 bg-red-950/20 border border-red-900/50 text-red-400 text-[10px] uppercase tracking-wider font-bold leading-relaxed">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Full Name *</label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Email Address *</label>
                <Input
                  type="email"
                  placeholder="developer@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Company / Project Name</label>
                <Input
                  type="text"
                  placeholder="Optional"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Password *</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Confirm *</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? 'Processing...' : 'Continue'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6 pt-4">
              {error && (
                <div className="p-4 bg-red-950/20 border border-red-900/50 text-red-400 text-[10px] uppercase tracking-wider font-bold leading-relaxed">
                  {error}
                </div>
              )}

              <div className="p-4 bg-neutral-950/50 border border-neutral-800 text-center mb-6">
                <p className="text-xs text-neutral-400 leading-relaxed">
                  We've sent a 6-digit verification code to <br/>
                  <strong className="text-white font-medium">{email}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold text-center block">Verification Code</label>
                <Input
                  type="text"
                  placeholder="000000"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white text-center tracking-[1em] text-lg font-mono h-14 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 bg-white text-black hover:bg-neutral-200 rounded-none text-xs font-bold uppercase tracking-widest transition-all duration-300" 
                disabled={loading || otp.length < 6}
              >
                {loading ? 'Verifying...' : 'Complete Registration'}
              </Button>

              <button
                type="button"
                onClick={() => setStep('details')}
                className="w-full py-3 text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white transition-all font-bold mt-2"
                disabled={loading}
              >
                Go Back
              </button>
            </form>
          )}

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

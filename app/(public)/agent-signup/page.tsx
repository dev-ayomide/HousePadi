'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import Particles from '@/components/Particles'
import { User, CheckCircle2, Camera, Loader2 } from 'lucide-react'
import { signUpAsIndividualAgent, sendAgentOTP } from '@/app/actions/agent-signup-actions'
import { generatePresignedUrl } from '@/app/actions/r2-actions'

export default function AgentSignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [step, setStep] = useState<'details' | 'otp' | 'success'>('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [tagline, setTagline] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(false)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 3 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum allowed size is 3MB.', variant: 'destructive' })
      return
    }

    setUploading(true)
    setAvatarError(false)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `onboarding/agent-${Date.now()}-${Math.random()}.${fileExt}`
      
      const presigned = await generatePresignedUrl(fileName, file.type)
      if (!presigned.success || !presigned.signedUrl) throw new Error(presigned.error || 'Upload failed')

      await fetch(presigned.signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })

      setAvatarUrl(presigned.publicUrl!)
      toast({ title: 'Success', description: 'Photo uploaded.' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleSendOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!avatarUrl) {
      setAvatarError(true)
      setError('Profile picture is compulsory.')
      return
    }

    if (!tagline) {
      setError('Tagline / Role is required.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)

    try {
      const result = await sendAgentOTP(email, fullName)
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
    formData.append('phone', phone)
    formData.append('otp', otp)
    formData.append('avatarUrl', avatarUrl)
    formData.append('tagline', tagline)
    formData.append('website', website)

    try {
      const result = await signUpAsIndividualAgent(formData)
      if (result.success) {
        setStep('success')
        toast({
          title: 'Account Created Successfully',
          description: 'You can now log in to access your agent portal.',
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
            Your independent agent account has been created. You can now log in and complete your onboarding profile details.
          </p>
          <div className="pt-6">
            <Link href="/auth/login">
              <Button className="w-full bg-white text-black hover:bg-neutral-200 rounded-none h-12 uppercase tracking-widest text-xs font-bold">
                Go to Sign In
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
              <User className="w-4 h-4 text-neutral-500" />
            </div>
            <h2 className="text-xl font-light text-white tracking-tight">Independent Agent Sign Up</h2>
            <p className="text-neutral-500 text-[9px] uppercase tracking-[0.2em] font-bold">
              {step === 'details' ? 'Register as an individual agent' : 'Verify your email address'}
            </p>
          </div>

          {step === 'details' ? (
            <form onSubmit={handleSendOTP} className="space-y-6 pt-4">
              {error && (
                <div className="p-4 bg-red-950/20 border border-red-900/50 text-red-400 text-[10px] uppercase tracking-wider font-bold leading-relaxed">
                  {error}
                </div>
              )}

              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-4 py-4 border-y border-neutral-900">
                <div className={`relative group w-24 h-24 bg-neutral-900 border rounded-full overflow-hidden transition-all duration-300 ${avatarError ? 'border-red-500 ring-2 ring-red-500/20' : 'border-neutral-800'}`}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-700">
                      <Camera className="w-8 h-8" />
                    </div>
                  )}
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-white">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload'}
                    </span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                  </label>
                </div>
                <p className={`text-[9px] uppercase tracking-widest font-bold transition-colors ${avatarError ? 'text-red-500' : 'text-neutral-500'}`}>
                  Profile Picture (Compulsory)
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Full Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Jane Doe"
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
                  placeholder="jane.doe@agent.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Confirm Password *</label>
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

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Phone Number *</label>
                <Input
                  type="tel"
                  placeholder="+2348012345678"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Tagline / Role *</label>
                <Input
                  type="text"
                  placeholder="e.g. Senior Real Estate Consultant"
                  required
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Website / Portfolio (Optional)</label>
                <Input
                  type="text"
                  placeholder="https://..."
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
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

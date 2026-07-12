'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import Particles from '@/components/Particles'
import { Building2, UploadCloud, CheckCircle2 } from 'lucide-react'
import { submitAgencyApplication } from '@/app/actions/agency-signup-actions'

export default function AgencySignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB')
        setFileName(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      setFileName(file.name)
      setError(null)
    }
  }

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
    
    const file = formData.get('verificationDocument') as File
    if (!file || file.size === 0) {
      setError('Proof of Agency document is required.')
      setLoading(false)
      return
    }

    try {
      const result = await submitAgencyApplication(formData)
      if (result.success) {
        setSuccess(true)
        toast({
          title: 'Application Received',
          description: 'Your agency application is now under review.',
        })
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="max-w-md w-full p-10 bg-neutral-900/40 border border-neutral-800 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-950/30 border border-emerald-900/50 flex items-center justify-center mx-auto rounded-full">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-light text-white tracking-tight">Application Submitted</h2>
          <p className="text-sm text-neutral-400 font-light leading-relaxed">
            Your registration has been forwarded to our moderation team. You will receive an email notification once your agency has been verified and approved.
          </p>
          <div className="pt-6">
            <Link href="/">
              <Button className="w-full bg-white text-black hover:bg-neutral-200 rounded-none h-12 uppercase tracking-widest text-xs font-bold">
                Return to Homepage
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
              <Building2 className="w-4 h-4 text-neutral-500" />
            </div>
            <h2 className="text-xl font-light text-white tracking-tight">Agency Registration</h2>
            <p className="text-neutral-500 text-[9px] uppercase tracking-[0.2em] font-bold">Apply for exclusive network access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {error && (
              <div className="p-4 bg-red-950/20 border border-red-900/50 text-red-400 text-[10px] uppercase tracking-wider font-bold leading-relaxed">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Agency Name *</label>
                <Input
                  name="agencyName"
                  type="text"
                  placeholder="e.g. Skyline Realty"
                  required
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Business Email *</label>
                <Input
                  name="email"
                  type="email"
                  placeholder="contact@agency.com"
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
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Phone Number</label>
                <Input
                  name="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Website URL</label>
                <Input
                  name="website"
                  type="url"
                  placeholder="https://youragency.com"
                  className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Proof of Agency *</label>
              <p className="text-xs text-neutral-600 font-light mb-2">Upload CAC registration, operational license, or company verification document. (PDF, JPG, PNG up to 5MB)</p>
              
              <div 
                className={`relative border-2 border-dashed ${fileName ? 'border-emerald-900/50 bg-emerald-950/10' : 'border-neutral-800 bg-neutral-950/50'} hover:bg-neutral-900 transition-colors p-8 text-center cursor-pointer`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  name="verificationDocument"
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  required
                />
                <div className="flex flex-col items-center justify-center space-y-3 pointer-events-none">
                  <UploadCloud className={`w-6 h-6 ${fileName ? 'text-emerald-500' : 'text-neutral-500'}`} />
                  <span className={`text-xs font-medium tracking-wide ${fileName ? 'text-emerald-400' : 'text-neutral-400'}`}>
                    {fileName ? fileName : 'Click to browse documents'}
                  </span>
                </div>
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
              {loading ? 'Submitting Application...' : 'Submit Registration'}
            </Button>
          </form>

          <div className="pt-6 border-t border-neutral-800 text-center">
            <Link href="/auth/login" className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white transition-all">
              Already verified? Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

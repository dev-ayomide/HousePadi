'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import Particles from '@/components/Particles'
import {
  Key,
  Mail,
  ShieldCheck,
  Compass,
  Building2,
  UserCheck,
  Store,
  Code2,
  ArrowRight
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { requestTemporaryPassword } from '@/app/actions/auth-actions'
import { resendVendorVerificationOTP } from '@/app/actions/vendor-signup-actions'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import { verifyConsumerOTP } from '@/app/actions/consumer-auth-actions'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { consumer, login: consumerLoginAction, openAuthModal } = useConsumerAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'login' | 'forgot' | 'otp'>('login')
  const [otpCode, setOtpCode] = useState('')
  const [showSignupModal, setShowSignupModal] = useState(false)

  // Auto-redirect if already logged in
  useEffect(() => {
    const supabase = createClient()
    
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      const nextParam = searchParams.get('next')
      
      if (user) {
        if (nextParam) {
          router.push(nextParam)
          return
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile) {
          if (profile.role === 'MODERATOR') {
            router.push('/admin')
            return
          } else if (profile.role === 'AGENCY') {
            router.push('/agency')
            return
          } else if (profile.role === 'AGENT') {
            router.push('/agent')
            return
          } else if (profile.role === 'product_vendor' || profile.role === 'PRODUCT_VENDOR') {
            router.push('/vendor')
            return
          } else if (profile.role === 'DEVELOPER') {
            router.push('/developer')
            return
          }
        }
      }

      if (consumer) {
        if (nextParam) {
          router.push(nextParam)
          return
        }
        router.push('/consumer/profile')
        return
      }
    }

    checkSession()
  }, [consumer, router])
  const [forgotSuccess, setForgotSuccess] = useState(false)

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam === 'pending_approval') {
      setError('Your moderator account is pending administrative approval. You will be granted access once a lead moderator verifies your profile.')
    } else if (errorParam === 'auth_callback_failed') {
      setError('The authentication link is invalid, expired, or has already been used.')
    }

    const messageParam = searchParams.get('message')
    if (messageParam === 'password_reset_success') {
      toast({
        title: 'Password Updated',
        description: 'Your security key was updated successfully. Please log in with your new security key.',
      })
    }
  }, [searchParams, toast])

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    setForgotSuccess(false)

    try {
      const result = await requestTemporaryPassword(email)

      if (!result.success) {
        setError(result.error || 'An error occurred.')
        setLoading(false)
        return
      }

      setForgotSuccess(true)
      toast({
        title: 'Temporary Key Dispatched',
        description: 'Check your email for the temporary security key.',
      })
    } catch (err) {
      console.error('Password reset error:', err)
      setError('A system error occurred while trying to send the recovery email.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    try {
      // Try consumer login first
      let isConsumerSuccess = false
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('role')
        .eq('email', email.toLowerCase())
        .maybeSingle()

      if (profileCheck && profileCheck.role === 'CONSUMER') {
        const res = await consumerLoginAction(email, password)
        if (res.success) {
          if (res.requireOtp) {
            setMode('otp')
            setLoading(false)
            toast({
              title: 'Verification Required',
              description: 'Please check your email for the OTP code.',
            })
            return
          }
          toast({
            title: 'Authentication Successful',
            description: 'Welcome back to HousePadi. Redirecting...',
          })
          window.location.href = searchParams.get('next') || '/consumer/profile'
          return
        }
      }

      // 2. Sign in with Supabase Auth (Dashboard users)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        // If Supabase Auth failed, check if consumer login succeeded
        if (isConsumerSuccess) {
          toast({
            title: 'Authentication Successful',
            description: 'Welcome back to HousePadi. Redirecting to your profile...',
          })
          window.location.href = '/consumer/profile'
          return
        } else {
          // Both failed
          setError('Authentication failed. Please verify credentials.')
          setLoading(false)
          return
        }
      }

      if (!authData.user) {
        if (isConsumerSuccess) {
          toast({
            title: 'Authentication Successful',
            description: 'Welcome back to HousePadi. Redirecting...',
          })
          window.location.href = searchParams.get('next') || '/consumer/profile'
          return
        }
        setError('Authentication failed. User not found.')
        setLoading(false)
        return
      }

      // 2. Fetch user profile and status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, is_approved, suspended, agency_id, agency_status')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        await supabase.auth.signOut()
        setError(`Access Denied: Could not retrieve your profile.`)
        setLoading(false)
        return
      }

      if (!profile) {
        await supabase.auth.signOut()
        setError('Access Denied: Profile not found in the system.')
        setLoading(false)
        return
      }

      // 3. Check approval for agencies (Checked first because pending agencies are set to suspended: true)
      if (profile.role === 'AGENCY') {
        if (profile.agency_status === 'pending_review') {
          await supabase.auth.signOut()
          setError('Your account is awaiting confirmation from a moderator.')
          setLoading(false)
          return
        }
        if (profile.agency_status === 'revoked') {
          await supabase.auth.signOut()
          setError('Your agency application has been revoked. Please contact support for more details.')
          setLoading(false)
          return
        }
      }

      // 4. Check for Account Suspension
      if (profile.suspended) {
        await supabase.auth.signOut()
        setError('Your account has been suspended by the platform moderators. Please reach out to a lead moderator for remediation.')
        setLoading(false)
        return
      }

      // 5. Check for Organizational Suspension (if Agent)
      if (profile.role === 'AGENT' && profile.agency_id) {
        const { data: agencyProfile } = await supabase
          .from('profiles')
          .select('suspended')
          .eq('id', profile.agency_id)
          .single()
        
        if (agencyProfile?.suspended) {
          await supabase.auth.signOut()
          setError('Your associated agency has been suspended. Please contact your agency administrator or a system moderator.')
          setLoading(false)
          return
        }
      }

      // 6. Check approval for moderators
      if (profile.role === 'MODERATOR' && profile.is_approved !== true) {
        await supabase.auth.signOut()
        setError('Your account is pending approval. Please contact a lead moderator.')
        setLoading(false)
        return
      }

      // 7. Automatically redirect based on user's database role
      let redirectPath = ''
      if (profile.role === 'MODERATOR') {
        redirectPath = '/admin'
      } else if (profile.role === 'AGENCY') {
        redirectPath = '/agency'
      } else if (profile.role === 'AGENT') {
        redirectPath = '/agent'
      } else if (profile.role === 'product_vendor' || profile.role === 'PRODUCT_VENDOR') {
        const { data: vendorProfile } = await supabase
          .from('vendor_profiles')
          .select('is_verified')
          .eq('id', authData.user.id)
          .single()
          
        if (!vendorProfile?.is_verified) {
          await resendVendorVerificationOTP(authData.user.id)
          await supabase.auth.signOut()
          toast({
            title: 'Account Not Verified',
            description: 'We have resent your verification code. Redirecting...',
          })
          router.push(`/vendor-signup/verify?userId=${authData.user.id}`)
          return
        }
        redirectPath = '/vendor'
      } else if (profile.role === 'DEVELOPER') {
        redirectPath = '/developer'
      } else if (profile.role === 'CONSUMER') {
        redirectPath = '/consumer/profile'
      } else {
        await supabase.auth.signOut()
        setError('Access Denied: Your assigned role is not recognized in the system.')
        setLoading(false)
        return
      }

      const nextParam = searchParams.get('next')
      const finalRedirect = nextParam || redirectPath

      toast({
        title: 'Authentication Successful',
        description: 'Welcome back to HousePadi. Redirecting...',
      })

      window.location.href = finalRedirect
    } catch (err) {
      console.error('Login system error:', err)
      setError('A system error occurred during authentication.')
      setLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }
    setLoading(true)
    try {
      const res = await verifyConsumerOTP(email, otpCode)
      if (res.success) {
        toast({
          title: 'Authentication Successful',
          description: 'Welcome back to HousePadi. Redirecting...',
        })
        window.location.href = searchParams.get('next') || '/consumer/profile'
      } else {
        setError(res.error || 'Invalid verification code.')
      }
    } catch (err) {
      setError('A system error occurred during verification.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-black overflow-x-hidden">
      {/* Background Particles */}
      <div className="absolute inset-0 z-0 opacity-30">
        <Particles
          className="w-full h-full"
          particleColors={["#ffffff"]}
          particleCount={120}
          particleSpread={15}
          speed={0.03}
          particleBaseSize={60}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
        />
      </div>

      <div className="relative z-10 w-full max-w-[480px] px-6 py-12 mx-auto">
        <div className="bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 p-10 space-y-8 shadow-2xl relative overflow-hidden group">
          {/* Subtle gradient light flare on top */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neutral-500 to-transparent opacity-50" />
          
          <div className="text-center space-y-4">
            <div className="mb-10 text-center flex flex-col items-center">
              <Link href="/">
                <img src="/logo.svg" alt="HousePadi Logo" className="h-20 w-auto mb-4 hover:opacity-80 transition-opacity" style={{ filter: 'brightness(0) invert(1)' }} />
              </Link>
              <p className="text-neutral-500 text-[10px] uppercase tracking-[0.4em] font-bold">Secure Access Gateway</p>
            </div>
          </div>

          {mode === 'login' ? (
            <>
              <div className="space-y-2 text-center pt-2">
                <div className="w-10 h-10 bg-neutral-950 border border-neutral-800 flex items-center justify-center mx-auto mb-3">
                  <Key className="w-4 h-4 text-neutral-500" />
                </div>
                <h2 className="text-lg font-light text-white tracking-tight">Identity Verification</h2>
                <p className="text-neutral-500 text-[9px] uppercase tracking-[0.2em] font-bold">Enter credentials to authenticate</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-950/20 border border-red-900/50 text-red-400 text-[10px] uppercase tracking-wider font-bold leading-relaxed">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Identity (Email)</label>
                  <Input
                    type="email"
                    placeholder="identity@housepadi.example"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Security Key</label>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot')
                        setError(null)
                        setForgotSuccess(false)
                      }}
                      className="text-[10px] uppercase tracking-widest text-neutral-600 hover:text-white transition-all font-bold cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-white text-black hover:bg-neutral-200 rounded-none text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md hover:shadow-lg" 
                  disabled={loading}
                >
                  {loading ? 'Verifying Identity...' : 'Sign In'}
                </Button>
              </form>
            </>
          ) : mode === 'forgot' ? (
            <>
              <div className="space-y-2 text-center pt-2">
                <div className="w-10 h-10 bg-neutral-950 border border-neutral-800 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-4 h-4 text-neutral-500" />
                </div>
                <h2 className="text-lg font-light text-white tracking-tight">Password Recovery</h2>
                <p className="text-neutral-500 text-[9px] uppercase tracking-[0.2em] font-bold">Receive a security key reset link</p>
              </div>

              {forgotSuccess ? (
                <div className="space-y-6">
                  <div className="p-4 bg-neutral-950/20 border border-emerald-800/40 text-emerald-400 text-[10px] uppercase tracking-wider font-bold leading-relaxed">
                    A temporary security key has been dispatched to your email. Please check your inbox and use it to log in.
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setMode('login')
                      setError(null)
                      setForgotSuccess(false)
                    }}
                    className="w-full h-12 bg-white text-black hover:bg-neutral-200 rounded-none text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    Back to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-950/20 border border-red-900/50 text-red-400 text-[10px] uppercase tracking-wider font-bold leading-relaxed">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Identity (Email)</label>
                    <Input
                      type="email"
                      placeholder="identity@housepadi.example"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="rounded-none bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 focus-visible:ring-offset-0 transition-all"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-white text-black hover:bg-neutral-200 rounded-none text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md hover:shadow-lg" 
                    disabled={loading}
                  >
                    {loading ? 'Requesting Key...' : 'Send Temporary Key'}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login')
                      setError(null)
                      setForgotSuccess(false)
                    }}
                    className="block w-full py-3 border border-neutral-800 bg-black text-neutral-400 hover:text-white hover:border-neutral-600 hover:bg-neutral-900 transition-all text-[10px] uppercase tracking-widest font-bold text-center cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </form>
              )}
            </>
          ) : mode === 'otp' ? (
            <>
              <div className="space-y-2 text-center pt-2">
                <div className="w-10 h-10 bg-neutral-950 border border-neutral-800 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <h2 className="text-lg font-light text-white tracking-tight">Verify Account</h2>
                <p className="text-neutral-500 text-[9px] uppercase tracking-[0.2em] font-bold">Enter the verification code sent to your email</p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-950/20 border border-red-900/50 text-red-400 text-[10px] uppercase tracking-wider font-bold leading-relaxed">
                    {error}
                  </div>
                )}

                <div className="space-y-2 flex flex-col items-center">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold w-full text-center mb-2">Verification Code</label>
                  <InputOTP
                    id="otp"
                    maxLength={6}
                    value={otpCode}
                    onChange={setOtpCode}
                    disabled={loading}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} className="bg-neutral-950 border-neutral-800 text-white" />
                      <InputOTPSlot index={1} className="bg-neutral-950 border-neutral-800 text-white" />
                      <InputOTPSlot index={2} className="bg-neutral-950 border-neutral-800 text-white" />
                      <InputOTPSlot index={3} className="bg-neutral-950 border-neutral-800 text-white" />
                      <InputOTPSlot index={4} className="bg-neutral-950 border-neutral-800 text-white" />
                      <InputOTPSlot index={5} className="bg-neutral-950 border-neutral-800 text-white" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-white text-black hover:bg-neutral-200 rounded-none text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-md hover:shadow-lg" 
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError(null)
                    setOtpCode('')
                  }}
                  className="block w-full py-3 border border-neutral-800 bg-black text-neutral-400 hover:text-white hover:border-neutral-600 hover:bg-neutral-900 transition-all text-[10px] uppercase tracking-widest font-bold text-center cursor-pointer"
                >
                  Back to Sign In
                </button>
              </form>
            </>
          ) : null}

          <div className="pt-6 border-t border-neutral-800 text-center space-y-4">
            <button
              type="button"
              onClick={() => setShowSignupModal(true)}
              className="block w-full py-3 border border-neutral-800 bg-black text-white hover:text-white hover:border-neutral-600 hover:bg-neutral-900 transition-all text-[10px] uppercase tracking-widest font-bold text-center cursor-pointer"
            >
              Apply for Access / Create an Account
            </button>
            <Link href="/" className="block text-[10px] uppercase tracking-widest text-neutral-600 hover:text-white transition-all">
              Return to public interface
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative architectural elements */}
      <div className="absolute top-0 right-0 w-64 h-64 border-t border-r border-neutral-900/50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 border-b border-l border-neutral-900/50 pointer-events-none" />

      {/* Signup Modal Selection */}
      <Dialog open={showSignupModal} onOpenChange={setShowSignupModal}>
        <DialogContent className="bg-black/95 border border-neutral-800 text-white rounded-none sm:max-w-lg p-8 backdrop-blur-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader className="space-y-2 pb-4 border-b border-neutral-900">
            <DialogTitle className="text-xl font-light tracking-tight text-white">
              Create an Account
            </DialogTitle>
            <DialogDescription className="text-neutral-500 text-[9px] uppercase tracking-[0.2em] font-bold">
              Select your profile type to begin registration
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            {/* Option 1: Space Explorer */}
            <button
              type="button"
              onClick={() => {
                setShowSignupModal(false)
                openAuthModal('signup')
              }}
              className="w-full flex items-center justify-between p-4 border border-neutral-900 bg-neutral-950 hover:bg-neutral-900/40 hover:border-neutral-700 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-neutral-800 bg-black flex items-center justify-center text-neutral-500 group-hover:text-white transition-colors">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-white">Looking for a Space?</h4>
                  <p className="text-[10px] text-neutral-500 font-light mt-0.5">Explore, search, view, and rent properties</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>

            {/* Option 2: Agency */}
            <Link
              href="/agency-signup"
              onClick={() => setShowSignupModal(false)}
              className="w-full flex items-center justify-between p-4 border border-neutral-900 bg-neutral-950 hover:bg-neutral-900/40 hover:border-neutral-700 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-neutral-800 bg-black flex items-center justify-center text-neutral-500 group-hover:text-white transition-colors">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-white">Real Estate Agency</h4>
                  <p className="text-[10px] text-neutral-500 font-light mt-0.5">Apply for access as an official brokerage</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </Link>

            {/* Option 3: Independent Agent */}
            <Link
              href="/agent-signup"
              onClick={() => setShowSignupModal(false)}
              className="w-full flex items-center justify-between p-4 border border-neutral-900 bg-neutral-950 hover:bg-neutral-900/40 hover:border-neutral-700 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-neutral-800 bg-black flex items-center justify-center text-neutral-500 group-hover:text-white transition-colors">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-white">Independent Agent</h4>
                  <p className="text-[10px] text-neutral-500 font-light mt-0.5">Register as an individual agent to post properties</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </Link>

            {/* Option 4: Product Vendor */}
            <Link
              href="/vendor-signup"
              onClick={() => setShowSignupModal(false)}
              className="w-full flex items-center justify-between p-4 border border-neutral-900 bg-neutral-950 hover:bg-neutral-900/40 hover:border-neutral-700 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-neutral-800 bg-black flex items-center justify-center text-neutral-500 group-hover:text-white transition-colors">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-white">Product Vendor</h4>
                  <p className="text-[10px] text-neutral-500 font-light mt-0.5">List and sell interior decor, furniture, or design assets</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </Link>

            {/* Option 5: Developer */}
            <Link
              href="/developer-signup"
              onClick={() => setShowSignupModal(false)}
              className="w-full flex items-center justify-between p-4 border border-neutral-900 bg-neutral-950 hover:bg-neutral-900/40 hover:border-neutral-700 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border border-neutral-800 bg-black flex items-center justify-center text-neutral-500 group-hover:text-white transition-colors">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-white">Developer Portal</h4>
                  <p className="text-[10px] text-neutral-500 font-light mt-0.5">Access developer toolkits and spatial APIs</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-t-2 border-white animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

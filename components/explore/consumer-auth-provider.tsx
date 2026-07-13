'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentConsumer, loginConsumer, signupConsumer, logoutConsumer, verifyConsumerOTP, ConsumerSession } from '@/app/actions/consumer-auth-actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, Lock, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { requestTemporaryPassword } from '@/app/actions/auth-actions'
import { useAuth } from '@/lib/auth-context'

interface ConsumerAuthContextType {
  consumer: ConsumerSession | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; requireOtp?: boolean; error?: string }>
  signup: (email: string, password: string) => Promise<{ success: boolean; requireOtp?: boolean; error?: string }>
  logout: () => Promise<void>
  triggerProtectedAction: (action: () => void, options?: { isFavorite?: boolean }) => void
  openAuthModal: (mode?: 'login' | 'signup') => void
  closeAuthModal: () => void
}

const ConsumerAuthContext = createContext<ConsumerAuthContextType | undefined>(undefined)

export function ConsumerAuthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [consumer, setConsumer] = useState<ConsumerSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [restrictedModalOpen, setRestrictedModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'otp'>('login')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formOtp, setFormOtp] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)

  const activeSession = consumer

  const router = useRouter()

  // 1. Initial Session Load
  useEffect(() => {
    async function loadSession() {
      try {
        const res = await getCurrentConsumer()
        if (res.success) {
          if (res.consumer) {
            setConsumer(res.consumer)
          } else if ((res as any).requireOtp) {
            setFormEmail((res as any).email || '')
            setAuthMode('otp')
            setAuthModalOpen(true)
          }
        }
      } catch (err) {
        console.error('Error loading consumer session:', err)
      } finally {
        setLoading(false)
      }
    }
    loadSession()

    // Listen for URL query parameters to trigger consumer auth modal
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const auth = params.get('auth')
      if (auth === 'signup') {
        setAuthMode('signup')
        setFormEmail('')
        setFormPassword('')
        setAuthModalOpen(true)
        const cleanSearch = window.location.search.replace(/[?&]auth=signup/, '').replace(/^&/, '?')
        const newUrl = window.location.pathname + (cleanSearch === '?' ? '' : cleanSearch)
        window.history.replaceState({}, '', newUrl)
      } else if (auth === 'login') {
        setAuthMode('login')
        setFormEmail('')
        setFormPassword('')
        setAuthModalOpen(true)
        const cleanSearch = window.location.search.replace(/[?&]auth=login/, '').replace(/^&/, '?')
        const newUrl = window.location.pathname + (cleanSearch === '?' ? '' : cleanSearch)
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [])

  // 2. Action wrappers
  const login = async (email: string, password: string) => {
    const res = await loginConsumer(email, password)
    if (res.success && 'consumer' in res && res.consumer) {
      setConsumer(res.consumer)
    }
    return res as { success: boolean; requireOtp?: boolean; error?: string }
  }

  const signup = async (email: string, password: string) => {
    const res = await signupConsumer(email, password)
    if (res.success && 'consumer' in res && (res as any).consumer) {
      setConsumer((res as any).consumer as ConsumerSession)
    }
    return res as { success: boolean; requireOtp?: boolean; error?: string }
  }

  const logout = async () => {
    await logoutConsumer()
    setConsumer(null)
    router.refresh()
  }

  const openAuthModal = (mode: 'login' | 'signup' = 'login') => {
    setAuthMode(mode)
    setFormEmail('')
    setFormPassword('')
    setFormOtp('')
    setAuthModalOpen(true)
  }

  const closeAuthModal = () => {
    setAuthModalOpen(false)
    setPendingAction(null)
  }

  // 3. Protected Action Interceptor
  const triggerProtectedAction = (action: () => void, options?: { isFavorite?: boolean }) => {
    if (options?.isFavorite) {
      // Favorites/collections are tied to a consumer_id, so only a real consumer session
      // can perform them. A signed-in agent/vendor/admin gets an explanatory dialog instead
      // of the generic login prompt, since they're not actually logged out.
      if (consumer) {
        action()
        return
      }
      if (!loading && !!user) {
        setRestrictedModalOpen(true)
        return
      }
      setPendingAction(() => action)
      openAuthModal()
      return
    }

    // Non-favorite protected actions (viewing/paying for contact info, etc.) are backed by
    // server actions that already accept any authenticated Supabase user as a fallback
    // identity when there's no consumer session — so any signed-in user (consumer, agent,
    // vendor, admin) should be let through here rather than being forced into a consumer login.
    if (activeSession || user) {
      action()
    } else {
      setPendingAction(() => action)
      openAuthModal()
    }
  }

  // Forgot Password handler
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError(null)
    setAuthLoading(true)
    setForgotSuccess(false)

    try {
      const result = await requestTemporaryPassword(formEmail)

      if (!result.success) {
        setForgotError(result.error || 'An error occurred.')
        setAuthLoading(false)
        return
      }

      setForgotSuccess(true)
      toast.success('Temporary Key Dispatched', {
        description: 'Check your email for the temporary security key.',
      })
    } catch (err) {
      console.error('Password reset error:', err)
      setForgotError('A system error occurred while trying to send the recovery email.')
    } finally {
      setAuthLoading(false)
    }
  }

  // 4. Form Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formEmail || !formPassword) {
      toast.error('Please enter all required fields')
      return
    }

    setAuthLoading(true)
    try {
      if (authMode === 'login') {
        const res = await login(formEmail, formPassword)
        if (res.success) {
          if (res.requireOtp) {
            setAuthMode('otp')
            toast.success('Check your email for the verification code.')
          } else {
            toast.success('Access Granted. Session synchronised.')
            setAuthModalOpen(false)
            if (pendingAction) {
              pendingAction()
              setPendingAction(null)
            }
          }
        } else {
          toast.error(res.error || 'Authentication failed. Please verify credentials.')
        }
      } else if (authMode === 'signup') {
        const res = await signup(formEmail, formPassword)
        if (res.success) {
          if (res.requireOtp) {
            setAuthMode('otp')
            toast.success('Check your email for the verification code.')
          } else {
            toast.success('Consumer Account Registered Successfully')
            setAuthModalOpen(false)
            if (pendingAction) {
              pendingAction()
              setPendingAction(null)
            }
          }
        } else {
          toast.error(res.error || 'Registration failed. Try again.')
        }
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred during authentication.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formOtp || formOtp.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }
    setAuthLoading(true)
    try {
      const res = await verifyConsumerOTP(formEmail, formOtp)
      if (res.success && res.consumer) {
        setConsumer(res.consumer)
        toast.success('Account verified successfully')
        setAuthModalOpen(false)
        if (pendingAction) {
          pendingAction()
          setPendingAction(null)
        }
      } else {
        toast.error(res.error || 'Invalid verification code')
      }
    } catch (err: any) {
      toast.error('Verification failed')
    } finally {
      setAuthLoading(false)
    }
  }

  return (
    <ConsumerAuthContext.Provider
      value={{
        consumer: activeSession,
        loading,
        login,
        signup,
        logout,
        triggerProtectedAction,
        openAuthModal,
        closeAuthModal
      }}
    >
      {children}

      {/* Modern Glassmorphic Dialog Gatekeeper */}
      <Dialog open={authModalOpen} onOpenChange={(open) => !open && closeAuthModal()}>
        <DialogContent className="sm:max-w-[420px] bg-neutral-950/80 backdrop-blur-xl border border-white/5 text-white p-8 rounded-none">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-light text-center tracking-tight">
              {authMode === 'login' 
                ? 'Login' 
                : authMode === 'signup' 
                  ? 'Create Consumer Account' 
                  : authMode === 'otp'
                    ? 'Verify Account'
                    : 'Password Recovery'}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400 text-center font-normal leading-relaxed">
              {authMode === 'login' 
                ? 'Sign in to access virtual viewings, manage favorites, and complete spatial transactions.' 
                : authMode === 'signup' 
                  ? 'Create an account to unlock advanced 3D immersion, bookmark spaces, and access premium real estate features.'
                  : authMode === 'otp'
                    ? 'Enter the 6-digit verification code sent to your email.'
                    : 'Receive a temporary security key to log back into the access gateway.'}
            </DialogDescription>
          </DialogHeader>

          {authMode === 'otp' ? (
            <form onSubmit={handleOtpSubmit} className="space-y-6 pt-4">
              <div className="space-y-2 flex flex-col items-center">
                <Label htmlFor="otp" className="text-xs font-semibold text-neutral-400 uppercase tracking-widest text-center w-full mb-2">Verification Code</Label>
                <InputOTP
                  id="otp"
                  maxLength={6}
                  value={formOtp}
                  onChange={setFormOtp}
                  disabled={authLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="bg-neutral-900/60 border-neutral-800 text-white" />
                    <InputOTPSlot index={1} className="bg-neutral-900/60 border-neutral-800 text-white" />
                    <InputOTPSlot index={2} className="bg-neutral-900/60 border-neutral-800 text-white" />
                    <InputOTPSlot index={3} className="bg-neutral-900/60 border-neutral-800 text-white" />
                    <InputOTPSlot index={4} className="bg-neutral-900/60 border-neutral-800 text-white" />
                    <InputOTPSlot index={5} className="bg-neutral-900/60 border-neutral-800 text-white" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none mt-2"
                disabled={authLoading}
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-xs text-neutral-400 hover:text-white transition-all underline decoration-white/20 underline-offset-4"
                  disabled={authLoading}
                >
                  Back to Login
                </button>
              </div>
            </form>
          ) : authMode === 'forgot' ? (
            forgotSuccess ? (
              <div className="space-y-6 pt-4">
                <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 text-emerald-400 text-[10px] uppercase tracking-wider font-bold leading-relaxed">
                  A temporary security key has been dispatched to your email. Please check your inbox and use it to log in.
                </div>
                <Button
                  type="button"
                  onClick={() => {
                    setAuthMode('login')
                    setForgotSuccess(false)
                  }}
                  className="w-full h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none"
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-6 pt-4">
                {forgotError && (
                  <div className="p-4 bg-red-950/20 border border-red-900/50 text-red-400 text-[10px] uppercase tracking-wider font-bold leading-relaxed">
                    {forgotError}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="name@domain.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="pl-10 bg-neutral-900/60 border-neutral-800 focus-visible:ring-emerald-500 h-11 text-sm rounded-none text-white placeholder:text-neutral-600 disabled:opacity-50"
                      disabled={authLoading}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none mt-2"
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Requesting Key...
                    </>
                  ) : (
                    'Send Temporary Key'
                  )}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login')
                      setForgotError(null)
                    }}
                    className="text-xs text-neutral-400 hover:text-white transition-all underline decoration-white/20 underline-offset-4"
                    disabled={authLoading}
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-6 pt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@domain.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="pl-10 bg-neutral-900/60 border-neutral-800 focus-visible:ring-emerald-500 h-11 text-sm rounded-none text-white placeholder:text-neutral-600 disabled:opacity-50"
                      disabled={authLoading}
                      required
                    />
                  </div>
                </div>

                {authMode === 'login' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password" className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Security Pin / Password</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot')
                          setForgotSuccess(false)
                          setForgotError(null)
                        }}
                        className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white transition-all font-bold cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="pl-10 bg-neutral-900/60 border-neutral-800 focus-visible:ring-emerald-500 h-11 text-sm rounded-none text-white placeholder:text-neutral-600"
                        disabled={authLoading}
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Security Pin / Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        className="pl-10 bg-neutral-900/60 border-neutral-800 focus-visible:ring-emerald-500 h-11 text-sm rounded-none text-white placeholder:text-neutral-600"
                        disabled={authLoading}
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none mt-2"
                disabled={authLoading}
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  authMode === 'login' ? 'Login' : 'Register Account'
                )}
              </Button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="text-xs text-neutral-400 hover:text-white transition-all underline decoration-white/20 underline-offset-4"
                  disabled={authLoading}
                >
                  {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Restricted Action Glassmorphic Dialog */}
      <Dialog open={restrictedModalOpen} onOpenChange={setRestrictedModalOpen}>
        <DialogContent className="sm:max-w-[420px] bg-neutral-950/85 backdrop-blur-xl border border-white/5 text-white p-8 rounded-none text-center">
          <DialogHeader className="space-y-3 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-950/40 border border-red-900/50 flex items-center justify-center mb-2">
              <Lock className="w-5 h-5 text-red-400" />
            </div>
            <DialogTitle className="text-xl font-light tracking-tight">
              Action Restricted
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400 font-normal leading-relaxed text-center">
              Only Registered Consumers can add listings to favorites or collections. Since you are logged in as a provider/agent/vendor, please use a Consumer account to perform this action.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <Button
              onClick={() => setRestrictedModalOpen(false)}
              className="w-full h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none"
            >
              Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ConsumerAuthContext.Provider>
  )
}

export function useConsumerAuth() {
  const context = useContext(ConsumerAuthContext)
  if (context === undefined) {
    throw new Error('useConsumerAuth must be used within a ConsumerAuthProvider')
  }
  return context
}

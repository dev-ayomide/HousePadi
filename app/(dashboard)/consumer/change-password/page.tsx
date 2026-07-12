'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import { updateUserPassword } from '@/app/actions/auth-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Lock, ShieldCheck, KeyRound, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export default function ChangePasswordPage() {
  const { consumer, loading: authLoading } = useConsumerAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Redirect if session is missing
  useEffect(() => {
    if (authLoading) return
    if (!consumer) {
      router.push('/auth/login')
    }
  }, [consumer, authLoading, router])

  if (authLoading || !consumer) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mb-2" />
        <span className="text-xs uppercase tracking-widest text-neutral-500">Loading settings...</span>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.')
      setFeedback({ type: 'error', message: 'Password must be at least 6 characters long.' })
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match. Please verify.')
      setFeedback({ type: 'error', message: 'Passwords do not match. Please verify.' })
      return
    }

    setLoading(true)
    try {
      const res = await updateUserPassword(newPassword)
      if (res.success) {
        toast.success('Your security password has been updated successfully.')
        setFeedback({ type: 'success', message: 'Your security password has been updated successfully.' })
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(res.error || 'Failed to change password.')
        setFeedback({ type: 'error', message: res.error || 'Failed to change password.' })
      }
    } catch (err) {
      toast.error('An unexpected error occurred.')
      setFeedback({ type: 'error', message: 'An unexpected error occurred.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white py-16 px-6 sm:px-8 lg:px-12">
      <div className="max-w-2xl mx-auto space-y-10">
        
        {/* Title */}
        <div className="flex flex-col space-y-2 border-b border-white/5 pb-6">
          <h1 className="text-2xl font-light tracking-tight uppercase">Security settings</h1>
          <p className="text-xs text-neutral-500 uppercase tracking-wider">Configure your authentication and login access details</p>
        </div>

        {/* Change Password Card */}
        <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/5 p-8 sm:p-10 space-y-8 relative overflow-hidden">
          
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-neutral-900 rounded-full blur-3xl opacity-20 pointer-events-none" />

          <div className="flex items-center gap-4 border-b border-white/5 pb-6">
            <div className="p-3 bg-white/5 border border-white/10 text-white rounded-none">
              <KeyRound className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-medium tracking-wide">Update Account Password</h2>
              <p className="text-xs text-neutral-500">Ensure your account uses a strong, unique security key</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {feedback && (
              <div className={`p-4 border text-xs uppercase tracking-wider font-semibold rounded-none ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                  : 'bg-red-950/30 border-red-500/30 text-red-400'
              }`}>
                {feedback.message}
              </div>
            )}
            <div className="space-y-4">
              
              {/* New Password Input */}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-xs uppercase tracking-wider text-neutral-400">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                  <Input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Enter new password (min. 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10 bg-neutral-900/40 border-white/5 focus-visible:ring-white h-11 text-sm rounded-none text-white placeholder:text-neutral-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-3.5 hover:text-white text-neutral-500 transition-colors"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-xs uppercase tracking-wider text-neutral-400">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                  <Input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10 bg-neutral-900/40 border-white/5 focus-visible:ring-white h-11 text-sm rounded-none text-white placeholder:text-neutral-600"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-3.5 hover:text-white text-neutral-500 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none px-8 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </div>
          </form>

        </div>

      </div>
    </div>
  )
}

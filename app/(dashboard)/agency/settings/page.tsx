'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Building2, 
  Shield, 
  Bell, 
  CreditCard,
  Save,
  Loader2,
  CheckCircle2,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { generatePresignedUrl } from '@/app/actions/r2-actions'
import { updateProfileAvatar, updateProfileMetadata } from '@/app/actions/profile-actions'
import { useToast } from '@/components/ui/use-toast'

interface SettingSectionProps {
  icon: any
  title: string
  description: string
  children: React.ReactNode
}

const SettingSection = ({ icon: Icon, title, description, children }: SettingSectionProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-12 border-b border-neutral-900 last:border-0">
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-white">
        <Icon className="w-4 h-4 text-neutral-500" />
        <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold">{title}</h3>
      </div>
      <p className="text-xs text-neutral-500 leading-relaxed pr-8">{description}</p>
    </div>
    <div className="lg:col-span-2 max-w-2xl">
      {children}
    </div>
  </div>
)

export default function AgencySettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  
  // Security State
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Visual Identity State
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select(`
          full_name,
          email,
          role,
          avatar_url,
          agency_subscriptions (
            subscription_plans (
              name
            )
          )
        `)
        .eq('id', user.id)
        .single()
      
      if (data) setProfile(data)
      setLoading(false)
    }
    loadProfile()
  }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    const result = await updateProfileMetadata(user?.id!, { full_name: profile.full_name })

    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Institutional preferences updated successfully.' })
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    }
    setSaving(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' })
      return
    }

    setPasswordLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Security credentials updated successfully.' })
      setPassword('')
      setConfirmPassword('')
      setPasswordSuccess(true)
      setTimeout(() => setPasswordSuccess(false), 3000)
    }
    setPasswordLoading(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Limit to 3MB
    if (file.size > 3 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum allowed size is 3MB.', variant: 'destructive' })
      return
    }

    setUploading(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `agency-assets/${fileName}`

      // Upload to Cloudflare R2
      const presigned = await generatePresignedUrl(filePath, file.type)
      
      if (!presigned.success || !presigned.signedUrl) {
        throw new Error(presigned.error || 'Failed to generate upload URL')
      }
      
      await fetch(presigned.signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })

      const publicUrl = presigned.publicUrl!

      // Update Supabase profile with revalidation
      const result = await updateProfileAvatar(user.id, publicUrl)

      if (!result.success) throw new Error(result.error)

      setProfile({ ...profile, avatar_url: publicUrl })
      toast({ title: 'Success', description: 'Visual identity updated.' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto animate-in fade-in duration-700 pb-32">
      <div className="space-y-2 mb-12 border-b border-neutral-800 pb-8">
        <h1 className="text-3xl font-medium text-white tracking-tight">Institutional Preferences</h1>
        <p className="text-neutral-500 text-[10px] uppercase tracking-[0.3em] font-bold">
          Organization Identity & Security Controls
        </p>
      </div>

      <div className="space-y-0">
        <SettingSection 
          icon={Building2} 
          title="Organization Profile" 
          description="Manage your institutional identity and primary point of contact across the platform."
        >
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold">Organization Name</label>
              <Input 
                value={profile?.full_name || ''} 
                onChange={e => setProfile({...profile, full_name: e.target.value})}
                className="bg-neutral-900/40 border-neutral-800 text-white rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold">Primary Email (Locked)</label>
              <Input 
                disabled 
                value={profile?.email || ''} 
                className="bg-neutral-950/50 border-neutral-900 text-neutral-600 rounded-none h-12 italic opacity-50 cursor-not-allowed"
              />
            </div>
            <div className="pt-4 flex items-center gap-4">
              <Button 
                type="submit" 
                disabled={saving}
                className={`h-12 px-12 text-xs font-bold uppercase tracking-widest transition-all rounded-none ${
                  profileSuccess 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : profileSuccess ? (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {profileSuccess ? 'Preferences Saved' : 'Update Profile'}
              </Button>

              <AnimatePresence>
                {profileSuccess && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2 text-green-500"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Updated</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </SettingSection>

        <SettingSection 
          icon={Activity} 
          title="Visual Identity" 
          description="Upload an organizational preview or property hero image to be showcased in the Featured Agencies ecosystem."
        >
          <div className="space-y-6">
            <div className="relative group aspect-video bg-neutral-900/40 border border-neutral-800 overflow-hidden flex items-center justify-center">
              {profile?.avatar_url ? (
                <img 
                  key={profile.avatar_url}
                  src={profile.avatar_url} 
                  alt="Agency Preview" 
                  className="w-full h-full object-cover opacity-80" 
                  onError={(e) => {
                    console.error('Image failed to load:', profile.avatar_url);
                  }}
                />
              ) : (
                <div className="text-center space-y-2">
                  <Activity className="w-8 h-8 text-neutral-700 mx-auto" />
                  <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">No Preview Image Uploaded</p>
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <label className="cursor-pointer bg-white text-black px-6 py-3 text-[10px] uppercase tracking-widest font-bold hover:bg-neutral-200 transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload Asset'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>
            </div>
            <p className="text-[10px] text-neutral-600 uppercase tracking-widest leading-relaxed">
              Recommended: 1920x1080px (16:9). Maximum size: 3MB.
            </p>
          </div>
        </SettingSection>

        <SettingSection 
          icon={Shield} 
          title="Security & Access" 
          description="Manage your organizational authentication credentials and security posture."
        >
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold">New Password</label>
                <Input 
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-neutral-900/40 border-neutral-800 text-white rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold">Confirm Password</label>
                <Input 
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="bg-neutral-900/40 border-neutral-800 text-white rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>
            </div>
            <div className="pt-4 flex items-center gap-4">
              <Button 
                type="submit" 
                disabled={passwordLoading || !password}
                className={`h-12 px-12 text-xs font-bold uppercase tracking-widest transition-all rounded-none ${
                  passwordSuccess 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-neutral-800 text-white hover:bg-neutral-700'
                }`}
              >
                {passwordLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : passwordSuccess ? (
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                ) : null}
                {passwordSuccess ? 'Identity Secured' : 'Update Credentials'}
              </Button>

              <AnimatePresence>
                {passwordSuccess && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2 text-green-500"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Success</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </form>
        </SettingSection>

        <SettingSection 
          icon={Bell} 
          title="Communications" 
          description="Configure how you receive operational alerts, moderation updates, and system broadcasts."
        >
          <div className="p-8 border border-neutral-900 bg-neutral-950/50 text-center space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold italic">Communication preferences are managed globally by the platform administration.</p>
          </div>
        </SettingSection>
      </div>
    </div>
  )
}

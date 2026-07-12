'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Shield, 
  Save,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/components/ui/use-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { generatePresignedUrl } from '@/app/actions/r2-actions'
import { updateProfileAvatar, updateProfileMetadata, deleteDeveloperAccount } from '@/app/actions/profile-actions'

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

export default function DeveloperSettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  
  // Profile State
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

  // Danger Zone State
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          full_name,
          email,
          role,
          avatar_url,
          tagline,
          website_url,
          phone_number
        `)
        .eq('id', user.id)
        .single()
      
      if (error) {
         console.error('Error fetching profile in settings:', error)
      }
      
      if (data) setProfile(data)
      setLoading(false)
    }
    loadProfile()
  }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    const result = await updateProfileMetadata(user?.id!, { 
      full_name: profile.full_name,
      tagline: profile.tagline,
      website_url: profile.website_url,
      phone_number: profile.phone_number
    })

    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: 'Success', description: 'Developer profile updated successfully.' })
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

    if (file.size > 3 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum allowed size is 3MB.', variant: 'destructive' })
      return
    }

    setUploading(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      const filePath = `developer-avatars/${fileName}`

      const presigned = await generatePresignedUrl(filePath, file.type)
      if (!presigned.success || !presigned.signedUrl) throw new Error(presigned.error || 'Failed to generate upload URL')
      
      await fetch(presigned.signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })
      const publicUrl = presigned.publicUrl!

      const result = await updateProfileAvatar(user.id, publicUrl)

      if (!result.success) throw new Error(result.error)

      setProfile({ ...profile, avatar_url: publicUrl })
      toast({ title: 'Success', description: 'Profile picture updated.' })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast({ title: 'Invalid Confirmation', description: 'Please type "DELETE" to confirm account deletion.', variant: 'destructive' })
      return
    }

    setDeleteLoading(true)
    try {
      const supabase = createClient()
      const result = await deleteDeveloperAccount(user?.id!)
      
      if (!result.success) {
        throw new Error(result.error)
      }

      toast({ title: 'Account Deleted', description: 'Your account has been permanently removed.' })
      
      // Sign out from Supabase Client to clear sessions
      await supabase.auth.signOut()
      
      // Redirect to homepage
      router.push('/')
    } catch (err: any) {
      toast({ title: 'Error deleting account', description: err.message, variant: 'destructive' })
    } finally {
      setDeleteLoading(false)
      setShowDeleteDialog(false)
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
        <h1 className="text-3xl font-medium text-white tracking-tight">Account Settings</h1>
        <p className="text-neutral-500 text-[10px] uppercase tracking-[0.3em] font-bold">
          Developer Identity & Security Controls
        </p>
      </div>

      <div className="space-y-0">
        <SettingSection 
          icon={User} 
          title="Developer Profile" 
          description="Manage your identity and contact details."
        >
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold">Full Name</label>
                <Input 
                  value={profile?.full_name || ''} 
                  onChange={e => setProfile({...profile, full_name: e.target.value})}
                  className="bg-neutral-900/40 border-neutral-800 text-white rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold">Contact Phone Number</label>
                <Input 
                  type="tel"
                  value={profile?.phone_number || ''} 
                  onChange={e => setProfile({...profile, phone_number: e.target.value})}
                  placeholder="e.g. +2348012345678"
                  className="bg-neutral-900/40 border-neutral-800 text-white rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold">Company / Project Name</label>
                <Input 
                  value={profile?.tagline || ''} 
                  onChange={e => setProfile({...profile, tagline: e.target.value})}
                  placeholder="e.g. NextGen PropTech"
                  className="bg-neutral-900/40 border-neutral-800 text-white rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold">Website URL</label>
                <Input 
                  value={profile?.website_url || ''} 
                  onChange={e => setProfile({...profile, website_url: e.target.value})}
                  placeholder="https://..."
                  className="bg-neutral-900/40 border-neutral-800 text-white rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-bold">Email Address (Locked)</label>
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
                {profileSuccess ? 'Profile Saved' : 'Update Profile'}
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
          icon={ImageIcon} 
          title="Profile Picture" 
          description="Upload an avatar or company logo to represent you."
        >
          <div className="space-y-6">
            <div className="relative group w-48 h-48 bg-neutral-900/40 border border-neutral-800 overflow-hidden flex items-center justify-center rounded-full">
              {profile?.avatar_url ? (
                <img 
                  key={profile.avatar_url}
                  src={profile.avatar_url} 
                  alt="Developer Profile" 
                  className="w-full h-full object-cover opacity-80" 
                />
              ) : (
                <div className="text-center space-y-2">
                  <User className="w-8 h-8 text-neutral-700 mx-auto" />
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <label className="cursor-pointer text-white px-4 py-2 text-[10px] uppercase tracking-widest font-bold hover:text-neutral-300 transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Change Photo'}
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </label>
              </div>
            </div>
            <p className="text-[10px] text-neutral-600 uppercase tracking-widest leading-relaxed">
              Recommended: 500x500px. Maximum size: 3MB.
            </p>
          </div>
        </SettingSection>

        <SettingSection 
          icon={Shield} 
          title="Security & Access" 
          description="Manage your account credentials."
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
                {passwordSuccess ? 'Identity Secured' : 'Update Password'}
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
          icon={Trash2} 
          title="Danger Zone" 
          description="Permanently delete your developer account and revoke all credentials."
        >
          <div className="space-y-6">
            <div className="p-4 border border-red-950/50 bg-red-950/20 text-neutral-300 text-xs leading-relaxed space-y-2">
              <p className="font-bold text-red-400 uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Warning: Permanent Deletion
              </p>
              <p>Deleting your developer account will permanently revoke your API keys, remove your profile information, and delete all associated data from the HousePadi Platform. This action is irreversible.</p>
            </div>
            
            <Button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="h-12 px-8 text-xs font-bold uppercase tracking-widest bg-red-950 hover:bg-red-900 text-red-400 hover:text-white rounded-none border border-red-900/50 transition-all"
            >
              Delete Account
            </Button>
          </div>
        </SettingSection>

      </div>

      {/* Account Deletion Confirmation Modal */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-black/95 border border-neutral-800 text-white rounded-none sm:max-w-md p-8 backdrop-blur-xl">
          <DialogHeader className="space-y-2 pb-4 border-b border-neutral-900">
            <DialogTitle className="text-xl font-light tracking-tight text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Confirm Account Deletion
            </DialogTitle>
            <DialogDescription className="text-neutral-500 text-[9px] uppercase tracking-[0.2em] font-bold">
              This action cannot be undone
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-4">
            <p className="text-neutral-400 text-xs font-light leading-relaxed">
              Are you absolutely sure you want to delete your developer account? Please type <span className="font-mono text-red-400 font-bold">DELETE</span> below to confirm.
            </p>

            <Input 
              type="text" 
              value={deleteConfirmText} 
              onChange={(e) => setDeleteConfirmText(e.target.value)} 
              placeholder="Type DELETE here" 
              className="bg-neutral-950 border-neutral-800 text-white placeholder:text-neutral-700 h-12 rounded-none focus-visible:ring-1 focus-visible:ring-red-700 focus-visible:ring-offset-0 transition-all font-mono"
            />

            <div className="flex gap-4 pt-4">
              <Button 
                onClick={() => setShowDeleteDialog(false)} 
                variant="outline" 
                className="flex-1 border-neutral-800 text-neutral-400 hover:bg-neutral-900 rounded-none h-12 text-xs uppercase tracking-widest font-bold"
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteAccount} 
                className="flex-1 bg-red-900 hover:bg-red-800 text-white rounded-none h-12 text-xs uppercase tracking-widest font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={deleteLoading || deleteConfirmText !== 'DELETE'}
              >
                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

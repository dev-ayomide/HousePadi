'use client'

import { useState, useEffect } from 'react'
import { 
  User, 
  Upload, 
  Save, 
  Lock,
  ShieldCheck,
  Loader2,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/lib/auth-context'
import { updateProfileAvatar, updateProfileMetadata } from '@/app/actions/profile-actions'
import { generatePresignedUrl } from '@/app/actions/r2-actions'

export default function ModeratorProfilePage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, tagline, bio, avatar_url')
        .eq('id', user.id)
        .single()
      
      if (error) {
        console.error('Error fetching profile:', error)
      }
      if (data) {
        setProfile(data)
      }
      setLoading(false)
    }
    loadProfile()
  }, [user])

  const handleSaveProfile = async () => {
    if (!user || !profile) return
    setSaving(true)
    const result = await updateProfileMetadata(user.id, {
      full_name: profile.full_name,
      tagline: profile.tagline || null,
      bio: profile.bio || null
    })

    if (result.success) {
      toast({ title: "Success", description: "Profile details updated successfully." })
    } else {
      toast({ title: "Update Failed", description: result.error, variant: "destructive" })
    }
    setSaving(false)
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
      const filePath = `moderator-avatars/${fileName}`

      // Upload to Cloudflare R2
      const presigned = await generatePresignedUrl(filePath, file.type)
      if (!presigned.success || !presigned.signedUrl) throw new Error(presigned.error || 'Failed to generate upload URL')
      
      await fetch(presigned.signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })
      const publicUrl = presigned.publicUrl!

      // Update Supabase profile
      const result = await updateProfileAvatar(user.id, publicUrl)
      if (!result.success) throw new Error(result.error)

      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }))
      toast({ title: 'Success', description: 'Portrait image updated successfully.' })
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: "Validation Error", description: "Please fill in both password fields.", variant: "destructive" })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Mismatch", description: "Passwords do not match.", variant: "destructive" })
      return
    }

    if (newPassword.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" })
      return
    }

    setUpdatingPassword(true)
    const supabase = createClient()
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Success", description: "Your login password has been updated securely." })
      setNewPassword('')
      setConfirmPassword('')
    }
    setUpdatingPassword(false)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center min-h-[600px]">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-10 max-w-[1000px] mx-auto space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Moderator Profile</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Administrative Identity
          </p>
        </div>
        
        <div className="flex gap-4">
          <Button 
            onClick={handleSaveProfile}
            disabled={saving}
            className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-6 text-xs font-bold uppercase tracking-widest transition-all"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Updating...' : 'Update Profile'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
        {/* Left Column: Form */}
        <div className="md:col-span-8 space-y-12">
          {/* Personal Info */}
          <div className="bg-neutral-900/20 border border-neutral-800 p-8 space-y-8">
            <div className="space-y-2 border-b border-neutral-800 pb-4">
              <h2 className="text-xl font-light text-white">Identity Details</h2>
              <p className="text-xs text-neutral-500 mt-1">Manage your internal platform credentials and representation.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Display Name</label>
                <Input 
                  value={profile?.full_name || ''}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Role / Position</label>
                <Input 
                  value={profile?.tagline || ''}
                  placeholder="e.g. Senior Moderator"
                  onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                  className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Professional Bio</label>
              <Textarea 
                value={profile?.bio || ''}
                placeholder="Brief professional background..."
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                className="rounded-none bg-black border-neutral-800 text-white min-h-[160px] resize-y focus-visible:ring-1 focus-visible:ring-neutral-700 p-4 leading-relaxed"
              />
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-neutral-900/20 border border-neutral-800 p-8 space-y-8">
            <div className="space-y-2 border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-neutral-500" />
                <h2 className="text-xl font-light text-white">Security Settings</h2>
              </div>
              <p className="text-xs text-neutral-500 mt-1">Update your administrative access credentials.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">New Password</label>
                <Input 
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Confirm New Password</label>
                <Input 
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>
            </div>

            <Button 
              onClick={handleUpdatePassword}
              disabled={updatingPassword}
              className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-6 text-xs font-bold uppercase tracking-widest transition-all w-full sm:w-auto"
            >
              {updatingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Securing Account...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Update Credentials
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right Column: Media */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-neutral-900/20 border border-neutral-800 p-6 space-y-4">
            <h3 className="text-xs uppercase tracking-[0.2em] text-white font-bold border-b border-neutral-800 pb-4">Profile Portrait</h3>
            
            <div className="aspect-[3/4] w-full border border-neutral-800 bg-black flex flex-col items-center justify-center relative group overflow-hidden">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Moderator Profile Portrait" 
                  className="w-full h-full object-cover opacity-80" 
                />
              ) : (
                <User className="w-16 h-16 text-neutral-800 absolute" />
              )}
              
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <label className="cursor-pointer text-white flex flex-col items-center justify-center w-full h-full">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white mb-2" />
                  ) : (
                    <Upload className="w-6 h-6 text-white mb-2" />
                  )}
                  <span className="text-xs font-medium text-white uppercase tracking-wider">
                    {uploading ? 'Uploading...' : 'Replace Image'}
                  </span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    disabled={uploading} 
                  />
                </label>
              </div>
            </div>
            
            <p className="text-[10px] text-neutral-500 leading-tight">
              Recommended: 800x1066px (3:4 ratio). This image is used for internal attribution.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}


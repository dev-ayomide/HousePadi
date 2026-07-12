'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import { getConsumerProfile, updateConsumerProfile, deleteConsumerAccount } from '@/app/actions/consumer-actions'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Loader2, User, Phone, Mail, Calendar, Camera, ShieldAlert, Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function ConsumerProfilePage() {
  const { consumer, loading: authLoading, logout } = useConsumerAuth()
  const router = useRouter()
  const supabase = createClient()

  // Profile data state
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [createdAt, setCreatedAt] = useState('')

  // Uploading state
  const [uploading, setUploading] = useState(false)

  // Dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!consumer) {
      // If not logged in, redirect to login page
      router.push('/auth/login')
      return
    }

    async function loadProfile() {
      try {
        const res = await getConsumerProfile(consumer!.id)
        if (res.success && res.data) {
          setFullName(res.data.full_name || '')
          setPhoneNumber(res.data.phone_number || '')
          setAvatarUrl(res.data.avatar_url || '')
          setCreatedAt(new Date(res.data.created_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }))
        } else {
          toast.error(res.error || 'Failed to retrieve profile details.')
        }
      } catch (err) {
        toast.error('An error occurred while loading your profile.')
      } finally {
        setProfileLoading(false)
      }
    }

    loadProfile()
  }, [consumer, authLoading, router])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    
    // File size constraint (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds the 2MB limit.')
      return
    }

    setUploading(true)
    const toastId = toast.loading('Uploading avatar...')
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${consumer!.id}/${Math.random()}.${fileExt}`

      // Attempt upload to 'consumer-avatars' bucket
      const { data, error: uploadError } = await supabase.storage
        .from('consumer-avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        // If bucket is missing, guide the user or throw to fallback
        throw new Error(uploadError.message)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('consumer-avatars')
        .getPublicUrl(filePath)

      setAvatarUrl(publicUrl)
      toast.success('Avatar uploaded successfully.', { id: toastId })
    } catch (err: any) {
      console.error('Avatar upload failed:', err)
      
      // Fallback base64 conversion for demonstration if bucket doesn't exist
      try {
        const reader = new FileReader()
        reader.onloadend = () => {
          setAvatarUrl(reader.result as string)
          toast.success('Avatar converted locally (Storage Bucket unavailable).', { id: toastId })
        }
        reader.readAsDataURL(file)
      } catch {
        toast.error('Could not upload avatar image.', { id: toastId })
      }
    } finally {
      setUploading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consumer) return

    setSaving(true)
    try {
      const res = await updateConsumerProfile(consumer.id, fullName, phoneNumber, avatarUrl)
      if (res.success) {
        toast.success('Profile details updated successfully.')
      } else {
        toast.error(res.error || 'Failed to save profile.')
      }
    } catch (err) {
      toast.error('Could not save profile details.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!consumer) return
    setDeleting(true)
    try {
      const res = await deleteConsumerAccount(consumer.id)
      if (res.success) {
        toast.success('Account permanently deleted.')
        await logout()
        router.push('/')
      } else {
        toast.error(res.error || 'Failed to delete account.')
      }
    } catch (err) {
      toast.error('A critical error occurred while deleting your account.')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  if (authLoading || (consumer && profileLoading)) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mb-2" />
        <span className="text-xs uppercase tracking-widest text-neutral-500">Retrieving profile...</span>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-white">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h1 className="text-2xl font-light tracking-tight uppercase">Profile Settings</h1>
      </div>

        {/* Profile Card */}
        <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/5 p-8 sm:p-10 space-y-8 relative overflow-hidden">
          
          {/* Decorative background gradient glow */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-neutral-900 rounded-full blur-3xl opacity-20 pointer-events-none" />

          {/* Profile Overview (Avatar section) */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-white/5">
            <div className="relative group">
              <Avatar className="w-24 h-24 rounded-none border border-neutral-800">
                <AvatarImage src={avatarUrl} alt={fullName} className="object-cover" />
                <AvatarFallback className="bg-neutral-900 text-neutral-400 text-xl font-light uppercase rounded-none">
                  {fullName ? fullName.substring(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <label 
                htmlFor="avatar-file"
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-white/10"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </label>
              <input 
                type="file" 
                id="avatar-file" 
                accept="image/*" 
                onChange={handleAvatarUpload} 
                className="hidden" 
                disabled={uploading}
              />
            </div>
            
            <div className="text-center sm:text-left space-y-1.5">
              <h2 className="text-lg font-medium tracking-wide">{fullName || 'Unspecified Name'}</h2>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Mail className="w-3.5 h-3.5" />
                <span>{consumer?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                <span>Joined {createdAt}</span>
              </div>
            </div>
          </div>

          {/* Edit Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full-name" className="text-xs uppercase tracking-wider text-neutral-400">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                  <Input
                    id="full-name"
                    type="text"
                    placeholder="Enter your name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 bg-neutral-900/40 border-white/5 focus-visible:ring-white h-11 text-sm rounded-none text-white placeholder:text-neutral-600"
                    required
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone-number" className="text-xs uppercase tracking-wider text-neutral-400">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                  <Input
                    id="phone-number"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10 bg-neutral-900/40 border-white/5 focus-visible:ring-white h-11 text-sm rounded-none text-white placeholder:text-neutral-600"
                  />
                </div>
              </div>

              {/* Email (Read Only - Disabled) */}
              <div className="space-y-2 sm:col-span-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider text-neutral-400">Email Address (Read-Only)</Label>
                  <span className="text-[9px] uppercase tracking-widest text-neutral-600 font-bold">Cannot be modified</span>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-600" />
                  <Input
                    id="email"
                    type="email"
                    value={consumer?.email || ''}
                    disabled
                    className="pl-10 bg-neutral-950 border-white/5 h-11 text-sm rounded-none text-neutral-500 opacity-60 cursor-not-allowed"
                  />
                </div>
              </div>

            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={saving}
                className="h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none px-8 transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Profile Details'
                )}
              </Button>
            </div>
          </form>

        </div>

        {/* Danger Zone (Account Deletion) */}
        <div className="border border-red-950 bg-red-950/10 p-8 sm:p-10 space-y-6 rounded-none">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-red-950/40 border border-red-900/30 text-red-500">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-red-400">Danger Zone</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Permanently delete your profile account and wipe all associated bookmarks, collections, access permissions, and history from our database. This action is immediate and completely irreversible.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="h-11 bg-red-650 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-none px-6 border border-red-500/20 bg-red-950/20 hover:bg-red-950/50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </div>



      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px] bg-neutral-950 border border-red-950/50 text-white p-8 rounded-none">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-lg font-medium tracking-tight text-red-400 uppercase">
              Confirm Account Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400 font-normal leading-relaxed">
              Are you absolutely sure you want to delete your HousePadi account? All favorites, custom collections, and viewing history will be wiped out from the system. You will be logged out automatically.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="h-11 border-neutral-800 bg-transparent text-white hover:bg-neutral-900 rounded-none text-xs tracking-widest uppercase transition-colors"
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleDeleteAccount}
              className="h-11 bg-red-600 hover:bg-red-700 text-white rounded-none text-xs font-bold tracking-widest uppercase transition-colors"
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete Permanent'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Camera, Shield, User, Globe, Tag, Phone } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { generatePresignedUrl } from '@/app/actions/r2-actions'
import { updateProfileAvatar, updateProfileMetadata } from '@/app/actions/profile-actions'

interface OnboardingModalProps {
  user: any
  onComplete: () => void
}

export function OnboardingModal({ user, onComplete }: OnboardingModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  // State
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [tagline, setTagline] = useState('')
  const [website, setWebsite] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
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
      const fileName = `onboarding/${user.id}-${Math.random()}.${fileExt}`
      
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!avatarUrl) {
      setAvatarError(true)
      toast({ title: 'Profile Picture Required', description: 'Please upload a profile picture to complete your profile.', variant: 'destructive' })
      return
    }

    if (!name || !password || !tagline || !phoneNumber) {
      toast({ title: 'Missing Info', description: 'Please complete all required fields.', variant: 'destructive' })
      return
    }

    if (password !== confirmPassword) {
      toast({ title: 'Security Conflict', description: 'Passwords do not match.', variant: 'destructive' })
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      // 1. Update Password
      const { error: pwdError } = await supabase.auth.updateUser({ password })
      if (pwdError) throw pwdError

      // 2. Update Profile
      const result = await updateProfileMetadata(user.id, {
        full_name: name,
        tagline: tagline,
        website_url: website,
        avatar_url: avatarUrl,
        phone_number: phoneNumber,
        is_approved: true // Assuming onboarding completes their setup
      })

      if (!result.success) throw new Error(result.error)

      toast({ title: 'Welcome aboard', description: 'Your profile has been initialized.' })
      onComplete()
    } catch (err: any) {
      toast({ title: 'Onboarding Failed', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        showCloseButton={false}
        className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-neutral-950 border-neutral-900 text-white rounded-none p-0 custom-scrollbar"
      >
        <div className="bg-white h-1.5 w-full sticky top-0 z-10" />
        
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white flex items-center justify-center">
                <User className="text-black w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-light tracking-tight">Initialize Identity</DialogTitle>
                <DialogDescription className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">
                  Compulsory Security & Profile Provisioning
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6">
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

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold flex items-center gap-2">
                  <User className="w-3 h-3" /> Full Name
                </label>
                <Input 
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="John Doe"
                  className="bg-black border-neutral-900 rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold flex items-center gap-2">
                  <Phone className="w-3 h-3" /> Phone Number (Compulsory)
                </label>
                <Input 
                  required
                  type="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value)}
                  placeholder="e.g. +2348012345678"
                  className="bg-black border-neutral-900 rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
                <p className="text-[9px] text-neutral-500 tracking-wider">
                  This number will be used to contact you when someone decides to get your listing.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold flex items-center gap-2">
                  <Shield className="w-3 h-3" /> Set New Password
                </label>
                <Input 
                  required
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-black border-neutral-900 rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold flex items-center gap-2">
                  <Shield className="w-3 h-3" /> Confirm Password
                </label>
                <Input 
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-black border-neutral-900 rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold flex items-center gap-2">
                  <Tag className="w-3 h-3" /> Tagline / Role
                </label>
                <Input 
                  required
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  placeholder="e.g. Senior Real Estate Consultant"
                  className="bg-black border-neutral-900 rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold flex items-center gap-2">
                  <Globe className="w-3 h-3" /> Website / Portfolio (Optional)
                </label>
                <Input 
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="bg-black border-neutral-900 rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-neutral-900">
            <Button 
              type="submit" 
              disabled={loading || uploading}
              className="w-full bg-white text-black hover:bg-neutral-200 h-14 rounded-none text-xs font-bold uppercase tracking-[0.3em] transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Finalize Profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

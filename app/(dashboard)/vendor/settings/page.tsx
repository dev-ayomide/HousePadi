'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Settings, AlertTriangle } from 'lucide-react'
import { deleteVendorAccount } from '@/app/actions/profile-actions'
import { updateUserPassword } from '@/app/actions/auth-actions'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function VendorSettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  const handleDeleteAccount = async () => {
    if (!user) return
    setIsDeleting(true)
    const res = await deleteVendorAccount(user.id)
    if (res.success) {
      toast({
        title: 'Account Deleted',
        description: 'Your account and all associated products have been successfully deleted.',
      })
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
    } else {
      toast({
        title: 'Deletion Failed',
        description: res.error || 'There was an issue deleting your account.',
        variant: 'destructive',
      })
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      const supabase = createClient()
      const { data } = await supabase
        .from('vendor_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (data) {
        setProfile(data)
      }
      setLoading(false)
    }
    loadProfile()
  }, [user])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)

    const formData = new FormData(e.currentTarget)
    const businessName = formData.get('businessName') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const website = formData.get('website') as string

    const supabase = createClient()
    const { error } = await supabase
      .from('vendor_profiles')
      .update({
        business_name: businessName,
        phone_number: phone,
        business_address: address,
        website_url: website,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive'
      })
    } else {
      toast({
        title: 'Settings Saved',
        description: 'Your profile has been updated.',
      })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-light text-white">
          Store Settings
        </h1>
        <p className="text-sm text-neutral-400 mt-2">Manage your vendor profile and contact information.</p>
      </div>

      <div className="bg-neutral-900/30 border border-neutral-800 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Business Name</label>
              <Input
                name="businessName"
                defaultValue={profile?.business_name || ''}
                className="bg-black border-neutral-800 text-white rounded-none h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Phone Number (Required)</label>
              <Input
                name="phone"
                required
                defaultValue={profile?.phone_number || ''}
                className="bg-black border-neutral-800 text-white rounded-none h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Business Address</label>
              <Input
                name="address"
                defaultValue={profile?.business_address || ''}
                className="bg-black border-neutral-800 text-white rounded-none h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Website URL</label>
              <Input
                name="website"
                type="url"
                defaultValue={profile?.website_url || ''}
                className="bg-black border-neutral-800 text-white rounded-none h-12"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800">
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-white text-black hover:bg-neutral-200 rounded-none uppercase tracking-widest text-xs font-bold px-8 h-12"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-12 mb-8">
        <h2 className="text-xl font-light text-white flex items-center gap-2">
          Change Password
        </h2>
        <p className="text-sm text-neutral-400 mt-2">Update your account password.</p>
      </div>

      <div className="bg-neutral-900/30 border border-neutral-800 p-8">
        <form onSubmit={async (e) => {
          e.preventDefault()
          const form = e.currentTarget
          const fd = new FormData(form)
          const password = fd.get('password') as string
          const confirmPassword = fd.get('confirmPassword') as string
          
          if (password !== confirmPassword) {
            toast({
              title: 'Error',
              description: 'Passwords do not match.',
              variant: 'destructive'
            })
            return
          }

          if (password.length < 6) {
            toast({
              title: 'Error',
              description: 'Password must be at least 6 characters long.',
              variant: 'destructive'
            })
            return
          }

          setSaving(true)
          const result = await updateUserPassword(password)
          
          if (!result.success) {
            toast({
              title: 'Error',
              description: result.error,
              variant: 'destructive'
            })
          } else {
            toast({
              title: 'Success',
              description: 'Your password has been updated.',
            })
            form.reset()
          }
          setSaving(false)
        }} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">New Password</label>
              <Input
                name="password"
                type="password"
                required
                className="bg-black border-neutral-800 text-white rounded-none h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Confirm New Password</label>
              <Input
                name="confirmPassword"
                type="password"
                required
                className="bg-black border-neutral-800 text-white rounded-none h-12"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800">
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-white text-black hover:bg-neutral-200 rounded-none uppercase tracking-widest text-xs font-bold px-8 h-12"
            >
              Update Password
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-12 mb-8">
        <h2 className="text-xl font-light text-red-500 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Danger Zone
        </h2>
        <p className="text-sm text-neutral-400 mt-2">Irreversible, destructive actions for your vendor account.</p>
      </div>

      <div className="bg-red-950/10 border border-red-900/30 p-8 rounded-none">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-white font-medium">Delete Vendor Account</h3>
            <p className="text-neutral-500 text-sm">
              Permanently delete your vendor account and all its data. This will instantly cascade and remove all your products, transaction records, and profile details from the HousePadi platform. This action cannot be undone.
            </p>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="rounded-none font-bold uppercase tracking-widest text-xs h-12 px-8 whitespace-nowrap">
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-neutral-950 border-neutral-800 rounded-none">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white font-light tracking-wide">Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-neutral-400">
                  This action cannot be undone. This will permanently delete your vendor account 
                  <strong className="text-white ml-1">{profile?.business_name}</strong> and remove your data, including all active products, from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6">
                <AlertDialogCancel className="bg-transparent border-neutral-800 text-white hover:bg-neutral-900 hover:text-white rounded-none uppercase tracking-widest text-xs font-bold">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-none uppercase tracking-widest text-xs font-bold"
                >
                  Yes, delete account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Upload } from 'lucide-react'
import { TeamMember, createTeamMember, updateTeamMember } from '@/app/actions/about-actions'
import { useToast } from '@/components/ui/use-toast'
import { uploadFile, deleteFile } from '@/lib/supabase/storage-utils'
import Image from 'next/image'

interface TeamMemberModalProps {
  isOpen: boolean
  onClose: () => void
  member?: TeamMember
  onSuccess: () => void
}

export function TeamMemberModal({ isOpen, onClose, member, onSuccess }: TeamMemberModalProps) {
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    about: '',
    handle: '',
    status: '',
    image_url: '',
    is_visible: true,
    display_order: 0
  })

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name,
        role: member.role,
        about: member.about,
        handle: member.handle || '',
        status: member.status || '',
        image_url: member.image_url || '',
        is_visible: member.is_visible,
        display_order: member.display_order
      })
    } else {
      setFormData({
        name: '',
        role: '',
        about: '',
        handle: '',
        status: '',
        image_url: '',
        is_visible: true,
        display_order: 0
      })
    }
  }, [member, isOpen])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      // Delete old image if it exists
      if (formData.image_url) {
        await deleteFile(formData.image_url)
      }

      const url = await uploadFile(file, `team/${Date.now()}_${file.name}`)
      setFormData(prev => ({ ...prev, image_url: url }))
      toast({ title: "Image uploaded successfully" })
    } catch (error: any) {
      toast({ title: "Error uploading image", description: error.message, variant: "destructive" })
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (member) {
        const result = await updateTeamMember(member.id, formData)
        if (result.success) {
          toast({ title: "Team member updated" })
          onSuccess()
          onClose()
        } else {
          throw new Error(result.error)
        }
      } else {
        const result = await createTeamMember(formData)
        if (result.success) {
          toast({ title: "Team member created" })
          onSuccess()
          onClose()
        } else {
          throw new Error(result.error)
        }
      }
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border border-neutral-800 text-white sm:max-w-[600px] rounded-none p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-neutral-800 shrink-0">
          <DialogTitle className="text-xl font-medium tracking-tight">
            {member ? 'Edit Team Member' : 'Add Team Member'}
          </DialogTitle>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form id="team-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Image Upload Area */}
            <div className="flex items-center gap-6">
              <div 
                className="w-24 h-32 bg-neutral-900 border border-neutral-800 flex items-center justify-center relative overflow-hidden group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.image_url ? (
                  <>
                    <Image src={formData.image_url} alt="Profile" fill className="object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="w-5 h-5 text-white" />
                    </div>
                  </>
                ) : (
                  <div className="text-center text-neutral-500 group-hover:text-white transition-colors">
                    {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <Upload className="w-5 h-5 mx-auto" />}
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Profile Portrait</Label>
                <p className="text-xs text-neutral-400">Upload a high-quality vertical portrait. Recommended aspect ratio 3:4.</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Name</Label>
                <Input
                  id="name"
                  required
                  className="bg-neutral-950 border-neutral-800 rounded-none h-12 focus:ring-1 focus:ring-white transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Role / Title</Label>
                <Input
                  id="role"
                  required
                  className="bg-neutral-950 border-neutral-800 rounded-none h-12 focus:ring-1 focus:ring-white transition-all"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="handle" className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Handle / Social</Label>
                <Input
                  id="handle"
                  placeholder="@username"
                  className="bg-neutral-950 border-neutral-800 rounded-none h-12 focus:ring-1 focus:ring-white transition-all"
                  value={formData.handle}
                  onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Status Indicator</Label>
                <Input
                  id="status"
                  placeholder="e.g. Building, Designing"
                  className="bg-neutral-950 border-neutral-800 rounded-none h-12 focus:ring-1 focus:ring-white transition-all"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="about" className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Short Bio</Label>
              <Textarea
                id="about"
                required
                className="bg-neutral-950 border-neutral-800 rounded-none min-h-[100px] focus:ring-1 focus:ring-white transition-all resize-none"
                value={formData.about}
                onChange={(e) => setFormData({ ...formData, about: e.target.value })}
              />
            </div>

          </form>
        </div>

        <DialogFooter className="p-6 border-t border-neutral-800 shrink-0">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onClose}
            className="rounded-none h-12 text-neutral-400 hover:text-white hover:bg-neutral-900 px-8 text-[10px] uppercase tracking-widest font-bold"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="team-form"
            disabled={loading || uploadingImage}
            className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-8 text-[10px] uppercase tracking-widest font-bold"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

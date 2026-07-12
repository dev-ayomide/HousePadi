'use client'

import { useState, useEffect } from 'react'
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
import { Loader2 } from 'lucide-react'
import { Testimonial, createTestimonial, updateTestimonial } from '@/app/actions/testimonial-actions'
import { useToast } from '@/components/ui/use-toast'

interface TestimonialModalProps {
  isOpen: boolean
  onClose: () => void
  testimonial?: Testimonial
  onSuccess: () => void
}

export function TestimonialModal({ isOpen, onClose, testimonial, onSuccess }: TestimonialModalProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    author_name: '',
    author_role: '',
    author_company: '',
    content: '',
    is_visible: true,
    display_order: 0
  })

  useEffect(() => {
    if (testimonial) {
      setFormData({
        author_name: testimonial.author_name,
        author_role: testimonial.author_role,
        author_company: testimonial.author_company,
        content: testimonial.content,
        is_visible: testimonial.is_visible,
        display_order: testimonial.display_order
      })
    } else {
      setFormData({
        author_name: '',
        author_role: '',
        author_company: '',
        content: '',
        is_visible: true,
        display_order: 0
      })
    }
  }, [testimonial, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (testimonial) {
        const result = await updateTestimonial(testimonial.id, formData)
        if (result.success) {
          toast({ title: "Testimonial updated" })
          onSuccess()
          onClose()
        } else {
          throw new Error(result.error)
        }
      } else {
        const result = await createTestimonial(formData)
        if (result.success) {
          toast({ title: "Testimonial created" })
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
      <DialogContent className="bg-black border border-neutral-800 text-white sm:max-w-[500px] rounded-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium tracking-tight">
            {testimonial ? 'Edit Testimonial' : 'Add New Testimonial'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author_name" className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Author Name</Label>
              <Input
                id="author_name"
                required
                placeholder="e.g. John Doe"
                className="bg-neutral-950 border-neutral-800 rounded-none h-12 focus:ring-1 focus:ring-white transition-all"
                value={formData.author_name}
                onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author_role" className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Role / Title</Label>
              <Input
                id="author_role"
                required
                placeholder="e.g. CEO"
                className="bg-neutral-950 border-neutral-800 rounded-none h-12 focus:ring-1 focus:ring-white transition-all"
                value={formData.author_role}
                onChange={(e) => setFormData({ ...formData, author_role: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="author_company" className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Company Name</Label>
            <Input
              id="author_company"
              required
              placeholder="e.g. Skyline Realty"
              className="bg-neutral-950 border-neutral-800 rounded-none h-12 focus:ring-1 focus:ring-white transition-all"
              value={formData.author_company}
              onChange={(e) => setFormData({ ...formData, author_company: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Testimonial Content</Label>
            <Textarea
              id="content"
              required
              placeholder="Enter the client's quote here..."
              className="bg-neutral-950 border-neutral-800 rounded-none min-h-[120px] focus:ring-1 focus:ring-white transition-all resize-none"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            />
          </div>

          <DialogFooter className="pt-4">
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
              disabled={loading}
              className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-8 text-[10px] uppercase tracking-widest font-bold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (testimonial ? 'Save Changes' : 'Create Testimonial')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

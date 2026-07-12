'use client'

import { useEffect, useState, useCallback } from 'react'
import { 
  Plus, 
  GripVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  getTestimonials, 
  toggleTestimonialVisibility, 
  deleteTestimonial,
  Testimonial 
} from '@/app/actions/testimonial-actions'
import { useToast } from '@/components/ui/use-toast'
import { TestimonialModal } from '@/components/modals/testimonial-modal'

export default function TestimonialsCMSPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | undefined>()
  const { toast } = useToast()

  const fetchTestimonials = useCallback(async () => {
    setLoading(true)
    const result = await getTestimonials()
    if (result.success && result.data) {
      setTestimonials(result.data)
    } else {
      toast({ 
        title: "Sync Error", 
        description: "Failed to fetch from database.",
        variant: "destructive"
      })
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    fetchTestimonials()
  }, [fetchTestimonials])

  const handleToggleVisibility = async (id: string, currentStatus: boolean) => {
    const result = await toggleTestimonialVisibility(id, currentStatus)
    if (result.success) {
      setTestimonials(prev => prev.map(t => 
        t.id === id ? { ...t, is_visible: !currentStatus } : t
      ))
      toast({ title: "Visibility Updated" })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this testimonial?")) return
    const result = await deleteTestimonial(id)
    if (result.success) {
      setTestimonials(prev => prev.filter(t => t.id !== id))
      toast({ title: "Testimonial Deleted" })
    }
  }

  const openAddModal = () => {
    setSelectedTestimonial(undefined)
    setIsModalOpen(true)
  }

  const openEditModal = (testimonial: Testimonial) => {
    setSelectedTestimonial(testimonial)
    setIsModalOpen(true)
  }

  return (
    <div className="p-10 max-w-[1000px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">Testimonial Management</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Public Website Content Control
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={fetchTestimonials}
            className="border-neutral-800 bg-transparent text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-none h-12 px-4 uppercase tracking-widest text-[10px]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Sync DB
          </Button>
          <Button 
            onClick={openAddModal}
            className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-6 text-xs font-bold uppercase tracking-widest transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Testimonial
          </Button>
        </div>
      </div>

      {/* CMS List */}
      <div className="space-y-4 relative min-h-[300px]">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-10">
            <Loader2 className="w-8 h-8 text-white animate-spin mb-4" />
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">Syncing with Cloud...</p>
          </div>
        ) : testimonials.length > 0 ? (
          testimonials.map((testimonial) => (
            <div 
              key={testimonial.id} 
              className={`group relative flex items-start gap-4 p-6 border transition-all duration-300 ${
                testimonial.is_visible ? 'bg-neutral-900/40 border-neutral-800 hover:border-neutral-600' : 'bg-black border-neutral-900 opacity-60 hover:opacity-100'
              }`}
            >
              <div className="mt-1 cursor-grab active:cursor-grabbing text-neutral-600 hover:text-white">
                <GripVertical className="w-5 h-5" />
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-white">{testimonial.author_name}</h3>
                    <p className="text-xs text-neutral-400 mt-1">
                      {testimonial.author_role} <span className="text-neutral-600">at</span> {testimonial.author_company}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleToggleVisibility(testimonial.id, testimonial.is_visible)}
                      className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-none"
                      title={testimonial.is_visible ? "Hide from website" : "Show on website"}
                    >
                      {testimonial.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openEditModal(testimonial)}
                      className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-none"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(testimonial.id)}
                      className="h-8 w-8 text-neutral-400 hover:text-red-500 hover:bg-red-950/30 rounded-none"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-neutral-500 italic">
                  "{testimonial.content}"
                </p>
                
                <div className="flex items-center gap-2 pt-2">
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 ${
                    testimonial.is_visible ? 'bg-emerald-950/30 text-emerald-500 border border-emerald-900/50' : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                  }`}>
                    {testimonial.is_visible ? 'Live on site' : 'Hidden'}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-20 text-center border border-dashed border-neutral-800">
            <p className="text-neutral-500 text-sm italic">No testimonials found in database.</p>
          </div>
        )}
      </div>

      <TestimonialModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        testimonial={selectedTestimonial}
        onSuccess={fetchTestimonials}
      />
    </div>
  )
}

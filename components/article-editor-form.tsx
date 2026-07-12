'use client'

import { useState, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Send, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { saveArticle } from '@/app/actions/article-actions'
import { RichTextEditor } from '@/components/rich-text-editor'

interface ArticleEditorFormProps {
  initialData?: any
  articleId?: string
}

export function ArticleEditorForm({ initialData, articleId }: ArticleEditorFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [title, setTitle] = useState(initialData?.title || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initialData?.thumbnail_url || null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', 'article-thumbnail')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      const result = await res.json()
      if (res.ok && result.success) {
        setThumbnailUrl(result.fileUrl)
        toast({ title: 'Thumbnail Uploaded' })
      } else {
        throw new Error(result.error)
      }
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async (status: 'draft' | 'published') => {
    if (!title.trim() || !content.trim()) {
      toast({ title: 'Validation Error', description: 'Title and content are required.', variant: 'destructive' })
      return
    }

    setIsSaving(true)
    const formData = new FormData()
    formData.append('title', title)
    formData.append('status', status)

    const res = await saveArticle(formData, content, thumbnailUrl, articleId)

    if (res.success) {
      toast({ title: 'Success', description: `Article saved as ${status}.` })
      router.push('/admin/cms/resources')
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    }
    setIsSaving(false)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10 space-y-8">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-neutral-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Resources
        </button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={isSaving}
            className="border-neutral-800 bg-black text-white hover:bg-neutral-900 rounded-none h-10 px-6 text-[10px] uppercase tracking-widest font-bold"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave('published')}
            disabled={isSaving}
            className="bg-white text-black hover:bg-neutral-200 rounded-none h-10 px-6 text-[10px] uppercase tracking-widest font-bold"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
            Publish Article
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="text-xs uppercase tracking-widest font-bold text-neutral-500 mb-2 block">Article Title</label>
          <Input 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a compelling title..."
            className="text-2xl h-14 bg-black border-neutral-900 text-white rounded-none focus-visible:ring-1 focus-visible:ring-neutral-700 font-light"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest font-bold text-neutral-500 mb-2 block">Cover Thumbnail</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-neutral-800 bg-neutral-950 hover:bg-neutral-900 transition-colors cursor-pointer rounded-lg overflow-hidden flex items-center justify-center min-h-[200px] relative"
          >
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover absolute inset-0" />
            ) : (
              <div className="text-center p-6">
                <ImageIcon className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                <p className="text-sm text-neutral-400">Click to upload a cover image</p>
                <p className="text-xs text-neutral-600 mt-1">Recommended: 1200x630px, JPG/PNG</p>
              </div>
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-10">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleThumbnailUpload} 
            />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest font-bold text-neutral-500 mb-2 block">Article Content</label>
          <RichTextEditor value={content} onChange={setContent} />
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { getApiDocs, updateApiDoc, createApiDoc, deleteApiDoc, ApiDoc } from '@/app/actions/api-doc-actions'
import { RichTextEditor } from '@/components/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Save, Trash2 } from 'lucide-react'

export default function ApiDocsCMS() {
  const [docs, setDocs] = useState<ApiDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchDocs = useCallback(async () => {
    setLoading(true)
    const result = await getApiDocs(true)
    if (result.success && result.data) {
      setDocs(result.data.sort((a, b) => a.section_order - b.section_order))
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    }
    setLoading(false)
  }, [toast])

  useEffect(() => {
    fetchDocs()
  }, [fetchDocs])

  const handleUpdateDoc = (index: number, field: keyof ApiDoc, value: any) => {
    const updatedDocs = [...docs]
    updatedDocs[index] = { ...updatedDocs[index], [field]: value }
    setDocs(updatedDocs)
  }

  const handleSave = async (doc: ApiDoc) => {
    setSavingId(doc.id)
    const result = await updateApiDoc(doc.id, {
      title: doc.title,
      content: doc.content,
      section_order: doc.section_order,
      is_published: doc.is_published
    })
    
    if (result.success) {
      toast({ title: 'Section Saved' })
    } else {
      toast({ title: 'Save Failed', description: result.error, variant: 'destructive' })
    }
    setSavingId(null)
  }

  const handleCreateNew = async () => {
    setSavingId('new')
    const result = await createApiDoc({
      title: 'New API Section',
      content: '',
      section_order: docs.length + 1,
      is_published: false
    })

    if (result.success && result.data) {
      setDocs([...docs, result.data])
      toast({ title: 'Section Created' })
    } else {
      toast({ title: 'Creation Failed', description: result.error, variant: 'destructive' })
    }
    setSavingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return
    
    const result = await deleteApiDoc(id)
    if (result.success) {
      setDocs(docs.filter(d => d.id !== id))
      toast({ title: 'Section Deleted' })
    } else {
      toast({ title: 'Delete Failed', description: result.error, variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-20">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-10 max-w-[1200px] mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">API Documentation</h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Developer Resources CMS
          </p>
        </div>
        
        <Button 
          onClick={handleCreateNew}
          disabled={savingId === 'new'}
          className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-6 text-xs font-bold uppercase tracking-widest transition-all"
        >
          {savingId === 'new' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Add New Section
        </Button>
      </div>

      <div className="space-y-12">
        {docs.length === 0 ? (
          <p className="text-neutral-500 italic">No API documentation sections found.</p>
        ) : (
          docs.map((doc, idx) => (
            <div key={doc.id} className="bg-neutral-900/20 border border-neutral-800 p-8 space-y-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Section Title</label>
                  <Input 
                    value={doc.title}
                    onChange={(e) => handleUpdateDoc(idx, 'title', e.target.value)}
                    className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700 font-bold text-lg"
                  />
                </div>
                <div className="w-32 space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Display Order</label>
                  <Input 
                    type="number"
                    value={doc.section_order}
                    onChange={(e) => handleUpdateDoc(idx, 'section_order', parseInt(e.target.value))}
                    className="rounded-none bg-black border-neutral-800 text-white h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Content</label>
                <div className="prose prose-invert max-w-none">
                  <RichTextEditor 
                    value={doc.content} 
                    onChange={(val) => handleUpdateDoc(idx, 'content', val)} 
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-neutral-800">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs text-neutral-400 uppercase tracking-widest font-medium cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={doc.is_published}
                      onChange={(e) => handleUpdateDoc(idx, 'is_published', e.target.checked)}
                      className="rounded-none bg-black border-neutral-800 focus:ring-0"
                    />
                    Published
                  </label>
                  <Button 
                    onClick={() => handleDelete(doc.id)}
                    variant="ghost" 
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-none h-10 px-4 text-[10px] tracking-wider uppercase font-bold"
                  >
                    <Trash2 className="w-3 h-3 mr-2" /> Delete
                  </Button>
                </div>
                
                <Button 
                  onClick={() => handleSave(doc)}
                  disabled={savingId === doc.id}
                  className="bg-neutral-800 text-white hover:bg-neutral-700 rounded-none h-10 px-6 text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  {savingId === doc.id ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Save className="w-3 h-3 mr-2" />}
                  Save Section
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

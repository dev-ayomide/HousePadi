'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getArticleByIdAdmin } from '@/app/actions/article-actions'
import { ArticleEditorForm } from '@/components/article-editor-form'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function EditArticlePage() {
  const params = useParams()
  const { toast } = useToast()
  const id = params.id as string
  const [initialData, setInitialData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const res = await getArticleByIdAdmin(id)
      if (res.success && res.data) {
        setInitialData(res.data)
      } else {
        toast({ title: 'Error', description: 'Failed to load article.', variant: 'destructive' })
      }
      setLoading(false)
    }
    loadData()
  }, [id])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    )
  }

  if (!initialData) return null

  return <ArticleEditorForm initialData={initialData} articleId={id} />
}

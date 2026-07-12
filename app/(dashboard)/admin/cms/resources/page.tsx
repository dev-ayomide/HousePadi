'use client'

import { useEffect, useState } from 'react'
import { getArticles, deleteArticle } from '@/app/actions/article-actions'
import { BookOpen, Plus, Trash2, Edit, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ResourcesAdminPage() {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function fetchArticles() {
      const res = await getArticles(false) // fetch all, including drafts
      if (res.success && res.data) {
        setArticles(res.data)
      }
      setLoading(false)
    }
    fetchArticles()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this article?')) return
    const res = await deleteArticle(id)
    if (res.success) {
      setArticles(prev => prev.filter(a => a.id !== id))
      toast({ title: 'Deleted', description: 'Article has been deleted.' })
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-light text-white flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-neutral-500" />
            Resources Management
          </h1>
          <p className="text-xs uppercase tracking-widest text-neutral-500 mt-2">
            Manage publications and articles
          </p>
        </div>
        <Button onClick={() => router.push('/admin/cms/resources/new')} className="bg-white text-black hover:bg-neutral-200 text-xs tracking-widest uppercase font-bold rounded-none h-10 px-6">
          <Plus className="w-4 h-4 mr-2" />
          Create Article
        </Button>
      </div>

      <div className="bg-black border border-neutral-900 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-neutral-900 bg-neutral-950/50 text-[10px] uppercase tracking-widest font-bold text-neutral-500">
          <div className="col-span-5">Title</div>
          <div className="col-span-3">Author</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
          </div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-sm">
            No articles found. Create one to get started.
          </div>
        ) : (
          <div className="divide-y divide-neutral-900">
            {articles.map(article => (
              <div key={article.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-neutral-900/30 transition-colors">
                <div className="col-span-5">
                  <p className="text-sm text-white font-medium truncate" title={article.title}>{article.title}</p>
                  <p className="text-xs text-neutral-500 mt-1">{new Date(article.created_at).toLocaleDateString()}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-xs text-neutral-400 truncate">{Array.isArray(article.profiles) ? article.profiles[0]?.full_name : article.profiles?.full_name || 'System'}</p>
                </div>
                <div className="col-span-2 text-center">
                  {article.status === 'published' ? (
                    <span className="inline-flex px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-widest font-bold rounded-sm">
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] uppercase tracking-widest font-bold rounded-sm">
                      Draft
                    </span>
                  )}
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-white" asChild>
                    <Link href={`/admin/cms/resources/${article.id}`}>
                      <Edit className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(article.id)} className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

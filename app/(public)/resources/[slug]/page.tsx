import { getArticleBySlug } from '@/app/actions/article-actions'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Props {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: Props) {
  const res = await getArticleBySlug(params.slug)
  if (!res.success || !res.data) {
    return { title: 'Not Found | HousePadi' }
  }
  return {
    title: `${res.data.title} | HousePadi Resources`,
    description: `Read ${res.data.title} on HousePadi.`
  }
}

export default async function ArticlePage({ params }: Props) {
  const res = await getArticleBySlug(params.slug)
  
  if (!res.success || !res.data) {
    notFound()
  }

  const article = res.data

  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Header />
      
      <article className="pt-32 pb-24 px-6 sm:px-8 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <Link href="/resources" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-neutral-500 hover:text-white transition-colors mb-12">
            <ArrowLeft className="w-4 h-4" /> Back to Resources
          </Link>

          <div className="mb-12">
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-neutral-500 font-bold mb-6">
              <span>{new Date(article.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span className="w-1 h-1 bg-neutral-800 rounded-full"></span>
              <span>{Array.isArray(article.profiles) ? article.profiles[0]?.full_name : article.profiles?.full_name || 'HousePadi'}</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light leading-tight mb-12">
              {article.title}
            </h1>
          </div>
          
          {article.thumbnail_url && (
            <div className="aspect-[21/9] w-full bg-neutral-900 mb-16 overflow-hidden">
              <img 
                src={article.thumbnail_url} 
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div 
            className="prose prose-invert prose-lg max-w-none prose-p:font-light prose-p:leading-relaxed prose-headings:font-light prose-a:text-blue-400 hover:prose-a:text-blue-300 prose-img:rounded-lg prose-img:border prose-img:border-neutral-800"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        </div>
      </article>

      <Footer />
    </main>
  )
}

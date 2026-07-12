import { getArticles } from '@/app/actions/article-actions'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Resources | HousePadi',
  description: 'Insights, publications, and resources for the spatial evolution of real estate.'
}

export default async function ResourcesPage() {
  const res = await getArticles(true)
  const articles = res.success && res.data ? res.data : []

  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Header />
      
      <section className="pt-40 pb-20 px-6 sm:px-8 lg:px-12 border-b border-neutral-900">
        <div className="max-w-[90rem] mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-light tracking-tight mb-8">
              HousePadi <span className="text-neutral-500">Resources</span>
            </h1>
            <p className="text-lg text-neutral-400 font-light leading-relaxed mb-12">
              Explore our latest publications, insights, and guides on immersive technology, spatial computing, and the future of real estate architecture.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 sm:px-8 lg:px-12">
        <div className="max-w-[90rem] mx-auto">
          {articles.length === 0 ? (
            <div className="text-center py-32 border border-neutral-900 bg-neutral-950/30">
              <BookOpen className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
              <p className="text-neutral-500 text-sm uppercase tracking-widest font-bold">No publications available</p>
              <p className="text-neutral-600 text-xs mt-2">Check back soon for new articles and resources.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article: any) => (
                <Link href={`/resources/${article.slug}`} key={article.id} className="group flex flex-col border border-neutral-900 bg-black hover:border-neutral-700 transition-all duration-500 overflow-hidden">
                  <div className="aspect-[16/9] w-full bg-neutral-900 relative overflow-hidden">
                    {article.thumbnail_url ? (
                      <img 
                        src={article.thumbnail_url} 
                        alt={article.title}
                        className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-700 scale-100 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-neutral-800" />
                      </div>
                    )}
                  </div>
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-4">
                      <span>{new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      <span className="w-1 h-1 bg-neutral-800 rounded-full"></span>
                      <span>{Array.isArray(article.profiles) ? article.profiles[0]?.full_name : article.profiles?.full_name || 'HousePadi'}</span>
                    </div>
                    <h2 className="text-xl font-light text-white mb-6 group-hover:text-blue-400 transition-colors line-clamp-3">
                      {article.title}
                    </h2>
                    <div className="mt-auto pt-6 flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-neutral-400 group-hover:text-white transition-colors">
                      Read Article <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}

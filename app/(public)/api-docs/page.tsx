import { getApiDocs } from '@/app/actions/api-doc-actions'
import Link from 'next/link'
import { ChevronRight, Code2 } from 'lucide-react'
import { ApiDocsClient } from './api-docs-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'API Documentation | HousePadi',
  description: 'Official API documentation for the HousePadi developer platform.',
}

export default async function ApiDocumentationPage() {
  const result = await getApiDocs(false) // fetch only published docs
  const docs = result.success && result.data ? result.data : []

  return (
    <main className="min-h-screen w-full bg-[#050505] pt-32 pb-24 overflow-x-hidden">
      <div className="max-w-[1000px] mx-auto px-6 sm:px-8 lg:px-12 space-y-16">
        
        {/* Header Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white">API Documentation</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              API Documentation
            </h1>
          </div>
          <p className="text-neutral-400 text-lg max-w-2xl font-light">
            Integrate HousePadi immersive properties directly into your applications. Follow these guides to authenticate and interact securely with our read-only endpoints.
          </p>
        </div>

        {/* Documentation Content */}
        <div className="space-y-16">
          {docs.length === 0 ? (
            <div className="p-8 border border-neutral-800 bg-neutral-900/20 text-neutral-400">
              API Documentation is currently being updated. Please check back later.
            </div>
          ) : (
            <ApiDocsClient docs={docs} />
          )}
        </div>
        
        {/* Footer help block */}
        <div className="mt-20 pt-10 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-white font-medium">Need Technical Support?</h3>
            <p className="text-sm text-neutral-500">Reach out to our engineering team for integration assistance.</p>
          </div>
          <Link 
            href="/contact" 
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-black text-xs uppercase tracking-widest font-bold hover:bg-neutral-200 transition-colors"
          >
            Contact Engineering
          </Link>
        </div>

      </div>
    </main>
  )
}

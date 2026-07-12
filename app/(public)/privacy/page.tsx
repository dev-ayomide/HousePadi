import React from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { getSiteSettings } from '@/app/actions/settings-actions'

export const metadata = {
  title: 'Privacy Policy | HousePadi',
  description: 'Privacy Policy for accessing and using the HousePadi luxury real estate visualization platform.',
}

export default async function PrivacyPage() {
  const result = await getSiteSettings()
  const settings = result.success ? result.data : {}
  const rawContent = settings.privacy_content || '# Privacy Policy\n\nDefault privacy policy will be updated shortly.'

  const renderContent = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-lg font-medium text-white mt-8 mb-4 tracking-tight">
            {line.replace('### ', '')}
          </h3>
        )
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-2xl font-light text-white mt-12 mb-6 border-b border-neutral-900 pb-3 tracking-tight">
            {line.replace('## ', '')}
          </h2>
        )
      }
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-4xl md:text-5xl font-light text-white mb-10 tracking-tighter">
            {line.replace('# ', '')}
          </h1>
        )
      }
      if (line.trim() === '') {
        return <div key={idx} className="h-4" />
      }
      return (
        <p key={idx} className="text-neutral-400 text-sm md:text-base leading-relaxed mb-6 font-light">
          {line}
        </p>
      )
    })
  }

  return (
    <div className="bg-[#0A0A0A] min-h-screen flex flex-col justify-between selection:bg-white selection:text-black">
      <div>
        <Header />
        
        <main className="pt-32 pb-24 px-6 max-w-3xl mx-auto">
          <div className="space-y-2 mb-12">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-600">Platform Standards</p>
          </div>
          
          <article className="prose prose-invert max-w-none">
            {renderContent(rawContent)}
          </article>
        </main>
      </div>

      <Footer />
    </div>
  )
}

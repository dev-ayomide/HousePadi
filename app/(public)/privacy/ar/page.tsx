import React from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { getSiteSettings } from '@/app/actions/settings-actions'
import { SITE_URL } from '@/lib/constants'

export const metadata = {
  title: 'HousePadi AR App Privacy Policy | HousePadi',
  description: 'Privacy Policy for the HousePadi AR Mobile Application, detailing our AR camera processing, location coordinates, and spatial rendering standards.',
}

const DEFAULT_AR_PRIVACY = `# HousePadi AR Privacy Policy

Last updated: May 30, 2026

This Privacy Policy describes how HousePadi AR collects, uses, and shares your personal information when you use our mobile application to view immersive real estate listings.

## 1. Information We Collect
We collect device metadata, spatial calibration info (AR session parameters), location coordinates (to locate nearby staging listings), and camera access feeds (processed strictly on-device for spatial anchoring and rendering).

## 2. On-Device AR Processing
Camera access is required only to enable the Augmented Reality (AR) viewer. Camera feed data is processed locally in real-time and is never uploaded, stored, or shared with third parties.

## 3. Data Storage & Sharing
Saved bookmarks, preferences, and analytics are synced securely with Supabase. We do not sell or monetize individual tracking details. Contact us at concierge@${SITE_URL.replace('https://', '')} for data requests.`

export default async function ArPrivacyPage() {
  const result = await getSiteSettings()
  const settings = result.success ? result.data : {}
  const rawContent = settings.ar_privacy_content || DEFAULT_AR_PRIVACY

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
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-600">Mobile Standards</p>
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

'use client'

import { useEffect, useState } from 'react'
import {
  Smartphone,
  Apple,
  Globe,
  ArrowRight,
  ShieldCheck,
  Zap,
  Download,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Footer } from '@/components/footer'
import { getSiteSettings } from '@/app/actions/settings-actions'
import Particles from '@/components/Particles'

export default function DownloadPage() {
  const [links, setLinks] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLinks() {
      const result = await getSiteSettings()
      if (result.success) {
        setLinks(result.data)
      }
      setLoading(false)
    }
    loadLinks()
  }, [])

  return (
    <div className="bg-black min-h-screen selection:bg-white selection:text-black flex flex-col">
      <main className="flex-1 relative pt-32 pb-20 px-6 lg:px-10 overflow-hidden flex items-center justify-center">
        {/* Background Particles */}
        <div className="absolute inset-0 z-0 opacity-20">
          <Particles
            particleColors={["#ffffff"]}
            particleCount={100}
            particleSpread={12}
            speed={0.05}
            particleBaseSize={80}
            moveParticlesOnHover={true}
            alphaParticles={true}
            disableRotation={false}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

          {/* Left: Branding & Value Prop */}
          <div className="space-y-12">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-3 px-4 py-2 border border-neutral-800 bg-neutral-900/40">
                <Zap className="w-3 h-3 text-white animate-pulse" />
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-400">Mobile Ecosystem</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-medium text-white tracking-tighter leading-none">
                HousePadi <br />
                <span className="text-neutral-500 italic font-serif text-4xl lg:text-6xl">In Your Pocket</span>
              </h1>
              <p className="text-neutral-400 text-lg max-w-md leading-relaxed font-light">
                Experience architectural fidelity and immersive curation on the go. Access your entire spatial portfolio with zero latency.
              </p>
            </div>

            <div className="space-y-6 pt-8 border-t border-neutral-900">
              <div className="flex items-center gap-4 text-neutral-400 group">
                <ShieldCheck className="w-5 h-5 text-neutral-600 group-hover:text-white transition-colors" />
                <span className="text-xs uppercase tracking-widest font-medium">Enterprise Security Encryption</span>
              </div>
              <div className="flex items-center gap-4 text-neutral-400 group">
                <Globe className="w-5 h-5 text-neutral-600 group-hover:text-white transition-colors" />
                <span className="text-xs uppercase tracking-widest font-medium">Cross-Cloud Synchronization</span>
              </div>
            </div>
          </div>

          {/* Right: Store Selection */}
          <div className="relative">
            <div className="bg-neutral-900/10 backdrop-blur-3xl border border-neutral-800 p-10 lg:p-16 space-y-12 relative overflow-hidden">
              <div className="space-y-2 text-center lg:text-left">
                <h2 className="text-2xl font-light text-white">Select Platform</h2>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-600">Distribution Repositories</p>
              </div>

              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                  <p className="text-[10px] uppercase tracking-widest text-neutral-700">Verifying Links...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Apple App Store */}
                  {links.apple_app_store_coming_soon === 'true' ? (
                    <div className="group block cursor-not-allowed opacity-80">
                      <div className="w-full bg-neutral-900 border border-neutral-800 text-neutral-400 p-8 flex items-center justify-between rounded-none relative overflow-hidden">
                        <div className="flex items-center gap-6 relative z-10">
                          <Apple className="w-8 h-8 opacity-50" />
                          <div className="text-left">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Coming Soon</p>
                            <p className="text-xl font-bold tracking-tight text-neutral-300">App coming to Apple App Store</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <a
                      href={links.apple_app_store_link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <div className="w-full bg-white text-black p-8 flex items-center justify-between group-hover:bg-neutral-200 transition-all duration-500 rounded-none relative overflow-hidden">
                        <div className="flex items-center gap-6 relative z-10">
                          <Apple className="w-8 h-8" />
                          <div className="text-left">
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Available on the</p>
                            <p className="text-xl font-bold tracking-tight">App Store</p>
                          </div>
                        </div>
                        <ArrowRight className="w-6 h-6 transform group-hover:translate-x-2 transition-transform relative z-10" />

                        {/* Subtle background glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 -mr-16 -mt-16 rounded-full blur-2xl" />
                      </div>
                    </a>
                  )}

                  {/* Google Play Store */}
                  {links.google_play_coming_soon === 'true' ? (
                    <div className="group block cursor-not-allowed opacity-80">
                      <div className="w-full bg-neutral-900 border border-neutral-800 text-neutral-400 p-8 flex items-center justify-between rounded-none relative overflow-hidden">
                        <div className="flex items-center gap-6 relative z-10">
                          <Smartphone className="w-8 h-8 opacity-50" />
                          <div className="text-left">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Coming Soon</p>
                            <p className="text-xl font-bold tracking-tight text-neutral-300">App coming to Google Play Store</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <a
                      href={links.google_play_link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <div className="w-full bg-neutral-900 border border-neutral-800 text-white p-8 flex items-center justify-between hover:bg-neutral-800 transition-all duration-500 rounded-none relative overflow-hidden">
                        <div className="flex items-center gap-6 relative z-10">
                          <Smartphone className="w-8 h-8 text-neutral-400 group-hover:text-white transition-colors" />
                          <div className="text-left">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Get it on</p>
                            <p className="text-xl font-bold tracking-tight">Google Play</p>
                          </div>
                        </div>
                        <ArrowRight className="w-6 h-6 transform group-hover:translate-x-2 transition-transform relative z-10" />
                      </div>
                    </a>
                  )}

                  <div className="pt-8 border-t border-neutral-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-neutral-600" />
                      <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Current Build</span>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-neutral-700">Latest Release: May 2026</span>
                  </div>
                </div>
              )}
            </div>

            {/* Background decorative square */}
            <div className="absolute -top-4 -right-4 w-24 h-24 border-t border-r border-neutral-800 -z-10" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 border-b border-l border-neutral-800 -z-10" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

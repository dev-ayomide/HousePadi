'use client'

import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Code, ShieldCheck, Box } from 'lucide-react'

export default function DeveloperOverviewPage() {
  const { user } = useAuth()

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">
            Welcome, Developer
          </h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            HousePadi Spatial Integration Portal
          </p>
        </div>
        <Link href="/developer/keys">
          <Button className="bg-white hover:bg-neutral-200 text-black rounded-none h-11 px-6 text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            Manage API Keys
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900/40 border border-neutral-800 p-8 space-y-6 hover:border-neutral-700 transition-colors group">
          <div className="w-12 h-12 bg-black border border-neutral-800 flex items-center justify-center group-hover:border-neutral-600 transition-colors">
            <Code className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-white">Embed Viewer</h3>
            <p className="text-xs text-neutral-500 leading-relaxed font-light">
              Integrate HousePadi 360 and AR capabilities directly into your website using our secure iframe embeddings.
            </p>
          </div>
          <Link href="/developer/keys" className="inline-flex items-center text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-white transition-colors">
            Get Started <ArrowRight className="w-3 h-3 ml-2" />
          </Link>
        </div>

        <div className="bg-neutral-900/40 border border-neutral-800 p-8 space-y-6 hover:border-neutral-700 transition-colors group">
          <div className="w-12 h-12 bg-black border border-neutral-800 flex items-center justify-center group-hover:border-neutral-600 transition-colors">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-white">Secure Credentials</h3>
            <p className="text-xs text-neutral-500 leading-relaxed font-light">
              Generate encrypted API keys to authenticate your domain. Upgrade your tier to scale usage seamlessly.
            </p>
          </div>
          <Link href="/developer/keys" className="inline-flex items-center text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-white transition-colors">
            View Keys <ArrowRight className="w-3 h-3 ml-2" />
          </Link>
        </div>

        <div className="bg-neutral-900/40 border border-neutral-800 p-8 space-y-6 hover:border-neutral-700 transition-colors group">
          <div className="w-12 h-12 bg-black border border-neutral-800 flex items-center justify-center group-hover:border-neutral-600 transition-colors">
            <Box className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-white">Docs</h3>
            <p className="text-xs text-neutral-500 leading-relaxed font-light">
              Query spatial endpoints to retrieve listing details and metadata securely from the HousePadi cloud.
            </p>
          </div>
          <Link href="/api-docs" className="inline-flex items-center text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-white transition-colors">
            View Docs <ArrowRight className="w-3 h-3 ml-2" />
          </Link>
        </div>
      </div>

    </div>
  )
}

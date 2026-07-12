'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getTopAgents } from '@/app/actions/top-agent-actions'

export function TopAgentsSection() {
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadAgents() {
      const result = await getTopAgents()
      if (result.success) {
        setAgents(result.data || [])
      }
      setLoading(false)
    }
    loadAgents()
  }, [])

  if (loading) {
    return (
      <section className="py-32 px-6 lg:px-12 bg-black border-t border-neutral-900">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-neutral-800 animate-spin" />
          <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">Scanning Human Element...</p>
        </div>
      </section>
    )
  }

  if (agents.length === 0) return null

  return (
    <section className="py-32 px-6 lg:px-12 bg-black border-t border-neutral-900">
      <div className="max-w-[90rem] mx-auto">
        <div className="flex items-center justify-between mb-24 border-b border-neutral-900 pb-12">
          <div className="space-y-4">
            <span className="text-[10px] tracking-[0.4em] uppercase text-neutral-500 font-bold">The Human Element</span>
            <h2 className="text-4xl lg:text-5xl font-light text-white tracking-tight">Master Curation</h2>
          </div>
          <div className="hidden md:block text-right max-w-xs">
            <p className="text-xs text-neutral-500 font-light leading-relaxed uppercase tracking-widest">
              Connecting visionaries with significant architectural legacies through expert guidance.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {agents.map((agent) => (
            <div 
              key={agent.id}
              className="group relative bg-neutral-900/30 backdrop-blur-md border border-white/5 p-8 flex flex-col items-center text-center space-y-6 transition-all duration-500 hover:shadow-[0_0_30px_rgba(16,185,129,0.05)] hover:border-white/10"
            >
              {/* Profile Image (Avatar style) */}
              <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-white/5 group-hover:border-emerald-500/30 transition-colors duration-500">
                <img 
                  src={agent.image} 
                  alt={agent.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 md:grayscale md:group-hover:grayscale-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80'
                  }}
                />
              </div>

              {/* Identity details */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-[0.2em] text-emerald-400 font-bold">{agent.role}</span>
                <h3 className="text-xl font-light text-white tracking-wide">{agent.name}</h3>
              </div>

              {/* Bio description */}
              <p className="text-xs text-neutral-400 font-light leading-relaxed max-w-[240px] flex-1">
                {agent.bio}
              </p>

              {/* Metadata Footer */}
              <div className="w-full pt-4 border-t border-white/5 flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-500">
                <span>{agent.agency}</span>
                <span className="font-bold text-white">{agent.listings} Listings</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

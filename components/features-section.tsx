'use client'

import { Building2, ClipboardCheck, Box, EyeOff, BarChart3, Calendar } from 'lucide-react'

const features = [
  {
    title: 'Agency Infrastructure',
    description: 'Allow agencies to manage their organization, agents, listings, and workflows from a centralized dashboard.',
    icon: Building2,
  },
  {
    title: 'Curated Property Listings',
    description: 'Only approved and verified immersive property listings are showcased to maintain platform quality.',
    icon: ClipboardCheck,
  },
  {
    title: 'Large 3D Asset Support',
    description: 'Upload and manage property assets in .fbx, .obj, .glb, .gltf, and .usdz formats with secure cloud storage.',
    icon: Box,
  },
  {
    title: 'Controlled Public Exposure',
    description: 'Showcase selected featured properties publicly while keeping full immersive experiences exclusive to scheduled demos.',
    icon: EyeOff,
  },
  {
    title: 'Subscription-Based Scaling',
    description: 'Flexible subscription tiers determine listing capacity, media limits, and agency visibility.',
    icon: BarChart3,
  },
  {
    title: 'Demo Scheduling Workflow',
    description: 'Potential clients can request guided property demonstrations directly through listing pages.',
    icon: Calendar,
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-32 px-6 sm:px-8 lg:px-12 bg-[#0A0A0A] border-t border-neutral-900">
      <div className="max-w-[90rem] mx-auto">
        {/* Section Header */}
        <div className="max-w-3xl mb-24 space-y-6">
          <div className="inline-block">
            <span className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 font-semibold border-l border-neutral-800 pl-4">
              Platform Core
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
            Professional Infrastructure <br /> for Immersive Listings
          </h2>
          <p className="text-lg text-neutral-400 font-light max-w-2xl leading-relaxed">
            A specialized ecosystem designed for elite real estate agencies to curate, manage, and showcase premium property experiences.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-900/50 border border-neutral-900">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group p-10 bg-[#0A0A0A] transition-all duration-500 hover:bg-neutral-900/40 relative overflow-hidden"
            >
              {/* Subtle accent line */}
              <div className="absolute top-0 left-0 w-px h-0 bg-white/20 transition-all duration-700 group-hover:h-full" />
              
              <div className="flex flex-col h-full">
                <div className="mb-8 inline-flex items-center justify-center w-12 h-12 bg-neutral-900 border border-neutral-800 group-hover:border-neutral-700 transition-colors">
                  <feature.icon className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors" />
                </div>
                
                <h3 className="text-xl font-medium text-white mb-4 tracking-wide">
                  {feature.title}
                </h3>
                
                <p className="text-neutral-500 text-sm leading-relaxed font-light group-hover:text-neutral-400 transition-colors">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom indicator */}
        <div className="mt-24 pt-8 border-t border-neutral-900 flex justify-between items-end">
          <div className="space-y-2">
            <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-600 font-semibold">
              Deployment Ready
            </p>
            <p className="text-sm text-neutral-500 font-light">
              Secure infrastructure for enterprise property management.
            </p>
          </div>
          <div className="hidden sm:block">
             <div className="w-16 h-px bg-neutral-800"></div>
          </div>
        </div>
      </div>
    </section>
  )
}

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { AboutContent } from '@/app/actions/about-actions'

export function AboutOrganizationSection({ content }: { content: AboutContent | null }) {
  const orgTitle = content?.org_title || "Pioneering Digital Spatial Representation"
  const orgDesc = content?.org_description || "We believe that luxury real estate deserves a medium as expansive as the properties themselves."
  const orgSupport = content?.org_supporting_text || "By combining architectural precision with cinematic immersion, we have built a platform that allows elite agencies to showcase their listings without compromise."

  return (
    <section className="py-32 px-6 sm:px-8 lg:px-12 bg-[#0A0A0A] border-b border-neutral-900 relative">
      <div className="max-w-[90rem] mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-start">
          
          {/* Left Column - Large Title */}
          <div className="lg:col-span-5 lg:sticky lg:top-32">
            <div className="space-y-6">
              <span className="text-[10px] tracking-[0.4em] uppercase text-neutral-600 font-bold block">
                The Organization
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium text-white tracking-tight leading-[1.2]">
                {orgTitle}
              </h2>
            </div>
          </div>

          {/* Right Column - Editorial Text */}
          <div className="lg:col-span-6 lg:col-start-7 space-y-16 mt-8 lg:mt-0">
            <div className="space-y-8">
              <p className="text-2xl md:text-3xl font-light text-neutral-300 leading-snug">
                {orgDesc}
              </p>
              
              <div className="w-12 h-px bg-neutral-800" />
              
              <p className="text-base text-neutral-500 leading-relaxed max-w-xl">
                {orgSupport}
              </p>
            </div>

            {/* Architectural Grid Detail */}
            <div className="grid grid-cols-2 gap-8 pt-16 border-t border-neutral-900">
              <div>
                <span className="block text-[10px] uppercase tracking-widest text-neutral-600 mb-2">Established</span>
                <span className="text-white font-mono text-sm tracking-wider">2026</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-widest text-neutral-600 mb-2">Architecture</span>
                <span className="text-white font-mono text-sm tracking-wider">Unity, Photogrammetry & React</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-widest text-neutral-600 mb-2">Global Nodes</span>
                <span className="text-white font-mono text-sm tracking-wider">NG</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-widest text-neutral-600 mb-2">Fidelity</span>
                <span className="text-white font-mono text-sm tracking-wider">Uncompromised</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}

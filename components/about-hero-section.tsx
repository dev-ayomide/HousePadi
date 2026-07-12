'use client'

import React from 'react'
import Antigravity from '@/components/Antigravity'
import { motion } from 'framer-motion'
import { AboutContent } from '@/app/actions/about-actions'

export function AboutHeroSection({ content }: { content: AboutContent | null }) {
  const headline = content?.hero_headline || "Architecting the Future of Virtual Real Estate"
  const subheadline = content?.hero_subheadline || "HousePadi bridges the gap between physical architecture and digital immersion."

  return (
    <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden bg-[#0A0A0A] pt-24">
      {/* Background Effect */}
      <div className="absolute inset-0 z-0 opacity-60">
        <Antigravity
          count={600}
          magnetRadius={15}
          ringRadius={15}
          waveSpeed={0.2}
          waveAmplitude={2}
          particleSize={1.5}
          lerpSpeed={0.03}
          color={'#ffffff'}
          autoAnimate={true}
          particleVariance={1.5}
          rotationSpeed={0.05}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/50 via-transparent to-[#0A0A0A]" />
      </div>

      <div className="max-w-[90rem] mx-auto px-6 sm:px-8 lg:px-12 relative z-10 w-full">
        <div className="max-w-4xl space-y-12">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block"
          >
            <span className="text-[10px] tracking-[0.4em] uppercase text-neutral-500 font-semibold border-l border-neutral-800 pl-4">
              About HousePadi
            </span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold text-white tracking-tight leading-[1.05]"
          >
            {headline.split(' ').map((word, i) => (
              <span key={i} className="inline-block mr-[0.25em]">
                {word}
              </span>
            ))}
          </motion.h1>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="relative p-8 md:p-12 border border-neutral-800/50 bg-neutral-950/40 backdrop-blur-md max-w-3xl"
          >
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-neutral-500" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-neutral-500" />
            
            <p className="text-lg md:text-xl text-neutral-400 font-light leading-relaxed">
              {subheadline}
            </p>
          </motion.div>

        </div>
      </div>
      
      {/* Decorative lines */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent z-10" />
      <div className="absolute top-0 right-[10%] w-px h-[20vh] bg-gradient-to-b from-transparent to-neutral-800 z-10" />
    </section>
  )
}

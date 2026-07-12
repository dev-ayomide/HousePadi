'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Eye, ArrowRight } from 'lucide-react'
import { gsap } from 'gsap'

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-text',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, stagger: 0.15, ease: 'power3.out', delay: 0.2 }
      )
      gsap.fromTo('.hero-card',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power2.out', delay: 0.6 }
      )
    }, containerRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={containerRef} className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0A]">
      {/* Immersive background imagery with subtle warm lighting overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 transform-gpu transition-transform duration-[20s] ease-out hover:scale-110"
        style={{
          backgroundImage: 'linear-gradient(135deg, rgba(10, 10, 10, 0.8) 0%, rgba(10, 10, 10, 0.3) 100%), url(/images/hero-residence.jpg)'
        }}
      />
      {/* Subtle overlay grid for architectural feel */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none" />

      {/* Content Container */}
      <div className="relative z-20 h-full min-h-screen flex items-center">
        <div className="max-w-[90rem] mx-auto w-full px-6 sm:px-8 lg:px-12 pt-40 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

            {/* Left Content (7 columns) */}
            <div className="lg:col-span-7 space-y-10">
              {/* Subheading */}
              <div className="hero-text overflow-hidden">
                <span className="text-xs tracking-[0.25em] uppercase text-neutral-400 font-medium border-l border-neutral-600 pl-4">
                  Exclusive Immersive Property Experiences
                </span>
              </div>

              {/* Main Headline */}
              <div className="space-y-4">
                <h1 className="hero-text text-6xl sm:text-7xl lg:text-[5.5rem] font-bold text-white leading-[1.05] tracking-[-0.02em] font-sans">
                  The Infinite <br /> Precision of Living
                </h1>
              </div>

              {/* Description */}
              <p className="hero-text text-lg text-neutral-400 max-w-xl leading-relaxed font-light">
                Empower your agents with immersive 360° and XR enabled property virtual tours. Let buyers explore exclusive homes with clarity, precision, and confidence from anywhere in the world.
              </p>

              {/* CTA Buttons */}
              <div className="hero-text flex flex-col sm:flex-row gap-5 pt-4">
                <Link href="/auth/login">
                  <Button size="lg" className="h-14 bg-white text-black hover:bg-neutral-200 font-medium px-8 text-sm tracking-wide rounded-none inline-flex items-center gap-3 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                    GET STARTED
                  </Button>
                </Link>
                <Link href="/explore">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-14 border border-neutral-700 bg-transparent text-white hover:bg-white hover:text-neutral-950 font-medium px-8 text-sm tracking-wide rounded-none transition-all duration-300"
                  >
                    STEP INSIDE
                  </Button>
                </Link>
              </div>

              {/* Trust indicator */}
              <div className="hero-text pt-12 border-t border-neutral-800/50 max-w-md">
                <p className="text-xs text-neutral-500 tracking-wider uppercase font-medium">
                  Trusted by elite global real estate agencies
                </p>
              </div>
            </div>

            {/* Right Info Cards (5 columns) */}
            <div className="lg:col-span-5 space-y-4 pl-0 lg:pl-12">
              {/* Property Specs Card */}
              <div className="hero-card group relative bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 p-8 transition-colors hover:bg-neutral-900/60">
                <div className="absolute top-0 left-0 w-1 h-full bg-white/10 group-hover:bg-white/30 transition-colors" />
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-neutral-800/50 flex items-center justify-center border border-neutral-700/50">
                    <Eye className="w-5 h-5 text-neutral-300" />
                  </div>
                  <span className="text-neutral-400 text-xs uppercase tracking-[0.15em] font-medium">Property Showcase</span>
                </div>
                <div>
                  <p className="text-5xl font-light text-white mb-2 tracking-tight">360°</p>
                  <p className="text-neutral-400 text-sm font-light">Immersive Virtual Tours</p>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="hero-card group bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 p-6 hover:bg-neutral-900/60 transition-colors">
                  <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-medium mb-3">Coverage</p>
                  <p className="text-2xl font-light text-white tracking-wide">Global</p>
                </div>
                <div className="hero-card group bg-neutral-900/40 backdrop-blur-md border border-neutral-800/50 p-6 hover:bg-neutral-900/60 transition-colors flex flex-col justify-between">
                  <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-medium mb-3">Experience</p>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-light text-white tracking-wide">Premium</p>
                    <ArrowRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </div>

              {/* Description text */}
              <div className="hero-card pt-6">
                <p className="text-neutral-500 text-xs leading-relaxed font-light">
                  A vision that transcends property and space, where unmatched craftsmanship inspires elegance and engagement enriches lives.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#0A0A0A] to-transparent pointer-events-none"></div>
    </section>
  )
}


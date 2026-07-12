'use client'

import { useState, useEffect } from 'react'
import Antigravity from './Antigravity'
import { getVisibleTestimonials, Testimonial } from '@/app/actions/testimonial-actions'
import { Loader2 } from 'lucide-react'

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTestimonials() {
      const result = await getVisibleTestimonials()
      if (result.success && result.data && result.data.length > 0) {
        setTestimonials(result.data)
      }
      setLoading(false)
    }
    loadTestimonials()
  }, [])
  useEffect(() => {
    if (testimonials.length <= 1) return

    const interval = setInterval(() => {
      setIsExiting(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length)
        setIsExiting(false)
      }, 500)
    }, 6000)

    return () => clearInterval(interval)
  }, [testimonials.length])

  if (loading) {
    return (
      <section className="py-40 bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-800 animate-spin" />
      </section>
    )
  }

  if (testimonials.length === 0) return null

  const current = testimonials[currentIndex]

  return (
    <section className="relative py-40 px-6 sm:px-8 lg:px-12 bg-[#0A0A0A] border-t border-neutral-900 overflow-hidden">
      {/* Background Antigravity */}
      <div className="absolute inset-0 z-0 opacity-40">
        <Antigravity
          count={500}
          magnetRadius={10}
          ringRadius={12}
          waveSpeed={0.3}
          waveAmplitude={1.5}
          particleSize={1.2}
          lerpSpeed={0.04}
          color={'#ffffff'}
          autoAnimate={true}
          particleVariance={1}
          rotationSpeed={0.1}
        />
      </div>

      <div className="max-w-[90rem] mx-auto">
        <div className="max-w-3xl space-y-12 relative z-10">
          <div className="space-y-6">
            <div className="inline-block">
              <span className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 font-semibold border-l border-neutral-800 pl-4">
                Client Perspective
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
              Connecting elite architectural firms, premium vendors, and ambitious clients.
            </h2>
          </div>

          <div className="space-y-8">
            <div className={`p-10 bg-neutral-900/30 backdrop-blur-xl border border-neutral-800/50 transition-all duration-1000 max-w-2xl ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}`}>
              <p className="text-2xl text-neutral-300 font-light leading-relaxed italic">
                &quot;{current.content}&quot;
              </p>
              <div className="mt-10 flex items-center gap-4">
                <div className="w-12 h-12 bg-neutral-800 border border-neutral-700 flex items-center justify-center">
                  <span className="text-[10px] text-neutral-600 font-bold">{current.author_name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-white text-base font-medium tracking-wide">{current.author_name}</p>
                  <p className="text-neutral-500 text-xs uppercase tracking-[0.2em]">{current.author_role} <span className="text-neutral-700">/</span> {current.author_company}</p>
                </div>
              </div>
            </div>

            {/* Progress indicators */}
            <div className="flex gap-4 pl-2">
              {testimonials.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-px transition-all duration-1000 ${i === currentIndex ? 'w-16 bg-white' : 'w-6 bg-neutral-800'}`} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Decorative vertical label */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 p-6 text-[10px] tracking-[0.5em] uppercase text-neutral-800 font-bold rotate-90 origin-center hidden lg:block">
        Client Testimonials // HousePadi
      </div>
    </section>
  )
}

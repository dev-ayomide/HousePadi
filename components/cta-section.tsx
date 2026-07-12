'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Particles from './Particles'

export function CTASection() {
  return (
    <section className="relative py-40 px-6 sm:px-8 lg:px-12 bg-[#0A0A0A] border-t border-neutral-900 overflow-hidden">
      {/* Background Particles */}
      <div className="absolute inset-0 z-0 opacity-80">
        <Particles
          particleColors={["#ffffff"]}
          particleCount={200}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover={true}
          alphaParticles={true}
          disableRotation={false}
        />
      </div>
      
      {/* Subtle radial gradient overlay to ensure content pops */}
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,transparent_0%,#0A0A0A_90%)] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-10">
        <div className="inline-block">
          <span className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 font-semibold border-x border-neutral-800 px-4">
            Next Steps
          </span>
        </div>
        
        <h2 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white tracking-tight leading-[1.1]">
          Ready to Transform <br /> Your Workflow?
        </h2>
        
        <p className="text-lg text-neutral-400 font-light max-w-2xl mx-auto leading-relaxed">
          Join elite real estate agencies and immersive property firms already scaling their portfolio with HousePadi.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
          <Link href="/auth/login">
            <Button size="lg" className="h-14 bg-white text-black hover:bg-neutral-200 px-10 rounded-none text-xs tracking-widest uppercase font-bold transition-all duration-300">
              Agency or agent start here?
            </Button>
          </Link>
          <Link href="/download">
            <Button size="lg" variant="outline" className="h-14 border border-neutral-700 bg-transparent text-white hover:bg-white hover:text-black px-10 rounded-none text-xs tracking-widest uppercase font-bold transition-all duration-300">
              Get The App
            </Button>
          </Link>
        </div>
      </div>

      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t border-l border-neutral-900 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b border-r border-neutral-900 pointer-events-none" />
    </section>
  )
}

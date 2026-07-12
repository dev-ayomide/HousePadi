'use client'

import React from 'react'
import { TeamMember } from '@/app/actions/about-actions'
import { ProfileCard } from '@/components/ui/profile-card'

export function AboutTeamSection({ members }: { members: TeamMember[] }) {
  if (!members || members.length === 0) return null

  return (
    <section className="py-32 px-6 sm:px-8 lg:px-12 bg-black relative overflow-hidden">
      
      {/* Cinematic Lighting Effect */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neutral-800 to-transparent" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-3/4 h-80 bg-neutral-900/50 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-[90rem] mx-auto relative z-10">
        
        <div className="text-center mb-20 space-y-4">
          <span className="text-[10px] tracking-[0.4em] uppercase text-neutral-600 font-bold block">
            The Architects
          </span>
          <h2 className="text-3xl md:text-5xl font-medium text-white tracking-tight">
            Meet The Team
          </h2>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12 lg:gap-16">
          {members.map((member) => (
            <div key={member.id} className="flex justify-center">
              <ProfileCard 
                name={member.name}
                role={member.role}
                imageUrl={member.image_url}
              />
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

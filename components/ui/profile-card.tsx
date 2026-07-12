'use client'

import React, { useRef } from 'react'
import Image from 'next/image'
import './profile-card.css'

interface ProfileCardProps {
  name: string
  role: string
  imageUrl?: string | null
}

export function ProfileCard({ name, role, imageUrl }: ProfileCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    
    // Pointer position for gradients
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    
    // Normalized coordinates (-0.5 to 0.5)
    const x = (px / rect.width) - 0.5
    const y = (py / rect.height) - 0.5
    
    // Rotation angles
    const rotateX = x * 20 // Max 10deg rotation
    const rotateY = y * -20 // Max 10deg rotation
    
    // Background parallax
    const bgX = 50 + (x * 10)
    const bgY = 50 + (y * 10)

    // Update CSS variables
    containerRef.current.style.setProperty('--pointer-x', `${px}px`)
    containerRef.current.style.setProperty('--pointer-y', `${py}px`)
    containerRef.current.style.setProperty('--rotate-x', `${rotateX}deg`)
    containerRef.current.style.setProperty('--rotate-y', `${rotateY}deg`)
    containerRef.current.style.setProperty('--background-x', `${bgX}%`)
    containerRef.current.style.setProperty('--background-y', `${bgY}%`)
  }

  const handleMouseLeave = () => {
    if (!containerRef.current) return
    containerRef.current.style.setProperty('--rotate-x', '0deg')
    containerRef.current.style.setProperty('--rotate-y', '0deg')
  }

  return (
    <div 
      ref={containerRef}
      className="pc-card-wrapper"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Behind Glow Layer */}
      <div className="pc-behind" />

      {/* Tiltable Shell */}
      <div className="pc-card-shell">
        <div className="pc-card">
          <div className="pc-inside" />
          
          {/* Avatar / Portrait */}
          <div className="pc-content">
            <div className="pc-avatar-container">
              {imageUrl ? (
                <Image 
                  src={imageUrl} 
                  alt={name} 
                  fill 
                  className="pc-avatar"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-neutral-900" />
              )}
              <div className="pc-vignette" />
            </div>
          </div>

          {/* Shine Layer with Pattern Mask */}
          <div className="pc-shine" />
          
          {/* Surface Glare */}
          <div className="pc-glare" />

          {/* User Information Overlay */}
          <div className="pc-user-info">
            <h3 className="pc-name">{name}</h3>
            <p className="pc-role">{role}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

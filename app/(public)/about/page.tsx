import React from 'react'
import { getAboutContent, getTeamMembers } from '@/app/actions/about-actions'
import { AboutHeroSection } from '@/components/about-hero-section'
import { AboutOrganizationSection } from '@/components/about-organization-section'
import { AboutTeamSection } from '@/components/about-team-section'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export const metadata = {
  title: 'About | HousePadi',
  description: 'Architecting the Future of Virtual Real Estate. Meet the team behind the premier immersive platform.',
}

export default async function AboutPage() {
  // Fetch content concurrently
  const [aboutResult, teamResult] = await Promise.all([
    getAboutContent(),
    getTeamMembers(true) // true to only get visible members
  ])

  const aboutContent = aboutResult.success ? aboutResult.data : null
  const teamMembers = teamResult.success && teamResult.data ? teamResult.data : []

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <Header />
      
      <AboutHeroSection content={aboutContent} />
      <AboutOrganizationSection content={aboutContent} />
      <AboutTeamSection members={teamMembers} />

      <Footer />
    </main>
  )
}

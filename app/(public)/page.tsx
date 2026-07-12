import { Metadata } from 'next'
import { HeroSection } from '@/components/hero-section'
import { FeaturesSection } from '@/components/features-section'
import { TestimonialsSection } from '@/components/testimonials-section'
import { FeaturedListingsSection } from '@/components/featured-listings-section'
import { FeaturedAgenciesSection } from '@/components/featured-agencies-section'
import { FeaturedVendorProducts } from '@/components/featured-vendor-products'
import { TopAgentsSection } from '@/components/top-agents-section'
import { CTASection } from '@/components/cta-section'
import { Footer } from '@/components/footer'

export const metadata: Metadata = {
  title: 'HousePadi | Immersive Real Estate Platform',
  description: 'Manage, customize, and explore premium 3D virtual tours and immersive property listings. The architectural evolution of real estate.',
}

export default function Home() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <TestimonialsSection />
      <FeaturedListingsSection />
      <FeaturedVendorProducts />
      <FeaturedAgenciesSection />
      <TopAgentsSection />
      <CTASection />
      <Footer />
    </main>
  )
}

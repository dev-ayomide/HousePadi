import { PricingSection } from '@/components/pricing-section'
import { CTASection } from '@/components/cta-section'

export const metadata = {
  title: 'Pricing | HousePadi',
  description: 'Choose the right infrastructure tier for your immersive property agency.',
}

export default function PricingPage() {
  return (
    <div className="pt-20">
      <PricingSection />
      <CTASection />
    </div>
  )
}

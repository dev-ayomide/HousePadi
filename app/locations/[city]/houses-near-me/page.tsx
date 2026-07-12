import { Metadata } from 'next'
import Link from 'next/link'
import { STATIC_CITIES, capitalize } from '../../cities'
import { Button } from '@/components/ui/button'

type Props = {
  params: Promise<{ city: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const city = capitalize(resolvedParams.city)
  
  return {
    title: `Houses Near Me in ${city} | HousePadi Real Estate`,
    description: `Discover the best houses for sale and rent near you in ${city}. Explore immersive virtual tours and high-quality listings on HousePadi.`,
    alternates: {
      canonical: `/locations/${resolvedParams.city}/houses-near-me`,
    }
  }
}

export function generateStaticParams() {
  return STATIC_CITIES.map((city) => ({
    city: city,
  }))
}

export default async function HousesNearMePage({ params }: Props) {
  const resolvedParams = await params;
  const city = capitalize(resolvedParams.city)

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
      <header className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
          Find Houses Near Me in {city}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Explore a curated selection of premium houses available in {city}. Experience properties like never before with our immersive XR technology.
        </p>
      </header>

      <section className="bg-card text-card-foreground rounded-2xl shadow-sm border p-8 md:p-12 mb-12 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          Ready to discover your dream home?
        </h2>
        <p className="text-lg mb-8 text-muted-foreground">
          HousePadi offers the most comprehensive and immersive real estate listings in {city}.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href={`/explore?category=house&location=${resolvedParams.city}`}>
              View Houses in {city}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/explore">
              Explore All Properties
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3">Immersive Tours</h3>
          <p className="text-muted-foreground">Step inside properties in {city} with our advanced virtual reality and 3D walkthroughs.</p>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3">Verified Listings</h3>
          <p className="text-muted-foreground">Every house listed is verified to ensure you get exactly what you see.</p>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3">Expert Agents</h3>
          <p className="text-muted-foreground">Connect with top real estate professionals who know the {city} market inside and out.</p>
        </div>
      </section>
    </div>
  )
}

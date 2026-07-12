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
    title: `Shops for Rent in ${city} | HousePadi Commercial`,
    description: `Discover prime retail spaces and shops for rent in ${city}. Tour properties virtually to find the best location for your business.`,
    alternates: {
      canonical: `/locations/${resolvedParams.city}/shops-for-rent-near-me`,
    }
  }
}

export function generateStaticParams() {
  return STATIC_CITIES.map((city) => ({
    city: city,
  }))
}

export default async function ShopsForRentNearMePage({ params }: Props) {
  const resolvedParams = await params;
  const city = capitalize(resolvedParams.city)

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
      <header className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
          Shops for Rent in {city}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Elevate your business with the perfect retail space. Browse premium shops for rent in {city} and tour them virtually with HousePadi.
        </p>
      </header>

      <section className="bg-card text-card-foreground rounded-2xl shadow-sm border p-8 md:p-12 mb-12 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          Find Your Next Retail Location
        </h2>
        <p className="text-lg mb-8 text-muted-foreground">
          Whether you need a boutique space or a large storefront, find top retail spots available in {city}.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href={`/explore?category=shop&location=${resolvedParams.city}`}>
              View Shops in {city}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/explore">
              Explore All Commercial Spaces
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3">XR Retail Walkthroughs</h3>
          <p className="text-muted-foreground">Visualize your store setup before signing a lease with our immersive virtual environments in {city}.</p>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3">Prime Locations</h3>
          <p className="text-muted-foreground">Gain insights into foot traffic and neighborhood demographics for each listing.</p>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3">Seamless Process</h3>
          <p className="text-muted-foreground">Connect with commercial agents and property managers efficiently to finalize your lease.</p>
        </div>
      </section>
    </div>
  )
}

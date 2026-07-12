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
    title: `Office Spaces for Rent in ${city} | HousePadi Commercial`,
    description: `Find premium office spaces, co-working spots, and corporate real estate for rent in ${city}. Experience immersive virtual tours with HousePadi.`,
    alternates: {
      canonical: `/locations/${resolvedParams.city}/office-spaces-for-rent-near-me`,
    }
  }
}

export function generateStaticParams() {
  return STATIC_CITIES.map((city) => ({
    city: city,
  }))
}

export default async function OfficeSpacesForRentNearMePage({ params }: Props) {
  const resolvedParams = await params;
  const city = capitalize(resolvedParams.city)

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
      <header className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
          Office Spaces for Rent in {city}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Scale your company in the ideal work environment. Explore professional office spaces for rent in {city} with state-of-the-art immersive 3D viewing.
        </p>
      </header>

      <section className="bg-card text-card-foreground rounded-2xl shadow-sm border p-8 md:p-12 mb-12 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          Upgrade Your Workspace
        </h2>
        <p className="text-lg mb-8 text-muted-foreground">
          From private suites to expansive corporate floors, discover high-quality office rentals in {city}.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href={`/explore?category=office&location=${resolvedParams.city}`}>
              View Office Spaces in {city}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/explore">
              Explore All Commercial Real Estate
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3">Virtual Office Tours</h3>
          <p className="text-muted-foreground">Evaluate floor plans and desk arrangements in {city} remotely through our advanced VR features.</p>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3">Flexible Options</h3>
          <p className="text-muted-foreground">Find leases that fit your business needs, from short-term co-working to long-term headquarters.</p>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3">Direct Negotiations</h3>
          <p className="text-muted-foreground">Connect with leasing agents directly to negotiate the best terms for your company.</p>
        </div>
      </section>
    </div>
  )
}

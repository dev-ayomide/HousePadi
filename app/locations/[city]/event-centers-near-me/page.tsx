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
    title: `Event Centers Near Me in ${city} | HousePadi`,
    description: `Find the perfect event centers for weddings, corporate events, and parties in ${city}. Explore venues with immersive 3D virtual tours.`,
    alternates: {
      canonical: `/locations/${resolvedParams.city}/event-centers-near-me`,
    }
  }
}

export function generateStaticParams() {
  return STATIC_CITIES.map((city) => ({
    city: city,
  }))
}

export default async function EventCentersNearMePage({ params }: Props) {
  const resolvedParams = await params;
  const city = capitalize(resolvedParams.city)

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
      <header className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-foreground">
          Top Event Centers in {city}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Planning an event? Discover stunning venues and event spaces in {city} with our interactive 3D virtual tours, ensuring you find the perfect match before stepping foot inside.
        </p>
      </header>

      <section className="bg-card text-card-foreground rounded-2xl shadow-sm border p-8 md:p-12 mb-12 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">
          Find Your Ideal Venue
        </h2>
        <p className="text-lg mb-8 text-muted-foreground">
          From grand halls to intimate spaces, browse premium event centers available in {city}.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href={`/explore?category=event-center&location=${resolvedParams.city}`}>
              View Venues in {city}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/explore">
              Explore All Venues
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3">3D Previews</h3>
          <p className="text-muted-foreground">Walk through potential venues in {city} right from your browser, checking layout and capacity instantly.</p>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3">Direct Bookings</h3>
          <p className="text-muted-foreground">Contact owners and managers directly to secure your dates with no hidden fees.</p>
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-3">Verified Spaces</h3>
          <p className="text-muted-foreground">All event centers listed on HousePadi go through a rigorous verification process.</p>
        </div>
      </section>
    </div>
  )
}

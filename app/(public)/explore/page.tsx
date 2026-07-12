import Link from 'next/link'
import { getListingTypes } from '@/app/actions/registry-actions'
import { Building2, Tent, Store, ArrowUpRight, Compass, ShieldCheck } from 'lucide-react'

// Default details matching seeded data
const CATEGORY_META: Record<string, { image: string; desc: string; icon: any }> = {
  apartment: {
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=800',
    desc: 'Elite residential apartments and spatial architectural layouts optimized for 3D exploration.',
    icon: Building2
  },
  event_center: {
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800',
    desc: 'Vibrant luxury banquet halls, galleries, and conference locations modeled for virtual tours.',
    icon: Tent
  },
  public_space: {
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800',
    desc: 'Commercial public spaces, virtual galleries, and public exhibits created for premium branding.',
    icon: Store
  },
  products: {
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    desc: 'Browse premium furniture, lighting, and interior fixtures from our verified product vendors.',
    icon: Store
  }
}

export const revalidate = 0 // Disable cache for real-time updates

export default async function ExploreLandingPage() {
  const registryResponse = await getListingTypes()
  const categories = registryResponse.success && registryResponse.data ? [...registryResponse.data] : []

  // Inject the Products category
  categories.push({
    id: 'shop-products',
    slug: 'products',
    name: 'Product',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact_fee: 0,
    viewing_fee: 0,
    icon_url: null
  })

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Dynamic Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* Neon Glow Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative z-10 space-y-16">

        {/* Premium Header/Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-6 pt-10">
          <h1 className="text-4xl lg:text-6xl font-light tracking-tight text-white leading-none">
            Architecting the <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-500">Virtual Frontier</span>
          </h1>
          <p className="text-sm lg:text-base text-neutral-400 font-light leading-relaxed max-w-2xl mx-auto">
            Step inside our immersive spatial index. Access 3D architecture, virtual retail, and events curated with extreme sensory precision. Secure your virtual license today.
          </p>
        </div>

        {/* Categories Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
          {categories.map((category) => {
            const meta = CATEGORY_META[category.slug] || {
              image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
              desc: 'Premium dynamic listings configured for immersive spatial touring and layout calibration.',
              icon: Compass
            }
            const Icon = meta.icon

            return (
              <div
                key={category.id}
                className="group relative bg-neutral-900/20 border border-white/5 overflow-hidden transition-all duration-500 hover:border-white/10 hover:shadow-[0_0_50px_-12px_rgba(16,185,129,0.15)] flex flex-col justify-between"
              >
                {/* Visual Card Image Header */}
                <div className="relative aspect-video overflow-hidden border-b border-white/5">
                  <div className="absolute inset-0 bg-neutral-950/40 group-hover:bg-neutral-950/20 transition-colors z-10 duration-500" />
                  <img
                    src={meta.image}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />

                  {/* Category Type Icon Tag */}
                  <div className="absolute top-4 left-4 z-20 px-3 py-1.5 bg-neutral-950/80 backdrop-blur-md border border-white/10 flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest">
                    {category.name}
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h3 className="text-xl font-light tracking-tight group-hover:text-emerald-400 transition-colors">{category.name}s</h3>
                    <p className="text-xs text-neutral-400 font-light leading-relaxed">{meta.desc}</p>
                  </div>

                  {/* Pricing and Action Details */}
                  <div className="border-t border-white/5 pt-6 space-y-4">
                    <Link
                      href={`/explore/${category.slug}`}
                      className="w-full flex items-center justify-center gap-2 h-12 bg-white/5 border border-white/10 hover:bg-white hover:text-black hover:border-white text-xs font-bold uppercase tracking-widest transition-all duration-300"
                    >
                      Scout {category.name}s <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

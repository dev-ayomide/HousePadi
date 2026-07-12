'use client'

import { Button } from '@/components/ui/button'
import { Check, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import { getConsumerProfile } from '@/app/actions/consumer-actions'

export interface SubscriptionPlan {
  id: string
  name: string
  monthly_price: number
  storage_limit_mb: number
  agent_limit: number
  listing_limit: number
  supported_listing_types: string[]
  has_product_placement: boolean
  featured_listing_allowance: number
  upgrade_price: number
  display_order: number
  is_contact_sales: boolean
  is_active: boolean
  is_recommended: boolean
  plan_type?: 'agency' | 'agent' | 'consumer'
}

export interface VendorTier {
  id: string
  name: string
  price: number
  max_products: number
  max_storage_mb: number
  is_featured_tier: boolean
  is_active: boolean
}

export interface DeveloperTier {
  id: string
  name: string
  base_monthly_price: number
  included_calls: number
  overage_call_fee: number
}

export function PricingSection() {
  const { consumer, openAuthModal } = useConsumerAuth()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [vendorTiers, setVendorTiers] = useState<VendorTier[]>([])
  const [developerTiers, setDeveloperTiers] = useState<DeveloperTier[]>([])
  const [consumerTier, setConsumerTier] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAllPlans() {
      const supabase = createClient()
      
      const [agencyRes, vendorRes, developerRes] = await Promise.all([
        supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('vendor_subscription_tiers')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true }),
        supabase
          .from('billing_tiers')
          .select('*')
          .order('base_monthly_price', { ascending: true })
      ])

      if (!agencyRes.error && agencyRes.data) {
        setPlans(agencyRes.data as SubscriptionPlan[])
      }
      if (!vendorRes.error && vendorRes.data) {
        setVendorTiers(vendorRes.data as VendorTier[])
      }
      if (!developerRes.error && developerRes.data) {
        setDeveloperTiers(developerRes.data as DeveloperTier[])
      }

      if (consumer?.id) {
        try {
          const profileRes = await getConsumerProfile(consumer.id)
          if (profileRes.success && profileRes.data) {
            setConsumerTier(profileRes.data.tier || 'FREE')
          }
        } catch (err) {
          console.error('Error fetching consumer tier:', err)
        }
      } else {
        setConsumerTier(null)
      }

      setLoading(false)
    }

    fetchAllPlans()
  }, [consumer])

  const getPlanDescription = (name: string) => {
    const descMap: Record<string, string> = {
      'Freelancer': 'Entry-level tier for individual property agents.',
      'Independent': 'Standard workspace for independent spatial brokers.',
      'Senior man': 'Advanced capacity for active agents.',
      'Senior Man': 'Advanced capacity for active agents.',
      'Professional': 'Elite capability for top-performing individual agents.',
      'Curator': 'Basic workspace for small property agencies.',
      'Spatial': 'Starter-grade property management.',
      'Pro': 'Professional-grade property management.',
      'Enterprise': 'Custom subscription level.'
    }
    return descMap[name] || 'Enterprise-grade property management.'
  }

  const getFeaturesList = (plan: SubscriptionPlan) => {
    const list: string[] = []
    
    // Storage
    if (plan.storage_limit_mb >= 1000) {
      list.push(`${plan.storage_limit_mb / 1000}GB of storage`)
    } else {
      list.push(`${plan.storage_limit_mb}MB of storage`)
    }
    
    // Agents
    if (plan.is_contact_sales) {
      list.push('Custom agent limit')
    } else {
      list.push(`Up to ${plan.agent_limit} agent${plan.agent_limit === 1 ? '' : 's'}`)
    }
    
    // Listings
    if (plan.is_contact_sales) {
      list.push('Custom listing limits')
    } else {
      list.push(`Up to ${plan.listing_limit} listing${plan.listing_limit === 1 ? '' : 's'}`)
    }
    
    // Featured Allowance
    if (plan.featured_listing_allowance > 0) {
      list.push(`${plan.featured_listing_allowance} Featured listing${plan.featured_listing_allowance === 1 ? '' : 's'}`)
    }
    
    // Product placement
    if (plan.has_product_placement) {
      list.push('Product placement enabled')
    }
    
    // Supported Categories
    if (plan.supported_listing_types && plan.supported_listing_types.length > 0) {
      const categories = plan.supported_listing_types
        .map(t => t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' '))
        .join(', ')
      list.push(`Categories: ${categories}`)
    }

    return list
  }

  const consumerPlans = plans
    .filter(p => p.plan_type === 'consumer')
    .map(p => {
      let description = 'Starter tier for exploring immersive spaces.'
      let features: string[] = []
      
      if (p.name.toLowerCase() === 'free') {
        description = 'Starter tier for exploring immersive spaces.'
        features = [
          `Up to ${p.listing_limit} products`,
          `10MB max upload size per product`,
          `${p.storage_limit_mb}MB total allocated storage`,
          'Private products only'
        ]
      } else if (p.name.toLowerCase() === 'premium') {
        description = 'Enhanced tier for active spatial collectors.'
        features = [
          `Up to ${p.listing_limit} products`,
          `50MB max upload size per product`,
          `${p.storage_limit_mb}MB total allocated storage`,
          'Public/Private toggle for Unity app',
          'Advanced 3D AR viewer showcase'
        ]
      } else if (p.name.toLowerCase() === 'pro') {
        description = 'Power user tier for extensive product collections.'
        features = [
          `Up to ${p.listing_limit} products`,
          `100MB max upload size per product`,
          `${p.storage_limit_mb >= 1024 ? `${p.storage_limit_mb / 1024}GB` : `${p.storage_limit_mb}MB`} total allocated storage`,
          'Public/Private toggle for Unity app',
          'Advanced 3D AR viewer + priority processing'
        ]
      } else {
        description = 'Custom tier for spatial collectors.'
        features = [
          `Up to ${p.listing_limit} products`,
          `${p.storage_limit_mb >= 1024 ? `${p.storage_limit_mb / 1024}GB` : `${p.storage_limit_mb}MB`} total allocated storage`
        ]
      }

      return {
        id: p.id,
        name: p.name,
        price: Number(p.monthly_price),
        description,
        features,
        tierKey: p.name.toUpperCase(),
        is_recommended: p.is_recommended
      }
    })

  const individualPlans = plans.filter(p => p.plan_type === 'agent')
  const agencyPlans = plans.filter(p => p.plan_type === 'agency')

  if (loading) {
    return (
      <section id="pricing" className="py-32 bg-[#0A0A0A] border-t border-neutral-900 flex justify-center">
        <Loader2 className="w-8 h-8 text-neutral-800 animate-spin" />
      </section>
    )
  }

  return (
    <section id="pricing" className="py-32 px-6 sm:px-8 lg:px-12 bg-[#0A0A0A] border-t border-neutral-900">
      <div className="max-w-[90rem] mx-auto">
        {/* Section Header */}
        <div className="text-center mb-24 space-y-6">
          <div className="inline-block">
            <span className="text-[10px] tracking-[0.3em] uppercase text-neutral-500 font-semibold border-x border-neutral-800 px-4">
              Access Levels
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1]">
            Structured for <br /> Modern Spatial Business
          </h2>
          <p className="text-lg text-neutral-400 font-light max-w-2xl mx-auto leading-relaxed">
            Flexible infrastructure designed to scale with your organization&apos;s immersive properties and product catalogs.
          </p>
        </div>

        {/* Consumer Plans Section */}
        <div className="mb-32">
          <div className="text-center mb-16 space-y-2">
            <h3 className="text-2xl sm:text-3xl font-light text-white tracking-tight uppercase">Consumer Plans</h3>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">For Immersive Space Explorers and Asset Collectors</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {consumerPlans.map((plan) => {
              const isCurrent = consumerTier === plan.tierKey;
              const isDowngrade = consumerTier === 'PRO' && (plan.tierKey === 'FREE' || plan.tierKey === 'PREMIUM') ||
                                  consumerTier === 'PREMIUM' && plan.tierKey === 'FREE';
              const isEmerald = plan.tierKey === 'PREMIUM' || plan.tierKey === 'PRO';

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col p-10 border transition-all duration-500 ${
                    plan.is_recommended
                      ? isEmerald
                        ? 'border-emerald-500/30 bg-neutral-900/60 shadow-[0_0_80px_-20px_rgba(16,185,129,0.12)] z-10 scale-105'
                        : 'border-neutral-700 bg-neutral-900/60 shadow-[0_0_80px_-20px_rgba(255,255,255,0.05)] z-10 scale-105'
                      : isEmerald
                        ? 'border-emerald-900/30 bg-neutral-950 hover:bg-neutral-900/10'
                        : 'border-neutral-800/50 bg-neutral-950 hover:bg-neutral-900/20'
                  }`}
                >
                  {plan.is_recommended && (
                    <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-[10px] tracking-[0.2em] font-bold uppercase ${
                      isEmerald ? 'bg-emerald-500 text-black' : 'bg-white text-black'
                    }`}>
                      Signature
                    </div>
                  )}

                  <div className="mb-8">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-medium text-white mb-2 tracking-wide uppercase">{plan.name}</h3>
                      {isEmerald && <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />}
                    </div>
                    <p className="text-xs text-neutral-500 font-light tracking-wide">{plan.description}</p>
                  </div>

                  <div className="mb-10 flex items-baseline gap-1">
                    {plan.price === 0 ? (
                      <span className="text-5xl font-light text-white tracking-tighter">Free</span>
                    ) : (
                      <>
                        <span className="text-5xl font-light text-white tracking-tighter">₦{plan.price.toLocaleString()}</span>
                        <span className="text-neutral-500 text-sm font-light">one-time upgrade</span>
                      </>
                    )}
                  </div>

                  <div className="w-full mb-12">
                    {!consumer ? (
                      <Button
                        onClick={() => openAuthModal('signup')}
                        className={`w-full h-14 rounded-none text-xs tracking-widest uppercase transition-all duration-300 ${
                          plan.is_recommended
                            ? isEmerald
                              ? 'bg-emerald-500 text-black hover:bg-emerald-600'
                              : 'bg-white text-black hover:bg-neutral-200'
                            : isEmerald
                              ? 'bg-transparent border border-emerald-800 text-emerald-400 hover:bg-emerald-500 hover:text-black'
                              : 'bg-transparent border border-neutral-700 text-white hover:bg-white hover:text-black'
                        }`}
                      >
                        Start Experience
                      </Button>
                    ) : isCurrent ? (
                      <Button
                        disabled
                        className="w-full h-14 rounded-none text-xs tracking-widest uppercase bg-neutral-900 border border-neutral-800 text-neutral-600 cursor-not-allowed"
                      >
                        Current Plan
                      </Button>
                    ) : isDowngrade ? (
                      <Button
                        disabled
                        className="w-full h-14 rounded-none text-xs tracking-widest uppercase bg-neutral-950 border border-neutral-900 text-neutral-700 cursor-not-allowed"
                      >
                        Active Account
                      </Button>
                    ) : (
                      <Link href={`/consumer/products?upgrade=${plan.tierKey}`} className="w-full">
                        <Button
                          className={`w-full h-14 rounded-none text-xs tracking-widest uppercase transition-all duration-300 ${
                            plan.is_recommended
                              ? isEmerald
                                ? 'bg-emerald-500 text-black hover:bg-emerald-600'
                                : 'bg-white text-black hover:bg-neutral-200'
                              : isEmerald
                                ? 'bg-transparent border border-emerald-800 text-emerald-400 hover:bg-emerald-500 hover:text-black'
                                : 'bg-transparent border border-neutral-700 text-white hover:bg-white hover:text-black'
                          }`}
                        >
                          Upgrade Plan
                        </Button>
                      </Link>
                    )}
                  </div>

                  <div className="space-y-5 mt-auto">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-600 font-bold mb-4">Features</p>
                    {plan.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-start gap-4">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isEmerald ? 'text-emerald-500' : 'text-neutral-500'}`} />
                        <span className="text-neutral-400 text-sm font-light leading-snug">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Individual Agent Plans Section */}
        <div className="mb-32">
          <div className="text-center mb-16 space-y-2">
            <h3 className="text-2xl sm:text-3xl font-light text-white tracking-tight uppercase">Individual Agent Plans</h3>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Workspace Infrastructure for Freelance Agents & Spatial Brokers</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {individualPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col p-10 border transition-all duration-500 ${
                  plan.is_recommended
                    ? 'border-neutral-700 bg-neutral-900/60 shadow-[0_0_80px_-20px_rgba(255,255,255,0.05)] z-10 scale-105'
                    : 'border-neutral-800/50 bg-neutral-950 hover:bg-neutral-900/20'
                }`}
              >
                {plan.is_recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-[10px] tracking-[0.2em] font-bold text-black uppercase">
                    Signature
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-xl font-medium text-white mb-2 tracking-wide uppercase">{plan.name}</h3>
                  <p className="text-xs text-neutral-500 font-light tracking-wide">{getPlanDescription(plan.name)}</p>
                </div>

                <div className="mb-10 flex items-baseline gap-1">
                  {plan.is_contact_sales ? (
                    <span className="text-4xl font-light text-white tracking-tighter uppercase">Contact</span>
                  ) : (
                    <>
                      <span className="text-5xl font-light text-white tracking-tighter">₦{Number(plan.monthly_price).toLocaleString()}</span>
                      <span className="text-neutral-500 text-sm font-light">one-time upgrade</span>
                    </>
                  )}
                </div>

                <Link href={plan.is_contact_sales ? "/contact-sales" : "/auth/signup"} className="w-full mb-12">
                  <Button
                    className={`w-full h-14 rounded-none text-xs tracking-widest uppercase transition-all duration-300 ${
                      plan.is_recommended
                        ? 'bg-white text-black hover:bg-neutral-200'
                        : 'bg-transparent border border-neutral-700 text-white hover:bg-white hover:text-black'
                    }`}
                  >
                    {plan.is_contact_sales ? 'Contact Sales' : 'Start Experience'}
                  </Button>
                </Link>

                <div className="space-y-5 mt-auto">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-600 font-bold mb-4">Features</p>
                  {getFeaturesList(plan).map((feature: string, featureIndex: number) => (
                    <div key={featureIndex} className="flex items-start gap-4">
                      <Check className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-400 text-sm font-light leading-snug">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agency Plans Section */}
        <div className="mb-32">
          <div className="text-center mb-16 space-y-2">
            <h3 className="text-2xl sm:text-3xl font-light text-white tracking-tight uppercase">Agency Plans</h3>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Infrastructure for Immersive Property Organizations</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {agencyPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col p-10 border transition-all duration-500 ${
                  plan.is_recommended
                    ? 'border-neutral-700 bg-neutral-900/60 shadow-[0_0_80px_-20px_rgba(255,255,255,0.05)] z-10 scale-105'
                    : 'border-neutral-800/50 bg-neutral-950 hover:bg-neutral-900/20'
                }`}
              >
                {plan.is_recommended && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-[10px] tracking-[0.2em] font-bold text-black uppercase">
                    Signature
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-xl font-medium text-white mb-2 tracking-wide uppercase">{plan.name}</h3>
                  <p className="text-xs text-neutral-500 font-light tracking-wide">{getPlanDescription(plan.name)}</p>
                </div>

                <div className="mb-10 flex items-baseline gap-1">
                  {plan.is_contact_sales ? (
                    <span className="text-4xl font-light text-white tracking-tighter uppercase">Contact</span>
                  ) : (
                    <>
                      <span className="text-5xl font-light text-white tracking-tighter">₦{Number(plan.monthly_price).toLocaleString()}</span>
                      <span className="text-neutral-500 text-sm font-light">one-time upgrade</span>
                    </>
                  )}
                </div>

                <Link href={plan.is_contact_sales ? "/contact-sales" : "/auth/signup"} className="w-full mb-12">
                  <Button
                    className={`w-full h-14 rounded-none text-xs tracking-widest uppercase transition-all duration-300 ${
                      plan.is_recommended
                        ? 'bg-white text-black hover:bg-neutral-200'
                        : 'bg-transparent border border-neutral-700 text-white hover:bg-white hover:text-black'
                    }`}
                  >
                    {plan.is_contact_sales ? 'Contact Sales' : 'Start Experience'}
                  </Button>
                </Link>

                <div className="space-y-5 mt-auto">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-600 font-bold mb-4">Features</p>
                  {getFeaturesList(plan).map((feature: string, featureIndex: number) => (
                    <div key={featureIndex} className="flex items-start gap-4">
                      <Check className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-400 text-sm font-light leading-snug">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor Plans Section */}
        <div className="mb-16">
          <div className="text-center mb-16 space-y-2">
            <h3 className="text-2xl sm:text-3xl font-light text-white tracking-tight uppercase">Vendor Plans</h3>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">For Furniture and Spatial Fixture Merchants</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {vendorTiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative flex flex-col p-10 border transition-all duration-500 ${
                  tier.is_featured_tier
                    ? 'border-neutral-700 bg-neutral-900/60 shadow-[0_0_80px_-20px_rgba(255,255,255,0.05)] z-10 scale-105'
                    : 'border-neutral-800/50 bg-neutral-950 hover:bg-neutral-900/20'
                }`}
              >
                {tier.is_featured_tier && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-[10px] tracking-[0.2em] font-bold text-black uppercase">
                    Featured
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-xl font-medium text-white mb-2 tracking-wide uppercase">{tier.name}</h3>
                  <p className="text-xs text-neutral-500 font-light tracking-wide">
                    {tier.name.includes('Basic') 
                      ? 'Starter package for showcasing products.' 
                      : 'Advanced tier for growing product vendors.'}
                  </p>
                </div>

                <div className="mb-10 flex items-baseline gap-1">
                  {Number(tier.price) === 0 ? (
                    <span className="text-5xl font-light text-white tracking-tighter">Free</span>
                  ) : (
                    <>
                      <span className="text-5xl font-light text-white tracking-tighter">₦{Number(tier.price).toLocaleString()}</span>
                      <span className="text-neutral-500 text-sm font-light">one-time upgrade</span>
                    </>
                  )}
                </div>

                <Link href="/auth/signup" className="w-full mb-12">
                  <Button
                    className={`w-full h-14 rounded-none text-xs tracking-widest uppercase transition-all duration-300 ${
                      tier.is_featured_tier
                        ? 'bg-white text-black hover:bg-neutral-200'
                        : 'bg-transparent border border-neutral-700 text-white hover:bg-white hover:text-black'
                    }`}
                  >
                    Start Experience
                  </Button>
                </Link>

                <div className="space-y-5 mt-auto">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-600 font-bold mb-4">Features</p>
                  <div className="flex items-start gap-4">
                    <Check className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                    <span className="text-neutral-400 text-sm font-light leading-snug">Up to {tier.max_products} products</span>
                  </div>
                  <div className="flex items-start gap-4">
                    <Check className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                    <span className="text-neutral-400 text-sm font-light leading-snug">
                      {tier.max_storage_mb >= 1024 ? `${tier.max_storage_mb / 1024}GB` : `${tier.max_storage_mb}MB`} model storage
                    </span>
                  </div>
                  {tier.is_featured_tier && (
                    <div className="flex items-start gap-4">
                      <Check className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-400 text-sm font-light leading-snug">Featured products on homepage</span>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <Check className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                    <span className="text-neutral-400 text-sm font-light leading-snug">AR viewer enabled</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Developer API Plans Section */}
        <div className="mb-32">
          <div className="text-center mb-16 space-y-2">
            <h3 className="text-2xl sm:text-3xl font-light text-white tracking-tight uppercase">Developer API Plans</h3>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">Integrate Immersive 3D Viewer Technology into Your Parent Site</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {developerTiers.map((tier) => {
              const isGrowth = tier.name.toLowerCase() === 'growth';
              const isRecommended = tier.name.toLowerCase() === 'growth';

              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col p-10 border transition-all duration-500 ${
                    isRecommended
                      ? 'border-emerald-500/30 bg-neutral-900/60 shadow-[0_0_80px_-20px_rgba(16,185,129,0.12)] z-10 scale-105'
                      : 'border-neutral-800/50 bg-neutral-950 hover:bg-neutral-900/20'
                  }`}
                >
                  {isRecommended && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 text-[10px] tracking-[0.2em] font-bold uppercase bg-emerald-500 text-black">
                      Signature
                    </div>
                  )}

                  <div className="mb-8">
                    <div className="flex justify-between items-start">
                      <h3 className="text-xl font-medium text-white mb-2 tracking-wide uppercase">{tier.name}</h3>
                      {isRecommended && <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />}
                    </div>
                    <p className="text-xs text-neutral-500 font-light tracking-wide">
                      {tier.name.toLowerCase() === 'free' 
                        ? 'Starter tools for prototyping API and embed integrations.'
                        : tier.name.toLowerCase() === 'growth'
                        ? 'Dynamic volume cap for production client platforms.'
                        : 'Enterprise capacity for high-volume virtual properties.'}
                    </p>
                  </div>

                  <div className="mb-10 flex items-baseline gap-1">
                    {Number(tier.base_monthly_price) === 0 ? (
                      <span className="text-5xl font-light text-white tracking-tighter">Free</span>
                    ) : (
                      <>
                        <span className="text-5xl font-light text-white tracking-tighter">₦{Number(tier.base_monthly_price).toLocaleString()}</span>
                        <span className="text-neutral-500 text-sm font-light">/ month</span>
                      </>
                    )}
                  </div>

                  <Link href="/auth/signup" className="w-full mb-12">
                    <Button
                      className={`w-full h-14 rounded-none text-xs tracking-widest uppercase transition-all duration-300 ${
                        isRecommended
                          ? 'bg-emerald-500 text-black hover:bg-emerald-600'
                          : 'bg-transparent border border-neutral-700 text-white hover:bg-white hover:text-black'
                      }`}
                    >
                      Get Developer Keys
                    </Button>
                  </Link>

                  <div className="space-y-5 mt-auto">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-600 font-bold mb-4">Features</p>
                    <div className="flex items-start gap-4">
                      <Check className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-400 text-sm font-light leading-snug">
                        Up to {Number(tier.included_calls).toLocaleString()} unified calls / month
                      </span>
                    </div>
                    <div className="flex items-start gap-4">
                      <Check className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-400 text-sm font-light leading-snug">
                        ₦{Number(tier.overage_call_fee).toFixed(4)} overage fee per call
                      </span>
                    </div>
                    <div className="flex items-start gap-4">
                      <Check className="w-4 h-4 text-neutral-500 mt-0.5 flex-shrink-0" />
                      <span className="text-neutral-400 text-sm font-light leading-snug">
                        Secure Domain Locking / Referrer Validation
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom indicator */}
        <div className="mt-24 text-center">
          <p className="text-xs text-neutral-600 font-light max-w-lg mx-auto leading-relaxed">
            All plans include core immersive technology access. Custom white-label options and advanced analytics are available upon request.
          </p>
        </div>
      </div>
    </section>
  )
}


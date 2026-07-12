'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import {
  Store,
  Box,
  Settings,
  ChevronRight,
  Menu,
  Upload,
  HardDrive,
  CreditCard,
  Home
} from 'lucide-react'

export function VendorSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const [vendorLimits, setVendorLimits] = useState<any>(null)
  const [usageStats, setUsageStats] = useState({ products: 0, storageBytes: 0 })

  useEffect(() => {
    async function loadVendorData() {
      if (!user) return
      const supabase = createClient()

      const { data: profile } = await supabase
        .from('vendor_profiles')
        .select('current_tier_id')
        .eq('id', user.id)
        .single()

      if (profile && profile.current_tier_id) {
        const { data: tier } = await supabase
          .from('vendor_subscription_tiers')
          .select('*')
          .eq('id', profile.current_tier_id)
          .single()

        if (tier) {
          setVendorLimits({
            title: tier.name,
            maxProducts: tier.max_products,
            maxStorageBytes: tier.max_storage_mb * 1024 * 1024
          })
        }

        // Load stats
        const fetchStats = async () => {
          const { data: products } = await supabase
            .from('products')
            .select('id, model_size_bytes')
            .eq('vendor_id', user.id)

          if (products) {
            const productsCount = products.length
            const storageUsed = products.reduce((acc, p) => acc + (Number(p.model_size_bytes) || 0), 0)
            setUsageStats({ products: productsCount, storageBytes: storageUsed })
          }
        }

        await fetchStats()

        const channel = supabase
          .channel(`vendor_usage_sync_${Math.random()}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'products',
              filter: `vendor_id=eq.${user.id}`
            },
            () => fetchStats()
          )
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      }
    }
    loadVendorData()
  }, [user])

  const navGroups = [
    {
      title: 'Storefront',
      links: [
        { href: '/vendor', label: 'Overview', icon: Store },
        { href: '/vendor/products', label: 'My Products', icon: Box },
      ]
    },
    {
      title: 'Management',
      links: [
        { href: '/vendor/subscription', label: 'Subscription', icon: CreditCard },
        { href: '/vendor/settings', label: 'Account Settings', icon: Settings },
      ]
    }
  ]

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB'
    const mb = bytes / (1024 * 1024)
    if (mb > 1000) {
      return `${(mb / 1024).toFixed(2)} GB`
    }
    return `${mb.toFixed(2)} MB`
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-black">
      <div className="p-8 border-b border-neutral-900 space-y-4">
        <Link href="/vendor/products" className="inline-block">
          <img src="/logo.svg" alt="HousePadi Logo" className="h-8 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">Vendor Portal</p>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 py-1 text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white font-bold transition-colors"
        >
          <Home className="w-3.5 h-3.5" /> Return to Homepage
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto py-6 custom-scrollbar">
        {navGroups.map((group, idx) => (
          <div key={group.title} className={idx > 0 ? 'mt-8' : ''}>
            <div className="px-8 mb-4">
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-neutral-600">{group.title}</span>
            </div>
            <div className="space-y-1 px-4">
              {group.links.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || pathname?.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`group flex items-center justify-between px-4 py-3 text-xs tracking-wider uppercase font-medium transition-all ${isActive
                        ? 'text-white bg-neutral-900/50'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-900/30'
                      }`}
                  >
                    <div className="flex items-center gap-4">
                      <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'}`} />
                      {label}
                    </div>
                    {isActive && <ChevronRight className="w-3 h-3 text-neutral-500" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-neutral-900">
        {vendorLimits && (
          <div className="mb-4 px-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Tier: {vendorLimits.title}</span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
                  <span className="flex items-center gap-1"><Box className="w-3 h-3" /> Products</span>
                  <span>{usageStats.products} / {vendorLimits.maxProducts}</span>
                </div>
                <div className="h-1 bg-neutral-900 overflow-hidden">
                  <div
                    className={`h-full ${usageStats.products >= vendorLimits.maxProducts ? 'bg-amber-500' : 'bg-white'}`}
                    style={{ width: `${Math.min(100, (usageStats.products / vendorLimits.maxProducts) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
                  <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> Storage</span>
                  <span>{formatBytes(usageStats.storageBytes)} / {formatBytes(vendorLimits.maxStorageBytes)}</span>
                </div>
                <div className="h-1 bg-neutral-900 overflow-hidden">
                  <div
                    className={`h-full ${usageStats.storageBytes >= vendorLimits.maxStorageBytes ? 'bg-amber-500' : 'bg-white'}`}
                    style={{ width: `${Math.min(100, (usageStats.storageBytes / vendorLimits.maxStorageBytes) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden lg:flex w-72 bg-black border-r border-neutral-900 h-screen flex-col shrink-0 sticky top-0">
        <SidebarContent />
      </aside>

      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-black border-neutral-800 text-white hover:bg-neutral-900">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-black border-r border-neutral-900">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Access vendor portal links</SheetDescription>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

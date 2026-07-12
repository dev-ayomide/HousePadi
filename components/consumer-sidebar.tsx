'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { getConsumerProducts } from '@/app/actions/consumer-product-actions'
import {
  User,
  Lock,
  Box,
  Heart,
  CreditCard,
  Bell,
  ChevronRight,
  Menu,
  HardDrive,
  Home
} from 'lucide-react'

export function ConsumerSidebar() {
  const pathname = usePathname()
  const { consumer } = useConsumerAuth()
  const [open, setOpen] = useState(false)

  const [tier, setTier] = useState<string>('FREE')
  const [limits, setLimits] = useState<any>(null)
  const [stats, setStats] = useState({ productsCount: 0, storageBytes: 0 })

  const loadConsumerData = async () => {
    if (!consumer) return
    try {
      const res = await getConsumerProducts(consumer.id)
      if (res.success && res.limits) {
        setTier(res.tier || 'FREE')
        setLimits(res.limits)
        setStats({
          productsCount: res.products?.length || 0,
          storageBytes: res.totalStorageUsed || 0
        })
      }
    } catch (err) {
      console.error('Failed to load consumer data in sidebar:', err)
    }
  }

  useEffect(() => {
    if (!consumer) return
    loadConsumerData()

    const supabase = createClient()
    
    // Realtime sync on products table
    const productChannel = supabase
      .channel(`consumer_sidebar_products_${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consumer_products',
          filter: `user_id=eq.${consumer.id}`
        },
        () => loadConsumerData()
      )
      .subscribe()

    // Realtime sync on profile/tier updates
    const profileChannel = supabase
      .channel(`consumer_sidebar_profile_${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consumer_profiles',
          filter: `user_id=eq.${consumer.id}`
        },
        () => loadConsumerData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(productChannel)
      supabase.removeChannel(profileChannel)
    }
  }, [consumer])

  const navGroups = [
    {
      title: 'Workspace',
      links: [
        { href: '/consumer/profile', label: 'Account Settings', icon: User },
        { href: '/consumer/change-password', label: 'Change Password', icon: Lock },
        { href: '/consumer/products', label: 'My Products', icon: Box },
        { href: '/consumer/favorites', label: 'Saved Library', icon: Heart },
      ]
    },
    {
      title: 'Management',
      links: [
        { href: '/consumer/payments', label: 'Payment History', icon: CreditCard },
        { href: '/consumer/notifications', label: 'System Notifications', icon: Bell },
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
        <Link href="/consumer/profile" className="inline-block">
          <img src="/logo.svg" alt="HousePadi Logo" className="h-8 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">Consumer Portal</p>
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
        {limits && (
          <div className="mb-4 px-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Tier: {tier}</span>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
                  <span className="flex items-center gap-1"><Box className="w-3 h-3" /> Products</span>
                  <span>{stats.productsCount} / {limits.maxProducts}</span>
                </div>
                <div className="h-1 bg-neutral-900 overflow-hidden">
                  <div
                    className={`h-full ${stats.productsCount >= limits.maxProducts ? 'bg-amber-500' : 'bg-white'}`}
                    style={{ width: `${Math.min(100, (stats.productsCount / limits.maxProducts) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
                  <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> Storage</span>
                  <span>{formatBytes(stats.storageBytes)} / {formatBytes(limits.maxStorageSizeBytes)}</span>
                </div>
                <div className="h-1 bg-neutral-900 overflow-hidden">
                  <div
                    className={`h-full ${stats.storageBytes >= limits.maxStorageSizeBytes ? 'bg-amber-500' : 'bg-white'}`}
                    style={{ width: `${Math.min(100, (stats.storageBytes / limits.maxStorageSizeBytes) * 100)}%` }}
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
              <SheetDescription>Access consumer dashboard links</SheetDescription>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

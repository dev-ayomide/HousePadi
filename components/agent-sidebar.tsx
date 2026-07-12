'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { getAgencyStorageUsage } from '@/app/actions/r2-actions'
import {
  LayoutDashboard,
  Box,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  Upload,
  AlertTriangle,
  HardDrive,
  Calendar,
  Key,
  Home,
  CreditCard
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function AgentSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  
  const [userRole, setUserRole] = useState<string | null>(null)
  const [agencyLimits, setAgencyLimits] = useState<any>(null)
  const [usageStats, setUsageStats] = useState({ listings: 0, storageBytes: 0 })
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [isPersonalAgency, setIsPersonalAgency] = useState<boolean>(false)

  useEffect(() => {
    async function loadAgencyData() {
      if (!user) return
      const supabase = createClient()
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, agency_id')
        .eq('id', user.id)
        .single()
      
      if (profile && profile.agency_id) {
        // Fetch is_personal status
        const { data: agencyProfile } = await supabase
          .from('profiles')
          .select('is_personal')
          .eq('id', profile.agency_id)
          .single()
        
        setIsPersonalAgency(agencyProfile?.is_personal || false)

        const { data: sub } = await supabase
          .from('agency_subscriptions')
          .select('custom_listing_limit, custom_storage_limit_mb, subscription_plans(*)')
          .eq('agency_id', profile.agency_id)
          .single()
          
        if (sub && sub.subscription_plans) {
          const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans
          setAgencyLimits({
            title: plan.name,
            maxListings: sub.custom_listing_limit ?? plan.listing_limit,
            maxStorageBytes: (sub.custom_storage_limit_mb ?? plan.storage_limit_mb) * 1000 * 1000
          })
        }

        // Load stats
        const fetchStats = async () => {
          const [aptRes, evtRes, shpRes] = await Promise.all([
            supabase.from('apartments').select('id, file_size').eq('agency_id', profile.agency_id),
            supabase.from('event_centers').select('id, file_size').eq('agency_id', profile.agency_id),
            supabase.from('public_space').select('id, file_size').eq('agency_id', profile.agency_id)
          ])

          const properties = [...(aptRes.data || []), ...(evtRes.data || []), ...(shpRes.data || [])]
            
          if (properties) {
            const listingsCount = properties.length
            const storageUsed = properties.reduce((acc, p) => acc + (Number(p.file_size) || 0), 0)
            setUsageStats({ listings: listingsCount, storageBytes: storageUsed })
          }
        }

        await fetchStats()

        // Realtime subscription for properties under this agency
        const channel = supabase
          .channel(`agent_usage_sync_${Math.random()}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'properties',
              filter: `agency_id=eq.${profile.agency_id}`
            },
            () => {
              fetchStats()
            }
          )
          .subscribe()

        return () => {
          supabase.removeChannel(channel)
        }
      }
    }
    loadAgencyData()
  }, [user])

  const limitsReached = agencyLimits && (usageStats.listings >= agencyLimits.maxListings || usageStats.storageBytes >= agencyLimits.maxStorageBytes)

  const navGroups = [
    {
      title: 'Operations',
      links: [
        { href: '/agent', label: 'Overview', icon: LayoutDashboard },
        { href: '/agent/listings', label: 'My Listings', icon: Box },
        { href: '/agent/listings/upload', label: 'Upload Listing', icon: Upload },
      ]
    },
    ...(isPersonalAgency ? [{
      title: 'Billing',
      links: [
        { href: '/agent/subscription', label: 'Subscription & Billing', icon: CreditCard }
      ]
    }] : []),
    {
      title: 'System',
      links: [
        { href: '/agent/settings', label: 'Account Settings', icon: Settings },
      ]
    }
  ]

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 GB'
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(2)} GB`
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-black">
      <div className="p-8 border-b border-neutral-900 space-y-4">
        <Link href="/agent" className="inline-block">
          <img src="/logo.svg" alt="HousePadi Logo" className="h-8 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">Agent Portal</p>
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
                const isActive = pathname === href || (href !== '/agent' && pathname?.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`group flex items-center justify-between px-4 py-3 text-xs tracking-wider uppercase font-medium transition-all ${
                      isActive
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
        {agencyLimits && (
          <div className="mb-4 px-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Agency Plan: {agencyLimits.title}</span>
              {limitsReached && (
                <button onClick={() => setShowUpgradeModal(true)} className="text-[10px] uppercase tracking-widest text-amber-500 font-bold animate-pulse hover:text-amber-400">
                  Limit Reached
                </button>
              )}
            </div>
            
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
                  <span className="flex items-center gap-1"><Box className="w-3 h-3" /> Listings</span>
                  <span>{usageStats.listings} / {agencyLimits.maxListings}</span>
                </div>
                <div className="h-1 bg-neutral-900 overflow-hidden">
                  <div 
                    className={`h-full ${usageStats.listings >= agencyLimits.maxListings ? 'bg-amber-500' : 'bg-white'}`} 
                    style={{ width: `${Math.min(100, (usageStats.listings / agencyLimits.maxListings) * 100)}%` }} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
                  <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" /> Storage</span>
                  <span>{formatBytes(usageStats.storageBytes)} / {formatBytes(agencyLimits.maxStorageBytes)}</span>
                </div>
                <div className="h-1 bg-neutral-900 overflow-hidden">
                  <div 
                    className={`h-full ${usageStats.storageBytes >= agencyLimits.maxStorageBytes ? 'bg-amber-500' : 'bg-white'}`} 
                    style={{ width: `${Math.min(100, (usageStats.storageBytes / agencyLimits.maxStorageBytes) * 100)}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="bg-black border-neutral-800 text-white rounded-none sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-light tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Agency Capacity Reached
            </DialogTitle>
            <DialogDescription className="text-neutral-500 text-xs uppercase tracking-widest mt-2">
              Your agency has reached its storage or listing limits.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="p-4 border border-neutral-900 bg-neutral-900/20 text-sm text-neutral-300 leading-relaxed">
              {isPersonalAgency ? (
                `Uploads are temporarily disabled because you have exhausted your allocated capacity under the ${agencyLimits?.title} plan. Please upgrade your subscription or free up space.`
              ) : (
                `Uploads are temporarily disabled because your agency has exhausted its allocated capacity under the ${agencyLimits?.title} plan. Please contact your agency administrator to upgrade the subscription or free up space.`
              )}
            </div>
            {isPersonalAgency ? (
              <Button 
                onClick={() => {
                  setShowUpgradeModal(false)
                  router.push('/agent/subscription')
                }} 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black rounded-none h-12 text-xs font-bold uppercase tracking-widest transition-all"
              >
                Upgrade Plan
              </Button>
            ) : (
              <Button onClick={() => setShowUpgradeModal(false)} className="w-full bg-white text-black hover:bg-neutral-200 rounded-none h-12 text-xs font-bold uppercase tracking-widest transition-all">
                Understood
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-72 bg-black border-r border-neutral-900 h-screen flex-col shrink-0 sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Trigger */}
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
              <SheetDescription>Access agent portal links and storage stats</SheetDescription>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

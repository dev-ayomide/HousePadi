'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Users,
  Box,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  Activity,
  AlertTriangle,
  Home
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  
  const [userRole, setUserRole] = useState<string | null>(null)
  const [agencyLimits, setAgencyLimits] = useState<any>(null)
  const [usageStats, setUsageStats] = useState({ agents: 0, listings: 0 })
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    async function loadAgencyData() {
      if (!user) return
      const supabase = createClient()
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, subscription_tier_id')
        .eq('id', user.id)
        .single()
      
      if (profile) {
        setUserRole(profile.role)
        
        const { data: sub } = await supabase
          .from('agency_subscriptions')
          .select('custom_agent_limit, custom_listing_limit, subscription_plans(*)')
          .eq('agency_id', user.id)
          .single()

        if (sub && sub.subscription_plans) {
          const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans
          setAgencyLimits({
            title: plan.name,
            maxAgents: sub.custom_agent_limit ?? plan.agent_limit,
            maxListings: sub.custom_listing_limit ?? plan.listing_limit
          })
        }
      }

      const { count: agentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', user.id)
        .eq('role', 'AGENT')

      setUsageStats({ 
        agents: agentCount || 0, 
        listings: 0 
      })
    }
    loadAgencyData()
  }, [user])

  const limitsReached = agencyLimits && (usageStats.agents >= agencyLimits.maxAgents || usageStats.listings >= agencyLimits.maxListings)

  const navGroups = [
    {
      title: 'Operations',
      links: [
        { href: '/agency', label: 'Overview', icon: LayoutDashboard },
        { href: '/agency/agents', label: 'Agent Directory', icon: Users },
        { href: '/agency/listings', label: 'Property Listings', icon: Box },
      ]
    },
    {
      title: 'System',
      links: [
        { href: '/agency/analytics', label: 'Usage Analytics', icon: Activity },
        { href: '/agency/subscription', label: 'Subscription & Billing', icon: Settings },
        { href: '/agency/settings', label: 'Preferences', icon: Settings },
      ]
    }
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-black">
      <div className="p-8 border-b border-neutral-900 space-y-4">
        <Link href="/agency" className="inline-block">
          <img src="/logo.svg" alt="HousePadi Logo" className="h-8 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1">Agency Operations</p>
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
                const isActive = pathname === href || (href !== '/agency' && pathname?.startsWith(href));
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
          <div className="mb-4 px-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Plan: {agencyLimits.title}</span>
              {limitsReached && (
                <Link href="/agency/subscription" onClick={() => setOpen(false)} className="text-[10px] uppercase tracking-widest text-amber-500 font-bold animate-pulse hover:text-amber-400">
                  Upgrade
                </Link>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[9px] uppercase tracking-widest text-neutral-600 mb-1">
                  <span>Agents</span>
                  <span>{usageStats.agents} / {agencyLimits.maxAgents}</span>
                </div>
                <div className="h-1 bg-neutral-900 overflow-hidden">
                  <div 
                    className={`h-full ${usageStats.agents >= agencyLimits.maxAgents ? 'bg-amber-500' : 'bg-white'}`} 
                    style={{ width: `${Math.min(100, (usageStats.agents / agencyLimits.maxAgents) * 100)}%` }} 
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
              Capacity Reached
            </DialogTitle>
            <DialogDescription className="text-neutral-500 text-xs uppercase tracking-widest mt-2">
              Your {agencyLimits?.title} plan has reached its limits.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="p-4 border border-neutral-900 bg-neutral-900/20 text-sm text-neutral-300 leading-relaxed">
              You are currently utilizing {usageStats.agents} out of {agencyLimits?.maxAgents} allowed agents on your platform tier. To provision additional personnel or expand your listing capacity, please upgrade your subscription.
            </div>
            <Button className="w-full bg-white text-black hover:bg-neutral-200 rounded-none h-12 text-xs font-bold uppercase tracking-widest transition-all">
              Contact Sales to Upgrade
            </Button>
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
              <SheetDescription>Access agency dashboard operations and options</SheetDescription>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

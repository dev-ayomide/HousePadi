'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Building2,
  Users,
  MessageSquareQuote,
  Tags,
  FileEdit,
  FileText,
  User,
  CheckSquare,
  Activity,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  ShieldCheck,
  MessageSquare,
  Globe,
  Home,
  Store,
  BookOpen,
  Gift
} from 'lucide-react'

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const navGroups = [
    {
      title: 'Core',
      links: [
        { href: '/admin', label: 'Overview', icon: LayoutDashboard },
        { href: '/admin/moderators', label: 'Moderators', icon: ShieldCheck },
        { href: '/admin/agencies', label: 'Agencies', icon: Building2 },
        { href: '/admin/agents', label: 'Agents', icon: Users },
        { href: '/admin/moderation', label: 'Listing Moderation', icon: CheckSquare },
        { href: '/admin/moderation/vendors', label: 'Vendor Moderation', icon: Store },
        { href: '/admin/campaigns', label: 'Credit Campaigns', icon: Gift },
      ]
    },
    {
      title: 'Content Management',
      links: [
        { href: '/admin/cms/testimonials', label: 'Testimonials', icon: MessageSquareQuote },
        { href: '/admin/cms/pricing', label: 'Pricing Plans', icon: Tags },
        { href: '/admin/cms/about', label: 'About Page', icon: FileEdit },
        { href: '/admin/cms/legal', label: 'Legal Pages', icon: FileText },
        { href: '/admin/cms/resources', label: 'Resources Management', icon: BookOpen },
        { href: '/admin/cms/api-docs', label: 'API Documentation', icon: FileText },
      ]
    },
    {
      title: 'Platform',
      links: [
        { href: '/admin/analytics', label: 'Analytics', icon: Activity },
        { href: '/admin/keys', label: 'API Key Monitor', icon: ShieldCheck },
        { href: '/admin/contact', label: 'Inquiries', icon: MessageSquare },
        { href: '/admin/messaging', label: 'Messaging Center', icon: MessageSquareQuote },
        { href: '/admin/links', label: 'Link Management', icon: Globe },
        { href: '/admin/profile', label: 'Moderator Profile', icon: User },
        { href: '/admin/settings', label: 'Settings', icon: Settings },
      ]
    }
  ]

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-black">
      <div className="p-8 border-b border-neutral-900 space-y-4">
        <Link href="/admin" className="flex items-center gap-3 px-2">
          <img src="/logo.svg" alt="HousePadi Logo" className="h-8 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white font-bold transition-colors"
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
                const isActive = pathname === href || (href !== '/admin' && pathname?.startsWith(href));
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
              <SheetDescription>Access moderator dashboard controls and administrative panels</SheetDescription>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getSiteSettings } from '@/app/actions/settings-actions'
import { getUserNotifications } from '@/app/actions/messaging-actions'
import { getConsumerCredits } from '@/app/actions/campaign-actions'
import { Menu, X, User, Settings, LogOut, Heart, CreditCard, Bell, Ticket, Box } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function Header() {
  const [links, setLinks] = useState<Record<string, string>>({})
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const { consumer, logout: consumerLogout } = useConsumerAuth()
  const [hasUnread, setHasUnread] = useState(false)
  const [credits, setCredits] = useState(0)
  const [profileRole, setProfileRole] = useState<string | null>(null)
  const router = useRouter()

  const handleLogout = async () => {
    if (user) await signOut()
    if (consumer) await consumerLogout()
    router.push('/')
  }

  const activeEmail = user?.email || consumer?.email
  const initials = activeEmail ? activeEmail.substring(0, 2).toUpperCase() : 'U'

  useEffect(() => {
    async function loadLinks() {
      const result = await getSiteSettings()
      if (result.success) {
        setLinks(result.data)
      }
    }
    loadLinks()
  }, [])

  useEffect(() => {
    async function loadProfile() {
      if (!user) {
        setProfileRole(null)
        return
      }
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        if (data) {
          setProfileRole(data.role)
        }
      } catch (err) {
        console.error('Failed to load user profile role in header:', err)
      }
    }
    loadProfile()
  }, [user])

  useEffect(() => {
    async function checkNotifs() {
      const activeId = user?.id || consumer?.id
      if (!activeId) return
      try {
        const res = await getUserNotifications(activeId)
        if (res.success && res.data) {
          setHasUnread(res.data.some((n: any) => !n.is_read))
        }
      } catch (error) {
        console.error('Failed to load notifications in header', error)
      }
    }
    checkNotifs()
  }, [user?.id, consumer?.id])

  useEffect(() => {
    async function loadCredits() {
      if (!activeEmail) return
      try {
        const res = await getConsumerCredits(activeEmail)
        if (res.success) setCredits(res.data)
      } catch (error) {
        console.error('Failed to load credits', error)
      }
    }
    loadCredits()
  }, [activeEmail])

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const menuVariants = {
    closed: {
      opacity: 0,
      y: '-100%',
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 40,
      },
    },
    open: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 400,
        damping: 40,
      },
    },
  }

  const containerVariants = {
    closed: { opacity: 0 },
    open: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    closed: { opacity: 0, x: -20 },
    open: { opacity: 1, x: 0 },
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/20 backdrop-blur-xl">
        <div className="max-w-[90rem] mx-auto px-6 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 z-50">
            <img src="/logo.svg" alt="HousePadi Logo" className="h-10 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
            <span className="text-lg font-bold tracking-tight text-white">HousePadi</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            <Link href="/explore" className="text-xs tracking-widest uppercase text-neutral-400 hover:text-white transition-colors font-medium">
              Explore
            </Link>
            <Link href="/pricing" className="text-xs tracking-widest uppercase text-neutral-400 hover:text-white transition-colors font-medium">
              Pricing
            </Link>
            <Link href="/about" className="text-xs tracking-widest uppercase text-neutral-400 hover:text-white transition-colors font-medium">
              About Us
            </Link>
            <Link href="/contact" className="text-xs tracking-widest uppercase text-neutral-400 hover:text-white transition-colors font-medium">
              Contact Us
            </Link>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-6">
            {(user || consumer) ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none relative">
                  <Avatar className="w-8 h-8 rounded-none border border-neutral-800 hover:border-neutral-500 transition-colors">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-neutral-900 text-white text-[10px] uppercase font-bold rounded-none">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {hasUnread && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black z-10" />
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-black border-neutral-800 text-white rounded-none mr-4" align="end">
                  <DropdownMenuLabel className="font-light text-xs text-neutral-400 pb-1">
                    {activeEmail}
                  </DropdownMenuLabel>
                  <DropdownMenuLabel className="font-bold text-xs text-white pt-0 pb-2 flex items-center gap-2">
                    <Ticket className="w-3.5 h-3.5 text-green-400" /> {credits} Available Credits
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-neutral-900" />
                  {user && (
                    <DropdownMenuItem 
                      className="text-xs uppercase tracking-widest text-neutral-300 focus:bg-neutral-900 focus:text-white cursor-pointer rounded-none gap-2 py-3"
                      onClick={() => {
                        const role = (profileRole || user.user_metadata?.role || 'admin').toUpperCase()
                        if (role === 'PRODUCT_VENDOR' || role === 'VENDOR') router.push('/vendor')
                        else if (role === 'AGENCY') router.push('/agency')
                        else if (role === 'AGENT') router.push('/agent')
                        else if (role === 'DEVELOPER') router.push('/developer')
                        else if (role === 'CONSUMER') router.push('/consumer/profile')
                        else router.push('/admin')
                      }}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    className="text-xs uppercase tracking-widest text-neutral-300 focus:bg-neutral-900 focus:text-white cursor-pointer rounded-none gap-2 py-3"
                    onClick={() => router.push('/consumer/profile')}
                  >
                    <User className="w-3.5 h-3.5" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-xs uppercase tracking-widest text-neutral-300 focus:bg-neutral-900 focus:text-white cursor-pointer rounded-none gap-2 py-3"
                    onClick={() => router.push('/consumer/notifications')}
                  >
                    <Bell className="w-3.5 h-3.5" />
                    System Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-xs uppercase tracking-widest text-red-400 focus:bg-red-950/30 focus:text-red-300 cursor-pointer rounded-none gap-2 py-3"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login" className="text-xs tracking-widest uppercase text-neutral-400 hover:text-white transition-colors font-medium">
                Login
              </Link>
            )}
            <Link href="/download" className="hidden sm:block">
              <Button 
                variant="outline" 
                className="h-11 border-neutral-700 bg-transparent text-white hover:bg-white hover:text-neutral-950 rounded-none text-xs tracking-widest uppercase px-6 transition-all duration-300"
              >
                Get The App
              </Button>
            </Link>
            
            {/* Hamburger Button */}
            <button 
              className="md:hidden text-white hover:text-neutral-300 focus:outline-none transition-colors z-50"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
            className="fixed inset-0 z-45 bg-black/98 backdrop-blur-2xl md:hidden flex flex-col justify-center px-8 sm:px-12"
          >
            <motion.div 
              variants={containerVariants}
              className="space-y-8 flex flex-col text-left"
            >
              <motion.div variants={itemVariants}>
                <Link 
                  href="/explore" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-light tracking-[0.15em] uppercase text-neutral-400 hover:text-white transition-colors block border-b border-neutral-900/50 pb-4"
                >
                  Explore
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link 
                  href="/pricing" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-light tracking-[0.15em] uppercase text-neutral-400 hover:text-white transition-colors block border-b border-neutral-900/50 pb-4"
                >
                  Pricing
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link 
                  href="/about" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-light tracking-[0.15em] uppercase text-neutral-400 hover:text-white transition-colors block border-b border-neutral-900/50 pb-4"
                >
                  About Us
                </Link>
              </motion.div>
              <motion.div variants={itemVariants}>
                <Link 
                  href="/contact" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-light tracking-[0.15em] uppercase text-neutral-400 hover:text-white transition-colors block border-b border-neutral-900/50 pb-4"
                >
                  Contact Us
                </Link>
              </motion.div>
              <motion.div variants={itemVariants} className="pt-4">
                <Link 
                  href="/download" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full block"
                >
                  <Button 
                    className="w-full h-14 bg-white text-black hover:bg-neutral-200 rounded-none text-xs font-bold tracking-widest uppercase transition-all duration-300"
                  >
                    Get The App
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

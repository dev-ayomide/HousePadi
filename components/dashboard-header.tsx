'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, Settings, User, Ticket } from 'lucide-react'
import { NotificationBell } from './notification-bell'
import { useEffect, useState } from 'react'
import { getConsumerCredits } from '@/app/actions/campaign-actions'

export function DashboardHeader() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [credits, setCredits] = useState(0)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Fallback if the user profile hasn't loaded fully or if there is no session
  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'U'

  useEffect(() => {
    async function loadCredits() {
      if (!user?.email) return
      try {
        const res = await getConsumerCredits(user.email)
        if (res.success) setCredits(res.data)
      } catch (error) {
        console.error('Failed to load credits', error)
      }
    }
    loadCredits()
  }, [user?.email])

  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-black/80 backdrop-blur-md border-b border-neutral-900 z-40 flex items-center justify-end px-6">
      <div className="flex items-center gap-4">
        {user && (
          <>
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <Avatar className="w-8 h-8 rounded-none border border-neutral-800 hover:border-neutral-500 transition-colors">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-neutral-900 text-white text-[10px] uppercase font-bold rounded-none">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-black border-neutral-800 text-white rounded-none mr-4" align="end">
                <DropdownMenuLabel className="font-light text-xs text-neutral-400 pb-1">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuLabel className="font-bold text-xs text-white pt-0 pb-2 flex items-center gap-2">
                  <Ticket className="w-3.5 h-3.5 text-green-400" /> {credits} Available Credits
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-neutral-900" />
                <DropdownMenuItem 
                  className="text-xs uppercase tracking-widest text-neutral-300 focus:bg-neutral-900 focus:text-white cursor-pointer rounded-none gap-2 py-3"
                  onClick={() => {
                    const role = (user.user_metadata?.role || 'admin').toUpperCase()
                    if (role === 'PRODUCT_VENDOR' || role === 'VENDOR') router.push('/vendor/settings')
                    else if (role === 'AGENCY') router.push('/agency/settings')
                    else if (role === 'CONSUMER') router.push('/consumer/profile')
                    else router.push('/admin/profile')
                  }}
                >
                  <Settings className="w-3.5 h-3.5" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-xs uppercase tracking-widest text-red-400 focus:bg-red-950/30 focus:text-red-300 cursor-pointer rounded-none gap-2 py-3"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </header>
  )
}

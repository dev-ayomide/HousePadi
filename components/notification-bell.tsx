'use client'

import { useState, useEffect } from 'react'
import { Bell, Check, Trash2, Clock, AlertTriangle, Info } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getUserNotifications, markNotificationRead } from '@/app/actions/messaging-actions'
import { useAuth } from '@/lib/auth-context'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

export function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchNotifs = async () => {
      const res = await getUserNotifications(user.id)
      if (res.success && res.data) {
        setNotifications(res.data)
        setUnreadCount(res.data.filter((n: any) => !n.is_read).length)
      }
    }

    fetchNotifs()
    
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifs, 60000)
    return () => clearInterval(interval)
  }, [user, isOpen]) // Re-fetch when opened too

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const res = await markNotificationRead(id)
    if (res.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleOpenNotification = async (notif: any) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id)
    }
    setIsOpen(false)
    router.push('/notifications')
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-neutral-900 rounded-none w-10 h-10">
          <Bell className="w-4 h-4 text-neutral-400" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 bg-black border-neutral-800 text-white rounded-none mr-4 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-neutral-900">
          <DropdownMenuLabel className="font-light text-xs text-neutral-400 uppercase tracking-widest p-0">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-medium">
              {unreadCount} New
            </span>
          )}
        </div>
        
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
              <Bell className="w-6 h-6 text-neutral-800" />
              <p>You're all caught up</p>
            </div>
          ) : (
            notifications.slice(0, 5).map((notif) => (
              <div 
                key={notif.id} 
                onClick={() => handleOpenNotification(notif)}
                className={`p-4 border-b border-neutral-900/50 cursor-pointer hover:bg-neutral-900/50 transition-colors ${!notif.is_read ? 'bg-neutral-900/20' : ''}`}
              >
                <div className="flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    {notif.priority === 'CRITICAL' ? (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    ) : notif.priority === 'IMPORTANT' ? (
                      <Info className="w-4 h-4 text-amber-500" />
                    ) : (
                      <Bell className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${!notif.is_read ? 'text-white font-medium' : 'text-neutral-300'}`}>
                      {notif.subject}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-1">
                      {notif.body}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[10px] text-neutral-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                      {!notif.is_read && (
                        <button 
                          onClick={(e) => handleMarkRead(notif.id, e)}
                          className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="p-2 border-t border-neutral-900">
          <Button 
            variant="ghost" 
            className="w-full text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-none"
            onClick={() => {
              setIsOpen(false)
              router.push('/notifications')
            }}
          >
            View All Notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

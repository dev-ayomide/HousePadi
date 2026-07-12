'use client'

import { useState, useEffect } from 'react'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import { getUserNotifications, markNotificationRead } from '@/app/actions/messaging-actions'
import { Bell, CheckCircle2, Clock, AlertTriangle, Info, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function ConsumerNotificationsPage() {
  const { consumer, loading: authLoading } = useConsumerAuth()
  const router = useRouter()
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!consumer) {
      router.push('/auth/login')
      return
    }
    const fetchNotifs = async () => {
      const res = await getUserNotifications(consumer.id)
      if (res.success && res.data) {
        setNotifications(res.data)
      }
      setIsLoading(false)
    }
    fetchNotifs()
  }, [consumer, router])

  const handleMarkAsRead = async (id: string) => {
    const res = await markNotificationRead(id)
    if (res.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="w-8 h-8 border-t-2 border-white animate-spin rounded-full mb-2"></div>
        <span className="text-xs uppercase tracking-widest text-neutral-500">Retrieving notifications...</span>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-white">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight uppercase">System Notifications</h1>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">
            You have {unreadCount} unread messages
          </p>
        </div>
      </div>

        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-20 border border-white/5 bg-neutral-950/80 backdrop-blur-xl">
              <Bell className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Notifications</h3>
              <p className="text-neutral-500 text-sm">You are all caught up!</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div 
                key={notif.id}
                className={`p-6 sm:p-8 border transition-colors ${notif.is_read ? 'bg-neutral-950/40 border-white/5' : 'bg-neutral-900/40 border-white/10'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 mt-1">
                    {notif.priority === 'CRITICAL' ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : notif.priority === 'IMPORTANT' ? (
                      <Info className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Bell className="w-5 h-5 text-neutral-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <h3 className={`text-lg tracking-wide ${!notif.is_read ? 'text-white font-medium' : 'text-neutral-300'}`}>
                        {notif.subject}
                      </h3>
                      <div className="flex items-center gap-3 shrink-0 text-xs text-neutral-500 font-medium">
                        <span className="flex items-center gap-1 uppercase tracking-wider">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                        {notif.priority !== 'NORMAL' && (
                          <span className={`px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase ${notif.priority === 'CRITICAL' ? 'bg-red-950/30 text-red-400 border border-red-900/50' : 'bg-amber-950/30 text-amber-400 border border-amber-900/50'}`}>
                            {notif.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">
                      {notif.body}
                    </div>
                    
                    <div className="flex justify-end mt-6">
                      {!notif.is_read && (
                        <Button 
                          onClick={() => handleMarkAsRead(notif.id)}
                          variant="ghost" 
                          className="text-xs font-bold uppercase tracking-widest text-neutral-300 hover:text-white hover:bg-white/10 h-10 px-4 rounded-none flex items-center gap-2 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Mark as Read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

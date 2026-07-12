'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getUserNotifications, markNotificationRead } from '@/app/actions/messaging-actions'
import { Bell, CheckCircle2, Clock, AlertTriangle, Info, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const fetchNotifs = async () => {
      const res = await getUserNotifications(user.id)
      if (res.success && res.data) {
        setNotifications(res.data)
      }
      setIsLoading(false)
    }
    fetchNotifs()
  }, [user])

  const handleMarkAsRead = async (id: string) => {
    const res = await markNotificationRead(id)
    if (res.success) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="w-8 h-8 border-t-2 border-white animate-spin rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-2xl font-light text-white">
            System Notifications
          </h1>
          <p className="text-xs uppercase tracking-widest text-neutral-500 mt-2">
            You have {unreadCount} unread messages
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="text-center py-20 border border-neutral-900 bg-neutral-950/50">
            <Bell className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No Notifications</h3>
            <p className="text-neutral-500 text-sm">You are all caught up!</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div 
              key={notif.id}
              className={`p-6 border transition-colors ${notif.is_read ? 'bg-black border-neutral-900' : 'bg-neutral-900/40 border-neutral-700'}`}
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-1">
                  {notif.priority === 'CRITICAL' ? (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  ) : notif.priority === 'IMPORTANT' ? (
                    <Info className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Bell className="w-5 h-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h3 className={`text-lg ${!notif.is_read ? 'text-white font-medium' : 'text-neutral-300'}`}>
                      {notif.subject}
                    </h3>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(notif.created_at).toLocaleString()}
                      </span>
                      {notif.priority !== 'NORMAL' && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase ${notif.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {notif.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">
                    {notif.body}
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    {!notif.is_read && (
                      <Button 
                        onClick={() => handleMarkAsRead(notif.id)}
                        variant="ghost" 
                        className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 h-8 px-3 rounded-none flex items-center gap-2"
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

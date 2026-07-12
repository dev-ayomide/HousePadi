'use client'

import { useState, useEffect } from 'react'
import { getBroadcastHistory } from '@/app/actions/messaging-actions'
import { Plus, Radio, Mail, Clock, AlertTriangle, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function MessagingCenterPage() {
  const [history, setHistory] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchHistory = async () => {
      const res = await getBroadcastHistory()
      if (res.success && res.data) {
        setHistory(res.data)
      }
      setIsLoading(false)
    }
    fetchHistory()
  }, [])

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-light text-white">
            Messaging Center
          </h1>
          <p className="text-xs uppercase tracking-widest text-neutral-500 mt-2">
            Broadcast History & Management
          </p>
        </div>
        <Button 
          onClick={() => router.push('/admin/messaging/compose')}
          className="bg-white text-black hover:bg-neutral-200 rounded-none h-10 px-6 text-xs uppercase tracking-widest font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Broadcast
        </Button>
      </div>

      {isLoading ? (
        <div className="p-12 flex justify-center">
          <div className="w-8 h-8 border-t-2 border-white animate-spin rounded-full"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20 border border-neutral-900 bg-neutral-950/50">
          <Radio className="w-12 h-12 text-neutral-800 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Broadcasts Yet</h3>
          <p className="text-neutral-500 text-sm mb-6">Send your first system or email broadcast to users.</p>
        </div>
      ) : (
        <div className="bg-black border border-neutral-900 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-neutral-900 bg-neutral-950/50 text-[10px] uppercase tracking-widest font-bold text-neutral-500">
            <div className="col-span-4">Message</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Audience</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2 text-right">Stats</div>
          </div>
          
          <div className="divide-y divide-neutral-900">
            {history.map(b => (
              <div key={b.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-neutral-900/30 transition-colors">
                <div className="col-span-4 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-white font-medium truncate">{b.subject}</p>
                    {b.priority !== 'NORMAL' && (
                      <span className={`px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-bold rounded-sm ${b.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {b.priority}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 truncate">{b.body}</p>
                </div>
                
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-medium tracking-wider uppercase ${b.broadcast_type === 'SYSTEM' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                    {b.broadcast_type === 'SYSTEM' ? <Radio className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                    {b.broadcast_type}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                    <Users className="w-3.5 h-3.5" />
                    {b.recipient_group}
                  </span>
                </div>

                <div className="col-span-2">
                  <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(b.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="col-span-2 text-right">
                  {b.broadcast_type === 'SYSTEM' ? (
                    <div className="flex flex-col items-end gap-1 text-[10px] uppercase tracking-wider font-medium">
                      <span className="text-neutral-400">Sent: {b.stats.total}</span>
                      <span className="text-blue-400">Read: {b.stats.read}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end gap-1 text-[10px] uppercase tracking-wider font-medium">
                      <span className="text-neutral-400">Sent: {b.stats.total}</span>
                      <span className="text-emerald-400">Deliv: {b.stats.delivered}</span>
                      {b.stats.failed > 0 && <span className="text-red-400">Fail: {b.stats.failed}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

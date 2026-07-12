'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { sendBroadcast, BroadcastData } from '@/app/actions/messaging-actions'
import { Radio, Mail, ArrowLeft, Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'

export default function ComposeBroadcastPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [data, setData] = useState<BroadcastData>({
    broadcastType: 'SYSTEM',
    recipientGroup: 'ALL',
    priority: 'NORMAL',
    subject: '',
    body: '',
    expiryDate: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setIsSubmitting(true)
    
    // Format payload
    const payload = {
      ...data,
      expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : undefined
    }

    const res = await sendBroadcast(payload, user.id)
    if (res.success) {
      toast({
        title: "Broadcast Sent",
        description: `Successfully dispatched to ${data.recipientGroup.toLowerCase()}.`,
      })
      router.push('/admin/messaging')
    } else {
      toast({
        title: "Broadcast Failed",
        description: res.error,
        variant: "destructive"
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-10">
      <div className="mb-8">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-neutral-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to History
        </button>
        <h1 className="text-2xl font-light text-white">Compose Broadcast</h1>
        <p className="text-xs uppercase tracking-widest text-neutral-500 mt-2">
          Create and send messages to platform users
        </p>
      </div>

      <div className="bg-black border border-neutral-900 p-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b border-neutral-900">
            {/* Type */}
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400">Broadcast Type</label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => setData({ ...data, broadcastType: 'SYSTEM' })}
                  className={`p-4 border cursor-pointer transition-colors flex flex-col items-center gap-2 ${data.broadcastType === 'SYSTEM' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'border-neutral-800 bg-neutral-950 text-neutral-500 hover:border-neutral-700'}`}
                >
                  <Radio className="w-5 h-5" />
                  <span className="text-xs font-medium uppercase tracking-widest">System</span>
                </div>
                <div 
                  onClick={() => setData({ ...data, broadcastType: 'EMAIL' })}
                  className={`p-4 border cursor-pointer transition-colors flex flex-col items-center gap-2 ${data.broadcastType === 'EMAIL' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'border-neutral-800 bg-neutral-950 text-neutral-500 hover:border-neutral-700'}`}
                >
                  <Mail className="w-5 h-5" />
                  <span className="text-xs font-medium uppercase tracking-widest">Email</span>
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 mt-2">
                {data.broadcastType === 'SYSTEM' ? 'Delivers to the in-app Notification Center.' : 'Sends a direct email via Resend.'}
              </p>
            </div>

            {/* Audience */}
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400">Target Audience</label>
              <select 
                value={data.recipientGroup}
                onChange={(e) => setData({ ...data, recipientGroup: e.target.value as any })}
                className="w-full h-12 bg-black border border-neutral-800 text-white px-4 focus:outline-none focus:border-neutral-600 appearance-none text-sm"
              >
                <option value="ALL">All Users</option>
                <option value="CLIENTS">Clients Only</option>
                <option value="AGENTS">Agents Only</option>
                <option value="AGENCIES">Agencies Only</option>
                <option value="MODERATORS">Moderators Only</option>
                <option value="VENDORS">Vendors Only</option>
              </select>

              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 block pt-4">Priority</label>
              <select 
                value={data.priority}
                onChange={(e) => setData({ ...data, priority: e.target.value as any })}
                className="w-full h-12 bg-black border border-neutral-800 text-white px-4 focus:outline-none focus:border-neutral-600 appearance-none text-sm"
              >
                <option value="NORMAL">Normal</option>
                <option value="IMPORTANT">Important</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          {/* Composition */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400">Subject / Title</label>
              <Input 
                required
                value={data.subject}
                onChange={(e) => setData({ ...data, subject: e.target.value })}
                placeholder="e.g. Scheduled Maintenance Notice"
                className="bg-black border-neutral-800 text-white rounded-none h-12 focus-visible:ring-1 focus-visible:ring-neutral-700"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400">Message Body</label>
              <Textarea 
                required
                value={data.body}
                onChange={(e) => setData({ ...data, body: e.target.value })}
                placeholder="Write your broadcast message here..."
                className="bg-black border-neutral-800 text-white rounded-none min-h-[200px] p-4 focus-visible:ring-1 focus-visible:ring-neutral-700"
              />
            </div>

            {data.broadcastType === 'SYSTEM' && (
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-400 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Expiry Date (Optional)
                </label>
                <Input 
                  type="datetime-local"
                  value={data.expiryDate}
                  onChange={(e) => setData({ ...data, expiryDate: e.target.value })}
                  className="bg-black border-neutral-800 text-white rounded-none h-12 w-full md:w-1/2 focus-visible:ring-1 focus-visible:ring-neutral-700 [color-scheme:dark]"
                />
                <p className="text-[10px] text-neutral-600">Notifications will auto-delete from users' inbox after this date.</p>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-neutral-900 flex justify-end">
            <Button 
              type="submit"
              disabled={isSubmitting}
              className="bg-white text-black hover:bg-neutral-200 rounded-none h-12 px-8 text-xs uppercase tracking-[0.2em] font-bold transition-all w-full md:w-auto flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSubmitting ? 'Dispatching...' : 'Send Broadcast'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  )
}

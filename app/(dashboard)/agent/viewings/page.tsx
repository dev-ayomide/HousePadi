'use client'

import { useState, useEffect } from 'react'
import { getViewingRequestsForAgent, updateViewingRequestStatus } from '@/app/actions/payment-actions'
import { Calendar, User, Clock, CheckCircle2, XCircle, AlertCircle, Sparkles, MapPin, Loader2, ArrowRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function AgentViewingsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Reschedule dialog states
  const [rescheduleRequest, setRescheduleRequest] = useState<any | null>(null)
  const [newDate, setNewDate] = useState('')
  const [submittingReschedule, setSubmittingReschedule] = useState(false)

  useEffect(() => {
    fetchRequests()
  }, [])

  async function fetchRequests() {
    setLoading(true)
    try {
      const res = await getViewingRequestsForAgent()
      if (res.success && res.data) {
        setRequests(res.data)
      } else {
        toast.error(res.error || 'Failed to retrieve viewing requests.')
      }
    } catch (err) {
      toast.error('Network error loading viewing requests.')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
    setUpdatingId(requestId)
    try {
      const res = await updateViewingRequestStatus(requestId, status)
      if (res.success) {
        toast.success(`Viewing request ${status.toLowerCase()} successfully.`)
        // Update local state
        setRequests(prev => prev.map(req => req.id === requestId ? { ...req, status } : req))
      } else {
        toast.error(res.error || 'Failed to update request.')
      }
    } catch (err) {
      toast.error('Failed to communicate status update.')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRescheduleClick = (req: any) => {
    setRescheduleRequest(req)
    setNewDate(req.requestedDate)
  }

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rescheduleRequest || !newDate) return

    setSubmittingReschedule(true)
    try {
      const res = await updateViewingRequestStatus(rescheduleRequest.id, 'RESCHEDULED', newDate)
      if (res.success) {
        toast.success('Reschedule proposal sent successfully.')
        setRequests(prev => prev.map(req => 
          req.id === rescheduleRequest.id 
            ? { ...req, status: 'RESCHEDULED', requestedDate: newDate } 
            : req
        ))
        setRescheduleRequest(null)
      } else {
        toast.error(res.error || 'Failed to reschedule request.')
      }
    } catch (err) {
      toast.error('Failed to send reschedule proposal.')
    } finally {
      setSubmittingReschedule(false)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'PENDING')
  const historyRequests = requests.filter(r => r.status !== 'PENDING')

  const todayStr = new Date().toISOString().split('T')[0]

  return (
    <div className="p-6 lg:p-10 max-w-[1400px] mx-auto space-y-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-neutral-800">
        <div className="space-y-2">
          <h1 className="text-3xl font-medium text-white tracking-tight">
            Viewing Schedule
          </h1>
          <p className="text-neutral-500 text-[10px] uppercase tracking-[0.2em] font-bold">
            Manage viewing requests and coordinates submitted by spatial consumers
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex justify-center items-center">
          <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-neutral-800 bg-neutral-900/10 space-y-4">
          <Calendar className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
          <h4 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">Schedule Bookings Empty</h4>
          <p className="text-xs text-neutral-500 font-light max-w-sm mx-auto leading-relaxed">
            There are currently no active viewing requests for your listing templates.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* 1. Pending Notifications Section */}
          {pendingRequests.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-widest text-yellow-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500 animate-pulse" /> Pending Notifications ({pendingRequests.length})
              </h2>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {pendingRequests.map(req => (
                  <div 
                    key={req.id} 
                    className="bg-neutral-950/40 border border-yellow-500/20 shadow-[0_0_15px_-4px_rgba(234,179,8,0.1)] p-6 flex flex-col justify-between space-y-6"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 text-[8px] font-bold uppercase tracking-widest text-yellow-400">
                            Action Required
                          </span>
                          <h3 className="text-lg font-light text-white tracking-tight pt-1">{req.listingName}</h3>
                          <p className="text-[10px] text-neutral-400 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-neutral-500" /> {req.listingAddress}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-600">Ref: {req.paymentReference.slice(0, 10)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold flex items-center gap-1">
                            <User className="w-3 h-3 text-neutral-600" /> Consumer
                          </span>
                          <p className="text-xs text-neutral-300 font-medium truncate">{req.consumerEmail}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-neutral-600" /> Date Selected
                          </span>
                          <p className="text-xs text-emerald-400 font-bold">{new Date(req.requestedDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        onClick={() => handleUpdateStatus(req.id, 'ACCEPTED')}
                        disabled={updatingId === req.id}
                        className="bg-white text-black hover:bg-neutral-200 h-10 rounded-none text-xs font-bold uppercase tracking-wider px-4 flex-1"
                      >
                        {updatingId === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" /> Accept
                          </>
                        )}
                      </Button>
                      
                      <Button
                        onClick={() => handleRescheduleClick(req)}
                        disabled={updatingId === req.id}
                        className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white h-10 rounded-none text-xs font-bold uppercase tracking-wider px-4 flex-1"
                      >
                        <Clock className="w-4 h-4 mr-1.5" /> Reschedule
                      </Button>

                      <Button
                        onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                        disabled={updatingId === req.id}
                        variant="destructive"
                        className="h-10 rounded-none text-xs font-bold uppercase tracking-wider px-4 flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Schedule History Section */}
          <div className="space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
              Schedule Archive / History ({historyRequests.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {historyRequests.map(req => {
                const isAccepted = req.status === 'ACCEPTED'
                const isRejected = req.status === 'REJECTED'
                const isRescheduled = req.status === 'RESCHEDULED'

                return (
                  <div 
                    key={req.id} 
                    className="bg-neutral-900/10 border border-neutral-800/80 p-6 flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          {isAccepted && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-[8px] font-bold uppercase tracking-widest text-emerald-400">
                              Approved
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-[8px] font-bold uppercase tracking-widest text-neutral-500">
                              Declined
                            </span>
                          )}
                          {isRescheduled && (
                            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-[8px] font-bold uppercase tracking-widest text-amber-400">
                              Rescheduled Proposal
                            </span>
                          )}
                          <h3 className="text-base font-light text-white tracking-tight pt-1.5">{req.listingName}</h3>
                        </div>
                      </div>

                      <div className="border-t border-white/5 pt-3 space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Consumer</span>
                          <span className="text-neutral-300 truncate max-w-[160px]" title={req.consumerEmail}>{req.consumerEmail}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Date Logged</span>
                          <span className="text-neutral-300">{new Date(req.requestedDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {isRescheduled && (
                      <div className="border-t border-white/5 pt-3 flex gap-2">
                        <Button
                          onClick={() => handleUpdateStatus(req.id, 'ACCEPTED')}
                          disabled={updatingId === req.id}
                          className="flex-1 bg-white hover:bg-neutral-200 text-black h-9 rounded-none text-[10px] font-bold uppercase tracking-wider"
                        >
                          {updatingId === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            'Accept New Date'
                          )}
                        </Button>
                        <Button
                          onClick={() => handleRescheduleClick(req)}
                          disabled={updatingId === req.id}
                          variant="outline"
                          className="flex-1 border-neutral-800 hover:bg-neutral-900 text-neutral-300 h-9 rounded-none text-[10px] font-bold uppercase tracking-wider"
                        >
                          Reschedule Again
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Date Selection Dialog */}
      <Dialog open={!!rescheduleRequest} onOpenChange={(open) => !open && setRescheduleRequest(null)}>
        <DialogContent className="sm:max-w-[400px] bg-neutral-950/80 backdrop-blur-xl border border-white/5 text-white p-8 rounded-none">
          <DialogHeader className="space-y-3">
            <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center mb-2 mx-auto">
              <Clock className="w-6 h-6 text-emerald-400" />
            </div>
            <DialogTitle className="text-xl font-light text-center tracking-tight">
              Propose New Date
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400 text-center font-normal leading-relaxed">
              Reschedule appointments by proposing an alternative slots. The status of this viewing will transition to "Rescheduled".
            </DialogDescription>
          </DialogHeader>

          {rescheduleRequest && (
            <form onSubmit={handleRescheduleSubmit} className="space-y-6 pt-4">
              <div className="space-y-4">
                <div className="p-3 border border-white/5 bg-white/[0.02]">
                  <p className="text-[9px] text-neutral-500 uppercase font-bold">Listing</p>
                  <p className="text-xs font-semibold text-white mt-0.5">{rescheduleRequest.listingName}</p>
                  <p className="text-[10px] text-neutral-400 mt-1">Current Date: {new Date(rescheduleRequest.requestedDate).toLocaleDateString()}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rescheduleDate" className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                    Proposed New Date
                  </Label>
                  <Input
                    id="rescheduleDate"
                    type="date"
                    min={todayStr}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="bg-neutral-900/60 border-neutral-800 focus-visible:ring-emerald-500 h-11 text-sm rounded-none text-white w-full"
                    disabled={submittingReschedule}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none mt-2"
                disabled={submittingReschedule || !newDate || newDate === rescheduleRequest.requestedDate}
              >
                {submittingReschedule ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Updating Proposal...
                  </>
                ) : (
                  <>
                    Send Reschedule Proposal <ArrowRight className="w-3.5 h-3.5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

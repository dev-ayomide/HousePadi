'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import { getConsumerPaymentHistory } from '@/app/actions/payment-actions'
import { Button } from '@/components/ui/button'
import { 
  Loader2, 
  ArrowLeft, 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Clock, 
  Sparkles, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Compass, 
  HelpCircle 
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface PaymentHistoryItem {
  id: string
  listingId: string
  listingName: string
  listingType: string
  amount: number
  paymentDate: string
  expiresAt: string
  status: 'Active' | 'Expired' | 'Pending' | 'Failed'
}

export default function PaymentHistoryPage() {
  const { consumer, loading: authLoading } = useConsumerAuth()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<PaymentHistoryItem[]>([])

  useEffect(() => {
    if (authLoading) return

    if (!consumer) {
      router.push('/auth/login')
      return
    }

    async function loadPaymentHistory() {
      setLoading(true)
      try {
        const res = await getConsumerPaymentHistory(consumer!.id)
        if (res.success && res.data) {
          setHistory(res.data as PaymentHistoryItem[])
        } else {
          toast.error(res.error || 'Failed to load transaction history.')
        }
      } catch (err) {
        toast.error('Failed to communicate with payment logs.')
      } finally {
        setLoading(false)
      }
    }

    loadPaymentHistory()
  }, [consumer, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mb-2" />
        <span className="text-xs uppercase tracking-widest text-neutral-500 font-medium">Retrieving transaction ledger...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-white relative z-10 overflow-hidden">
      {/* Premium backdrop pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }} 
      />
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <h1 className="text-3xl lg:text-5xl font-light tracking-tight uppercase leading-none">
          Payment <span className="font-semibold text-emerald-400">History</span>
        </h1>
        <p className="text-xs text-neutral-500 font-light max-w-xs sm:text-right leading-relaxed">
          Log of your transactions, digital invoices, and rolling 30-day contact access permissions status.
        </p>
      </div>

        {/* Datatable Wrapper */}
        {history.length === 0 ? (
          <div className="py-24 text-center border border-dashed border-neutral-800 bg-neutral-900/10 space-y-4">
            <CreditCard className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
            <h4 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">No Transactions Found</h4>
            <p className="text-xs text-neutral-500 font-light max-w-sm mx-auto leading-relaxed">
              You have not initiated any payment checkouts or spatial unlocks yet. Contact listings in the catalog to generate invoices.
            </p>
            <Link href="/explore">
              <Button className="mt-4 h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none px-6">
                Browse Properties
              </Button>
            </Link>
          </div>
        ) : (
          <div className="bg-neutral-950/80 border border-white/5 relative overflow-hidden backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-neutral-400 font-semibold bg-neutral-900/10">
                    <th className="py-4 px-6">Listing / Category</th>
                    <th className="py-4 px-6">Type</th>
                    <th className="py-4 px-6 text-right">Payment Amount</th>
                    <th className="py-4 px-6">Transaction Date</th>
                    <th className="py-4 px-6">Access Expiration</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {history.map((tx) => {
                    const priceFormatted = new Intl.NumberFormat('en-NG', {
                      style: 'currency',
                      currency: 'NGN',
                      maximumFractionDigits: 0
                    }).format(tx.amount)

                    const dateFormatted = new Date(tx.paymentDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })

                    const expiresFormatted = new Date(tx.expiresAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })

                    return (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                        
                        {/* Listing Name */}
                        <td className="py-5 px-6">
                          <div className="space-y-1">
                            <span className="font-light tracking-wide text-white group-hover:text-emerald-400 transition-colors">
                              {tx.listingName}
                            </span>
                            <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-neutral-500 font-semibold">
                              <Compass className="w-3 h-3 text-neutral-600" />
                              {tx.listingType}
                            </div>
                          </div>
                        </td>

                        {/* Payment Type */}
                        <td className="py-5 px-6">
                          <span className="text-xs font-light text-neutral-300">
                            Contact Access
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-5 px-6 text-right font-medium text-white">
                          {priceFormatted}
                        </td>

                        {/* Payment Date */}
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-1.5 text-xs font-light text-neutral-400">
                            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                            {dateFormatted}
                          </div>
                        </td>

                        {/* Access Expiration */}
                        <td className="py-5 px-6">
                          {tx.status === 'Active' || tx.status === 'Expired' ? (
                            <div className="flex items-center gap-1.5 text-xs font-light text-neutral-400">
                              <Clock className="w-3.5 h-3.5 text-neutral-500" />
                              {expiresFormatted}
                            </div>
                          ) : (
                            <span className="text-neutral-600 font-light text-xs">—</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-5 px-6">
                          {tx.status === 'Active' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Active
                            </span>
                          )}
                          {tx.status === 'Expired' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-[9px] font-bold uppercase tracking-widest text-red-400">
                              <XCircle className="w-2.5 h-2.5" /> Expired
                            </span>
                          )}
                          {tx.status === 'Pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/30 text-[9px] font-bold uppercase tracking-widest text-yellow-400">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Pending
                            </span>
                          )}
                          {tx.status === 'Failed' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-900 border border-white/5 text-[9px] font-bold uppercase tracking-widest text-neutral-500">
                              <XCircle className="w-2.5 h-2.5" /> Failed
                            </span>
                          )}
                        </td>

                        {/* Action View */}
                        <td className="py-5 px-6 text-center">
                          <Link href={`/explore/${tx.listingType}`}>
                            <button className="p-2.5 bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white hover:text-black hover:border-white transition-all rounded-none" title="Explore Category">
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                        </td>

                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
  )
}

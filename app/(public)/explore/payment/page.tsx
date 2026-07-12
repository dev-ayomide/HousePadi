'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { ShieldCheck, Loader2, Copy, Check, XCircle, CheckCircle2, Landmark } from 'lucide-react'
import { toast } from 'sonner'
import { verifyPaymentTransaction } from '@/app/actions/payment-actions'
import { verifyPlanUpgrade } from '@/app/actions/subscription-actions'
import { verifyVendorTierUpgrade } from '@/app/actions/vendor-subscription-actions'
import { verifyApiKeyUpgradePayment } from '@/app/actions/api-key-actions'

const POLL_INTERVAL_MS = 5000

function PaymentContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const flow = searchParams.get('flow') || 'CONTACT_OR_TIER'
  const reference = searchParams.get('reference') || ''
  const txId = searchParams.get('txId') || ''
  const keyId = searchParams.get('keyId') || ''
  const tierId = searchParams.get('tierId') || ''
  const amount = searchParams.get('amount') || '0'
  const accountNumber = searchParams.get('accountNumber') || ''
  const bankName = searchParams.get('bankName') || ''
  const expiresAt = searchParams.get('expiresAt') || ''
  const returnTo = searchParams.get('returnTo') || '/'

  // Consumer contact-reveal / tier-upgrade flow specifics
  const paymentType = searchParams.get('type') || ''
  const listingId = searchParams.get('listingId') || ''

  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  const isVirtualAccount = Boolean(accountNumber)

  const priceFormatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(Number(amount))

  const buildSuccessUrl = useCallback(() => {
    switch (flow) {
      case 'AGENCY_UPGRADE':
      case 'AGENT_UPGRADE':
      case 'VENDOR_UPGRADE':
        return `${returnTo}?upgrade_success=true&tx_id=${txId}`
      case 'DEVELOPER_KEY_UPGRADE':
        return `${returnTo}?payment_verify=true&reference=${reference}&key_id=${keyId}&tier_id=${tierId}`
      default:
        return paymentType === 'CONSUMER_TIER_UPGRADE'
          ? `/consumer/products?payment_success=true&reference=${reference}`
          : `/property/${listingId}?payment_success=true&reference=${reference}&revealed_listing_id=${listingId}`
    }
  }, [flow, returnTo, txId, reference, keyId, tierId, paymentType, listingId])

  const buildFailureUrl = useCallback(() => {
    switch (flow) {
      case 'AGENCY_UPGRADE':
      case 'AGENT_UPGRADE':
      case 'VENDOR_UPGRADE':
      case 'DEVELOPER_KEY_UPGRADE':
        return returnTo
      default:
        return paymentType === 'CONSUMER_TIER_UPGRADE'
          ? `/consumer/products?payment_failed=true&reference=${reference}`
          : `/property/${listingId}?payment_failed=true&reference=${reference}`
    }
  }, [flow, returnTo, reference, paymentType, listingId])

  const checkStatus = useCallback(async (): Promise<boolean> => {
    try {
      switch (flow) {
        case 'AGENCY_UPGRADE':
        case 'AGENT_UPGRADE':
          return (await verifyPlanUpgrade(txId)).success
        case 'VENDOR_UPGRADE':
          return (await verifyVendorTierUpgrade(txId)).success
        case 'DEVELOPER_KEY_UPGRADE':
          return (await verifyApiKeyUpgradePayment(reference, keyId, tierId)).success
        default:
          return (await verifyPaymentTransaction(reference)).success
      }
    } catch {
      return false
    }
  }, [flow, txId, reference, keyId, tierId])

  // Poll for confirmation automatically while a real virtual account is showing
  useEffect(() => {
    if (!isVirtualAccount || status !== 'idle') return
    const interval = setInterval(async () => {
      const ok = await checkStatus()
      if (ok) {
        setStatus('success')
        toast.success('Transfer received. Payment confirmed.')
        setTimeout(() => router.push(buildSuccessUrl()), 1200)
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [isVirtualAccount, status, checkStatus, buildSuccessUrl, router])

  const handleManualCheck = async () => {
    setLoading(true)
    const ok = await checkStatus()
    setLoading(false)
    if (ok) {
      setStatus('success')
      toast.success('Transfer received. Payment confirmed.')
      setTimeout(() => router.push(buildSuccessUrl()), 1200)
    } else {
      toast.info("No transfer detected yet. We'll keep checking automatically.")
    }
  }

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(accountNumber)
    setCopied(true)
    toast.success('Account number copied.')
    setTimeout(() => setCopied(false), 2000)
  }

  // Sandbox simulate flow — only reachable for the consumer contact-reveal/tier-upgrade flow
  // when ALATPay isn't configured. Every other flow requires a configured gateway upfront,
  // so this page only ever renders the virtual-account panel for them.
  const handleSimulateSuccess = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, status: 'SUCCESSFUL' })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setStatus('success')
        toast.success('Simulated successful payment! Webhook processed.')
        setTimeout(() => router.push(buildSuccessUrl()), 1200)
      } else {
        toast.error(data.error || 'Failed to process simulated webhook.')
      }
    } catch {
      toast.error('Network error simulating checkout.')
    } finally {
      setLoading(false)
    }
  }

  const handleSimulateFailure = () => {
    setStatus('failed')
    toast.error('Payment cancelled/failed.')
    setTimeout(() => router.push(buildFailureUrl()), 1200)
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-[500px] bg-neutral-950/80 backdrop-blur-2xl border border-white/5 p-8 relative rounded-none shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/20 via-emerald-500/80 to-emerald-500/20" />

        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            {isVirtualAccount ? <Landmark className="w-8 h-8 text-emerald-400" /> : <ShieldCheck className="w-8 h-8 text-emerald-400" />}
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-light uppercase tracking-wider text-white">
              {isVirtualAccount ? 'Transfer To Complete Payment' : 'Secure Sandbox Checkout'}
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-500">
              {isVirtualAccount ? 'ALATPay Virtual Account' : 'Simulated Sandbox Gateway'}
            </p>
          </div>

          <div className="w-full border-y border-white/5 py-6 my-2 space-y-4 text-left">
            {isVirtualAccount ? (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold">Bank</span>
                  <span className="font-mono text-neutral-300 font-bold">{bankName || 'ALAT by Wema'}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-500 uppercase tracking-wider font-semibold">Account Number</span>
                  <button onClick={handleCopyAccount} className="font-mono text-white font-bold flex items-center gap-2 hover:text-emerald-400 transition-colors">
                    {accountNumber}
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {expiresAt && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500 uppercase tracking-wider font-semibold">Expires</span>
                    <span className="text-neutral-300 font-bold">{new Date(expiresAt).toLocaleString()}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 uppercase tracking-wider font-semibold">Reference</span>
                <span className="font-mono text-neutral-300 font-bold">{reference}</span>
              </div>
            )}

            <div className="flex justify-between items-center border-t border-white/5 pt-4">
              <span className="text-neutral-500 uppercase tracking-wider font-semibold text-xs">Amount Due</span>
              <span className="text-2xl font-light tracking-tight text-white">{priceFormatted}</span>
            </div>
          </div>

          {status === 'success' && (
            <div className="flex flex-col items-center gap-2 text-emerald-400 text-sm animate-in zoom-in duration-300 py-2">
              <CheckCircle2 className="w-8 h-8 animate-bounce" />
              <span>Payment Confirmed. Redirecting...</span>
            </div>
          )}

          {status === 'failed' && (
            <div className="flex flex-col items-center gap-2 text-red-500 text-sm animate-in zoom-in duration-300 py-2">
              <XCircle className="w-8 h-8 animate-shake" />
              <span>Payment Cancelled. Redirecting...</span>
            </div>
          )}

          {status === 'idle' && isVirtualAccount && (
            <div className="w-full space-y-4 pt-2">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Transfer the exact amount above to the account details shown. We confirm automatically once your bank completes the transfer.
              </p>
              <button
                onClick={handleManualCheck}
                disabled={loading}
                className="w-full h-12 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest transition-all rounded-none flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                I&apos;ve Made The Transfer
              </button>
            </div>
          )}

          {status === 'idle' && !isVirtualAccount && (
            <div className="w-full space-y-4 pt-2">
              <button
                onClick={handleSimulateSuccess}
                disabled={loading}
                className="w-full h-12 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest transition-all rounded-none flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Simulate Success
              </button>
              <button
                onClick={handleSimulateFailure}
                disabled={loading}
                className="w-full h-12 bg-transparent hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-all"
              >
                Cancel / Simulate Failure
              </button>
            </div>
          )}

          <div className="text-[10px] text-neutral-600 uppercase tracking-widest font-bold">
            {isVirtualAccount ? 'HousePadi Secure Payments' : 'Development Sandbox Environment'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  )
}

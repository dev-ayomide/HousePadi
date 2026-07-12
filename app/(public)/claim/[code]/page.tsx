'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { claimCoupon } from '@/app/actions/campaign-actions'
import { Frown, PartyPopper, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function ClaimCouponPage() {
  const { code } = useParams()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ALREADY_CLAIMED' | 'EXPIRED' | 'NOT_FOUND'>('IDLE')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !code) return

    setStatus('LOADING')
    const res = await claimCoupon(code as string, email)

    if (res.success) {
      setStatus('SUCCESS')
    } else {
      if (res.reason === 'EXPIRED') setStatus('EXPIRED')
      else if (res.reason === 'ALREADY_CLAIMED') setStatus('ALREADY_CLAIMED')
      else if (res.reason === 'NOT_FOUND') setStatus('NOT_FOUND')
      else setStatus('EXPIRED') // default fallback
    }
  }

  const renderContent = () => {
    switch (status) {
      case 'SUCCESS':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center space-y-6"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
            >
              <PartyPopper className="w-16 h-16 text-green-500" />
            </motion.div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-light tracking-widest text-white uppercase">Credit Claimed!</h2>
              <p className="text-neutral-400">1 Free Viewing Credit has been added to {email}.</p>
            </div>
            <Link href="/auth/login">
              <Button className="bg-white text-black hover:bg-neutral-200 rounded-none text-xs uppercase tracking-widest font-bold px-8 h-12 mt-4">
                Login / Sign Up
              </Button>
            </Link>
          </motion.div>
        )

      case 'ALREADY_CLAIMED':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center space-y-6"
          >
            <motion.div
              animate={{ y: [0, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Frown className="w-16 h-16 text-yellow-500" />
            </motion.div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-light tracking-widest text-white uppercase">Already Claimed</h2>
              <p className="text-neutral-400">This email has already claimed this coupon.</p>
            </div>
            <Button 
              onClick={() => {
                setStatus('IDLE')
                setEmail('')
              }}
              variant="outline" 
              className="bg-transparent border-neutral-800 text-white hover:bg-neutral-900 rounded-none text-xs uppercase tracking-widest font-bold px-8 h-12 mt-4"
            >
              Try Another Email
            </Button>
          </motion.div>
        )

      case 'EXPIRED':
      case 'NOT_FOUND':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center space-y-6"
          >
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Frown className="w-16 h-16 text-red-500" />
            </motion.div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-light tracking-widest text-white uppercase">
                {status === 'NOT_FOUND' ? 'Campaign Not Found' : 'Campaign Ended'}
              </h2>
              <p className="text-neutral-400">
                {status === 'NOT_FOUND' 
                  ? 'This link appears to be invalid.' 
                  : 'This campaign has expired or reached its claim limit.'}
              </p>
            </div>
            <Link href="/">
              <Button variant="outline" className="bg-transparent border-neutral-800 text-white hover:bg-neutral-900 rounded-none text-xs uppercase tracking-widest font-bold px-8 h-12 mt-4">
                Return Home
              </Button>
            </Link>
          </motion.div>
        )

      default:
        return (
          <motion.form 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleSubmit} 
            className="space-y-6 w-full max-w-sm"
          >
            <div className="text-center space-y-2 mb-8">
              <h1 className="text-3xl font-light tracking-widest text-white uppercase">Claim Your Free Credit</h1>
              <p className="text-neutral-400 text-sm">Enter your email below to claim 1 free viewing credit on HousePadi.</p>
            </div>
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-neutral-900/50 border-neutral-800 rounded-none text-white focus-visible:ring-1 focus-visible:ring-neutral-700 h-14 text-center"
              />
            </div>
            <Button 
              type="submit" 
              disabled={status === 'LOADING'}
              className="w-full bg-white text-black hover:bg-neutral-200 rounded-none text-xs uppercase font-bold tracking-widest h-14"
            >
              {status === 'LOADING' ? 'Claiming...' : 'Claim Coupon'}
            </Button>
          </motion.form>
        )
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neutral-800/20 rounded-full blur-[120px]" />
      </div>
      
      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="bg-black/50 backdrop-blur-xl border border-neutral-800 p-8 sm:p-12 shadow-2xl">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}

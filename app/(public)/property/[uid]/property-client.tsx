'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import { ProtectedAction } from '@/components/explore/protected-action'
import { getListingContactInfo, verifyPaymentTransaction, getUnlockedContactsForConsumer } from '@/app/actions/payment-actions'
import { redeemCreditForContact } from '@/app/actions/campaign-actions'
import { UnifiedListing, toggleFavorite, getConsumerFavorites } from '@/app/actions/registry-actions'
import { Eye, MapPin, UserCheck, Sparkles, Phone, Mail, Loader2, CreditCard, ArrowLeft, Ticket, Smartphone, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import Link from 'next/link'
import { ShareButton } from '@/components/share-button'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { SITE_URL } from '@/lib/constants'

interface PropertyClientProps {
  listing: UnifiedListing
  contactFee: number
}

export function PropertyClient({ listing, contactFee }: PropertyClientProps) {
  const { consumer } = useConsumerAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [revealedContact, setRevealedContact] = useState<{ name: string; phone: string; email: string; agency?: string } | null>(null)
  const [loadingContact, setLoadingContact] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(listing.favorite_count || 0)
  const [creditsModalOpen, setCreditsModalOpen] = useState(false)
  const [availableCredits, setAvailableCredits] = useState(0)
  const [redeeming, setRedeeming] = useState(false)

  // Sync unlocked contact details for the specific property
  useEffect(() => {
    async function loadUnlockedContacts() {
      if (!consumer || !listing.listing_type_slug) return
      try {
        const res = await getUnlockedContactsForConsumer(consumer.id, listing.listing_type_slug)
        if (res.success && res.data && res.data[listing.id]) {
          setRevealedContact(res.data[listing.id])
        }
      } catch (err) {
        console.error('Failed to pre-load unlocked contacts:', err)
      }
    }
    loadUnlockedContacts()
  }, [consumer, listing])

  // Sync initial favorite status of the listing for the logged in consumer
  useEffect(() => {
    async function checkFavoriteStatus() {
      if (!consumer) return
      try {
        const res = await getConsumerFavorites(consumer.id)
        if (res.success && res.data) {
          const favorited = res.data.some(item => item.id === listing.id)
          setIsFavorited(favorited)
        }
      } catch (err) {
        console.error('Failed to load favorite status:', err)
      }
    }
    checkFavoriteStatus()
  }, [consumer, listing.id])

  const handleToggleFavorite = async () => {
    if (!consumer) return // ProtectedAction prevents this
    try {
      const res = await toggleFavorite(consumer.id, listing.id, listing.listing_type_slug || 'apartment')
      if (res.success) {
        if (res.favorited) {
          setIsFavorited(true)
          setFavoriteCount(prev => prev + 1)
          toast.success('Listing added to favorites.')
        } else {
          setIsFavorited(false)
          setFavoriteCount(prev => Math.max(0, prev - 1))
          toast.success('Listing removed from favorites.')
        }
      } else {
        toast.error(res.error || 'Failed to update favorites.')
      }
    } catch (err) {
      toast.error('Could not communicate with the database.')
    }
  }

  // Handle Auto-Reveal and toast notifications after redirecting from Payment
  useEffect(() => {
    const success = searchParams.get('payment_success')
    const revealedListingId = searchParams.get('revealed_listing_id')
    const reference = searchParams.get('reference')
    const failed = searchParams.get('payment_failed')

    async function verifyPayment() {
      if (!reference) return
      const toastId = toast.loading('Verifying transaction status...')
      try {
        const res = await verifyPaymentTransaction(reference)
        toast.dismiss(toastId)
        if (res.success) {
          toast.success(`Payment verified successfully. Reference: ${reference}`)
          if (res.paymentType === 'CONTACT' && revealedListingId === listing.id) {
            handleLoadContactInfo(true)
          }
        } else {
          toast.error(`Transaction verification failed. Status: ${res.status || 'FAILED'}`)
        }
      } catch (err) {
        toast.dismiss(toastId)
        toast.error('An error occurred while verifying the transaction.')
      } finally {
        router.replace(`/property/${listing.id}`)
      }
    }

    if (success === 'true' && reference) {
      verifyPayment()
    }

    if (failed === 'true') {
      toast.error('Transaction was cancelled or declined.')
      router.replace(`/property/${listing.id}`)
    }
  }, [searchParams, listing.id, router])

  const handleLoadContactInfo = async (skipPaymentInit = false) => {
    let paymentTab: Window | null = null
    if (!skipPaymentInit) {
      paymentTab = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null
    }

    setLoadingContact(true)
    try {
      const res = await getListingContactInfo(listing.id, listing.listing_type_slug || 'apartment')
      if (res.success && res.contactInfo) {
        setRevealedContact(res.contactInfo)
        toast.success('Agent contact details unlocked.')
        if (paymentTab) paymentTab.close()
      } else if (res.requiresPayment) {
        if ((res as any).hasCredits) {
          setAvailableCredits((res as any).availableCredits)
          setCreditsModalOpen(true)
          if (paymentTab) paymentTab.close()
        } else {
          if (skipPaymentInit) {
            if (paymentTab) paymentTab.close()
            toast.error('Payment verified but contact details could not be retrieved. Please refresh the page.')
          } else {
            await handleInitializePayment(paymentTab)
          }
        }
      } else if (res.requiresAuth) {
        if (paymentTab) paymentTab.close()
        toast.error('Please log in to contact this agent.')
      } else {
        if (paymentTab) paymentTab.close()
        toast.error(res.error || 'Failed to retrieve agent details.')
      }
    } catch (err) {
      if (paymentTab) paymentTab.close()
      toast.error('Could not connect to service.')
    } finally {
      setLoadingContact(false)
    }
  }

  const handleRedeemCredit = async () => {
    if (!consumer) return
    setRedeeming(true)
    try {
      const res = await redeemCreditForContact(listing.id, consumer.id, consumer.email)
      if (res.success) {
        toast.success('Credit redeemed successfully.')
        setCreditsModalOpen(false)
        handleLoadContactInfo(true)
      } else {
        toast.error(res.error || 'Failed to redeem credit.')
      }
    } catch (err) {
      toast.error('An error occurred during redemption.')
    } finally {
      setRedeeming(false)
    }
  }

  const handleInitializePayment = async (newTab: Window | null) => {
    if (newTab) {
      newTab.document.write(`
        <html>
          <head>
            <title>HousePadi Secure Redirect</title>
            <style>
              body { background: #0a0a0a; color: #ffffff; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; } 
              .loader { border: 2px solid rgba(255,255,255,0.05); border-radius: 50%; border-top: 2px solid #10b981; width: 32px; height: 32px; animation: spin 0.8s linear infinite; margin-bottom: 24px; } 
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              p { font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: #737373; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="loader"></div>
            <p>Connecting to Secure Gateway...</p>
          </body>
        </html>
      `)
      newTab.document.close()
    }

    try {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          listingType: listing.listing_type_slug || 'apartment',
          paymentType: 'CONTACT'
        })
      })

      const data = await response.json()
      if (response.ok && data.success && data.authorization_url) {
        toast.success('Secure gateway page opened in a new tab.')
        if (newTab) {
          newTab.location.href = data.authorization_url
        }
      } else {
        toast.error(data.error || 'Could not initiate checkout transaction.')
        if (newTab) newTab.close()
      }
    } catch (err) {
      toast.error('Failed to communicate with authorization server.')
      if (newTab) newTab.close()
    }
  }

  const priceFormatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(listing.price || 0)

  const feat = listing.features || {}
  let otherFeatures: string[] = []
  if (Array.isArray(feat.other_features)) {
    otherFeatures = feat.other_features
  } else if (typeof feat.other_features === 'string') {
    try {
      const parsed = JSON.parse(feat.other_features)
      if (Array.isArray(parsed)) otherFeatures = parsed
    } catch (e) {
      // Ignored
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden font-sans">
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
      />
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-12 relative z-10 space-y-10">
        <div className="flex justify-between items-center w-full">
          <Link 
            href={`/explore/${listing.listing_type_slug}`} 
            className="inline-flex items-center gap-2 text-[10px] text-neutral-400 hover:text-white uppercase tracking-widest font-bold border border-white/10 px-3 py-1.5 bg-neutral-900/40 hover:bg-neutral-900 transition-all w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Listings
          </Link>
          <div className="flex items-center gap-2">
            <ProtectedAction onClick={handleToggleFavorite} isFavorite>
              <button 
                className={`h-8 px-3 text-[10px] bg-transparent border transition-all flex items-center gap-1.5 font-bold uppercase tracking-widest ${
                  isFavorited 
                    ? 'border-red-500/40 text-red-500 bg-red-500/10' 
                    : 'border-white/10 text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
                title={isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-current' : ''}`} />
                <span>{favoriteCount}</span>
              </button>
            </ProtectedAction>

            <ShareButton 
              title={`Check out ${listing.name} on HousePadi`} 
              className="h-8 px-3 text-[10px] bg-transparent border border-white/10 text-neutral-400 hover:text-white hover:bg-neutral-900" 
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          <div className="space-y-8">
            {listing.gallery && listing.gallery.length > 0 ? (
              <Carousel className="w-full relative">
                <CarouselContent>
                  <CarouselItem>
                    <div className="relative aspect-video bg-neutral-950 border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={listing.thumbnail_path || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200'} 
                        alt={listing.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/80 backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-widest text-white">
                        {listing.listing_type}
                      </div>
                    </div>
                  </CarouselItem>
                  {listing.gallery.map((img, idx) => (
                    <CarouselItem key={idx}>
                      <div className="relative aspect-video bg-neutral-950 border border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={img.url} 
                          alt={img.note ? `${img.note} - ${listing.name}, ${listing.address}` : `${listing.name} Gallery ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {img.note && (
                          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                            <p className="text-white text-sm font-medium">{img.note}</p>
                          </div>
                        )}
                        <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/80 backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-widest text-white">
                          Gallery
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                  <CarouselPrevious className="relative top-0 left-0 translate-x-0 translate-y-0 pointer-events-auto bg-black/50 border-white/20 hover:bg-black hover:text-white" />
                  <CarouselNext className="relative top-0 right-0 translate-x-0 translate-y-0 pointer-events-auto bg-black/50 border-white/20 hover:bg-black hover:text-white" />
                </div>
              </Carousel>
            ) : (
              <div className="relative aspect-video bg-neutral-950 border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={listing.thumbnail_path || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200'} 
                  alt={listing.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-black/80 backdrop-blur-md border border-white/10 text-xs font-bold uppercase tracking-widest text-white">
                  {listing.listing_type}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h1 className="text-3xl lg:text-5xl font-light tracking-tight text-white leading-none">
                {listing.name}
              </h1>
              <div className="flex items-center gap-2 text-neutral-400">
                <MapPin className="w-4 h-4 text-emerald-500" /> {listing.address}, {listing.state}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-neutral-900/30 border border-white/5">
              {listing.listing_type_slug === 'apartment' && (
                <>
                  <div className="space-y-1"><p className="text-[10px] text-neutral-500 uppercase tracking-widest">Land Size</p><p className="font-mono text-lg">{feat.land_size || 'N/A'}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-neutral-500 uppercase tracking-widest">Bedrooms</p><p className="font-mono text-lg">{feat.num_bedrooms ?? 0}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-neutral-500 uppercase tracking-widest">Bathrooms</p><p className="font-mono text-lg">{feat.num_bathrooms ?? 0}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-neutral-500 uppercase tracking-widest">Running Water</p><p className="font-mono text-lg">{feat.has_water ? 'Yes' : 'No'}</p></div>
                </>
              )}
              {listing.listing_type_slug === 'event_center' && (
                <>
                  <div className="space-y-1"><p className="text-[10px] text-neutral-500 uppercase tracking-widest">Capacity</p><p className="font-mono text-lg">{feat.sitting_capacity ?? 0}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-neutral-500 uppercase tracking-widest">Parking</p><p className="font-mono text-lg">{feat.parking_yard ? 'Yes' : 'No'}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-neutral-500 uppercase tracking-widest">Generator</p><p className="font-mono text-lg">{feat.generator ? 'Yes' : 'No'}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-neutral-500 uppercase tracking-widest">Security</p><p className="font-mono text-lg">{feat.security ? 'Yes' : 'No'}</p></div>
                </>
              )}
              {listing.listing_type_slug === 'public_space' && (
                <>
                  <div className="space-y-1"><p className="text-[10px] text-neutral-500 uppercase tracking-widest">Floor Area</p><p className="font-mono text-lg">{feat.floor_area || 'N/A'}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-neutral-500 uppercase tracking-widest">Grid Power</p><p className="font-mono text-lg">{feat.power_supply ? 'Yes' : 'No'}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-neutral-500 uppercase tracking-widest">Cust Parking</p><p className="font-mono text-lg">{feat.parking ? 'Yes' : 'No'}</p></div>
                  <div className="space-y-1"><p className="text-[10px] text-neutral-500 uppercase tracking-widest">High-Speed Wifi</p><p className="font-mono text-lg">{feat.internet ? 'Yes' : 'No'}</p></div>
                </>
              )}
            </div>

            {otherFeatures.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm uppercase tracking-widest font-bold text-neutral-300">Other Features</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {otherFeatures.map((f: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-neutral-400">
                      <div className="w-1.5 h-1.5 bg-emerald-500 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-neutral-900/30 border border-white/5 p-6 space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Listing Price</p>
                <p className="text-3xl font-light text-white">
                  {priceFormatted}
                  <span className="text-sm text-neutral-500 ml-1">
                    {listing.listing_type === 'RENTAL' && listing.rent_interval ? `/${listing.rent_interval === 'yearly' ? 'yr' : 'mo'}` : ''}
                  </span>
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                {revealedContact ? (
                  <div className="bg-neutral-950 border border-emerald-500/30 p-4 space-y-3">
                    <h4 className="text-xs uppercase tracking-widest text-emerald-400 font-bold mb-4">Contact Unlocked</h4>
                    <div className="flex items-center gap-3 text-sm text-white">
                      <UserCheck className="w-4 h-4 text-emerald-500" /> {revealedContact.name}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-neutral-300">
                      <Sparkles className="w-4 h-4 text-neutral-500" /> {revealedContact.agency || 'Independent Agent'}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-neutral-300">
                      <Phone className="w-4 h-4 text-neutral-500" /> {revealedContact.phone}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-neutral-300">
                      <Mail className="w-4 h-4 text-neutral-500" /> {revealedContact.email}
                    </div>
                  </div>
                ) : (
                  <ProtectedAction onClick={() => handleLoadContactInfo()}>
                    <button 
                      disabled={loadingContact}
                      className="w-full flex items-center justify-center gap-2 h-14 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-widest transition-all"
                    >
                      {loadingContact ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : contactFee > 0 ? (
                        <>
                          <CreditCard className="w-4 h-4" /> Pay to Unlock Contact Details
                        </>
                      ) : (
                        <>
                          <Phone className="w-4 h-4" /> Contact Agent
                        </>
                      )}
                    </button>
                  </ProtectedAction>
                )}

                <ProtectedAction onClick={() => {
                  if (listing.model_url) {
                    window.open(`/explore/viewer?url=${encodeURIComponent(listing.model_url)}&title=${encodeURIComponent(listing.name)}`, '_blank')
                  } else {
                    toast.error('This listing does not have a 3D asset file attached.')
                  }
                }}>
                  <button className="w-full flex items-center justify-center gap-2 h-14 bg-transparent border border-white/20 hover:bg-white/5 hover:text-white text-xs font-bold uppercase tracking-widest transition-all">
                    <Eye className="w-4 h-4" /> Enter 3D Space
                  </button>
                </ProtectedAction>

                <ProtectedAction onClick={() => {
                  if (listing.model_url) {
                    window.location.href = `housepadiar://${SITE_URL.replace('https://', '')}?model_url=${encodeURIComponent(listing.model_url)}`
                  } else {
                    toast.error('This listing does not have a 3D asset file attached.')
                  }
                }}>
                  <button className="w-full flex items-center justify-center gap-2 h-14 bg-emerald-950/30 border border-emerald-500/30 hover:bg-emerald-900/50 hover:text-white text-emerald-400 text-xs font-bold uppercase tracking-widest transition-all">
                    <Smartphone className="w-4 h-4" /> View in App
                  </button>
                </ProtectedAction>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={creditsModalOpen} onOpenChange={setCreditsModalOpen}>
        <DialogContent className="sm:max-w-md bg-neutral-950 border border-emerald-900/30 text-white rounded-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <Ticket className="w-5 h-5" /> Redeem Credit
            </DialogTitle>
            <DialogDescription className="text-neutral-400">
              You have {availableCredits} available credit{availableCredits > 1 ? 's' : ''}. 
              Your credit will be used to unlock the contact details for this listing instead of paying.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3 sm:justify-start mt-4">
            <Button 
              disabled={redeeming}
              onClick={handleRedeemCredit}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-none flex-1 font-bold tracking-widest uppercase text-xs"
            >
              {redeeming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              OK, Use 1 Credit
            </Button>
            <Button 
              disabled={redeeming}
              onClick={() => setCreditsModalOpen(false)}
              variant="outline" 
              className="bg-transparent border-neutral-700 text-white hover:bg-neutral-800 rounded-none flex-1 font-bold tracking-widest uppercase text-xs"
            >
              Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

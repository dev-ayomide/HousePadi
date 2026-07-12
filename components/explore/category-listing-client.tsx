'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useConsumerAuth } from './consumer-auth-provider'
import { ProtectedAction } from './protected-action'
import { toggleFavorite, getConsumerFavorites, UnifiedListing, getConsumerCollections, addListingToCollection, removeListingFromCollection, getCollectionsForListing, createCollection } from '@/app/actions/registry-actions'
import { getListingContactInfo, verifyPaymentTransaction, getUnlockedContactsForConsumer } from '@/app/actions/payment-actions'
import { Heart, Compass, X, MapPin, Eye, Sparkles, UserCheck, Calendar, Phone, Mail, Loader2, ArrowRight, FolderHeart, FolderPlus, CreditCard, Filter, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface CategoryListingClientProps {
  listings: UnifiedListing[]
  categorySlug: string
  categoryName: string
  contactFee: number
}

export function CategoryListingClient({ 
  listings: initialListings, 
  categorySlug, 
  categoryName,
  contactFee
}: CategoryListingClientProps) {
  const { consumer } = useConsumerAuth()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [listings, setListings] = useState<UnifiedListing[]>(initialListings)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  // Keep state in sync with incoming listings prop changes
  useEffect(() => {
    setListings(initialListings)
  }, [initialListings])

  // Payment & Lead Gen State
  const [revealedContacts, setRevealedContacts] = useState<Record<string, { name: string; phone: string; email: string; agency?: string }>>({})
  const [loadingContactId, setLoadingContactId] = useState<string | null>(null)

  // Collections states
  const [collections, setCollections] = useState<any[]>([])
  const [selectedListingForColl, setSelectedListingForColl] = useState<UnifiedListing | null>(null)
  const [collModalOpen, setCollModalOpen] = useState(false)
  const [activeCollIds, setActiveCollIds] = useState<Set<string>>(new Set())
  const [newCollName, setNewCollName] = useState('')
  const [creatingColl, setCreatingColl] = useState(false)

  // Filter States
  const [filterLocation, setFilterLocation] = useState('')
  const [filterMinPrice, setFilterMinPrice] = useState('')
  const [filterMaxPrice, setFilterMaxPrice] = useState('')
  
  // Apartment Specific
  const [filterBedrooms, setFilterBedrooms] = useState('any')
  const [filterBathrooms, setFilterBathrooms] = useState('any')
  const [filterListingType, setFilterListingType] = useState('ALL') // ALL, SALE, RENTAL

  // Event Center Specific
  const [filterMinCapacity, setFilterMinCapacity] = useState('')
  const [filterParkingYard, setFilterParkingYard] = useState(false)
  const [filterGenerator, setFilterGenerator] = useState(false)
  const [filterSecurity, setFilterSecurity] = useState(false)

  // Public Space Specific
  const [filterMinArea, setFilterMinArea] = useState('')
  const [filterPowerSupply, setFilterPowerSupply] = useState(false)
  const [filterParking, setFilterParking] = useState(false)
  const [filterInternet, setFilterInternet] = useState(false)

  // Mobile layout state
  const [showFiltersMobile, setShowFiltersMobile] = useState(false)

  const handleClearFilters = () => {
    setFilterLocation('')
    setFilterMinPrice('')
    setFilterMaxPrice('')
    setFilterBedrooms('any')
    setFilterBathrooms('any')
    setFilterListingType('ALL')
    setFilterMinCapacity('')
    setFilterParkingYard(false)
    setFilterGenerator(false)
    setFilterSecurity(false)
    setFilterMinArea('')
    setFilterPowerSupply(false)
    setFilterParking(false)
    setFilterInternet(false)
  }

  // 1. Sync consumer favorites list on mount or session change
  useEffect(() => {
    async function fetchFavorites() {
      if (!consumer) {
        setFavoriteIds(new Set())
        return
      }
      try {
        const res = await getConsumerFavorites(consumer.id)
        if (res.success && res.data) {
          setFavoriteIds(new Set(res.data.map(item => item.id)))
        }
      } catch (err) {
        console.error('Failed to sync favorites:', err)
      }
    }
    fetchFavorites()
  }, [consumer])

  // 1.5 Sync already unlocked contact details for the category
  useEffect(() => {
    async function loadUnlockedContacts() {
      if (!consumer) return
      try {
        const res = await getUnlockedContactsForConsumer(consumer.id, categorySlug)
        if (res.success && res.data) {
          setRevealedContacts(prev => ({
            ...prev,
            ...res.data
          }))
        }
      } catch (err) {
        console.error('Failed to pre-load unlocked contacts:', err)
      }
    }
    loadUnlockedContacts()
  }, [consumer, categorySlug])

  // 2. Handle Auto-Reveal and toast notifications after redirecting from Payment
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
          if (res.paymentType === 'CONTACT' && revealedListingId) {
            // Unlocks agent details, explicitly bypassing repeat payment triggers
            handleLoadContactInfo(revealedListingId, true)
          }
        } else {
          toast.error(`Transaction verification failed. Status: ${res.status || 'FAILED'}`)
        }
      } catch (err) {
        toast.dismiss(toastId)
        toast.error('An error occurred while verifying the transaction.')
      } finally {
        const currentPath = window.location.pathname
        router.replace(currentPath)
      }
    }

    if (success === 'true' && reference) {
      verifyPayment()
    }

    if (failed === 'true') {
      toast.error('Transaction was cancelled or declined.')
      const currentPath = window.location.pathname
      router.replace(currentPath)
    }
  }, [searchParams])

  // 3. Contact Info Loader (Queries server for details)
  const handleLoadContactInfo = async (listingId: string, skipPaymentInit = false) => {
    // Open a blank tab synchronously immediately upon the click to bypass mobile browser popup blockers
    let paymentTab: Window | null = null
    if (!skipPaymentInit) {
      paymentTab = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null
    }

    setLoadingContactId(listingId)
    try {
      const res = await getListingContactInfo(listingId, categorySlug)
      if (res.success && res.contactInfo) {
        setRevealedContacts(prev => ({
          ...prev,
          [listingId]: res.contactInfo
        }))
        toast.success('Agent contact details unlocked.')
        if (paymentTab) paymentTab.close() // Close the unused tab if contact is already revealed
      } else if (res.requiresPayment) {
        if (skipPaymentInit) {
          if (paymentTab) paymentTab.close()
          toast.error('Payment verified but contact details could not be retrieved. Please refresh the page.')
        } else {
          // Trigger payment initialization for contact fee with the pre-opened tab
          await handleInitializePayment(listingId, paymentTab)
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
      setLoadingContactId(null)
    }
  }

  // 4. Initialize payment (Contact)
  const handleInitializePayment = async (listingId: string, newTab: Window | null) => {
    if (newTab) {
      newTab.document.write(`
        <html>
          <head>
            <title>HousePadi Secure Redirect</title>
            <style>
              body { 
                background: #0a0a0a; 
                color: #ffffff; 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                height: 100vh; 
                margin: 0; 
              } 
              .loader { 
                border: 2px solid rgba(255,255,255,0.05); 
                border-radius: 50%; 
                border-top: 2px solid #10b981; 
                width: 32px; 
                height: 32px; 
                animation: spin 0.8s linear infinite; 
                margin-bottom: 24px; 
              } 
              @keyframes spin { 
                0% { transform: rotate(0deg); } 
                100% { transform: rotate(360deg); } 
              }
              p {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.2em;
                color: #737373;
                font-weight: 600;
              }
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
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          listingId,
          listingType: categorySlug,
          paymentType: 'CONTACT'
        })
      })

      const data = await response.json()
      if (response.ok && data.success && data.authorization_url) {
        toast.success('Secure gateway page opened in a new tab. Please complete the transaction there.')
        if (newTab) {
          newTab.location.href = data.authorization_url
        }
      } else {
        toast.error(data.error || 'Could not initiate checkout transaction.')
        if (newTab) {
          newTab.close()
        }
      }
    } catch (err) {
      toast.error('Failed to communicate with authorization server.')
      if (newTab) {
        newTab.close()
      }
    }
  }

  // 5. Handle favorite toggle
  const handleToggleFavorite = async (listingId: string) => {
    if (!consumer) return // Handled by ProtectedAction wrapper

    try {
      const res = await toggleFavorite(consumer.id, listingId, categorySlug)
      if (res.success) {
        setFavoriteIds(prev => {
          const updated = new Set(prev)
          if (res.favorited) {
            updated.add(listingId)
            toast.success('Listing added to favorites.')
          } else {
            updated.delete(listingId)
            toast.success('Listing removed from favorites.')
          }
          return updated
        })

        // Dynamically update favorite count in the local state
        setListings(prevListings =>
          prevListings.map(l => {
            if (l.id === listingId) {
              const currentCount = l.favorite_count || 0
              return {
                ...l,
                favorite_count: res.favorited ? currentCount + 1 : Math.max(0, currentCount - 1)
              }
            }
            return l
          })
        )
      } else {
        toast.error(res.error || 'Failed to update favorites.')
      }
    } catch (err) {
      toast.error('Could not communicate with the database.')
    }
  }

  // Open collections modal for a listing
  const handleOpenCollectionModal = async (listing: UnifiedListing) => {
    if (!consumer) return // ProtectedAction forces login
    setSelectedListingForColl(listing)
    setCollModalOpen(true)
    
    try {
      const collsRes = await getConsumerCollections(consumer.id)
      const activeCollsRes = await getCollectionsForListing(consumer.id, listing.id)
      
      if (collsRes.success) setCollections(collsRes.data || [])
      if (activeCollsRes.success) {
        setActiveCollIds(new Set(activeCollsRes.data || []))
      }
    } catch (err) {
      toast.error('Failed to retrieve collections.')
    }
  }

  // Toggle collection assignment
  const handleToggleCollectionItem = async (collectionId: string, isChecked: boolean) => {
    if (!consumer || !selectedListingForColl) return
    
    try {
      if (isChecked) {
        const res = await addListingToCollection(consumer.id, collectionId, selectedListingForColl.id, categorySlug)
        if (res.success) {
          setActiveCollIds(prev => {
            const next = new Set(prev)
            next.add(collectionId)
            return next
          })
          toast.success('Listing added to collection.')
        } else {
          toast.error(res.error || 'Failed to add to collection.')
        }
      } else {
        const res = await removeListingFromCollection(consumer.id, collectionId, selectedListingForColl.id)
        if (res.success) {
          setActiveCollIds(prev => {
            const next = new Set(prev)
            next.delete(collectionId)
            return next
          })
          toast.success('Listing removed from collection.')
        } else {
          toast.error(res.error || 'Failed to remove from collection.')
        }
      }
    } catch (err) {
      toast.error('Database connection error.')
    }
  }

  // Create new collection inline
  const handleCreateCollectionInline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consumer || !newCollName.trim()) return
    setCreatingColl(true)
    try {
      const res = await createCollection(consumer.id, newCollName.trim())
      if (res.success) {
        setCollections(prev => [res.data, ...prev])
        setNewCollName('')
        toast.success('Collection created.')
      } else {
        toast.error(res.error || 'Failed to create collection.')
      }
    } catch (err) {
      toast.error('Database connection error.')
    } finally {
      setCreatingColl(false)
    }
  }


  // 7. Render features list conditionally by space category
  const renderFeatures = (listing: UnifiedListing) => {
    const feat = listing.features || {}
    
    if (categorySlug === 'apartment') {
      return (
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-neutral-400 font-light uppercase tracking-wider">
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400" /> Size: {feat.land_size || 'N/A'}</div>
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400" /> Bedrooms: {feat.num_bedrooms ?? 0}</div>
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400" /> Bathrooms: {feat.num_bathrooms ?? 0}</div>
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400" /> Running Water: {feat.has_water ? 'Yes' : 'No'}</div>
        </div>
      )
    }

    if (categorySlug === 'event_center') {
      return (
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-neutral-400 font-light uppercase tracking-wider">
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400" /> Capacity: {feat.sitting_capacity ?? 0} Seats</div>
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400" /> Parking: {feat.parking_yard ? 'Yes' : 'No'}</div>
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400" /> Power Generator: {feat.generator ? 'Yes' : 'No'}</div>
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400" /> Dedicated Security: {feat.security ? 'Yes' : 'No'}</div>
        </div>
      )
    }

    // Shop / Public Space
    return (
      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px] text-neutral-400 font-light uppercase tracking-wider">
        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400" /> Floor Area: {feat.floor_area || 'N/A'}</div>
        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400" /> Grid Power: {feat.power_supply ? 'Yes' : 'No'}</div>
        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400" /> Cust Parking: {feat.parking ? 'Yes' : 'No'}</div>
        <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400" /> High-Speed Wifi: {feat.internet ? 'Yes' : 'No'}</div>
      </div>
    )
  }

  const filteredListings = listings.filter((listing) => {
    // 1. Common Filters: Location (State or Address)
    if (filterLocation.trim()) {
      const locQuery = filterLocation.toLowerCase()
      const matchesAddress = (listing.address || '').toLowerCase().includes(locQuery)
      const matchesState = (listing.state || '').toLowerCase().includes(locQuery)
      if (!matchesAddress && !matchesState) return false
    }

    // 2. Common Filters: Price Range
    if (filterMinPrice) {
      if (Number(listing.price) < Number(filterMinPrice)) return false
    }
    if (filterMaxPrice) {
      if (Number(listing.price) > Number(filterMaxPrice)) return false
    }

    const feat = listing.features || {}

    // 3. Category Specific Filters
    if (categorySlug === 'apartment') {
      // Bedrooms
      if (filterBedrooms && filterBedrooms !== 'any') {
        const beds = Number(feat.num_bedrooms) || 0
        if (filterBedrooms === '4+') {
          if (beds < 4) return false
        } else {
          if (beds !== Number(filterBedrooms)) return false
        }
      }

      // Bathrooms
      if (filterBathrooms && filterBathrooms !== 'any') {
        const baths = Number(feat.num_bathrooms) || 0
        if (filterBathrooms === '4+') {
          if (baths < 4) return false
        } else {
          if (baths !== Number(filterBathrooms)) return false
        }
      }

      // Listing Type (Buy/Rent)
      if (filterListingType !== 'ALL') {
        if (listing.listing_type !== filterListingType) return false
      }
    }

    if (categorySlug === 'event_center') {
      // Seating Capacity
      if (filterMinCapacity) {
        const cap = Number(feat.sitting_capacity) || 0
        if (cap < Number(filterMinCapacity)) return false
      }

      // Parking Yard
      if (filterParkingYard && !feat.parking_yard) return false

      // Generator
      if (filterGenerator && !feat.generator) return false

      // Security
      if (filterSecurity && !feat.security) return false
    }

    if (categorySlug === 'public_space') {
      // Floor Area
      if (filterMinArea) {
        const area = Number(feat.floor_area) || parseFloat(feat.floor_area) || 0
        if (area < Number(filterMinArea)) return false
      }

      // Power Supply
      if (filterPowerSupply && !feat.power_supply) return false

      // Parking
      if (filterParking && !feat.parking) return false

      // Internet
      if (filterInternet && !feat.internet) return false
    }

    return true
  })

  return (
    <>
      <div className="space-y-8">
        
        {/* Toggle Button for Mobile */}
        <div className="md:hidden flex justify-end">
          <Button 
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            className="border border-white/10 bg-neutral-900/60 hover:bg-neutral-900 text-white rounded-none h-11 text-[10px] tracking-widest uppercase gap-2 px-6"
          >
            <Filter className="w-4 h-4" />
            {showFiltersMobile ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          
          {/* Filters Sidebar */}
          <div className={`${showFiltersMobile ? 'block' : 'hidden'} md:block col-span-1 bg-neutral-950/80 border border-white/5 p-6 space-y-6 backdrop-blur-xl relative`}>
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <h3 className="text-xs uppercase tracking-widest font-bold text-emerald-400">Filters</h3>
              <button 
                onClick={handleClearFilters}
                className="text-[10px] uppercase tracking-widest text-neutral-500 hover:text-white font-semibold transition-colors"
              >
                Clear All
              </button>
            </div>

            {/* Common Filter: Location */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Location / State</label>
              <div className="relative">
                <Search className="absolute left-3 top-3.5 w-4 h-4 text-neutral-600" />
                <Input 
                  placeholder="Search city, state..."
                  value={filterLocation}
                  onChange={e => setFilterLocation(e.target.value)}
                  className="pl-10 bg-neutral-900/60 border-white/5 focus-visible:ring-white h-11 text-xs rounded-none text-white placeholder:text-neutral-600"
                />
              </div>
            </div>

            {/* Common Filter: Price Range */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Price Range (₦)</label>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  type="number"
                  placeholder="Min"
                  value={filterMinPrice}
                  onChange={e => setFilterMinPrice(e.target.value)}
                  className="bg-neutral-900/60 border-white/5 focus-visible:ring-white h-11 text-xs rounded-none text-white placeholder:text-neutral-600"
                />
                <Input 
                  type="number"
                  placeholder="Max"
                  value={filterMaxPrice}
                  onChange={e => setFilterMaxPrice(e.target.value)}
                  className="bg-neutral-900/60 border-white/5 focus-visible:ring-white h-11 text-xs rounded-none text-white placeholder:text-neutral-600"
                />
              </div>
            </div>

            {/* Apartment Specific Controls */}
            {categorySlug === 'apartment' && (
              <>
                {/* Buy vs Rent */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Listing Type</label>
                  <select
                    value={filterListingType}
                    onChange={e => setFilterListingType(e.target.value)}
                    className="w-full bg-neutral-900/60 border border-white/5 focus:border-white h-11 text-xs rounded-none text-white px-3 focus:outline-none focus:ring-0 focus:ring-offset-0"
                  >
                    <option value="ALL">All Types</option>
                    <option value="SALE">For Sale</option>
                    <option value="RENTAL">For Rent</option>
                  </select>
                </div>

                {/* Bedrooms */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Bedrooms</label>
                  <select
                    value={filterBedrooms}
                    onChange={e => setFilterBedrooms(e.target.value)}
                    className="w-full bg-neutral-900/60 border border-white/5 focus:border-white h-11 text-xs rounded-none text-white px-3 focus:outline-none focus:ring-0 focus:ring-offset-0"
                  >
                    <option value="any">Any Bedrooms</option>
                    <option value="1">1 Bedroom</option>
                    <option value="2">2 Bedrooms</option>
                    <option value="3">3 Bedrooms</option>
                    <option value="4+">4+ Bedrooms</option>
                  </select>
                </div>

                {/* Bathrooms */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Bathrooms</label>
                  <select
                    value={filterBathrooms}
                    onChange={e => setFilterBathrooms(e.target.value)}
                    className="w-full bg-neutral-900/60 border border-white/5 focus:border-white h-11 text-xs rounded-none text-white px-3 focus:outline-none focus:ring-0 focus:ring-offset-0"
                  >
                    <option value="any">Any Bathrooms</option>
                    <option value="1">1 Bathroom</option>
                    <option value="2">2 Bathrooms</option>
                    <option value="3">3 Bathrooms</option>
                    <option value="4+">4+ Bathrooms</option>
                  </select>
                </div>
              </>
            )}

            {/* Event Center Specific Controls */}
            {categorySlug === 'event_center' && (
              <>
                {/* Min Seating Capacity */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Min Capacity (Seats)</label>
                  <Input 
                    type="number"
                    placeholder="e.g. 500"
                    value={filterMinCapacity}
                    onChange={e => setFilterMinCapacity(e.target.value)}
                    className="bg-neutral-900/60 border-white/5 focus-visible:ring-white h-11 text-xs rounded-none text-white placeholder:text-neutral-600"
                  />
                </div>

                {/* Parking Yard checkbox */}
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-300 font-medium">Parking Yard</span>
                  <input 
                    type="checkbox"
                    checked={filterParkingYard}
                    onChange={e => setFilterParkingYard(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 border border-neutral-700 bg-neutral-900 rounded focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer"
                  />
                </div>

                {/* Generator checkbox */}
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-300 font-medium">Power Generator</span>
                  <input 
                    type="checkbox"
                    checked={filterGenerator}
                    onChange={e => setFilterGenerator(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 border border-neutral-700 bg-neutral-900 rounded focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer"
                  />
                </div>

                {/* Security checkbox */}
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-300 font-medium">Security Guard</span>
                  <input 
                    type="checkbox"
                    checked={filterSecurity}
                    onChange={e => setFilterSecurity(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 border border-neutral-700 bg-neutral-900 rounded focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer"
                  />
                </div>
              </>
            )}

            {/* Public Space Specific Controls */}
            {categorySlug === 'public_space' && (
              <>
                {/* Min Land/Floor Area */}
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold">Min Floor Area (sqm)</label>
                  <Input 
                    type="number"
                    placeholder="e.g. 150"
                    value={filterMinArea}
                    onChange={e => setFilterMinArea(e.target.value)}
                    className="bg-neutral-900/60 border-white/5 focus-visible:ring-white h-11 text-xs rounded-none text-white placeholder:text-neutral-600"
                  />
                </div>

                {/* Electricity grid availability checkbox */}
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-300 font-medium">Electricity Grid</span>
                  <input 
                    type="checkbox"
                    checked={filterPowerSupply}
                    onChange={e => setFilterPowerSupply(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 border border-neutral-700 bg-neutral-900 rounded focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer"
                  />
                </div>

                {/* Parking checkbox */}
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-300 font-medium">Cust Parking</span>
                  <input 
                    type="checkbox"
                    checked={filterParking}
                    onChange={e => setFilterParking(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 border border-neutral-700 bg-neutral-900 rounded focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer"
                  />
                </div>

                {/* High-speed Internet checkbox */}
                <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-300 font-medium">Wifi Internet</span>
                  <input 
                    type="checkbox"
                    checked={filterInternet}
                    onChange={e => setFilterInternet(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 border border-neutral-700 bg-neutral-900 rounded focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer"
                  />
                </div>
              </>
            )}

          </div>

          {/* Listings Viewport */}
          <div className="col-span-1 md:col-span-3 space-y-8">
            {/* Search Stats Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <p className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">
                Showing {filteredListings.length} of {listings.length} Active Listings in {categoryName}s
              </p>
            </div>

            {filteredListings.length === 0 ? (
              <div className="py-24 text-center border border-dashed border-neutral-800 bg-neutral-900/10 space-y-4">
                <Compass className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
                <h4 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">No Listings Match</h4>
                <p className="text-xs text-neutral-500 font-light max-w-sm mx-auto leading-relaxed">
                  We couldn&apos;t find any spatial spaces matching your active filter criteria. Try adjusting the parameters or clearing filters.
                </p>
                <Button 
                  onClick={handleClearFilters}
                  className="h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none px-6"
                >
                  Reset Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((listing) => {
                  const isFavorited = favoriteIds.has(listing.id)
                  const revealed = revealedContacts[listing.id]
                  const priceFormatted = new Intl.NumberFormat('en-NG', {
                    style: 'currency',
                    currency: 'NGN',
                    maximumFractionDigits: 0
                  }).format(listing.price)

                  return (
                    <div 
                      key={listing.id}
                      className="group relative bg-neutral-900/20 border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col justify-between font-sans"
                    >
                      {/* Visual Thumbnail Container */}
                      <div className="relative aspect-video overflow-hidden border-b border-white/5 bg-neutral-950">
                        <img 
                          src={listing.thumbnail_path || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600'} 
                          alt={listing.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        
                        {/* Option Tag: For Sale vs Rental */}
                        <div className="absolute top-4 left-4 z-10 px-2 py-1 bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white">
                          {listing.listing_type}
                        </div>

                        {/* Golden Glowing Featured Badge */}
                        <div className="absolute top-4 right-4 z-10 px-2 py-1 bg-yellow-500/10 backdrop-blur-md border border-yellow-500/30 text-[9px] font-bold uppercase tracking-widest text-yellow-400 flex items-center gap-1 shadow-[0_0_15px_-3px_rgba(234,179,8,0.2)]">
                          <Sparkles className="w-2.5 h-2.5" /> Featured
                        </div>

                        {/* Quick-Action Favorite & Collection Buttons */}
                        <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                          <ProtectedAction onClick={() => handleOpenCollectionModal(listing)} isFavorite>
                            <button 
                              className="p-2.5 bg-black/60 backdrop-blur-md border border-white/10 text-neutral-400 hover:text-white hover:border-white/20 transition-all rounded-full hover:scale-110 active:scale-95 shadow-md"
                              title="Add to Collection"
                            >
                              <FolderHeart className="w-4 h-4" />
                            </button>
                          </ProtectedAction>

                          <ProtectedAction onClick={() => handleToggleFavorite(listing.id)} isFavorite>
                            <button 
                              className={`p-2.5 backdrop-blur-md border transition-all rounded-full hover:scale-110 active:scale-95 flex items-center gap-1.5 shadow-md ${
                                isFavorited 
                                  ? 'bg-red-500/15 border-red-500/40 text-red-500 shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]' 
                                  : 'bg-black/60 border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                              <span className="text-[10px] font-semibold pr-0.5">{listing.favorite_count || 0}</span>
                            </button>
                          </ProtectedAction>
                        </div>
                      </div>

                      {/* Details Section */}
                      <div className="p-6 space-y-6 flex-1 flex flex-col justify-between bg-neutral-950/20">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start gap-3">
                            <h4 className="text-base font-light tracking-tight text-white group-hover:text-emerald-400 transition-colors leading-tight">
                              {listing.name}
                            </h4>
                            <p className="text-sm font-semibold text-white whitespace-nowrap">
                              {priceFormatted}{listing.listing_type === 'RENTAL' && listing.rent_interval ? `/${listing.rent_interval === 'yearly' ? 'yr' : 'mo'}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-neutral-600" /> {listing.address}, {listing.state}
                          </div>
                        </div>

                        {/* Render mapping specifications */}
                        <div className="border-t border-white/5 pt-4">
                          {renderFeatures(listing)}
                        </div>

                        {/* Immersion CTA View Space Details */}
                        <div className="space-y-3 border-t border-white/5 pt-4">
                          <button 
                            onClick={() => router.push(`/property/${listing.id}?category=${categorySlug}`)}
                            className="w-full flex items-center justify-center gap-2 h-11 bg-white/5 border border-white/10 hover:bg-white hover:text-black hover:border-white text-xs font-bold uppercase tracking-widest transition-all"
                          >
                            <ArrowRight className="w-3.5 h-3.5" /> View Property Details
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Dynamic Collection Selection Dialog Modal */}
      <Dialog open={collModalOpen} onOpenChange={setCollModalOpen}>
        <DialogContent className="bg-neutral-950 border border-white/10 text-white rounded-none p-8 sm:max-w-md">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-lg font-light uppercase tracking-tight text-white">Save to Collection</DialogTitle>
            <DialogDescription className="text-xs text-neutral-400 leading-relaxed">
              Add or remove this listing from your custom bookmark collections.
            </DialogDescription>
          </DialogHeader>

          {/* Inline creation form */}
          <form onSubmit={handleCreateCollectionInline} className="flex gap-2 border-b border-white/5 pb-4 mb-4">
            <Input 
              type="text"
              placeholder="Create new folder..."
              value={newCollName}
              onChange={e => setNewCollName(e.target.value)}
              className="bg-neutral-900 border-white/5 focus-visible:ring-white h-11 text-xs rounded-none text-white flex-1"
              required
            />
            <Button
              type="submit"
              disabled={creatingColl}
              className="h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none px-4"
            >
              {creatingColl ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
            </Button>
          </form>

          {/* Collections checklist */}
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {collections.length === 0 ? (
              <p className="text-xs text-neutral-500 italic text-center py-4">No collections created yet.</p>
            ) : (
              collections.map(c => {
                const isSelected = activeCollIds.has(c.id)
                return (
                  <div 
                    key={c.id}
                    className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-colors"
                  >
                    <span className="text-xs font-medium">{c.name}</span>
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => handleToggleCollectionItem(c.id, e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 border border-neutral-700 bg-neutral-900 rounded focus:ring-0 focus:ring-offset-0 focus:outline-none"
                    />
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-white/5">
            <Button
              onClick={() => {
                setCollModalOpen(false)
                setSelectedListingForColl(null)
              }}
              className="w-full h-11 bg-white/5 border border-white/10 hover:bg-white hover:text-black text-xs font-bold uppercase tracking-widest rounded-none"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

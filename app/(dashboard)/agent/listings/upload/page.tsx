'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import {
  Box,
  Upload as UploadIcon,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X,
  Lock,
  Building,
  Tent,
  Store
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { generatePresignedUrl } from '@/app/actions/r2-actions'

interface AgencyLimitData {
  maxStorageBytes: number
  storageUsedBytes: number
  maxListings: number
  listingsUsed: number
  tierName: string
  supportedListingTypes: string[]
}

type CategoryType = 'apartments' | 'event_centers' | 'public_space'

const NIGERIA_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'Federal Capital Territory (FCT)'
]

function UploadListingContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [agencyData, setAgencyData] = useState<AgencyLimitData | null>(null)

  // Base State
  const [activeCategory, setActiveCategory] = useState<CategoryType>('apartments')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [location, setLocation] = useState('')
  const [state, setState] = useState('')
  const [listingType, setListingType] = useState<'SALE' | 'RENTAL'>('SALE')
  const [rentInterval, setRentInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [phoneNumber, setPhoneNumber] = useState('')

  // Apartment State
  const [landSize, setLandSize] = useState('')
  const [numBedrooms, setNumBedrooms] = useState('')
  const [numBathrooms, setNumBathrooms] = useState('')
  const [hasWater, setHasWater] = useState(false)

  // Event Center State
  const [sittingCapacity, setSittingCapacity] = useState('')
  const [parkingYard, setParkingYard] = useState(false)
  const [generator, setGenerator] = useState(false)
  const [security, setSecurity] = useState(false)

  // Other Public Space State
  const [floorArea, setFloorArea] = useState('')
  const [powerSupply, setPowerSupply] = useState(false)
  const [parking, setParking] = useState(false)
  const [internet, setInternet] = useState(false)

  // Other Features State
  const [otherFeatures, setOtherFeatures] = useState<string[]>([''])

  // Files
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [galleryImages, setGalleryImages] = useState<{ file: File; note: string }[]>([])

  // Upload State
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStep, setUploadStep] = useState<string>('')

  useEffect(() => {
    async function checkLimits() {
      if (!user) return
      const supabase = createClient()

      const { data: profile } = await supabase
        .from('profiles')
        .select('agency_id, phone_number')
        .eq('id', user.id)
        .single()

      if (!profile?.agency_id) return

      if (profile.phone_number) {
        setPhoneNumber(profile.phone_number)
      }

      let maxListings = 25
      let maxStorageBytes = 10 * 1000 * 1000 * 1000
      let tierName = 'Basic'
      let supportedListingTypes = ['apartment', 'event_center', 'public_space']

      const { data: subData } = await supabase
        .from('agency_subscriptions')
        .select(`
          custom_listing_limit,
          custom_storage_limit_mb,
          subscription_plans (*)
        `)
        .eq('agency_id', profile.agency_id)
        .single()

      if (subData && subData.subscription_plans) {
        const plan = Array.isArray(subData.subscription_plans) ? subData.subscription_plans[0] : subData.subscription_plans
        tierName = plan.name
        maxListings = subData.custom_listing_limit ?? plan.listing_limit
        maxStorageBytes = (subData.custom_storage_limit_mb ?? plan.storage_limit_mb) * 1000 * 1000
        if (plan.supported_listing_types) {
          supportedListingTypes = plan.supported_listing_types
        }
      }

      const [aptData, evtData, shpData] = await Promise.all([
        supabase.from('apartments').select('id, file_size').eq('agency_id', profile.agency_id),
        supabase.from('event_centers').select('id, file_size').eq('agency_id', profile.agency_id),
        supabase.from('public_space').select('id, file_size').eq('agency_id', profile.agency_id)
      ])

      const props = [...(aptData.data || []), ...(evtData.data || []), ...(shpData.data || [])]
      const listingsUsed = props.length
      const storageUsedBytes = props.reduce((acc, p) => acc + (Number(p.file_size) || 0), 0)

      setAgencyData({
        maxStorageBytes,
        storageUsedBytes,
        maxListings,
        listingsUsed,
        tierName,
        supportedListingTypes
      })
      setLoading(false)
    }

    checkLimits()
  }, [user])

  // Prefill hook from Proximap Loopback Bridge
  useEffect(() => {
    const prefill = searchParams.get('prefill') === 'true'
    const localUrl = searchParams.get('local_url')
    const prefillName = searchParams.get('name')

    if (prefill && localUrl && agencyData) {
      const fetchUrl = localUrl
      const activeAgency = agencyData
      let isSubposed = true
      
      async function prefillModel() {
        toast({ title: 'Integration Bridge', description: 'Retrieving model from Proximap...' })
        try {
          const response = await fetch(fetchUrl)
          if (!response.ok) throw new Error('Could not contact local loopback server')
          
          const blob = await response.blob()
          const filename = prefillName || fetchUrl.substring(fetchUrl.lastIndexOf('/') + 1) || 'model.glb'
          const file = new File([blob], filename, { type: 'model/gltf-binary' })
          
          const remainingBytes = activeAgency.maxStorageBytes - activeAgency.storageUsedBytes
          if (file.size > remainingBytes) {
            throw new Error(`File size exceeds remaining agency storage space.`)
          }
          
          if (isSubposed) {
            setModelFile(file)
            if (prefillName) setName(prefillName)
            toast({ title: 'Attached Successfully', description: 'Successfully attached model from Proximap!' })
          }
        } catch (err: any) {
          if (isSubposed) {
            toast({ title: 'Bridge Error', description: err.message || 'Failed to auto-attach model.', variant: 'destructive' })
          }
        }
      }
      
      prefillModel()
      return () => {
        isSubposed = false
      }
    }
  }, [searchParams, agencyData])

  const handleModelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validExtensions = ['.glb', '.fbx', '.obj']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!validExtensions.includes(ext)) {
      toast({ title: 'Invalid format', description: `Only .glb,.fbx or .obj files are supported for 3D architectural models.`, variant: 'destructive' })
      e.target.value = ''
      return
    }

    if (agencyData) {
      const remainingBytes = agencyData.maxStorageBytes - agencyData.storageUsedBytes
      if (file.size > remainingBytes) {
        toast({
          title: 'Storage Limit Exceeded',
          description: `File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds remaining agency storage (${(remainingBytes / 1024 / 1024).toFixed(1)}MB).`,
          variant: 'destructive'
        })
        e.target.value = ''
        return
      }
    }

    setModelFile(file)
  }

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid format', description: 'Please upload an image file for the thumbnail.', variant: 'destructive' })
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Thumbnail must be less than 5MB.', variant: 'destructive' })
      e.target.value = ''
      return
    }

    setThumbnailFile(file)
  }

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Invalid format', description: `${file.name} is not an image.`, variant: 'destructive' })
        return false
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: 'File too large', description: `${file.name} must be less than 5MB.`, variant: 'destructive' })
        return false
      }
      return true
    })

    if (galleryImages.length + validFiles.length > 3) {
      toast({ title: 'Limit Exceeded', description: 'You can only upload up to 3 gallery images.', variant: 'destructive' })
      return
    }

    setGalleryImages(prev => [
      ...prev,
      ...validFiles.map(file => ({ file, note: '' }))
    ])
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !agencyData) return

    if (agencyData.listingsUsed >= agencyData.maxListings) {
      toast({ title: 'Limit Reached', description: 'Agency listing limit has been reached.', variant: 'destructive' })
      return
    }

    if (!modelFile || !thumbnailFile || !name || !price || !location || !state || !phoneNumber) {
      toast({ title: 'Missing Fields', description: 'Please complete all required fields and upload both files.', variant: 'destructive' })
      return
    }

    setIsUploading(true)
    setUploadStep('Initializing Upload Workflow...')

    try {
      const supabase = createClient()
      const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
      if (!profile?.agency_id) throw new Error('Agency ID not found')

      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`

      // 1. Upload Thumbnail (Cloudflare R2)
      setUploadStep('Uploading Thumbnail Image...')
      const thumbFileName = `thumbnails/${profile.agency_id}/${uniqueId}-${thumbnailFile.name}`
      const thumbPresigned = await generatePresignedUrl(thumbFileName, thumbnailFile.type)

      if (!thumbPresigned.success || !thumbPresigned.signedUrl) {
        throw new Error(thumbPresigned.error || 'Failed to generate thumbnail upload URL')
      }

      await fetch(thumbPresigned.signedUrl, {
        method: 'PUT',
        body: thumbnailFile,
        headers: { 'Content-Type': thumbnailFile.type }
      })
      const thumbnailUrl = thumbPresigned.publicUrl

      // 2. Upload 3D Model (Cloudflare R2)
      setUploadStep('Uploading 3D Architectural Model...')
      const modelFileName = `models/${profile.agency_id}/${uniqueId}-${modelFile.name}`
      const modelPresigned = await generatePresignedUrl(modelFileName, modelFile.type || 'model/gltf-binary')

      if (!modelPresigned.success || !modelPresigned.signedUrl) {
        throw new Error(modelPresigned.error || 'Failed to generate model upload URL')
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', modelPresigned.signedUrl!, true)
        xhr.setRequestHeader('Content-Type', modelFile.type || 'model/gltf-binary')

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress((e.loaded / e.total) * 100)
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error('Model upload failed with status ' + xhr.status))
        }

        xhr.onerror = () => reject(new Error('Model upload failed due to network error'))
        xhr.send(modelFile)
      })

      const modelUrl = modelPresigned.publicUrl

      // 2.5 Upload Gallery Images (Cloudflare R2)
      setUploadStep('Uploading Gallery Images...')
      const uploadedGallery: { url: string; note: string }[] = []
      for (const item of galleryImages) {
        const galFileName = `gallery/${profile.agency_id}/${uniqueId}-${item.file.name}`
        const galPresigned = await generatePresignedUrl(galFileName, item.file.type)

        if (galPresigned.success && galPresigned.signedUrl) {
          await fetch(galPresigned.signedUrl, {
            method: 'PUT',
            body: item.file,
            headers: { 'Content-Type': item.file.type }
          })
          if (galPresigned.publicUrl) {
            uploadedGallery.push({
              url: galPresigned.publicUrl,
              note: item.note.trim()
            })
          }
        }
      }

      // 3. Save Metadata to Supabase
      setUploadStep('Finalizing Database Records...')

      const basePayload: any = {
        name,
        price: parseFloat(price),
        address: location,
        state,
        thumbnail_path: thumbnailUrl,
        model_url: modelUrl,
        agent_id: user.id,
        agency_id: profile.agency_id,
        phone_number: phoneNumber,
        status: 'PENDING',
        file_size: modelFile.size,
        other_features: otherFeatures.filter(f => f.trim() !== ''),
        gallery: uploadedGallery,
        ...(activeCategory !== 'event_centers' ? {
          listing_type: listingType,
          ...(listingType === 'RENTAL' ? { rent_interval: rentInterval } : { rent_interval: null })
        } : {
          listing_type: 'SALE',
          rent_interval: null
        })
      }

      let insertError = null

      if (activeCategory === 'apartments') {
        const { error } = await supabase.from('apartments').insert([{
          ...basePayload,
          land_size: landSize,
          num_bedrooms: numBedrooms ? parseInt(numBedrooms) : 0,
          num_bathrooms: numBathrooms ? parseInt(numBathrooms) : 0,
          has_water: hasWater
        }])
        insertError = error
      } else if (activeCategory === 'event_centers') {
        const { error } = await supabase.from('event_centers').insert([{
          ...basePayload,
          sitting_capacity: sittingCapacity ? parseInt(sittingCapacity) : 0,
          parking_yard: parkingYard,
          generator: generator,
          security: security
        }])
        insertError = error
      } else if (activeCategory === 'public_space') {
        const { error } = await supabase.from('public_space').insert([{
          ...basePayload,
          floor_area: floorArea,
          power_supply: powerSupply,
          parking: parking,
          internet: internet
        }])
        insertError = error
      }

      if (insertError) {
        if (insertError.message?.includes('relation') || insertError.message?.includes('does not exist')) {
          console.error('Insert Error:', insertError.message)
          toast({
            title: 'Database Schema Error',
            description: `A required column or table is missing. Error: ${insertError.message}`,
            variant: 'destructive',
            duration: 10000
          })
        } else {
          throw insertError
        }
        setIsUploading(false)
        return
      }

      toast({
        title: 'Listing Submitted',
        description: 'Your property has been uploaded and is pending agency review.'
      })

      router.push('/agent/listings')
      router.refresh()
    } catch (err: any) {
      console.error('Upload Error:', err)
      toast({
        title: 'Upload Failed',
        description: err.message || 'An error occurred during upload',
        variant: 'destructive'
      })
      setIsUploading(false)
    }
  }

  if (loading || !agencyData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-100px)]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    )
  }

  const isAptAllowed = agencyData.supportedListingTypes.includes('apartment')
  const isEvtAllowed = agencyData.supportedListingTypes.includes('event_center')
  const isSpcAllowed = agencyData.supportedListingTypes.includes('public_space')
  const hasRestrictions = !isAptAllowed || !isEvtAllowed || !isSpcAllowed

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-light text-white tracking-tight">Create Listing</h1>
        <p className="text-neutral-500 text-sm mt-1">Upload a new spatial property for moderation review.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-2 space-y-8">

          {/* Category Switcher */}
          <div className="bg-neutral-900/30 border border-neutral-800/50 p-6 space-y-4">
            <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Property Category</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => isAptAllowed && setActiveCategory('apartments')}
                  disabled={!isAptAllowed}
                  className={`w-full h-full flex flex-col items-center justify-center gap-3 p-4 border transition-all ${activeCategory === 'apartments'
                    ? 'border-white bg-white/5 text-white'
                    : 'border-neutral-800 text-neutral-500 hover:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-neutral-800'
                    }`}
                >
                  <Building className="w-6 h-6" />
                  <span className="text-xs font-bold uppercase tracking-wider">Apartment</span>
                </button>
                {!isAptAllowed && (
                  <div className="absolute top-2 right-2 text-neutral-600" title="Upgrade required">
                    <Lock className="w-3 h-3" />
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => isEvtAllowed && setActiveCategory('event_centers')}
                  disabled={!isEvtAllowed}
                  className={`w-full h-full flex flex-col items-center justify-center gap-3 p-4 border transition-all ${activeCategory === 'event_centers'
                    ? 'border-white bg-white/5 text-white'
                    : 'border-neutral-800 text-neutral-500 hover:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-neutral-800'
                    }`}
                >
                  <Tent className="w-6 h-6" />
                  <span className="text-xs font-bold uppercase tracking-wider">Event Center</span>
                </button>
                {!isEvtAllowed && (
                  <div className="absolute top-2 right-2 text-neutral-600" title="Upgrade required">
                    <Lock className="w-3 h-3" />
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => isSpcAllowed && setActiveCategory('public_space')}
                  disabled={!isSpcAllowed}
                  className={`w-full h-full flex flex-col items-center justify-center gap-3 p-4 border transition-all ${activeCategory === 'public_space'
                    ? 'border-white bg-white/5 text-white'
                    : 'border-neutral-800 text-neutral-500 hover:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-neutral-800'
                    }`}
                >
                  <Store className="w-6 h-6" />
                  <span className="text-xs font-bold uppercase tracking-wider">Other Public Space</span>
                </button>
                {!isSpcAllowed && (
                  <div className="absolute top-2 right-2 text-neutral-600" title="Upgrade required">
                    <Lock className="w-3 h-3" />
                  </div>
                )}
              </div>
            </div>
            {hasRestrictions && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 mt-4 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
                <div>
                  <h4 className="text-amber-500 font-bold text-xs uppercase tracking-wider">Tier Limitation</h4>
                  <p className="text-amber-500/80 text-xs mt-1">Some categories are restricted. Upgrade your tier to unlock more listing types.</p>
                </div>
              </div>
            )}
          </div>

          <form id="upload-form" onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-neutral-900/30 border border-neutral-800/50 p-6 space-y-6">
              <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold border-b border-neutral-800 pb-3">Basic Information</h3>

              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-medium text-neutral-400">Listing Name</label>
                  <Input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Modern Penthouse Suite"
                    className="bg-neutral-950 border-neutral-800 h-12"
                  />
                </div>

                <div className={`${activeCategory === 'event_centers' ? 'col-span-2' : ''} space-y-2`}>
                  <label className="text-xs font-medium text-neutral-400">Price (₦)</label>
                  <Input
                    required
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="e.g. 500000"
                    className="bg-neutral-950 border-neutral-800 h-12"
                  />
                </div>

                {activeCategory !== 'event_centers' && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-400">Listing Option</label>
                    <div className="flex items-center h-12 bg-neutral-950 border border-neutral-800 rounded-md p-1">
                      <button
                        type="button"
                        onClick={() => setListingType('SALE')}
                        className={`flex-1 h-full text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${listingType === 'SALE' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
                          }`}
                      >
                        For Sale
                      </button>
                      <button
                        type="button"
                        onClick={() => setListingType('RENTAL')}
                        className={`flex-1 h-full text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${listingType === 'RENTAL' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
                          }`}
                      >
                        Rental
                      </button>
                    </div>
                  </div>
                )}

                {activeCategory !== 'event_centers' && listingType === 'RENTAL' && (
                  <div className="col-span-2 space-y-2 animate-in fade-in duration-300">
                    <label className="text-xs font-medium text-neutral-400">Rental Interval</label>
                    <div className="flex items-center h-12 bg-neutral-950 border border-neutral-800 rounded-md p-1">
                      <button
                        type="button"
                        onClick={() => setRentInterval('monthly')}
                        className={`flex-1 h-full text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${rentInterval === 'monthly' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
                          }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setRentInterval('yearly')}
                        className={`flex-1 h-full text-xs font-bold uppercase tracking-wider rounded-sm transition-all ${rentInterval === 'yearly' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
                          }`}
                      >
                        Yearly
                      </button>
                    </div>
                  </div>
                )}

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-medium text-neutral-400">Contact Phone Number (Compulsory)</label>
                  <Input
                    required
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +2348012345678"
                    className="bg-neutral-950 border-neutral-800 h-12"
                  />
                  <p className="text-[10px] text-neutral-500">
                    This number will be used to contact you when someone decides to get your listing.
                  </p>
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-medium text-neutral-400">Address / Location</label>
                  <Input
                    required
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. 123 Spatial Ave, Meta City"
                    className="bg-neutral-950 border-neutral-800 h-12"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-medium text-neutral-400">State</label>
                  <select
                    required
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="flex h-12 w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="" disabled>Select a state</option>
                    {NIGERIA_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-neutral-900/30 border border-neutral-800/50 p-6 space-y-6">
              <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold border-b border-neutral-800 pb-3">Features & Amenities</h3>

              {activeCategory === 'apartments' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-400">Bedrooms</label>
                    <Input type="number" value={numBedrooms} onChange={e => setNumBedrooms(e.target.value)} placeholder="0" className="bg-neutral-950 border-neutral-800 h-12" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-400">Bathrooms</label>
                    <Input type="number" value={numBathrooms} onChange={e => setNumBathrooms(e.target.value)} placeholder="0" className="bg-neutral-950 border-neutral-800 h-12" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-400">Land Size</label>
                    <Input value={landSize} onChange={e => setLandSize(e.target.value)} placeholder="e.g. 5,000 sqft" className="bg-neutral-950 border-neutral-800 h-12" />
                  </div>
                  <div className="space-y-2 flex flex-col justify-center pt-6">
                    <div className="flex items-center gap-3">
                      <Switch checked={hasWater} onCheckedChange={setHasWater} />
                      <span className="text-sm text-neutral-300">Water Supply</span>
                    </div>
                  </div>
                </div>
              )}

              {activeCategory === 'event_centers' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-400">Sitting Capacity</label>
                    <Input type="number" value={sittingCapacity} onChange={e => setSittingCapacity(e.target.value)} placeholder="e.g. 500" className="bg-neutral-950 border-neutral-800 h-12" />
                  </div>
                  <div className="space-y-2 flex flex-col justify-center pt-6">
                    <div className="flex items-center gap-3">
                      <Switch checked={parkingYard} onCheckedChange={setParkingYard} />
                      <span className="text-sm text-neutral-300">Parking Yard</span>
                    </div>
                  </div>
                  <div className="space-y-2 flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                      <Switch checked={generator} onCheckedChange={setGenerator} />
                      <span className="text-sm text-neutral-300">Generator / Power</span>
                    </div>
                  </div>
                  <div className="space-y-2 flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                      <Switch checked={security} onCheckedChange={setSecurity} />
                      <span className="text-sm text-neutral-300">Dedicated Security</span>
                    </div>
                  </div>
                </div>
              )}

              {activeCategory === 'public_space' && (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-400">Floor Area</label>
                    <Input value={floorArea} onChange={e => setFloorArea(e.target.value)} placeholder="e.g. 1,200 sqft" className="bg-neutral-950 border-neutral-800 h-12" />
                  </div>
                  <div className="space-y-2 flex flex-col justify-center pt-6">
                    <div className="flex items-center gap-3">
                      <Switch checked={powerSupply} onCheckedChange={setPowerSupply} />
                      <span className="text-sm text-neutral-300">Power Supply</span>
                    </div>
                  </div>
                  <div className="space-y-2 flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                      <Switch checked={parking} onCheckedChange={setParking} />
                      <span className="text-sm text-neutral-300">Customer Parking</span>
                    </div>
                  </div>
                  <div className="space-y-2 flex flex-col justify-center">
                    <div className="flex items-center gap-3">
                      <Switch checked={internet} onCheckedChange={setInternet} />
                      <span className="text-sm text-neutral-300">High-Speed Internet</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Features List */}
              <div className="pt-6 border-t border-neutral-800/50 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-medium text-neutral-400">Other Features (Optional)</label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="h-8 text-[10px] bg-transparent border-neutral-800 text-neutral-400 hover:text-white"
                    onClick={() => setOtherFeatures([...otherFeatures, ''])}
                  >
                    + Add Feature
                  </Button>
                </div>
                <div className="space-y-3 animate-in fade-in">
                  {otherFeatures.map((feature, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...otherFeatures]
                          newFeatures[idx] = e.target.value
                          setOtherFeatures(newFeatures)
                        }}
                        placeholder="e.g. Swimming Pool, Fully Furnished, Gym Access"
                        className="bg-neutral-950 border-neutral-800 h-10"
                      />
                      {otherFeatures.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 shrink-0"
                          onClick={() => setOtherFeatures(otherFeatures.filter((_, i) => i !== idx))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-neutral-900/30 border border-neutral-800/50 p-6 space-y-6">
              <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold border-b border-neutral-800 pb-3">Spatial Assets</h3>

              <div className="space-y-6">
                <div>
                  <label className="text-xs font-medium text-neutral-400 mb-2 block">Thumbnail Image</label>
                  <label className={`block w-full border-2 border-dashed ${thumbnailFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-neutral-800 hover:border-neutral-600 bg-neutral-950'} rounded-lg p-8 text-center cursor-pointer transition-colors`}>
                    <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailSelect} />
                    {thumbnailFile ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                        <span className="text-sm text-emerald-500 font-medium">{thumbnailFile.name}</span>
                        <span className="text-xs text-emerald-500/70 mt-1">Ready for upload</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <ImageIcon className="w-8 h-8 text-neutral-500 mb-2" />
                        <span className="text-sm text-neutral-300">Click to upload thumbnail</span>
                        <span className="text-xs text-neutral-600 mt-1">JPG, PNG, WebP (Max 5MB)</span>
                      </div>
                    )}
                  </label>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-400 mb-2 block">3D Architectural Model (GLB, FBX, OBJ)</label>
                  <label className={`block w-full border-2 border-dashed ${modelFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-neutral-800 hover:border-neutral-600 bg-neutral-950'} rounded-lg p-8 text-center cursor-pointer transition-colors`}>
                    <input type="file" accept=".glb,.fbx,.obj" className="hidden" onChange={handleModelSelect} />
                    {modelFile ? (
                      <div className="flex flex-col items-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                        <span className="text-sm text-emerald-500 font-medium">{modelFile.name}</span>
                        <span className="text-xs text-emerald-500/70 mt-1">{(modelFile.size / 1024 / 1024).toFixed(1)}MB • Ready for upload</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Box className="w-8 h-8 text-neutral-500 mb-2" />
                        <span className="text-sm text-neutral-300">Click to upload 3D model</span>
                        <span className="text-xs text-neutral-600 mt-1">.glb, .fbx or .obj format required</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="pt-6 border-t border-neutral-800/50 mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-400">Additional Gallery Images (Max 3)</label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="h-8 text-[10px] bg-transparent border-neutral-800 text-neutral-400 hover:text-white"
                    onClick={() => document.getElementById('gallery-upload')?.click()}
                    disabled={galleryImages.length >= 3}
                  >
                    + Add Image
                  </Button>
                  <input 
                    id="gallery-upload"
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    onChange={handleGallerySelect} 
                  />
                </div>
                
                {galleryImages.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {galleryImages.map((img, idx) => (
                      <div key={idx} className="bg-neutral-950 border border-neutral-800 rounded-lg overflow-hidden group">
                        <div className="relative aspect-video bg-neutral-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={URL.createObjectURL(img.file)} 
                            alt={`Gallery ${idx + 1}`} 
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors"
                            onClick={() => {
                              setGalleryImages(prev => prev.filter((_, i) => i !== idx))
                            }}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="p-3">
                          <Input
                            placeholder="Add a short note..."
                            value={img.note}
                            onChange={(e) => {
                              setGalleryImages(prev => {
                                const newArr = [...prev]
                                newArr[idx].note = e.target.value
                                return newArr
                              })
                            }}
                            className="h-8 text-xs bg-neutral-900 border-neutral-800"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-800/50 mt-8">
              {agencyData.listingsUsed >= agencyData.maxListings && (
                <div className="bg-red-500/10 border border-red-500/30 p-4 text-red-200 text-xs flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>
                    Your agency listing quota ({agencyData.listingsUsed} / {agencyData.maxListings}) has been reached. Please contact your agency administrator or upgrade to publish more.
                  </span>
                </div>
              )}
              {isUploading ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-500 font-medium animate-pulse">{uploadStep}</span>
                    <span className="text-neutral-400">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <Button
                  type="submit"
                  disabled={agencyData.listingsUsed >= agencyData.maxListings}
                  className="w-full h-12 bg-white text-black hover:bg-neutral-200 rounded-none text-xs font-bold uppercase tracking-widest"
                >
                  <UploadIcon className="w-4 h-4 mr-2" />
                  {agencyData.listingsUsed >= agencyData.maxListings ? 'Limit Reached' : 'Submit for Review'}
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-neutral-900/30 border border-neutral-800/50 p-6 sticky top-6">
            <h3 className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-4">Agency Capacity</h3>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-neutral-400">Listings Quota</span>
                  <span className="text-white font-medium">{agencyData.listingsUsed} / {agencyData.maxListings}</span>
                </div>
                <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all"
                    style={{ width: `${Math.min(100, (agencyData.listingsUsed / agencyData.maxListings) * 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-neutral-400">Storage Used</span>
                  <span className="text-white font-medium">
                    {(agencyData.storageUsedBytes / 1024 / 1024 / 1024).toFixed(2)}GB / {(agencyData.maxStorageBytes / 1024 / 1024 / 1024).toFixed(2)}GB
                  </span>
                </div>
                <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all"
                    style={{ width: `${Math.min(100, (agencyData.storageUsedBytes / agencyData.maxStorageBytes) * 100)}%` }}
                  />
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function UploadListingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    }>
      <UploadListingContent />
    </Suspense>
  )
}

'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import {
  getConsumerProducts,
  addConsumerProduct,
  deleteConsumerProduct,
  toggleConsumerProductPublicStatus,
  ConsumerProduct,
  TierLimits
} from '@/app/actions/consumer-product-actions'
import { generatePresignedUrl } from '@/app/actions/r2-actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Loader2,
  Box,
  Trash2,
  Globe,
  Lock,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  HardDrive
} from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

function ConsumerProductsContent() {
  const { consumer, loading: authLoading } = useConsumerAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<ConsumerProduct[]>([])
  const [tier, setTier] = useState<string>('FREE')
  const [limits, setLimits] = useState<TierLimits | null>(null)
  const [totalStorageUsed, setTotalStorageUsed] = useState<number>(0)

  // Upload modal & form states
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [name, setName] = useState('')
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStep, setUploadStep] = useState('')

  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const modelInputRef = useRef<HTMLInputElement>(null)

  // Payment Upgrade states
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null)

  const loadData = async () => {
    if (!consumer) return
    try {
      const res = await getConsumerProducts(consumer.id)
      if (res.success && res.products && res.limits) {
        setProducts(res.products)
        setTier(res.tier || 'FREE')
        setLimits(res.limits)
        setTotalStorageUsed(res.totalStorageUsed || 0)
      } else {
        toast.error(res.error || 'Failed to retrieve products.')
      }
    } catch (err) {
      toast.error('An error occurred loading your products workspace.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading) return

    if (!consumer) {
      router.push('/auth/login')
      return
    }

    // Process notification query params (e.g. from mock sandbox checkout redirects)
    if (searchParams.get('payment_success') === 'true') {
      toast.success('Your subscription tier has been upgraded successfully!')
      router.replace('/consumer/products')
    } else if (searchParams.get('payment_failed') === 'true') {
      toast.error('Your subscription tier upgrade was cancelled or failed.')
      router.replace('/consumer/products')
    } else {
      const targetUpgrade = searchParams.get('upgrade')
      if (targetUpgrade === 'PREMIUM' || targetUpgrade === 'PRO') {
        // Clear upgrade parameter to prevent loops
        const params = new URLSearchParams(window.location.search)
        params.delete('upgrade')
        router.replace(`${window.location.pathname}?${params.toString()}`)
        handleUpgradeTier(targetUpgrade as 'PREMIUM' | 'PRO')
      }
    }

    loadData()
  }, [consumer, authLoading, searchParams])

  // Prefill hook from Proximap Loopback Bridge
  useEffect(() => {
    const prefill = searchParams.get('prefill') === 'true'
    const localUrl = searchParams.get('local_url')
    const prefillName = searchParams.get('name')

    if (prefill && localUrl && limits) {
      const fetchUrl = localUrl
      const activeLimits = limits
      let isSubposed = true
      
      async function prefillModel() {
        const toastId = toast.loading('Retrieving model from Proximap...')
        try {
          const response = await fetch(fetchUrl)
          if (!response.ok) throw new Error('Could not contact local loopback server')
          
          const blob = await response.blob()
          const filename = prefillName || fetchUrl.substring(fetchUrl.lastIndexOf('/') + 1) || 'model.glb'
          const file = new File([blob], filename, { type: 'model/gltf-binary' })
          
          if (file.size > activeLimits.maxUploadSizeBytes) {
            const limitMb = activeLimits.maxUploadSizeBytes / (1024 * 1024)
            throw new Error(`Prefilled model size exceeds your tier limit of ${limitMb}MB.`)
          }
          
          if (isSubposed) {
            setModelFile(file)
            if (prefillName) setName(prefillName)
            setIsUploadOpen(true)
            toast.success('Successfully attached model from Proximap!', { id: toastId })
          }
        } catch (err: any) {
          if (isSubposed) {
            toast.error(err.message || 'Failed to auto-attach model.', { id: toastId })
          }
        }
      }
      
      prefillModel()
      return () => {
        isSubposed = false
      }
    }
  }, [searchParams, limits])

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file for the thumbnail.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Thumbnail image must be less than 5MB.')
      return
    }
    setThumbnailFile(file)
  }

  const handleModelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const validExtensions = ['.glb', '.fbx', '.obj']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    if (!validExtensions.includes(ext)) {
      toast.error('Supported 3D model formats are .glb, .fbx, or .obj')
      return
    }

    // Validate size against current tier limit
    if (limits && file.size > limits.maxUploadSizeBytes) {
      const limitMb = limits.maxUploadSizeBytes / (1024 * 1024)
      toast.error(`File size exceeds your tier limit of ${limitMb}MB. Please upgrade to upload larger files.`)
      return
    }

    setModelFile(file)
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consumer || !limits) return

    if (!name || !thumbnailFile || !modelFile) {
      toast.error('Please fill in all fields and select files.')
      return
    }

    // Total Storage Limit Check
    if (totalStorageUsed + modelFile.size > limits.maxTotalSizeBytes) {
      const maxMb = limits.maxTotalSizeBytes / (1024 * 1024)
      toast.error(`Insufficient workspace storage. Your tier limit is ${maxMb}MB. Please delete existing items or upgrade.`)
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`

      // 1. Upload Thumbnail Image
      setUploadStep('Uploading thumbnail...')
      const thumbnailName = `consumers/${consumer.id}/thumbnails/${uniqueId}-${thumbnailFile.name}`
      const thumbRes = await generatePresignedUrl(thumbnailName, thumbnailFile.type)

      if (!thumbRes.success || !thumbRes.signedUrl) {
        throw new Error(thumbRes.error || 'Failed to generate thumbnail secure link')
      }

      await fetch(thumbRes.signedUrl, {
        method: 'PUT',
        body: thumbnailFile,
        headers: { 'Content-Type': thumbnailFile.type }
      })

      // 2. Upload Model File
      setUploadStep('Uploading 3D model...')
      const modelName = `consumers/${consumer.id}/models/${uniqueId}-${modelFile.name}`
      const modelRes = await generatePresignedUrl(modelName, modelFile.type || 'model/gltf-binary')

      if (!modelRes.success || !modelRes.signedUrl) {
        throw new Error(modelRes.error || 'Failed to generate model secure link')
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', modelRes.signedUrl!, true)
        xhr.setRequestHeader('Content-Type', modelFile.type || 'model/gltf-binary')

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress((e.loaded / e.total) * 100)
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Model upload failed: ${xhr.statusText}`))
        }

        xhr.onerror = () => reject(new Error('Network error uploading 3D model.'))
        xhr.send(modelFile)
      })

      // 3. Save to database
      setUploadStep('Registering product scan...')
      const dbRes = await addConsumerProduct(
        consumer.id,
        name,
        thumbRes.publicUrl,
        modelRes.publicUrl,
        modelFile.size
      )

      if (!dbRes.success) {
        throw new Error(dbRes.error || 'Failed to save product in library database.')
      }

      toast.success('Product uploaded successfully to your library!')
      setIsUploadOpen(false)
      setName('')
      setThumbnailFile(null)
      setModelFile(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during upload.')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!consumer) return
    if (!confirm('Are you sure you want to delete this product? The files will be permanently deleted from Cloudflare R2.')) return

    const toastId = toast.loading('Deleting product...')
    try {
      const res = await deleteConsumerProduct(consumer.id, productId)
      if (res.success) {
        toast.success('Product deleted successfully.', { id: toastId })
        loadData()
      } else {
        toast.error(res.error || 'Failed to delete product.', { id: toastId })
      }
    } catch (err) {
      toast.error('An error occurred during deletion.', { id: toastId })
    }
  }

  const handleTogglePublic = async (productId: string, isPublic: boolean) => {
    if (!consumer || !limits) return
    if (!limits.allowPublicToggle) {
      toast.error('Your current tier does not support public sharing. Please upgrade.')
      return
    }

    const toastId = toast.loading('Updating sharing state...')
    try {
      const res = await toggleConsumerProductPublicStatus(consumer.id, productId, isPublic)
      if (res.success) {
        toast.success(`Product is now ${isPublic ? 'Public' : 'Private'}.`, { id: toastId })
        loadData()
      } else {
        toast.error(res.error || 'Failed to toggle visibility.', { id: toastId })
      }
    } catch (err) {
      toast.error('An error occurred updating the sharing state.', { id: toastId })
    }
  }

  const handleUpgradeTier = async (targetTier: 'PREMIUM' | 'PRO') => {
    setUpgradingTo(targetTier)
    try {
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: 'c0000000-c000-c000-c000-c00000000000',
          listingType: targetTier,
          paymentType: 'CONSUMER_TIER_UPGRADE'
        })
      })

      const data = await res.json()
      if (data.success && data.authorization_url) {
        window.location.href = data.authorization_url
      } else {
        toast.error(data.error || 'Failed to initialize payment gateway.')
      }
    } catch (err) {
      toast.error('Network error initializing upgrade transaction.')
    } finally {
      setUpgradingTo(null)
    }
  }

  if (authLoading || loading || !limits) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mb-2" />
        <span className="text-xs uppercase tracking-widest text-neutral-500">Loading Workspace...</span>
      </div>
    )
  }

  const isLimitReached = products.length >= limits.maxProducts || totalStorageUsed >= limits.maxTotalSizeBytes
  const percentProducts = Math.min(100, (products.length / limits.maxProducts) * 100)
  const percentStorage = Math.min(100, (totalStorageUsed / limits.maxTotalSizeBytes) * 100)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-white relative z-10 overflow-hidden">
      {/* Visual background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-light tracking-tight uppercase flex items-center gap-3">
            My Spatial Products
            <span className="text-[10px] tracking-widest uppercase font-bold border border-white/10 px-2 py-0.5 bg-white/5">
              {limits.name} Workspace
            </span>
          </h1>
          <p className="text-xs text-neutral-400">Upload and inspect your personal items for external Unity spatial applications.</p>
        </div>

          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button 
                disabled={isLimitReached}
                className="h-12 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none px-6 transition-colors self-start sm:self-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Product {isLimitReached && '(Limit Reached)'}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-neutral-950 border border-white/10 text-white sm:max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-light uppercase tracking-wide">Upload 3D Scan</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUploadSubmit} className="space-y-6 pt-4">
                
                {isLimitReached && (
                  <div className="bg-red-500/10 border border-red-500/30 p-4 text-red-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>
                      Workspace capacity reached. Please delete old scans or upgrade your tier before uploading new files.
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="prod-name" className="text-xs uppercase tracking-wider text-neutral-400">Product Name</Label>
                  <Input
                    id="prod-name"
                    required
                    placeholder="e.g. Victorian Leather Armchair"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-neutral-900/50 border-white/10 focus-visible:ring-white h-11 text-sm rounded-none text-white placeholder:text-neutral-600"
                    disabled={uploading || isLimitReached}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-neutral-400">Thumbnail Image (Max 5MB)</Label>
                  <div 
                    onClick={() => !uploading && !isLimitReached && thumbnailInputRef.current?.click()}
                    className={`border border-dashed rounded-none p-6 text-center cursor-pointer transition-colors ${
                      thumbnailFile ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400' : 'border-white/10 hover:border-white/35 bg-neutral-900/30 text-neutral-400'
                    }`}
                  >
                    <input
                      type="file"
                      ref={thumbnailInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleThumbnailSelect}
                      disabled={uploading || isLimitReached}
                    />
                    {thumbnailFile ? (
                      <div className="space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                        <p className="text-xs font-semibold truncate">{thumbnailFile.name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-emerald-500/70">Image Selected</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="w-6 h-6 mx-auto mb-1 opacity-70" />
                        <p className="text-xs">Click to choose image file</p>
                        <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold">JPG, PNG, WEBP</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-neutral-400">
                    3D Model File (Max {limits.maxUploadSizeBytes / (1024 * 1024)}MB)
                  </Label>
                  <div 
                    onClick={() => !uploading && !isLimitReached && modelInputRef.current?.click()}
                    className={`border border-dashed rounded-none p-6 text-center cursor-pointer transition-colors ${
                      modelFile ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-400' : 'border-white/10 hover:border-white/35 bg-neutral-900/30 text-neutral-400'
                    }`}
                  >
                    <input
                      type="file"
                      ref={modelInputRef}
                      accept=".glb,.fbx,.obj"
                      className="hidden"
                      onChange={handleModelSelect}
                      disabled={uploading || isLimitReached}
                    />
                    {modelFile ? (
                      <div className="space-y-1">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                        <p className="text-xs font-semibold truncate">{modelFile.name}</p>
                        <p className="text-[10px] uppercase tracking-wider text-emerald-500/70">
                          {(modelFile.size / 1024 / 1024).toFixed(2)}MB Selected
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Box className="w-6 h-6 mx-auto mb-1 opacity-70" />
                        <p className="text-xs">Click to select 3D Scan</p>
                        <p className="text-[9px] text-neutral-600 uppercase tracking-widest font-bold">GLB, FBX, OBJ</p>
                      </div>
                    )}
                  </div>
                </div>

                {uploading ? (
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      <span>{uploadStep}</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="h-1 bg-neutral-900 overflow-hidden">
                      <div 
                        className="h-full bg-white transition-all duration-250"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <Button
                    type="submit"
                    disabled={uploading || isLimitReached}
                    className="w-full h-12 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none mt-2"
                  >
                    Start Upload Workflow
                  </Button>
                )}

              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Capacity / Storage Analytics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/5 p-6 space-y-4 md:col-span-2 relative overflow-hidden">
            <h3 className="text-xs uppercase tracking-widest text-neutral-400 font-semibold flex items-center gap-2">
              <HardDrive className="w-4 h-4" /> Workspace Allocation Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500 font-medium">PRODUCTS CAP LIMIT</span>
                  <span className="text-white font-bold">{products.length} / {limits.maxProducts} Items</span>
                </div>
                <div className="h-1.5 bg-neutral-900">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${percentProducts}%` }}
                  />
                </div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
                  Remaining: {Math.max(0, limits.maxProducts - products.length)} products left
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500 font-medium">TOTAL STORAGE USED</span>
                  <span className="text-white font-bold">
                    {(totalStorageUsed / (1024 * 1024)).toFixed(1)}MB / {(limits.maxTotalSizeBytes / (1024 * 1024)).toFixed(0)}MB
                  </span>
                </div>
                <div className="h-1.5 bg-neutral-900">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-500"
                    style={{ width: `${percentStorage}%` }}
                  />
                </div>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wide">
                  {( (limits.maxTotalSizeBytes - totalStorageUsed) / (1024 * 1024) ).toFixed(1)}MB available storage
                </p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-950/80 backdrop-blur-xl border border-white/5 p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-[9px] uppercase tracking-[0.25em] font-bold text-neutral-500">Current Level</span>
              <h4 className="text-2xl font-light uppercase tracking-wider text-white">{limits.name} Tier</h4>
            </div>
            
            <div className="border-t border-white/5 pt-4 mt-4 flex items-center justify-between text-xs text-neutral-400">
              <span>Allow Public Sharing:</span>
              <span className="font-bold flex items-center gap-1">
                {limits.allowPublicToggle ? (
                  <>
                    <Globe className="w-3.5 h-3.5 text-emerald-400" /> Yes (App only)
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-neutral-600" /> No
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="space-y-6">
          <h2 className="text-xs uppercase tracking-widest text-neutral-400 font-bold border-b border-white/5 pb-2">Your 3D Scan Registry</h2>
          
          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <div key={p.id} className="bg-neutral-950/80 border border-white/5 group relative overflow-hidden">
                  <div className="aspect-video w-full bg-neutral-900 relative overflow-hidden border-b border-white/5">
                    {p.thumbnail_url ? (
                      <img 
                        src={p.thumbnail_url} 
                        alt={p.name} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Box className="w-10 h-10 text-neutral-700" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/5 px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold text-neutral-400">
                      {(p.file_size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold tracking-wide truncate text-white">{p.name}</h3>
                      <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-semibold pt-0.5">Uploaded {new Date(p.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4">
                      {/* Public Toggle (Unity App) */}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={p.is_public}
                          onCheckedChange={(checked) => handleTogglePublic(p.id, checked)}
                          disabled={!limits.allowPublicToggle}
                          className="data-[state=checked]:bg-emerald-500"
                        />
                        <span className="text-xs text-neutral-400 flex items-center gap-1">
                          {p.is_public ? 'Public' : 'Private'}
                          {!limits.allowPublicToggle && <Lock className="w-3 h-3 text-neutral-600" />}
                        </span>
                      </div>

                      {/* Delete */}
                      <Button
                        onClick={() => handleDeleteProduct(p.id)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-none"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center border border-dashed border-white/5 bg-neutral-950/20">
              <Box className="w-12 h-12 text-neutral-700 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">No Products Uploaded</h3>
              <p className="text-xs text-neutral-600 mt-1 max-w-sm mx-auto">Start uploading your 3D assets to view them in our spatial virtualization tools.</p>
            </div>
          )}
        </div>

        {/* Tier Upgrade Banner */}
        {tier !== 'PRO' && (
          <div className="bg-neutral-950 border border-white/10 p-8 sm:p-10 relative overflow-hidden mt-6">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-[100px] pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-400 font-bold">
                  <Sparkles className="w-4 h-4" /> Upgrade Your Studio Capacity
                </div>
                <h2 className="text-2xl font-light uppercase tracking-wider text-white">Unlock Extended Workspace Access</h2>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Need more products, higher size caps, or public integration with the Unity app? Expand your account boundaries to Premium or Pro plans for secure high-fidelity spatial storage.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                {tier === 'FREE' && (
                  <div className="bg-white/5 border border-white/10 p-6 flex flex-col justify-between space-y-4 max-w-xs w-full sm:w-[220px]">
                    <div className="space-y-1">
                      <h4 className="text-xs uppercase tracking-widest font-bold text-neutral-400">PREMIUM TIER</h4>
                      <p className="text-2xl font-light">₦5,000</p>
                      <p className="text-[10px] text-neutral-500 uppercase font-semibold">25 Products • 50MB Cap • 500MB Workspace</p>
                    </div>
                    <Button 
                      onClick={() => handleUpgradeTier('PREMIUM')}
                      disabled={upgradingTo !== null}
                      className="w-full h-10 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-widest rounded-none"
                    >
                      {upgradingTo === 'PREMIUM' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get Premium'}
                    </Button>
                  </div>
                )}

                <div className="bg-white/5 border border-white/10 p-6 flex flex-col justify-between space-y-4 max-w-xs w-full sm:w-[220px]">
                  <div className="space-y-1">
                    <h4 className="text-xs uppercase tracking-widest font-bold text-neutral-400">PRO TIER</h4>
                    <p className="text-2xl font-light">₦15,000</p>
                    <p className="text-[10px] text-neutral-500 uppercase font-semibold">100 Products • 100MB Cap • 2GB Workspace</p>
                  </div>
                  <Button 
                    onClick={() => handleUpgradeTier('PRO')}
                    disabled={upgradingTo !== null}
                    className="w-full h-10 bg-white text-black hover:bg-neutral-200 text-xs font-bold uppercase tracking-widest rounded-none"
                  >
                    {upgradingTo === 'PRO' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get Pro'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

export default function ConsumerProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    }>
      <ConsumerProductsContent />
    </Suspense>
  )
}


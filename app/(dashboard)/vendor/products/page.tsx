'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Box, Trash2, UploadCloud, Link as LinkIcon, Edit2, AlertTriangle } from 'lucide-react'
import { createProduct, deleteProduct, updateProduct } from '@/app/actions/product-actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { getPresignedUploadUrl } from '@/app/actions/upload-actions'
import { getVendorSubscriptionUsage } from '@/app/actions/vendor-subscription-actions'

function VendorProductsContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [products, setProducts] = useState<any[]>([])
  const [usageData, setUsageData] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [hasStoreLink, setHasStoreLink] = useState(false)
  const [editHasStoreLink, setEditHasStoreLink] = useState(false)

  const thumbnailRef = useRef<HTMLInputElement>(null)
  const modelRef = useRef<HTMLInputElement>(null)
  const editThumbnailRef = useRef<HTMLInputElement>(null)
  const editModelRef = useRef<HTMLInputElement>(null)

  const fetchProducts = async () => {
    if (!user) return
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_id', user.id)
      .order('created_at', { ascending: false })
    
    setProducts(data || [])
    
    const usageRes = await getVendorSubscriptionUsage()
    if (usageRes.success) {
      setUsageData(usageRes.data)
    }
    
    setLoading(false)
  }

  useEffect(() => {
    fetchProducts()
  }, [user])

  // Prefill hook from Proximap Loopback Bridge
  useEffect(() => {
    const prefill = searchParams.get('prefill') === 'true'
    const localUrl = searchParams.get('local_url')
    const prefillName = searchParams.get('name')

    if (prefill && localUrl && usageData) {
      const fetchUrl = localUrl
      const activeUsage = usageData
      let isSubposed = true
      
      async function prefillModel() {
        toast({ title: 'Integration Bridge', description: 'Retrieving model from Proximap...' })
        try {
          const response = await fetch(fetchUrl)
          if (!response.ok) throw new Error('Could not contact local loopback server')
          
          const blob = await response.blob()
          const filename = prefillName || fetchUrl.substring(fetchUrl.lastIndexOf('/') + 1) || 'model.glb'
          const file = new File([blob], filename, { type: 'model/gltf-binary' })
          
          const maxStorageBytes = (activeUsage.tier?.max_storage_mb ?? 100) * 1024 * 1024
          const remainingStorage = maxStorageBytes - activeUsage.usage.storageBytes
          if (file.size > remainingStorage) {
            throw new Error(`Model size exceeds remaining vendor storage space.`)
          }
          
          if (isSubposed) {
            if (modelRef.current) {
              const dataTransfer = new DataTransfer()
              dataTransfer.items.add(file)
              modelRef.current.files = dataTransfer.files
              const event = new Event('change', { bubbles: true })
              modelRef.current.dispatchEvent(event)
            }
            
            const titleInput = document.getElementsByName('title')[0] as HTMLInputElement
            if (titleInput && prefillName) {
              titleInput.value = prefillName
            }
            
            setIsModalOpen(true)
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
  }, [searchParams, usageData])

  const handleUploadToR2 = async (file: File, folder: string) => {
    const { success, signedUrl, finalPublicUrl, error } = await getPresignedUploadUrl(folder, file.name, file.type)
    
    if (!success || !signedUrl) {
      throw new Error(error || 'Failed to get secure upload link')
    }

    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    })

    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.statusText}`)
    }

    return finalPublicUrl
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    const formData = new FormData(e.currentTarget)
    const title = formData.get('title')
    const category = formData.get('category')
    const price = formData.get('price')

    if (!title || !category || !price) {
      toast({ title: 'Validation Error', description: 'Please fill in all required text fields.', variant: 'destructive' })
      return
    }

    const thumbFile = thumbnailRef.current?.files?.[0]
    const modelFile = modelRef.current?.files?.[0]

    if (!thumbFile) {
      toast({ title: 'Validation Error', description: 'Please select a thumbnail image.', variant: 'destructive' })
      return
    }

    if (!modelFile) {
      toast({ title: 'Validation Error', description: 'Please select a 3D model file.', variant: 'destructive' })
      return
    }

    if (hasStoreLink && !formData.get('storeLink')) {
      toast({ title: 'Validation Error', description: 'Please provide a store link.', variant: 'destructive' })
      return
    }

    setUploading(true)

    try {
      let thumbUrl = null
      let modelUrl = null
      let modelSize = 0

      if (thumbFile) {
        thumbUrl = await handleUploadToR2(thumbFile, 'thumbnails')
      }
      
      if (modelFile) {
        let finalModelFile = modelFile
        const isGLB = modelFile.name.match(/\.(glb|gltf)$/i)
        
        if (!isGLB) {
          setOptimizing(true)
          const { convertModelToGLB } = await import('@/lib/model-converter')
          finalModelFile = await convertModelToGLB(modelFile)
          setOptimizing(false)
        }
        
        modelUrl = await handleUploadToR2(finalModelFile, 'models')
        modelSize = finalModelFile.size
      }

      formData.append('hasStoreLink', hasStoreLink.toString())

      const result = await createProduct(formData, thumbUrl, modelUrl, modelSize)

      if (result.success) {
        toast({ title: 'Product Added', description: 'Your product is now listed.' })
        setIsModalOpen(false)
        fetchProducts()
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } catch (error: any) {
      console.error('Submit error:', error)
      toast({ title: 'Upload Failed', description: error.message || 'An unexpected error occurred during upload.', variant: 'destructive' })
      setOptimizing(false)
    } finally {
      setUploading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingProduct) return

    const formData = new FormData(e.currentTarget)
    const title = formData.get('title')
    const category = formData.get('category')
    const price = formData.get('price')

    if (!title || !category || !price) {
      toast({ title: 'Validation Error', description: 'Please fill in all required text fields.', variant: 'destructive' })
      return
    }

    if (editHasStoreLink && !formData.get('storeLink')) {
      toast({ title: 'Validation Error', description: 'Please provide a store link.', variant: 'destructive' })
      return
    }

    setUploading(true)

    try {
      const thumbFile = editThumbnailRef.current?.files?.[0]
      const modelFile = editModelRef.current?.files?.[0]

      let thumbUrl = undefined
      let modelUrl = undefined
      let modelSize = undefined

      if (thumbFile) {
        thumbUrl = await handleUploadToR2(thumbFile, 'thumbnails')
      }
      
      if (modelFile) {
        let finalModelFile = modelFile
        const isGLB = modelFile.name.match(/\.(glb|gltf)$/i)
        
        if (!isGLB) {
          setOptimizing(true)
          const { convertModelToGLB } = await import('@/lib/model-converter')
          finalModelFile = await convertModelToGLB(modelFile)
          setOptimizing(false)
        }
        
        modelUrl = await handleUploadToR2(finalModelFile, 'models')
        modelSize = finalModelFile.size
      }

      formData.append('hasStoreLink', editHasStoreLink.toString())
      const isPublic = formData.get('isPublic') === 'on'
      formData.set('isPublic', isPublic.toString())

      const result = await updateProduct(editingProduct.id, formData, thumbUrl, modelUrl, modelSize)

      if (result.success) {
        toast({ title: 'Product Updated', description: 'Your product has been successfully updated.' })
        setIsEditModalOpen(false)
        fetchProducts()
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } catch (error: any) {
      console.error('Update error:', error)
      toast({ title: 'Update Failed', description: error.message || 'An unexpected error occurred during update.', variant: 'destructive' })
      setOptimizing(false)
    } finally {
      setUploading(false)
    }
  }

  const openEditModal = (product: any) => {
    setEditingProduct(product)
    setEditHasStoreLink(product.has_store_link)
    setIsEditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    const result = await deleteProduct(id)
    if (result.success) {
      toast({ title: 'Product Deleted' })
      fetchProducts()
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
    )
  }

  const isLimitReached = usageData 
    ? usageData.usage.products >= (usageData.tier?.max_products ?? 0)
    : false

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-light text-white">
            Product Inventory
          </h1>
          <p className="text-sm text-neutral-400 mt-2">Manage your furniture and fixture listings.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button 
              disabled={isLimitReached}
              className="bg-white text-black hover:bg-neutral-200 rounded-none uppercase tracking-widest text-xs font-bold h-12 px-6"
            >
              <Plus className="w-4 h-4 mr-2" /> Add Product {isLimitReached && '(Limit Reached)'}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black border border-neutral-800 text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-light tracking-tight">Upload New Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} noValidate className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Product Title</label>
                <Input name="title" required className="bg-neutral-950 border-neutral-800 h-12 rounded-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Category</label>
                  <select name="category" required className="w-full bg-neutral-950 border border-neutral-800 text-white h-12 px-3 rounded-none focus:outline-none focus:ring-1 focus:ring-neutral-700">
                    <option value="Furniture">Furniture</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Bathroom Fixtures">Bathroom Fixtures</option>
                    <option value="Kitchen Fixtures">Kitchen Fixtures</option>
                    <option value="Electrical Appliance">Electrical Appliance</option>
                    <option value="Doors">Doors</option>
                    <option value="Windows">Windows</option>
                    <option value="Flooring">Flooring</option>
                    <option value="Decor">Decor</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Price (NGN)</label>
                  <Input name="price" type="number" required min="0" step="0.01" className="bg-neutral-950 border-neutral-800 h-12 rounded-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Thumbnail Image</label>
                <Input type="file" accept="image/*" ref={thumbnailRef} required className="bg-neutral-950 border-neutral-800 rounded-none file:text-neutral-400 file:bg-neutral-900 file:border-0 file:mr-4 file:px-4 file:py-2" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">3D Model (FBX, GLB, OBJ, USDZ)</label>
                <Input type="file" accept=".fbx,.glb,.gltf,.obj,.usdz" ref={modelRef} required className="bg-neutral-950 border-neutral-800 rounded-none file:text-neutral-400 file:bg-neutral-900 file:border-0 file:mr-4 file:px-4 file:py-2" />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input 
                  type="checkbox" 
                  id="hasStoreLink" 
                  checked={hasStoreLink}
                  onChange={(e) => setHasStoreLink(e.target.checked)}
                  className="w-4 h-4 bg-neutral-950 border-neutral-800 accent-white"
                />
                <label htmlFor="hasStoreLink" className="text-sm text-neutral-400 cursor-pointer">Product has external store link</label>
              </div>

              {hasStoreLink && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">External Store URL</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3.5 w-5 h-5 text-neutral-600" />
                    <Input name="storeLink" type="url" required={hasStoreLink} placeholder="https://..." className="pl-10 bg-neutral-950 border-neutral-800 h-12 rounded-none" />
                  </div>
                </div>
              )}

               {isLimitReached && (
                <div className="bg-red-500/10 border border-red-500/30 p-4 text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>
                    Your product upload limit ({usageData?.tier?.max_products} products) has been reached. Please upgrade your subscription tier to upload more products.
                  </span>
                </div>
              )}

              <Button type="submit" disabled={uploading || optimizing || isLimitReached} className="w-full bg-white text-black hover:bg-neutral-200 h-12 rounded-none uppercase tracking-widest text-xs font-bold">
                {uploading ? (optimizing ? 'Optimizing Format...' : 'Uploading...') : 'Submit Product'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="bg-black border border-neutral-800 text-white sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-light tracking-tight">Edit Product</DialogTitle>
            </DialogHeader>
            {editingProduct && (
            <form onSubmit={handleEditSubmit} noValidate className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Product Title</label>
                <Input name="title" defaultValue={editingProduct.name} required className="bg-neutral-950 border-neutral-800 h-12 rounded-none" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Category</label>
                  <select name="category" defaultValue={editingProduct.category} required className="w-full bg-neutral-950 border border-neutral-800 text-white h-12 px-3 rounded-none focus:outline-none focus:ring-1 focus:ring-neutral-700">
                    <option value="Furniture">Furniture</option>
                    <option value="Lighting">Lighting</option>
                    <option value="Bathroom Fixtures">Bathroom Fixtures</option>
                    <option value="Kitchen Fixtures">Kitchen Fixtures</option>
                    <option value="Electrical Appliance">Electrical Appliance</option>
                    <option value="Doors">Doors</option>
                    <option value="Windows">Windows</option>
                    <option value="Flooring">Flooring</option>
                    <option value="Decor">Decor</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Price (NGN)</label>
                  <Input name="price" type="number" defaultValue={editingProduct.price} required min="0" step="0.01" className="bg-neutral-950 border-neutral-800 h-12 rounded-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Update Thumbnail Image (Optional)</label>
                <Input type="file" accept="image/*" ref={editThumbnailRef} className="bg-neutral-950 border-neutral-800 rounded-none file:text-neutral-400 file:bg-neutral-900 file:border-0 file:mr-4 file:px-4 file:py-2" />
                <p className="text-[10px] text-neutral-500">Leave blank to keep existing image.</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Update 3D Model (Optional)</label>
                <Input type="file" accept=".fbx,.glb,.gltf,.obj,.usdz" ref={editModelRef} className="bg-neutral-950 border-neutral-800 rounded-none file:text-neutral-400 file:bg-neutral-900 file:border-0 file:mr-4 file:px-4 file:py-2" />
                <p className="text-[10px] text-neutral-500">Leave blank to keep existing 3D model.</p>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-neutral-800 mt-4">
                <input 
                  type="checkbox" 
                  id="editHasStoreLink" 
                  checked={editHasStoreLink}
                  onChange={(e) => setEditHasStoreLink(e.target.checked)}
                  className="w-4 h-4 bg-neutral-950 border-neutral-800 accent-white"
                />
                <label htmlFor="editHasStoreLink" className="text-sm text-neutral-400 cursor-pointer">Product has external store link</label>
              </div>

              {editHasStoreLink && (
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">External Store URL</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3.5 w-5 h-5 text-neutral-600" />
                    <Input name="storeLink" type="url" defaultValue={editingProduct.store_link || ''} required={editHasStoreLink} placeholder="https://..." className="pl-10 bg-neutral-950 border-neutral-800 h-12 rounded-none" />
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t border-neutral-800 mt-4">
                <label className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Product Status</label>
                <select name="status" defaultValue={editingProduct.is_sold_out ? 'hidden' : (editingProduct.availability ? 'available' : 'hidden')} className="w-full bg-neutral-950 border border-neutral-800 text-white h-12 px-3 rounded-none focus:outline-none focus:ring-1 focus:ring-neutral-700">
                  <option value="available">Available</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              <Button type="submit" disabled={uploading || optimizing} className="w-full bg-white text-black hover:bg-neutral-200 h-12 rounded-none uppercase tracking-widest text-xs font-bold mt-6">
                {uploading ? (optimizing ? 'Optimizing Format...' : 'Updating...') : 'Save Changes'}
              </Button>
            </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <div key={product.id} className="bg-neutral-900/30 border border-neutral-800 group relative">
            <div className="aspect-square bg-neutral-950 overflow-hidden relative">
              {product.thumbnail_path ? (
                <img src={product.thumbnail_path} alt={product.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Box className="w-12 h-12 text-neutral-800" />
                </div>
              )}
              {product.has_store_link && (
                <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 text-[10px] uppercase tracking-widest font-bold border border-neutral-800">
                  External Link
                </div>
              )}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {!product.availability && (
                  <div className="bg-neutral-800/90 text-white px-2 py-1 text-[9px] uppercase tracking-widest font-bold border border-neutral-700 backdrop-blur-sm">
                    Hidden
                  </div>
                )}
                {product.is_sold_out && (
                  <div className="bg-red-900/90 text-red-200 px-2 py-1 text-[9px] uppercase tracking-widest font-bold border border-red-800 backdrop-blur-sm">
                    Sold Out
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 space-y-1">
              <h3 className="font-medium text-white truncate">{product.name}</h3>
              <p className="text-xs text-neutral-500 uppercase tracking-widest">{product.category}</p>
              <p className="text-emerald-400 font-bold pt-2">₦{Number(product.price).toLocaleString()}</p>
            </div>
            {/* Mobile Actions (Visible only on small screens) */}
            <div className={`grid ${product.model_url ? 'grid-cols-4' : 'grid-cols-3'} gap-2 p-4 pt-2 lg:hidden`}>
               <a href={`/product/${product.id}`} target="_blank" className="bg-neutral-800 text-white py-2 text-[10px] uppercase tracking-widest font-bold text-center hover:bg-neutral-700">
                 View
               </a>
               <button onClick={() => openEditModal(product)} className="bg-neutral-800 text-white py-2 text-[10px] uppercase tracking-widest font-bold text-center hover:bg-neutral-700">
                 Edit
               </button>
               {product.model_url && (
                 <a href={`/vendor/products/editor?id=${product.id}`} className="bg-emerald-500 text-black py-2 text-[10px] uppercase tracking-widest font-bold text-center hover:bg-emerald-450">
                   Spatial
                 </a>
               )}
               <button onClick={() => handleDelete(product.id)} className="bg-red-500/10 text-red-400 border border-red-500/30 py-2 text-[10px] uppercase tracking-widest font-bold text-center hover:bg-red-500/20">
                 Delete
               </button>
            </div>

            {/* Desktop Actions Overlay */}
            <div className="hidden lg:flex absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex-col items-center justify-center gap-2">
               <a href={`/product/${product.id}`} target="_blank" className="bg-white text-black px-4 py-2 text-xs uppercase tracking-widest font-bold w-32 text-center hover:bg-neutral-200 transition-colors">
                 View
               </a>
               <button onClick={() => openEditModal(product)} className="bg-neutral-800 text-white px-4 py-2 text-xs uppercase tracking-widest font-bold hover:bg-neutral-700 w-32 text-center transition-colors">
                 Edit
               </button>
               {product.model_url && (
                 <a href={`/vendor/products/editor?id=${product.id}`} className="bg-emerald-500 text-black px-4 py-2 text-xs uppercase tracking-widest font-bold hover:bg-emerald-400 w-32 text-center transition-colors">
                   Spatial Editor
                 </a>
               )}
               <button onClick={() => handleDelete(product.id)} className="bg-red-500/20 text-red-400 border border-red-500/50 px-4 py-2 text-xs uppercase tracking-widest font-bold hover:bg-red-500/40 w-32 text-center transition-colors">
                 Delete
               </button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="col-span-full py-20 text-center border border-dashed border-neutral-800 text-neutral-500">
            <Box className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No products listed yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VendorProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    }>
      <VendorProductsContent />
    </Suspense>
  )
}

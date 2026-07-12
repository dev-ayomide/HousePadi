'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { 
  getVendorDetails, 
  getVendorProductsAdmin, 
  toggleVendorSuspension, 
  deleteVendorAccount,
  toggleProductSuspension,
  deleteProductAdmin
} from '@/app/actions/admin-vendor-actions'
import { ArrowLeft, Store, Box, AlertTriangle, ShieldAlert, Trash2, Eye, Info, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

export default function VendorDetailModerationPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const vendorId = params.id as string

  const [vendor, setVendor] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const [vendorRes, productsRes] = await Promise.all([
      getVendorDetails(vendorId),
      getVendorProductsAdmin(vendorId)
    ])

    if (vendorRes.success && vendorRes.data) {
      setVendor(vendorRes.data)
    } else {
      toast({ title: 'Error', description: 'Failed to load vendor details', variant: 'destructive' })
    }

    if (productsRes.success && productsRes.data) {
      setProducts(productsRes.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [vendorId])

  const handleToggleSuspension = async (suspend: boolean) => {
    if (!confirm(`Are you sure you want to ${suspend ? 'suspend' : 'reinstate'} this vendor?`)) return
    setIsProcessing(true)
    const res = await toggleVendorSuspension(vendorId, suspend)
    if (res.success) {
      setVendor({ ...vendor, is_suspended: suspend })
      toast({ title: 'Success', description: `Vendor has been ${suspend ? 'suspended' : 'reinstated'}.` })
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    }
    setIsProcessing(false)
  }

  const handleDeleteVendor = async () => {
    if (!confirm('CRITICAL WARNING: This will permanently delete the vendor account and all associated products. Are you absolutely sure?')) return
    setIsProcessing(true)
    const res = await deleteVendorAccount(vendorId)
    if (res.success) {
      toast({ title: 'Deleted', description: 'Vendor account has been permanently removed.' })
      router.push('/admin/moderation/vendors')
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
      setIsProcessing(false)
    }
  }

  const handleToggleProductSuspension = async (productId: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${!currentStatus ? 'suspend' : 'reinstate'} this listing?`)) return
    
    const res = await toggleProductSuspension(productId, !currentStatus)
    if (res.success) {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_suspended: !currentStatus } : p))
      toast({ title: 'Success', description: 'Listing status updated.' })
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Delete this listing permanently?')) return
    
    const res = await deleteProductAdmin(productId)
    if (res.success) {
      setProducts(prev => prev.filter(p => p.id !== productId))
      toast({ title: 'Deleted', description: 'Listing removed.' })
    } else {
      toast({ title: 'Error', description: res.error, variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="p-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
      </div>
    )
  }

  if (!vendor) return null

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8">
      {/* Header section */}
      <div>
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-neutral-500 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vendor List
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-light text-white flex items-center gap-3">
              {vendor.business_name || vendor.full_name}
              {vendor.is_suspended && (
                <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] uppercase tracking-widest font-bold border border-red-500/20 rounded-sm ml-2">
                  Suspended
                </span>
              )}
            </h1>
            <p className="text-sm text-neutral-400">
              {vendor.email} &bull; {vendor.phone_number}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {vendor.is_suspended ? (
              <Button 
                onClick={() => handleToggleSuspension(false)}
                disabled={isProcessing}
                className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-none h-10 px-6 text-[10px] uppercase tracking-widest font-bold"
              >
                Reinstate Vendor
              </Button>
            ) : (
              <Button 
                onClick={() => handleToggleSuspension(true)}
                disabled={isProcessing}
                variant="outline"
                className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400 rounded-none h-10 px-6 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Suspend Vendor
              </Button>
            )}

            <Button 
              onClick={handleDeleteVendor}
              disabled={isProcessing}
              variant="outline"
              className="border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400 rounded-none h-10 px-6 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      <div className="border border-neutral-900 bg-neutral-950/30 p-6">
        <h2 className="text-xs uppercase tracking-widest text-neutral-500 font-bold mb-6 flex items-center gap-2">
          <Box className="w-4 h-4" />
          Product Listings ({products.length})
        </h2>

        {products.length === 0 ? (
          <div className="py-12 text-center text-neutral-500">
            This vendor has no product listings.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(product => (
              <div 
                key={product.id}
                className={`flex flex-col border bg-black transition-all ${product.is_suspended ? 'border-red-900/50 opacity-80' : 'border-neutral-900'}`}
              >
                <div className="aspect-video relative bg-neutral-900 overflow-hidden">
                  {product.thumbnail_url ? (
                    <img src={product.thumbnail_url} alt={product.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-700">
                      <Box className="w-8 h-8" />
                    </div>
                  )}
                  {product.is_suspended && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-[9px] uppercase tracking-widest font-bold">
                      Suspended
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="text-white font-medium truncate mb-1" title={product.title}>{product.title}</h3>
                  <p className="text-xs text-neutral-500 capitalize">{product.category}</p>
                  
                  <div className="mt-auto pt-6 flex items-center justify-between">
                    <Link 
                      href={`/property/${product.uid}`} 
                      target="_blank"
                      className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 hover:text-white flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleProductSuspension(product.id, product.is_suspended)}
                        className={`h-8 w-8 rounded-none ${product.is_suspended ? 'text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10' : 'text-amber-500 hover:text-amber-400 hover:bg-amber-500/10'}`}
                        title={product.is_suspended ? 'Reinstate Listing' : 'Suspend Listing'}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="h-8 w-8 rounded-none text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        title="Delete Listing"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

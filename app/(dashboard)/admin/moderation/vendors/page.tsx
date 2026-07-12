'use client'

import { useEffect, useState } from 'react'
import { getVendorsList } from '@/app/actions/admin-vendor-actions'
import { Store, ChevronRight, Loader2, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

export default function VendorModerationPage() {
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const router = useRouter()

  useEffect(() => {
    async function fetchVendors() {
      const res = await getVendorsList()
      if (res.success && res.data) {
        setVendors(res.data)
      }
      setLoading(false)
    }
    fetchVendors()
  }, [])

  const filteredVendors = vendors.filter(v => 
    v.business_name?.toLowerCase().includes(search.toLowerCase()) || 
    v.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto p-6 lg:p-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-light text-white flex items-center gap-3">
            <Store className="w-6 h-6 text-neutral-500" />
            Vendor Moderation
          </h1>
          <p className="text-xs uppercase tracking-widest text-neutral-500 mt-2">
            Manage Product Vendors and Listings
          </p>
        </div>
      </div>

      <div className="mb-6 relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
        <Input 
          placeholder="Search vendors by name or email..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-black border-neutral-800 text-white pl-12 h-12 rounded-none focus-visible:ring-1 focus-visible:ring-neutral-700"
        />
      </div>

      <div className="bg-black border border-neutral-900 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-neutral-900 bg-neutral-950/50 text-[10px] uppercase tracking-widest font-bold text-neutral-500">
          <div className="col-span-4">Business / Vendor</div>
          <div className="col-span-3">Contact</div>
          <div className="col-span-2 text-center">Listings</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="p-12 text-center text-neutral-500 text-sm">
            No vendors found.
          </div>
        ) : (
          <div className="divide-y divide-neutral-900">
            {filteredVendors.map(vendor => (
              <div 
                key={vendor.id} 
                onClick={() => router.push(`/admin/moderation/vendors/${vendor.id}`)}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-neutral-900/30 transition-colors cursor-pointer"
              >
                <div className="col-span-4 min-w-0">
                  <p className="text-sm text-white font-medium truncate">
                    {vendor.business_name || vendor.full_name}
                  </p>
                  <p className="text-xs text-neutral-500 truncate">Joined: {new Date(vendor.created_at).toLocaleDateString()}</p>
                </div>
                
                <div className="col-span-3 min-w-0">
                  <p className="text-xs text-neutral-300 truncate">{vendor.email}</p>
                  <p className="text-xs text-neutral-500 truncate">{vendor.phone_number}</p>
                </div>

                <div className="col-span-2 text-center">
                  <span className="inline-flex items-center justify-center bg-neutral-900 text-neutral-300 px-3 py-1 rounded-full text-xs font-medium border border-neutral-800">
                    {vendor.product_count}
                  </span>
                </div>

                <div className="col-span-2 text-center">
                  {vendor.is_suspended ? (
                    <span className="inline-flex px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] uppercase tracking-widest font-bold rounded-sm">
                      Suspended
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase tracking-widest font-bold rounded-sm">
                      Active
                    </span>
                  )}
                </div>

                <div className="col-span-1 flex justify-end">
                  <ChevronRight className="w-4 h-4 text-neutral-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

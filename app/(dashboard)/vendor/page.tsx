'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Package, Eye, Activity, Store, Plus, Settings, ArrowUpCircle } from 'lucide-react'
import Link from 'next/link'
import { getVendorStats } from '@/app/actions/product-actions'

export default function VendorDashboardOverview() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalProducts: 0, activeListings: 0, totalViews: 0 })
  const [recentProducts, setRecentProducts] = useState<any[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return

      try {
        // Fetch stats using our new server action
        const statsResult = await getVendorStats(user.id)
        if (statsResult.success && statsResult.data) {
          setStats(statsResult.data)
        }

        // Fetch recent products
        const supabase = createClient()
        const { data: recent } = await supabase
          .from('products')
          .select('id, name, category, price, thumbnail_path, availability, created_at')
          .eq('vendor_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)

        if (recent) setRecentProducts(recent)
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-neutral-900 border-neutral-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-[100px] bg-neutral-800" />
                <Skeleton className="h-4 w-4 bg-neutral-800" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] bg-neutral-800" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight">
            Vendor Dashboard
          </h1>
          <p className="text-sm text-neutral-400 mt-2">
            Overview of your store's performance and inventory.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
          <Link href="/vendor/subscription">
            <Button className="bg-amber-500 text-black hover:bg-amber-600 rounded-none uppercase text-xs tracking-widest font-bold shadow-lg shadow-amber-500/20 transition-all hover:-translate-y-0.5">
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Upgrade
            </Button>
          </Link>
          <Link href="/vendor/settings">
            <Button variant="outline" className="border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-900 rounded-none uppercase text-xs tracking-widest font-bold">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
          <Link href="/vendor/products">
            <Button className="bg-white text-black hover:bg-neutral-200 rounded-none uppercase text-xs tracking-widest font-bold">
              <Plus className="w-4 h-4 mr-2" />
              New Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-neutral-900/50 border-neutral-800 backdrop-blur-sm hover:border-neutral-700 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Total Products</CardTitle>
            <Package className="w-4 h-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-light text-white">{stats.totalProducts}</div>
            <p className="text-xs text-neutral-500 mt-1">Uploaded to your store</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/50 border-neutral-800 backdrop-blur-sm hover:border-neutral-700 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Active Listings</CardTitle>
            <Activity className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-light text-emerald-400">{stats.activeListings}</div>
            <p className="text-xs text-neutral-500 mt-1">Visible to consumers</p>
          </CardContent>
        </Card>

        <Card className="bg-neutral-900/50 border-neutral-800 backdrop-blur-sm hover:border-neutral-700 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Total Views</CardTitle>
            <Eye className="w-4 h-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-light text-white">{stats.totalViews}</div>
            <p className="text-xs text-neutral-500 mt-1">Across all your products</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Products */}
      <Card className="bg-neutral-900/50 border-neutral-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-light text-white">Recent Products</CardTitle>
              <CardDescription className="text-neutral-500">Your latest uploaded inventory</CardDescription>
            </div>
            <Link href="/vendor/products">
              <Button variant="ghost" className="text-xs uppercase tracking-widest text-neutral-400 hover:text-white">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentProducts.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-neutral-800 bg-neutral-950/50">
              <Package className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
              <p className="text-sm text-neutral-400">No products uploaded yet.</p>
              <Link href="/vendor/products">
                <Button variant="link" className="text-white mt-2">Get started by adding a product</Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {recentProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-4 py-4 hover:bg-neutral-800/50 px-4 -mx-4 transition-colors rounded-sm">
                  <div className="w-16 h-16 bg-black rounded overflow-hidden flex-shrink-0 border border-neutral-800">
                    {product.thumbnail_path ? (
                      <img src={product.thumbnail_path} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-neutral-700" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{product.name}</p>
                    <p className="text-xs text-neutral-500 mt-1 capitalize">{product.category}</p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-sm text-white font-mono">₦{product.price?.toFixed(2) || '0.00'}</p>
                    <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">
                      {new Date(product.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4">
                    {product.availability ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 rounded-sm font-normal">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-neutral-400 border-neutral-700 rounded-sm font-normal">Draft</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

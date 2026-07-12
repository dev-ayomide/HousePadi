'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConsumerAuth } from '@/components/explore/consumer-auth-provider'
import { 
  getConsumerFavorites, 
  toggleFavorite, 
  getConsumerCollections, 
  createCollection, 
  renameCollection, 
  deleteCollection, 
  getCollectionDetails,
  removeListingFromCollection,
  UnifiedListing 
} from '@/app/actions/registry-actions'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Heart, FolderHeart, FolderPlus, ArrowLeft, Trash2, Edit3, Eye, Calendar, Sparkles, MapPin, ChevronRight, Compass } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function FavoritesPage() {
  const { consumer, loading: authLoading } = useConsumerAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<'favorites' | 'collections'>('favorites')
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<UnifiedListing[]>([])
  const [collections, setCollections] = useState<any[]>([])

  // Collection modal states
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')
  const [selectedCollection, setSelectedCollection] = useState<any>(null)
  
  // Active view inside a collection
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null)
  const [activeCollectionData, setActiveCollectionData] = useState<any>(null)
  const [activeCollectionListings, setActiveCollectionListings] = useState<UnifiedListing[]>([])
  const [collectionLoading, setCollectionLoading] = useState(false)

  useEffect(() => {
    if (authLoading) return

    if (!consumer) {
      router.push('/auth/login')
      return
    }

    async function loadData() {
      setLoading(true)
      try {
        const favsRes = await getConsumerFavorites(consumer!.id)
        const collsRes = await getConsumerCollections(consumer!.id)

        if (favsRes.success) setFavorites(favsRes.data || [])
        if (collsRes.success) setCollections(collsRes.data || [])
      } catch (err) {
        toast.error('Failed to retrieve your saved spaces.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [consumer, router])

  // Sync active collection details if open
  useEffect(() => {
    if (!activeCollectionId || !consumer) return

    async function loadCollectionDetails() {
      setCollectionLoading(true)
      try {
        const res = await getCollectionDetails(consumer!.id, activeCollectionId!)
        if (res.success) {
          setActiveCollectionData(res.collection)
          setActiveCollectionListings(res.data || [])
        } else {
          toast.error(res.error || 'Failed to open collection.')
          setActiveCollectionId(null)
        }
      } catch (err) {
        toast.error('Failed to connect to service.')
      } finally {
        setCollectionLoading(false)
      }
    }

    loadCollectionDetails()
  }, [activeCollectionId, consumer])

  const handleRemoveFavorite = async (listingId: string, type: string) => {
    if (!consumer) return
    try {
      const res = await toggleFavorite(consumer.id, listingId, type)
      if (res.success && !res.favorited) {
        setFavorites(prev => prev.filter(item => item.id !== listingId))
        toast.success('Listing removed from favorites.')
      } else {
        toast.error(res.error || 'Failed to remove favorite.')
      }
    } catch (err) {
      toast.error('Could not connect to database.')
    }
  }

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consumer || !newCollectionName.trim()) return

    try {
      const res = await createCollection(consumer.id, newCollectionName)
      if (res.success) {
        setCollections(prev => [res.data, ...prev])
        setNewCollectionName('')
        setCreateModalOpen(false)
        toast.success('Collection created successfully.')
      } else {
        toast.error(res.error || 'Failed to create collection.')
      }
    } catch (err) {
      toast.error('Database connection error.')
    }
  }

  const handleRenameCollection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consumer || !newCollectionName.trim() || !selectedCollection) return

    try {
      const res = await renameCollection(consumer.id, selectedCollection.id, newCollectionName)
      if (res.success) {
        setCollections(prev => prev.map(c => c.id === selectedCollection.id ? res.data : c))
        if (activeCollectionId === selectedCollection.id) {
          setActiveCollectionData(res.data)
        }
        setNewCollectionName('')
        setSelectedCollection(null)
        setRenameModalOpen(false)
        toast.success('Collection renamed.')
      } else {
        toast.error(res.error || 'Failed to rename collection.')
      }
    } catch (err) {
      toast.error('Database connection error.')
    }
  }

  const handleDeleteCollection = async (id: string) => {
    if (!consumer) return
    if (!confirm('Are you sure you want to permanently delete this collection? Listings inside it will not be deleted.')) return

    try {
      const res = await deleteCollection(consumer.id, id)
      if (res.success) {
        setCollections(prev => prev.filter(c => c.id !== id))
        if (activeCollectionId === id) {
          setActiveCollectionId(null)
        }
        toast.success('Collection deleted.')
      } else {
        toast.error(res.error || 'Failed to delete collection.')
      }
    } catch (err) {
      toast.error('Database connection error.')
    }
  }

  const handleRemoveFromCollection = async (listingId: string) => {
    if (!consumer || !activeCollectionId) return
    try {
      const res = await removeListingFromCollection(consumer.id, activeCollectionId, listingId)
      if (res.success) {
        setActiveCollectionListings(prev => prev.filter(item => item.id !== listingId))
        toast.success('Listing removed from collection.')
      } else {
        toast.error(res.error || 'Failed to remove listing.')
      }
    } catch (err) {
      toast.error('Database connection error.')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mb-2" />
        <span className="text-xs uppercase tracking-widest text-neutral-500">Curating Saved Spaces...</span>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 text-white relative z-10 overflow-hidden">
      {/* Premium background grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', 
          backgroundSize: '24px 24px' 
        }} 
      />
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-4">
        <div className="space-y-2">
          <h1 className="text-3xl lg:text-5xl font-light tracking-tight uppercase leading-none">
            Saved <span className="font-semibold text-emerald-400">Library</span>
          </h1>
        </div>
          
          <div className="flex items-center gap-4">
            {activeTab === 'collections' && !activeCollectionId && (
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none gap-2 px-6"
              >
                <FolderPlus className="w-4 h-4" /> Create Collection
              </Button>
            )}
          </div>
        </div>

        {/* Tab & Sub-navigation system */}
        {!activeCollectionId ? (
          <div className="flex border border-white/10 p-0.5 bg-black/40 rounded-none w-full sm:w-80">
            <button
              onClick={() => setActiveTab('favorites')}
              className={`flex-1 h-11 text-[10px] uppercase font-bold tracking-widest transition-all ${
                activeTab === 'favorites' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
              }`}
            >
              Favorites ({favorites.length})
            </button>
            <button
              onClick={() => setActiveTab('collections')}
              className={`flex-1 h-11 text-[10px] uppercase font-bold tracking-widest transition-all ${
                activeTab === 'collections' ? 'bg-white text-black' : 'text-neutral-500 hover:text-white'
              }`}
            >
              Collections ({collections.length})
            </button>
          </div>
        ) : (
          <button
            onClick={() => setActiveCollectionId(null)}
            className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Collections
          </button>
        )}

        {/* Render Tab Contents */}
        {activeTab === 'favorites' && !activeCollectionId && (
          favorites.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-neutral-800 bg-neutral-900/10 space-y-4">
              <Compass className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
              <h4 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">No Favorites Yet</h4>
              <p className="text-xs text-neutral-500 font-light max-w-sm mx-auto leading-relaxed">
                Start exploring 3D spaces in our catalog and click the heart icon to save listings here.
              </p>
              <Link href="/explore">
                <Button className="mt-4 h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none px-6">
                  Browse Properties
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {favorites.map(item => (
                <ListingCard 
                  key={item.id} 
                  listing={item} 
                  onRemove={() => handleRemoveFavorite(item.id, item.listing_type_slug)} 
                />
              ))}
            </div>
          )
        )}

        {activeTab === 'collections' && !activeCollectionId && (
          collections.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-neutral-800 bg-neutral-900/10 space-y-4">
              <FolderHeart className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
              <h4 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">No Collections</h4>
              <p className="text-xs text-neutral-500 font-light max-w-sm mx-auto leading-relaxed">
                Organize your favorited virtual realities into custom collections like &quot;Dream Living&quot; or &quot;Exquisite Venues&quot;.
              </p>
              <Button 
                onClick={() => setCreateModalOpen(true)}
                className="mt-4 h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none px-6"
              >
                Create First Collection
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {collections.map(c => (
                <div 
                  key={c.id}
                  className="bg-neutral-900/20 border border-white/5 p-6 hover:border-white/10 transition-all flex flex-col justify-between h-48 relative group"
                >
                  <div className="space-y-3">
                    <FolderHeart className="w-8 h-8 text-emerald-400" />
                    <h3 className="text-lg font-light tracking-wide text-white group-hover:text-emerald-400 transition-colors">{c.name}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">
                      Created {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-4">
                    <button
                      onClick={() => setActiveCollectionId(c.id)}
                      className="text-xs uppercase tracking-widest text-emerald-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                      Open <ChevronRight className="w-4 h-4" />
                    </button>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setSelectedCollection(c)
                          setNewCollectionName(c.name)
                          setRenameModalOpen(true)
                        }}
                        className="p-1 hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
                        title="Rename"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCollection(c.id)}
                        className="p-1 hover:bg-red-950/20 text-neutral-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* View Collection Details */}
        {activeCollectionId && (
          <div className="space-y-8">
            <div className="bg-neutral-950/60 border border-white/5 p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <p className="text-[9px] uppercase tracking-widest text-emerald-400 font-bold">Custom Collection</p>
                <h2 className="text-2xl font-light tracking-tight text-white uppercase">
                  {activeCollectionData?.name || 'Loading Collection...'}
                </h2>
              </div>
              <div className="flex gap-4">
                <Button
                  onClick={() => {
                    setSelectedCollection(activeCollectionData)
                    setNewCollectionName(activeCollectionData.name)
                    setRenameModalOpen(true)
                  }}
                  variant="outline"
                  className="h-11 border-neutral-800 bg-transparent text-white hover:bg-white hover:text-neutral-950 text-xs tracking-widest uppercase rounded-none px-6"
                >
                  <Edit3 className="w-4 h-4 mr-2" /> Rename
                </Button>
                <Button
                  onClick={() => handleDeleteCollection(activeCollectionId)}
                  className="h-11 bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-900 hover:text-white text-xs tracking-widest uppercase rounded-none px-6"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Collection
                </Button>
              </div>
            </div>

            {collectionLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              </div>
            ) : activeCollectionListings.length === 0 ? (
              <div className="py-24 text-center border border-dashed border-neutral-800 bg-neutral-900/10 space-y-4">
                <FolderHeart className="w-8 h-8 text-neutral-600 mx-auto animate-pulse" />
                <h4 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">Empty Collection</h4>
                <p className="text-xs text-neutral-500 font-light max-w-sm mx-auto leading-relaxed">
                  There are no spatial models saved inside this collection yet. Open explore categories and bookmark items.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {activeCollectionListings.map(item => (
                  <ListingCard 
                    key={item.id} 
                    listing={item} 
                    onRemove={() => handleRemoveFromCollection(item.id)} 
                  />
                ))}
              </div>
            )}
          </div>
        )}



      {/* CREATE COLLECTION DIALOG */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="bg-neutral-950 border border-white/10 text-white rounded-none p-8 sm:max-w-md">
          <form onSubmit={handleCreateCollection} className="space-y-6">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-lg font-light uppercase tracking-tight text-white">Create New Collection</DialogTitle>
              <DialogDescription className="text-xs text-neutral-400 leading-relaxed">
                Provide a descriptive name to organize your virtual masterpieces, templates, and viewings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="coll-name" className="text-xs uppercase tracking-wider text-neutral-400">Collection Name</Label>
              <Input 
                id="coll-name"
                type="text"
                placeholder="e.g. My Next Home"
                value={newCollectionName}
                onChange={e => setNewCollectionName(e.target.value)}
                className="bg-neutral-900 border-white/5 focus-visible:ring-white h-11 text-sm rounded-none text-white placeholder:text-neutral-600"
                required
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNewCollectionName('')
                  setCreateModalOpen(false)
                }}
                className="h-11 border-neutral-800 bg-transparent text-white hover:bg-neutral-900 rounded-none text-xs tracking-widest uppercase"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none"
              >
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RENAME COLLECTION DIALOG */}
      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent className="bg-neutral-950 border border-white/10 text-white rounded-none p-8 sm:max-w-md">
          <form onSubmit={handleRenameCollection} className="space-y-6">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-lg font-light uppercase tracking-tight text-white">Rename Collection</DialogTitle>
              <DialogDescription className="text-xs text-neutral-400 leading-relaxed">
                Change the name of your custom spatial collection folder.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="rename-coll-name" className="text-xs uppercase tracking-wider text-neutral-400">New Name</Label>
              <Input 
                id="rename-coll-name"
                type="text"
                value={newCollectionName}
                onChange={e => setNewCollectionName(e.target.value)}
                className="bg-neutral-900 border-white/5 focus-visible:ring-white h-11 text-sm rounded-none text-white"
                required
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNewCollectionName('')
                  setSelectedCollection(null)
                  setRenameModalOpen(false)
                }}
                className="h-11 border-neutral-800 bg-transparent text-white hover:bg-neutral-900 rounded-none text-xs tracking-widest uppercase"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="h-11 bg-white hover:bg-neutral-200 text-black text-xs font-bold uppercase tracking-widest rounded-none"
              >
                Rename
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ListingCard({ listing, onRemove }: { listing: UnifiedListing, onRemove: () => void }) {
  const priceFormatted = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(listing.price)

  return (
    <div className="group relative bg-neutral-900/20 border border-white/5 hover:border-white/10 transition-all duration-300 flex flex-col justify-between">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden border-b border-white/5 bg-neutral-950">
        <img 
          src={listing.thumbnail_path || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=600'} 
          alt={listing.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Listing Type tag */}
        <div className="absolute top-4 left-4 z-10 px-2 py-1 bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white">
          {listing.listing_type}
        </div>

        {/* Favorite count badge */}
        <div className="absolute top-4 right-4 z-10 px-2.5 py-1 bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5 shadow-lg">
          <Heart className="w-3 h-3 fill-emerald-500/20 text-emerald-400" />
          <span>{listing.favorite_count || 0}</span>
        </div>
      </div>

      {/* Info Details */}
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

          <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-emerald-400/80 font-bold">
            <Compass className="w-3.5 h-3.5" /> Category: {listing.listing_type_slug}
          </div>
        </div>

        {/* Action Button Row */}
        <div className="flex gap-3 border-t border-white/5 pt-4">
          <Button
            onClick={() => {
              if (listing.model_url) {
                window.open(`/explore/viewer?url=${encodeURIComponent(listing.model_url)}&title=${encodeURIComponent(listing.name)}`, '_blank')
              } else {
                toast.error('No 3D asset attached.')
              }
            }}
            className="flex-1 h-11 bg-white/5 border border-white/10 hover:bg-white hover:text-black text-[10px] font-bold uppercase tracking-widest rounded-none"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" /> 3D View
          </Button>

          <Button
            onClick={onRemove}
            className="h-11 bg-red-950/20 border border-red-500/20 text-red-400 hover:bg-red-900 hover:text-white rounded-none text-[10px] font-bold uppercase tracking-widest px-4"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

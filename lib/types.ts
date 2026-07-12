export type UserRole = 'super_admin' | 'agency' | 'agent' | 'product_vendor' | 'consumer'
export type PropertyStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'unavailable'
export type MediaType = 'image' | 'fbx' | 'obj' | 'glb' | 'gltf' | 'usdz'

export interface Organization {
  id: string
  name: string
  description?: string
  logo_url?: string
  status: 'active' | 'inactive' | 'pending'
  subscription_tier_id?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  full_name?: string
  role: UserRole
  organization_id?: string
  avatar_url?: string
  suspended?: boolean
  agency_status?: 'pending_review' | 'approved' | 'revoked' | 'suspended'
  verification_document_url?: string
  reviewed_by?: string
  reviewed_at?: string
  approval_notes?: string
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  organization_id: string
  agent_id: string
  title: string
  description?: string
  price: number
  land_size?: number
  bathrooms?: number
  has_light: boolean
  has_water: boolean
  has_parking_lot: boolean
  is_available: boolean
  status: PropertyStatus
  created_at: string
  updated_at: string
}

export interface PropertyMedia {
  id: string
  property_id: string
  file_url: string
  file_path: string
  file_type: MediaType
  file_size?: number
  is_featured: boolean
  created_at: string
}

export interface SubscriptionTier {
  id: string
  name: string
  price: number
  max_listings: number
  max_images_per_listing: number
  max_upload_size_mb: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Inquiry {
  id: string
  property_id: string
  agent_id: string
  client_name: string
  client_email: string
  client_phone?: string
  message?: string
  status: 'pending' | 'contacted'
  created_at: string
}

export interface VendorSubscriptionTier {
  id: string
  name: string
  price: number
  max_products: number
  max_storage_mb: number
  is_featured_tier: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface VendorProfile {
  id: string
  business_name?: string
  phone_number: string
  business_address?: string
  website_url?: string
  logo_url?: string
  current_tier_id?: string
  created_at: string
  updated_at: string
}

export type ProductCategory = 'Furniture' | 'Lighting' | 'Bathroom Fixtures' | 'Kitchen Fixtures' | 'Doors' | 'Windows' | 'Flooring' | 'Electrical Supplies' | 'Paint & Finishes' | 'Decor' | 'Electrical Appliances'

export interface Product {
  id: string
  uid: string
  vendor_id: string
  name: string
  category: ProductCategory | string
  price: number
  thumbnail_path?: string
  model_url?: string
  model_size_bytes?: number
  has_store_link: boolean
  store_link?: string
  availability: boolean
  approved: boolean
  created_at: string
  updated_at: string
}

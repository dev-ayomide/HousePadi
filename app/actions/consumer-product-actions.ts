'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { deleteFromR2 } from './r2-actions'

export interface ConsumerProduct {
  id: string
  user_id: string
  name: string
  thumbnail_url: string
  model_url: string
  file_size: number
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface TierLimits {
  name: string
  maxProducts: number
  maxUploadSizeBytes: number
  maxTotalSizeBytes: number
  allowPublicToggle: boolean
}

export async function getConsumerTierLimits(tier: string): Promise<TierLimits> {
  const normalized = (tier || 'FREE').toUpperCase()
  switch (normalized) {
    case 'PREMIUM':
      return {
        name: 'Premium',
        maxProducts: 25,
        maxUploadSizeBytes: 50 * 1024 * 1024, // 50MB
        maxTotalSizeBytes: 500 * 1024 * 1024, // 500MB
        allowPublicToggle: true
      }
    case 'PRO':
      return {
        name: 'Pro',
        maxProducts: 100,
        maxUploadSizeBytes: 100 * 1024 * 1024, // 100MB
        maxTotalSizeBytes: 2 * 1024 * 1024 * 1024, // 2GB
        allowPublicToggle: true
      }
    case 'FREE':
    default:
      return {
        name: 'Free',
        maxProducts: 3,
        maxUploadSizeBytes: 10 * 1024 * 1024, // 10MB
        maxTotalSizeBytes: 30 * 1024 * 1024, // 30MB
        allowPublicToggle: false
      }
  }
}

/**
 * Fetch consumer profile and products to return limits and lists
 */
export async function getConsumerProducts(consumerId: string) {
  try {
    const supabase = createAdminClient()
    
    // 1. Fetch consumer profile to find tier
    const { data: profile, error: profileError } = await supabase
      .from('consumer_profiles')
      .select('tier')
      .eq('user_id', consumerId)
      .maybeSingle()

    if (profileError) throw profileError
    const userTier = profile?.tier || 'FREE'
    const limits = await getConsumerTierLimits(userTier)

    // 2. Fetch products
    const { data: products, error: productsError } = await supabase
      .from('consumer_products')
      .select('*')
      .eq('user_id', consumerId)
      .order('created_at', { ascending: false })

    if (productsError) throw productsError

    const totalStorageUsed = (products || []).reduce((acc, p) => acc + (Number(p.file_size) || 0), 0)

    return {
      success: true,
      products: (products || []) as ConsumerProduct[],
      tier: userTier,
      limits,
      totalStorageUsed
    }
  } catch (err: any) {
    console.error('getConsumerProducts Error:', err)
    return { success: false, error: err.message || 'Failed to fetch consumer products.' }
  }
}

/**
 * Add a new product listing for a consumer, verifying tier limits first
 */
export async function addConsumerProduct(
  consumerId: string,
  name: string,
  thumbnailUrl: string,
  modelUrl: string,
  fileSize: number
) {
  try {
    if (!consumerId || !name || !thumbnailUrl || !modelUrl) {
      return { success: false, error: 'Missing required parameters.' }
    }

    const supabase = createAdminClient()

    // 1. Fetch profile and current products list to verify limits
    const { data: profile, error: profileErr } = await supabase
      .from('consumer_profiles')
      .select('tier')
      .eq('user_id', consumerId)
      .maybeSingle()

    if (profileErr) throw profileErr
    const userTier = profile?.tier || 'FREE'
    const limits = await getConsumerTierLimits(userTier)

    const { data: existingProducts, error: productsErr } = await supabase
      .from('consumer_products')
      .select('file_size')
      .eq('user_id', consumerId)

    if (productsErr) throw productsErr
    const currentProductsCount = existingProducts?.length || 0
    const currentTotalStorage = (existingProducts || []).reduce((acc, p) => acc + (Number(p.file_size) || 0), 0)

    // Validate product count limit
    if (currentProductsCount >= limits.maxProducts) {
      return { 
        success: false, 
        error: `Product upload limit reached. Your current tier (${limits.name}) allows a maximum of ${limits.maxProducts} products.` 
      }
    }

    // Validate individual file upload size limit
    if (fileSize > limits.maxUploadSizeBytes) {
      const limitMb = limits.maxUploadSizeBytes / (1024 * 1024)
      return { 
        success: false, 
        error: `File size exceeds the limit. Your tier (${limits.name}) allows up to ${limitMb}MB per 3D model file.` 
      }
    }

    // Validate total storage allocation limit
    if (currentTotalStorage + fileSize > limits.maxTotalSizeBytes) {
      const limitMb = limits.maxTotalSizeBytes / (1024 * 1024)
      return { 
        success: false, 
        error: `Total allocated storage exceeded. Your tier (${limits.name}) allows a maximum of ${limitMb}MB of total files.` 
      }
    }

    // 2. Insert product row
    const { error: insertErr } = await supabase
      .from('consumer_products')
      .insert({
        user_id: consumerId,
        name,
        thumbnail_url: thumbnailUrl,
        model_url: modelUrl,
        file_size: fileSize,
        is_public: false
      })

    if (insertErr) throw insertErr

    return { success: true }
  } catch (err: any) {
    console.error('addConsumerProduct Error:', err)
    return { success: false, error: err.message || 'Failed to add product.' }
  }
}

/**
 * Delete a consumer product and clean up assets in Cloudflare R2
 */
export async function deleteConsumerProduct(consumerId: string, productId: string) {
  try {
    const supabase = createAdminClient()

    // 1. Fetch details first to get the asset URLs
    const { data: product, error: fetchErr } = await supabase
      .from('consumer_products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', consumerId)
      .maybeSingle()

    if (fetchErr) throw fetchErr
    if (!product) {
      return { success: false, error: 'Product not found or unauthorized.' }
    }

    // 2. Delete files from Cloudflare R2
    if (product.thumbnail_url) {
      await deleteFromR2(product.thumbnail_url).catch(err => {
        console.warn('Failed to delete consumer thumbnail from R2:', err)
      })
    }
    if (product.model_url) {
      await deleteFromR2(product.model_url).catch(err => {
        console.warn('Failed to delete consumer 3D model from R2:', err)
      })
    }

    // 3. Delete row from DB
    const { error: deleteErr } = await supabase
      .from('consumer_products')
      .delete()
      .eq('id', productId)

    if (deleteErr) throw deleteErr

    return { success: true }
  } catch (err: any) {
    console.error('deleteConsumerProduct Error:', err)
    return { success: false, error: err.message || 'Failed to delete product.' }
  }
}

/**
 * Toggle product's public/private flag (blocked on FREE tier)
 */
export async function toggleConsumerProductPublicStatus(
  consumerId: string,
  productId: string,
  isPublic: boolean
) {
  try {
    const supabase = createAdminClient()

    // 1. Fetch profile to check tier
    const { data: profile, error: profileErr } = await supabase
      .from('consumer_profiles')
      .select('tier')
      .eq('user_id', consumerId)
      .maybeSingle()

    if (profileErr) throw profileErr
    const userTier = profile?.tier || 'FREE'
    const limits = await getConsumerTierLimits(userTier)

    if (isPublic && !limits.allowPublicToggle) {
      return { success: false, error: 'Your current tier does not support public sharing in the app.' }
    }

    // 2. Update status
    const { error: updateErr } = await supabase
      .from('consumer_products')
      .update({ is_public: isPublic, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('user_id', consumerId)

    if (updateErr) throw updateErr

    return { success: true }
  } catch (err: any) {
    console.error('toggleConsumerProductPublicStatus Error:', err)
    return { success: false, error: err.message || 'Failed to update public toggle.' }
  }
}

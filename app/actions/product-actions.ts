'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import crypto from 'node:crypto'

export async function createProduct(formData: FormData, thumbnailUrl: string | null, modelUrl: string | null, modelSizeBytes: number) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const title = formData.get('title') as string
    const category = formData.get('category') as string
    const priceStr = formData.get('price') as string
    const price = parseFloat(priceStr) || 0
    const hasStoreLink = formData.get('hasStoreLink') === 'true'
    const storeLink = formData.get('storeLink') as string
    const uid = crypto.randomBytes(8).toString('hex')

    const adminClient = createAdminClient()

    // Enforce limits
    const { data: profile } = await adminClient
      .from('vendor_profiles')
      .select('current_tier_id')
      .eq('id', user.id)
      .single()

    if (profile?.current_tier_id) {
      const { data: tier } = await adminClient
        .from('vendor_subscription_tiers')
        .select('*')
        .eq('id', profile.current_tier_id)
        .single()

      if (tier) {
        // Count products
        const { count: productsCount } = await adminClient
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('vendor_id', user.id)

        if (productsCount !== null && productsCount >= tier.max_products) {
          return { success: false, error: 'Product limit reached for your tier.' }
        }

        // Count storage
        const { data: products } = await adminClient
          .from('products')
          .select('model_size_bytes')
          .eq('vendor_id', user.id)
        
        const storageUsed = products?.reduce((acc, p) => acc + (Number(p.model_size_bytes) || 0), 0) || 0
        const maxStorageBytes = tier.max_storage_mb * 1024 * 1024

        if (storageUsed + modelSizeBytes > maxStorageBytes) {
          return { success: false, error: 'Storage limit reached for your tier.' }
        }
      }
    }

    const { error } = await adminClient.from('products').insert({
      uid,
      vendor_id: user.id,
      name: title,
      category,
      price,
      thumbnail_path: thumbnailUrl,
      model_url: modelUrl,
      model_size_bytes: modelSizeBytes,
      has_store_link: hasStoreLink,
      store_link: storeLink || null,
      availability: true
    })

    if (error) throw error

    revalidatePath('/vendor/products')
    return { success: true }
  } catch (error: any) {
    console.error('Create product error:', error)
    return { success: false, error: error.message || 'Failed to create product' }
  }
}

export async function deleteProduct(productId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { success: false, error: 'Unauthorized' }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('vendor_id', user.id)

    if (error) throw error

    revalidatePath('/vendor/products')
    return { success: true }
  } catch (error: any) {
    console.error('Delete product error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateProduct(
  productId: string, 
  formData: FormData, 
  thumbnailUrl?: string | null, 
  modelUrl?: string | null, 
  modelSizeBytes?: number
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return { success: false, error: 'Unauthorized' }
    }

    const title = formData.get('title') as string
    const category = formData.get('category') as string
    const priceStr = formData.get('price') as string
    const price = parseFloat(priceStr) || 0
    const hasStoreLink = formData.get('hasStoreLink') === 'true'
    const storeLink = formData.get('storeLink') as string
    const status = formData.get('status') as string || 'available'
    const isPublic = status !== 'hidden'
    const isSoldOut = status === 'sold_out'

    const adminClient = createAdminClient()

    // 1. Verify ownership and get current product details
    const { data: currentProduct, error: fetchError } = await adminClient
      .from('products')
      .select('id, model_size_bytes, thumbnail_path, model_url')
      .eq('id', productId)
      .eq('vendor_id', user.id)
      .single()

    if (fetchError || !currentProduct) {
      return { success: false, error: 'Product not found or unauthorized' }
    }

    // 2. Storage limits check (if uploading a new model)
    if (modelSizeBytes && modelSizeBytes > 0) {
      const { data: profile } = await adminClient
        .from('vendor_profiles')
        .select('current_tier_id')
        .eq('id', user.id)
        .single()

      if (profile?.current_tier_id) {
        const { data: tier } = await adminClient
          .from('vendor_subscription_tiers')
          .select('*')
          .eq('id', profile.current_tier_id)
          .single()

        if (tier) {
          const { data: products } = await adminClient
            .from('products')
            .select('model_size_bytes')
            .eq('vendor_id', user.id)
          
          const currentStorageUsed = products?.reduce((acc, p) => acc + (Number(p.model_size_bytes) || 0), 0) || 0
          // Subtract the old model size and add the new one
          const updatedStorageUsed = currentStorageUsed - (Number(currentProduct.model_size_bytes) || 0) + modelSizeBytes
          const maxStorageBytes = tier.max_storage_mb * 1024 * 1024

          if (updatedStorageUsed > maxStorageBytes) {
            return { success: false, error: 'Storage limit reached for your tier. Cannot upload a larger model.' }
          }
        }
      }
    }

    const updateData: any = {
      name: title,
      category,
      price,
      has_store_link: hasStoreLink,
      store_link: storeLink || null,
      availability: isPublic,
      is_sold_out: isSoldOut,
      updated_at: new Date().toISOString()
    }

    if (thumbnailUrl !== undefined) {
      updateData.thumbnail_path = thumbnailUrl
    }

    if (modelUrl !== undefined) {
      updateData.model_url = modelUrl
      updateData.model_size_bytes = modelSizeBytes || 0
    }

    const { error: updateError } = await adminClient
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .eq('vendor_id', user.id)

    if (updateError) throw updateError

    revalidatePath('/vendor/products')
    return { success: true }
  } catch (error: any) {
    console.error('Update product error:', error)
    return { success: false, error: error.message || 'Failed to update product' }
  }
}

export async function incrementProductView(productId: string) {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('product_views')
      .insert({ product_id: productId })

    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('Failed to increment view', err)
    return { success: false }
  }
}

export async function getVendorStats(vendorId: string) {
  try {
    const adminClient = createAdminClient()

    // Get total products
    const { count: totalProducts } = await adminClient
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)

    // Get active listings
    const { count: activeListings } = await adminClient
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('vendor_id', vendorId)
      .eq('availability', true)

    // Get total views across all products by this vendor
    const { data: viewsData, error: viewsError } = await adminClient
      .from('product_views')
      .select('id, products!inner(vendor_id)')
      .eq('products.vendor_id', vendorId)

    const totalViews = viewsData?.length || 0

    return { success: true, data: { totalProducts: totalProducts || 0, activeListings: activeListings || 0, totalViews } }
  } catch (err: any) {
    console.error('Failed to fetch vendor stats', err)
    return { success: false, error: err.message, data: { totalProducts: 0, activeListings: 0, totalViews: 0 } }
  }
}

export async function toggleProductFavorite(consumerId: string, productId: string) {
  try {
    const { getConsumerProfile } = await import('./consumer-actions')
    await getConsumerProfile(consumerId)
    const adminClient = createAdminClient()

    // Check if favorite exists
    const { data: existing, error: checkError } = await adminClient
      .from('product_favorites')
      .select('*')
      .eq('user_id', consumerId)
      .eq('product_id', productId)
      .maybeSingle()

    if (checkError) throw checkError

    if (existing) {
      // Remove favorite
      const { error: deleteError } = await adminClient
        .from('product_favorites')
        .delete()
        .eq('user_id', consumerId)
        .eq('product_id', productId)

      if (deleteError) throw deleteError
      return { success: true, favorited: false }
    } else {
      // Add favorite
      const { error: insertError } = await adminClient
        .from('product_favorites')
        .insert([
          {
            user_id: consumerId,
            product_id: productId
          }
        ])

      if (insertError) throw insertError
      return { success: true, favorited: true }
    }
  } catch (err: any) {
    console.error('Toggle Product Favorite Error:', err)
    return { success: false, error: err.message }
  }
}

export async function getConsumerProductFavorites(consumerId: string) {
  try {
    const { getConsumerProfile } = await import('./consumer-actions')
    await getConsumerProfile(consumerId)
    const adminClient = createAdminClient()

    const { data: favorites, error: favsError } = await adminClient
      .from('product_favorites')
      .select('product_id')
      .eq('user_id', consumerId)

    if (favsError) throw favsError

    if (!favorites || favorites.length === 0) {
      return { success: true, data: [] }
    }

    const productIds = favorites.map(f => f.product_id)

    const { data: products, error: productsError } = await adminClient
      .from('products')
      .select(`
        *,
        vendor:vendor_profiles (
          business_name
        )
      `)
      .in('id', productIds)

    if (productsError) throw productsError
    return { success: true, data: products }
  } catch (err: any) {
    console.error('Get Consumer Product Favorites Error:', err)
    return { success: false, error: err.message }
  }
}


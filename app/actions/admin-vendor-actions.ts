'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function getVendorsList() {
  try {
    const supabase = createAdminClient()

    // Get all vendors
    const { data: vendors, error: vendorError } = await supabase
      .from('vendor_profiles')
      .select(`
        id,
        business_name,
        phone_number,
        is_suspended,
        created_at
      `)

    if (vendorError) throw vendorError

    // Manually join with profiles to get email since it's a separate table
    // Also aggregate product counts
    const vendorIds = vendors.map(v => v.id)
    
    // Get profiles for emails
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', vendorIds)
      
    if (profileError) throw profileError

    // Aggregate product counts per vendor
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('vendor_id')
      .in('vendor_id', vendorIds)

    if (productsError) throw productsError

    const productCounts = products.reduce((acc: Record<string, number>, p) => {
      acc[p.vendor_id] = (acc[p.vendor_id] || 0) + 1
      return acc
    }, {})

    const enrichedVendors = vendors.map(v => {
      const profile = profiles.find(p => p.id === v.id)
      return {
        ...v,
        email: profile?.email || 'N/A',
        full_name: profile?.full_name || 'N/A',
        product_count: productCounts[v.id] || 0
      }
    })

    return { success: true, data: enrichedVendors }
  } catch (error: any) {
    console.error('getVendorsList Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getVendorDetails(vendorId: string) {
  try {
    const supabase = createAdminClient()

    const { data: vendor, error } = await supabase
      .from('vendor_profiles')
      .select('*')
      .eq('id', vendorId)
      .single()

    if (error) throw error

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', vendorId)
      .single()

    return { 
      success: true, 
      data: {
        ...vendor,
        email: profile?.email || 'N/A',
        full_name: profile?.full_name || 'N/A'
      } 
    }
  } catch (error: any) {
    console.error('getVendorDetails Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getVendorProductsAdmin(vendorId: string) {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('getVendorProductsAdmin Error:', error)
    return { success: false, error: error.message }
  }
}

export async function toggleVendorSuspension(vendorId: string, suspend: boolean) {
  try {
    const supabase = createAdminClient()
    
    const { error } = await supabase
      .from('vendor_profiles')
      .update({ is_suspended: suspend })
      .eq('id', vendorId)

    if (error) throw error

    revalidatePath('/admin/moderation/vendors')
    revalidatePath(`/admin/moderation/vendors/${vendorId}`)
    return { success: true }
  } catch (error: any) {
    console.error('toggleVendorSuspension Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteVendorAccount(vendorId: string) {
  try {
    const supabase = createAdminClient()
    
    // Deleting the user from auth.users will cascade and delete vendor_profiles, products, etc.
    const { error } = await supabase.auth.admin.deleteUser(vendorId)

    if (error) throw error

    revalidatePath('/admin/moderation/vendors')
    return { success: true }
  } catch (error: any) {
    console.error('deleteVendorAccount Error:', error)
    return { success: false, error: error.message }
  }
}

export async function toggleProductSuspension(productId: string, suspend: boolean) {
  try {
    const supabase = createAdminClient()
    
    const { error } = await supabase
      .from('products')
      .update({ approved: !suspend })
      .eq('id', productId)

    if (error) throw error

    revalidatePath('/admin/moderation/vendors')
    return { success: true }
  } catch (error: any) {
    console.error('toggleProductSuspension Error:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteProductAdmin(productId: string) {
  try {
    const supabase = createAdminClient()
    
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)

    if (error) throw error

    revalidatePath('/admin/moderation/vendors')
    return { success: true }
  } catch (error: any) {
    console.error('deleteProductAdmin Error:', error)
    return { success: false, error: error.message }
  }
}

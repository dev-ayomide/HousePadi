import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { ProductClient } from './product-client'

export const revalidate = 0

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const adminClient = createAdminClient()
  const { id } = await params
  
  const { data: product, error: productError } = await adminClient
    .from('products')
    .select(`
      *,
      vendor:vendor_profiles (
        business_name,
        phone_number,
        business_address,
        website_url
      )
    `)
    .eq('id', id)
    .single()

  if (productError || !product) {
    notFound()
  }

  if (!product.availability) {
    notFound()
  }

  // Fetch the vendor's email separately from the profiles table
  const { data: profile } = await adminClient
    .from('profiles')
    .select('email')
    .eq('id', product.vendor_id)
    .single()

  const vendor = {
    ...product.vendor,
    email: profile?.email || null
  }

  return <ProductClient product={product} vendor={vendor} />
}

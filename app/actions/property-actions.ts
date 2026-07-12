'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type ListingTable = 'apartments' | 'event_centers' | 'public_space'
const VALID_TABLES: ListingTable[] = ['apartments', 'event_centers', 'public_space']

function validateTable(table: string): ListingTable {
  if (VALID_TABLES.includes(table as ListingTable)) return table as ListingTable
  return 'apartments'
}

export async function updatePropertyStatus(propertyId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED', table: string = 'apartments') {
  try {
    const tableName = validateTable(table)
    const supabaseAdmin = createAdminClient()
    
    const { error } = await supabaseAdmin
      .from(tableName)
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', propertyId)
    
    if (error) throw error
    
    revalidatePath('/admin/moderation')
    return { success: true }
  } catch (err: any) {
    console.error('Update Status Error:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteProperty(propertyId: string, table: string = 'apartments') {
  try {
    const tableName = validateTable(table)
    const supabaseAdmin = createAdminClient()
    
    const { error } = await supabaseAdmin
      .from(tableName)
      .delete()
      .eq('id', propertyId)
    
    if (error) throw error
    
    revalidatePath('/admin/moderation')
    return { success: true }
  } catch (err: any) {
    console.error('Delete Property Error:', err)
    return { success: false, error: err.message }
  }
}

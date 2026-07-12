'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function submitContactForm(formData: {
  full_name: string
  email: string
  subject: string
  message: string
}) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('contact_submissions')
      .insert([formData])

    if (error) throw error
    return { success: true }
  } catch (err: any) {
    console.error('Contact Submission Error:', err)
    return { success: false, error: err.message }
  }
}

export async function getContactSubmissions() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (err: any) {
    console.error('Get Submissions Error:', err)
    return { success: false, error: err.message }
  }
}

export async function markAsRead(id: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('contact_submissions')
      .update({ is_read: true })
      .eq('id', id)

    if (error) throw error
    revalidatePath('/admin/contact')
    return { success: true }
  } catch (err: any) {
    console.error('Mark as Read Error:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteSubmission(id: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('contact_submissions')
      .delete()
      .eq('id', id)

    if (error) throw error
    revalidatePath('/admin/contact')
    return { success: true }
  } catch (err: any) {
    console.error('Delete Submission Error:', err)
    return { success: false, error: err.message }
  }
}

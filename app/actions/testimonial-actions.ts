'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export interface Testimonial {
  id: string
  author_name: string
  author_role: string
  author_company: string
  content: string
  is_visible: boolean
  display_order: number
}

export async function getTestimonials() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data as Testimonial[] }
  } catch (err: any) {
    console.error('Get Testimonials Error:', err)
    return { success: false, error: err.message }
  }
}

export async function toggleTestimonialVisibility(id: string, currentVisibility: boolean) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('testimonials')
      .update({ is_visible: !currentVisibility })
      .eq('id', id)

    if (error) throw error
    revalidatePath('/admin/cms/testimonials')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Toggle Visibility Error:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteTestimonial(id: string) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id)

    if (error) throw error
    revalidatePath('/admin/cms/testimonials')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Delete Testimonial Error:', err)
    return { success: false, error: err.message }
  }
}

export async function updateTestimonialOrder(orderedIds: string[]) {
  try {
    const supabase = createAdminClient()
    
    const updates = orderedIds.map((id, index) => 
      supabase.from('testimonials').update({ display_order: index + 1 }).eq('id', id)
    )

    await Promise.all(updates)
    
    revalidatePath('/admin/cms/testimonials')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Update Order Error:', err)
    return { success: false, error: err.message }
  }
}

export async function getVisibleTestimonials() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_visible', true)
      .order('display_order', { ascending: true })

    if (error) throw error
    return { success: true, data: data as Testimonial[] }
  } catch (err: any) {
    console.error('Get Visible Testimonials Error:', err)
    return { success: false, error: err.message }
  }
}

export async function createTestimonial(data: Omit<Testimonial, 'id'>) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('testimonials')
      .insert([data])

    if (error) throw error
    revalidatePath('/admin/cms/testimonials')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Create Testimonial Error:', err)
    return { success: false, error: err.message }
  }
}

export async function updateTestimonial(id: string, data: Partial<Omit<Testimonial, 'id'>>) {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('testimonials')
      .update(data)
      .eq('id', id)

    if (error) throw error
    revalidatePath('/admin/cms/testimonials')
    revalidatePath('/')
    return { success: true }
  } catch (err: any) {
    console.error('Update Testimonial Error:', err)
    return { success: false, error: err.message }
  }
}

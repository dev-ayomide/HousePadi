'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { uploadToR2 } from './r2-actions'

export async function submitCareerApplication(formData: FormData) {
  try {
    const fullName = formData.get('full_name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone_number') as string
    const role = formData.get('role') as string
    const education = formData.get('education') as string
    const country = formData.get('country') as string
    const state = formData.get('state') as string
    const linkedin = formData.get('linkedin') as string || 'N/A'
    const portfolio = formData.get('portfolio') as string || 'N/A'
    const notes = formData.get('notes') as string || 'N/A'
    const cvFile = formData.get('cv_file') as File | null

    let cvUrl = 'No CV attached'

    if (cvFile && cvFile.size > 0) {
      // Create a dummy user ID or use 'careers' for upload path
      const uploadId = `careers-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const uploadResult = await uploadToR2(cvFile, uploadId)
      
      if (uploadResult.success && uploadResult.url) {
        cvUrl = uploadResult.url
      } else {
        throw new Error('Failed to upload CV: ' + uploadResult.error)
      }
    }

    const formattedMessage = `Role Applied: ${role}

--- Applicant Details ---
Phone: ${phone}
Education: ${education}
Location: ${state}, ${country}

--- Links ---
LinkedIn: ${linkedin}
Portfolio: ${portfolio}
CV/Resume: ${cvUrl}

--- Personal Note ---
${notes}
`

    const supabase = createAdminClient()
    const { error } = await supabase
      .from('contact_submissions')
      .insert([{
        full_name: fullName,
        email: email,
        subject: `Career Application - ${role}`,
        message: formattedMessage,
      }])

    if (error) throw error

    return { success: true }
  } catch (err: any) {
    console.error('Career Application Submission Error:', err)
    return { success: false, error: err.message || 'An unexpected error occurred.' }
  }
}

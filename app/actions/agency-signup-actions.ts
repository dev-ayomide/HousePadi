'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { Resend } from 'resend'
import crypto from 'node:crypto'
import { render } from '@react-email/render'
import { AgencyApplicationReceivedEmail } from '@/lib/emails/AgencyApplicationReceivedEmail'

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not defined in environment variables.')
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

export async function submitAgencyApplication(formData: FormData) {
  try {
    const agencyName = formData.get('agencyName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const phone = formData.get('phone') as string
    const website = formData.get('website') as string
    const file = formData.get('verificationDocument') as File

    if (!agencyName || !email || !password || !file) {
      return { success: false, error: 'Please provide all required fields.' }
    }

    const supabase = createAdminClient()

    // 1. Check if email exists
    const { data: existingUserByEmail } = await supabase
      .from('profiles')
      .select('agency_status, suspended, role')
      .eq('email', email)
      .maybeSingle()

    if (existingUserByEmail) {
      if (existingUserByEmail.role === 'AGENCY') {
        if (existingUserByEmail.agency_status === 'pending_review') {
          return { success: false, error: 'An agency registration with this email is currently pending review.' }
        }
        if (existingUserByEmail.agency_status === 'revoked') {
          return { success: false, error: 'This agency application was previously revoked. Please contact support.' }
        }
        if (existingUserByEmail.agency_status === 'suspended' || existingUserByEmail.suspended) {
          return { success: false, error: 'This agency account has been suspended. Please contact support.' }
        }
      }
      return { success: false, error: 'An account with this email is already registered. Please sign in.' }
    }

    // 2. Check if agency name exists
    const { data: existingUserByName } = await supabase
      .from('profiles')
      .select('id')
      .eq('full_name', agencyName)
      .maybeSingle()

    if (existingUserByName) {
      return { success: false, error: 'An agency with this name is already registered.' }
    }

    // 3. Upload verification document to R2
    const fileExt = file.name.split('.').pop()
    const fileName = `verifications/${crypto.randomUUID()}.${fileExt}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    }

    await s3Client.send(new PutObjectCommand(uploadParams))
    const documentUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`

    // 3. Create Auth User (Admin bypasses confirmation if configured)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'AGENCY'
      }
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        return { success: false, error: 'This email is already registered.' }
      }
      throw authError
    }

    if (!authData.user) {
      throw new Error('Failed to create authentication user.')
    }

    const userId = authData.user.id

    // Find the Curator (Free) tier ID dynamically
    const { data: curatorPlan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', 'Curator')
      .maybeSingle()

    const curatorPlanId = curatorPlan?.id || null

    // 4. Create Profile Row with pending status
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        full_name: agencyName,
        role: 'AGENCY',
        suspended: true, // Login block at auth layer
        agency_status: 'pending_review',
        verification_document_url: documentUrl,
        phone_number: phone || null,
        website_url: website || null,
        is_approved: false
      })

    if (profileError) throw profileError

    // 4b. Create default subscription
    if (curatorPlanId) {
      await supabase.from('agency_subscriptions').insert({
        agency_id: userId,
        plan_id: curatorPlanId,
        status: 'active',
        current_period_end: new Date(Date.now() + 36500 * 24 * 60 * 60 * 1000).toISOString() // 100 years for free tier
      })
    }

    // 5. Send Application Received Email
    const resend = getResendClient()
    if (resend) {
      try {
        const emailHtml = await render(AgencyApplicationReceivedEmail({ agencyName }) as any)
        
        await resend.emails.send({
          from: 'HousePadi Onboarding <onboarding@housepadi.example>',
          to: email,
          subject: 'Application Received - HousePadi',
          html: emailHtml,
        })
      } catch (emailErr) {
        console.error('Failed to send confirmation email. Check RESEND_API_KEY.', emailErr)
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Agency application error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

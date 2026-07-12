'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function onboardAgency(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string
    const planId = formData.get('tierId') as string
    const customListingLimit = formData.get('custom_listing_limit') ? Number(formData.get('custom_listing_limit')) : null
    const customAgentLimit = formData.get('custom_agent_limit') ? Number(formData.get('custom_agent_limit')) : null
    const customStorageLimitGb = formData.get('custom_storage_limit_gb') ? Number(formData.get('custom_storage_limit_gb')) : null
    const customStorageLimitMb = customStorageLimitGb ? customStorageLimitGb * 1024 : null
    const password = formData.get('password') as string
    const website_url = formData.get('website_url') as string

    try {
      const supabaseAdmin = createAdminClient()

      // 1. Create Auth User
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role: 'AGENCY',
          full_name: name,
        }
      })

      if (authError) {
        const msg = authError.message.toLowerCase()
        if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('already in use')) {
          return { success: false, error: 'An agency with this email is already registered.' }
        }
        throw new Error(`Authentication Provisioning Failed: ${authError.message}`)
      }

      const userId = authData.user.id

      // 2. Generate Slug
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.floor(Math.random() * 1000)

      // 3. Upsert Profile Row
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          email,
          role: 'AGENCY',
          full_name: name,
          website_url: website_url
        })

      if (profileError) {
        // Rollback auth user creation if profile fails
        await supabaseAdmin.auth.admin.deleteUser(userId)
        throw new Error(`Profile Error: ${profileError.message}`)
      }

      // 4. Create agency subscription
      const { error: subError } = await supabaseAdmin
        .from('agency_subscriptions')
        .insert({
          agency_id: userId,
          plan_id: planId,
          custom_listing_limit: customListingLimit,
          custom_agent_limit: customAgentLimit,
          custom_storage_limit_mb: customStorageLimitMb,
          status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        
      if (subError) {
        console.error('Subscription error:', subError)
      }

    // 4. Simulated Email Sending Flow
    // In production, you would connect to Resend or SendGrid here
    console.log(`\n================ EMAIL DISPATCH ================`)
    console.log(`To: ${email}`)
    console.log(`Subject: Welcome to HousePadi - ${name}`)
    console.log(`Body: Your agency account has been created.`)
    console.log(`Temporary Password: ${password}`)
    console.log(`Login URL: https://housepadi.example/auth/login`)
    console.log(`================================================\n`)

    revalidatePath('/admin/agencies')
    
    return { success: true }
  } catch (err: any) {
    console.error('Onboarding Error:', err)
    return { success: false, error: err.message || 'Failed to onboard agency. Check server logs.' }
  }
}

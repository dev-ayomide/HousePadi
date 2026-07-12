'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { VendorOTPEmail } from '@/lib/emails/VendorOTPEmail'
import { VendorWelcomeEmail } from '@/lib/emails/VendorWelcomeEmail'

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not defined in environment variables.')
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function submitVendorSignup(formData: FormData) {
  try {
    const businessName = formData.get('businessName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string

    if (!email || !password || !phone) {
      return { success: false, error: 'Please provide Email, Password, and Phone Number.' }
    }

    const supabase = createAdminClient()

    // 1. Check if email exists in auth (we use admin client to check profiles as proxy)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return { success: false, error: 'An account with this email is already registered.' }
    }

    // 2. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'PRODUCT_VENDOR'
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

    // 3. Find the lowest-priced active tier dynamically
    const { data: basicTier } = await supabase
      .from('vendor_subscription_tiers')
      .select('id')
      .eq('is_active', true)
      .order('price', { ascending: true })
      .limit(1)
      .maybeSingle()

    const basicTierId = basicTier?.id || null

    // 4. Generate OTP
    const otpCode = generateOTP()

    // 5. Create Vendor Profile Row
    const { error: profileError } = await supabase
      .from('vendor_profiles')
      .insert({
        id: userId,
        business_name: businessName || null,
        phone_number: phone,
        business_address: address || null,
        current_tier_id: basicTierId,
        otp_code: otpCode,
        is_verified: false
      })

    if (profileError) throw profileError

    // Also insert into profiles for global auth compatibility
    await supabase.from('profiles').insert({
      id: userId,
      email: email,
      full_name: businessName || 'Product Vendor',
      role: 'PRODUCT_VENDOR',
      phone_number: phone,
      is_approved: true
    })

    // 6. Send OTP Email
    const resend = getResendClient()
    if (resend) {
      try {
        const emailHtml = await render(VendorOTPEmail({ businessName: businessName || 'Vendor', otpCode }) as any)
        await resend.emails.send({
          from: 'HousePadi Verification <onboarding@housepadi.example>',
          to: email,
          subject: 'Verify Your Vendor Account - HousePadi',
          html: emailHtml,
        })
      } catch (emailErr) {
        console.error('Failed to send OTP email:', emailErr)
      }
    }

    return { success: true, userId }
  } catch (error: any) {
    console.error('Vendor signup error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

export async function verifyVendorOTP(userId: string, code: string) {
  try {
    if (!userId || !code) {
      return { success: false, error: 'User ID and verification code are required.' }
    }

    const adminClient = createAdminClient()
    
    // 1. Fetch vendor profile
    const { data: vendor, error: fetchError } = await adminClient
      .from('vendor_profiles')
      .select('otp_code, business_name, id')
      .eq('id', userId)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!vendor) return { success: false, error: 'Vendor profile not found.' }

    if (vendor.otp_code !== code) {
      return { success: false, error: 'Invalid verification code.' }
    }

    // 2. Fetch email from profiles
    const { data: profile } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle()

    const email = profile?.email

    // 3. Update verification status
    const { error: updateError } = await adminClient
      .from('vendor_profiles')
      .update({ 
        is_verified: true, 
        otp_code: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) throw updateError

    // 4. Send Welcome Email
    if (email) {
      const resend = getResendClient()
      if (resend) {
        try {
          const emailHtml = await render(VendorWelcomeEmail({ businessName: vendor.business_name || 'Vendor' }) as any)
          await resend.emails.send({
            from: 'HousePadi <welcome@housepadi.example>',
            to: email,
            subject: 'Welcome to HousePadi!',
            html: emailHtml,
          })
        } catch (emailErr) {
          console.error('Failed to send Welcome email:', emailErr)
        }
      }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Verify Vendor OTP Error:', err)
    return { success: false, error: err.message || 'Failed to verify OTP.' }
  }
}

export async function resendVendorVerificationOTP(userId: string) {
  try {
    if (!userId) {
      return { success: false, error: 'User ID is required.' }
    }

    const adminClient = createAdminClient()
    
    // 1. Fetch vendor profile and check if already verified
    const { data: vendor, error: fetchError } = await adminClient
      .from('vendor_profiles')
      .select('is_verified, business_name')
      .eq('id', userId)
      .maybeSingle()

    if (fetchError || !vendor) {
      return { success: false, error: 'Vendor profile not found.' }
    }

    if (vendor.is_verified) {
      return { success: false, error: 'Vendor is already verified.' }
    }

    // 2. Fetch email
    const { data: profile } = await adminClient
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle()

    const email = profile?.email
    if (!email) {
      return { success: false, error: 'Email address not found.' }
    }

    // 3. Generate new OTP and update profile
    const otpCode = generateOTP()
    const { error: updateError } = await adminClient
      .from('vendor_profiles')
      .update({ otp_code: otpCode })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: 'Failed to update verification code.' }
    }

    // 4. Send email
    const resend = getResendClient()
    if (resend) {
      try {
        const emailHtml = await render(VendorOTPEmail({ businessName: vendor.business_name || 'Vendor', otpCode }) as any)
        await resend.emails.send({
          from: 'HousePadi Verification <onboarding@housepadi.example>',
          to: email,
          subject: 'Verify Your Vendor Account - HousePadi',
          html: emailHtml,
        })
      } catch (emailErr) {
        console.error('Failed to resend OTP email:', emailErr)
      }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Resend OTP Error:', err)
    return { success: false, error: err.message || 'Failed to resend OTP.' }
  }
}


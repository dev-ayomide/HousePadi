'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { ConsumerOTPEmail } from '@/lib/emails/ConsumerOTPEmail'

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

export interface ConsumerSession {
  id: string
  email: string
  created_at: string
}

/**
 * Register a new consumer account
 */
export async function signupConsumer(email: string, password: string) {
  try {
    if (!email || !password || password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' }
    }

    const adminClient = createAdminClient()

    // 1. Check if email already exists in profiles
    const { data: existingProfile, error: fetchError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (fetchError) throw fetchError
    if (existingProfile) {
      return { success: false, error: 'An account with this email already exists.' }
    }

    // 2. Create Auth User via Admin Client (so email_confirm can be bypassed/auto-confirmed in Auth, but we handle OTP manually in app layer)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'CONSUMER'
      }
    })

    if (authError) {
      const msg = authError.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return { success: false, error: 'An account with this email already exists.' }
      }
      throw authError
    }

    if (!authData.user) {
      throw new Error('Failed to create authentication user.')
    }

    const userId = authData.user.id

    // 3. Create global profile row
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        full_name: email.split('@')[0] || 'Consumer',
        role: 'CONSUMER',
        is_approved: true
      })

    if (profileError) {
      // Rollback Auth User
      await adminClient.auth.admin.deleteUser(userId)
      throw profileError
    }

    // 4. Create Consumer Profile Row with OTP Code
    const otpCode = generateOTP()
    const { error: consumerProfileError } = await adminClient
      .from('consumer_profiles')
      .insert({
        user_id: userId,
        full_name: email.split('@')[0] || 'Consumer',
        otp_code: otpCode,
        is_verified: false
      })

    if (consumerProfileError) {
      // Rollback Profile and Auth User
      await adminClient.from('profiles').delete().eq('id', userId)
      await adminClient.auth.admin.deleteUser(userId)
      throw consumerProfileError
    }

    // 5. Send OTP Email
    const resend = getResendClient()
    if (resend) {
      try {
        const emailHtml = await render(ConsumerOTPEmail({ email: email.toLowerCase(), otpCode }) as any)
        await resend.emails.send({
          from: 'HousePadi Verification <onboarding@housepadi.example>',
          to: email.toLowerCase(),
          subject: 'Verify Your Account - HousePadi',
          html: emailHtml,
        })
      } catch (emailErr) {
        console.error('Failed to send OTP email:', emailErr)
      }
    }

    // Attempt to automatically sign in the user so they have a session initialized while verifying
    const clientSupabase = await createClient()
    await clientSupabase.auth.signInWithPassword({ email, password })

    return { 
      success: true, 
      requireOtp: true,
      email: email.toLowerCase()
    }
  } catch (err: any) {
    console.error('Consumer Signup Error:', err)
    return { success: false, error: err.message || 'Failed to sign up.' }
  }
}

/**
 * Verify Consumer OTP
 */
export async function verifyConsumerOTP(email: string, code: string) {
  try {
    if (!email || !code) {
      return { success: false, error: 'Email and verification code are required.' }
    }

    const adminClient = createAdminClient()

    // 1. Fetch profiles by email to get user_id
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) {
      return { success: false, error: 'Account not found.' }
    }

    // 2. Fetch consumer profile
    const { data: consumerProfile, error: fetchError } = await adminClient
      .from('consumer_profiles')
      .select('*')
      .eq('user_id', profile.id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!consumerProfile) {
      return { success: false, error: 'Consumer profile not found.' }
    }

    if (consumerProfile.otp_code !== code) {
      return { success: false, error: 'Invalid verification code.' }
    }

    // 3. Mark as verified, clear OTP
    const { error: updateError } = await adminClient
      .from('consumer_profiles')
      .update({ 
        is_verified: true, 
        otp_code: null
      })
      .eq('user_id', profile.id)

    if (updateError) throw updateError

    // Retrieve active session details
    const clientSupabase = await createClient()
    const { data: { user } } = await clientSupabase.auth.getUser()

    return { 
      success: true, 
      consumer: { 
        id: profile.id, 
        email: email.toLowerCase(),
        created_at: user?.created_at || new Date().toISOString()
      } as ConsumerSession 
    }
  } catch (err: any) {
    console.error('Consumer OTP Verification Error:', err)
    return { success: false, error: err.message || 'Failed to verify OTP.' }
  }
}

/**
 * Log in a consumer
 */
export async function loginConsumer(email: string, password: string) {
  try {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' }
    }

    const clientSupabase = await createClient()

    // 1. Authenticate with standard Supabase Auth
    const { data: authData, error: authError } = await clientSupabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password
    })

    if (authError) {
      return { success: false, error: authError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'Invalid credentials.' }
    }

    const userId = authData.user.id
    const adminClient = createAdminClient()

    // 2. Fetch consumer profile
    const { data: consumerProfile, error: fetchError } = await adminClient
      .from('consumer_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) throw fetchError
    
    // Auto-create consumer profile if it doesn't exist for some reason
    if (!consumerProfile) {
      const otpCode = generateOTP()
      await adminClient
        .from('consumer_profiles')
        .insert({
          user_id: userId,
          full_name: email.split('@')[0] || 'Consumer',
          otp_code: otpCode,
          is_verified: false
        })

      const resend = getResendClient()
      if (resend) {
        try {
          const emailHtml = await render(ConsumerOTPEmail({ email: email.toLowerCase(), otpCode }) as any)
          await resend.emails.send({
            from: 'HousePadi Verification <onboarding@housepadi.example>',
            to: email.toLowerCase(),
            subject: 'Verify Your Account - HousePadi',
            html: emailHtml,
          })
        } catch (emailErr) {
          console.error('Failed to send OTP email:', emailErr)
        }
      }

      return { 
        success: true, 
        requireOtp: true,
        email: email.toLowerCase()
      }
    }

    // 3. Check verification status
    if (consumerProfile.is_verified === false) {
      const otpCode = generateOTP()
      await adminClient
        .from('consumer_profiles')
        .update({ otp_code: otpCode })
        .eq('user_id', userId)

      const resend = getResendClient()
      if (resend) {
        try {
          const emailHtml = await render(ConsumerOTPEmail({ email: email.toLowerCase(), otpCode }) as any)
          await resend.emails.send({
            from: 'HousePadi Verification <onboarding@housepadi.example>',
            to: email.toLowerCase(),
            subject: 'Verify Your Account - HousePadi',
            html: emailHtml,
          })
        } catch (emailErr) {
          console.error('Failed to send OTP email:', emailErr)
        }
      }

      return { 
        success: true, 
        requireOtp: true,
        email: email.toLowerCase()
      }
    }

    return { 
      success: true, 
      consumer: { 
        id: userId, 
        email: authData.user.email || email.toLowerCase(),
        created_at: authData.user.created_at
      } as ConsumerSession 
    }
  } catch (err: any) {
    console.error('Consumer Login Error:', err)
    return { success: false, error: err.message || 'Failed to log in.' }
  }
}

/**
 * Log out consumer
 */
export async function logoutConsumer() {
  try {
    const clientSupabase = await createClient()
    await clientSupabase.auth.signOut()
    return { success: true }
  } catch (err: any) {
    console.error('Consumer Logout Error:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Retrieve active consumer session
 */
export async function getCurrentConsumer() {
  try {
    const clientSupabase = await createClient()
    const { data: { user }, error: authError } = await clientSupabase.auth.getUser()

    if (authError || !user) {
      return { success: true, consumer: null }
    }

    // Verify they are a CONSUMER and verified
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile || profile.role !== 'CONSUMER') {
      return { success: true, consumer: null }
    }

    const { data: consumerProfile } = await adminClient
      .from('consumer_profiles')
      .select('is_verified')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!consumerProfile || !consumerProfile.is_verified) {
      return { success: true, consumer: null, requireOtp: true, email: user.email }
    }

    return { 
      success: true, 
      consumer: { 
        id: user.id, 
        email: user.email || '',
        created_at: user.created_at
      } as ConsumerSession 
    }
  } catch (err: any) {
    console.error('Get Current Consumer Error:', err)
    return { success: false, error: err.message }
  }
}

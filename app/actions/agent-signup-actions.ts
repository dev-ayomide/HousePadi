'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'node:crypto'
import { Resend } from 'resend'

function generateOTP(): string {
  const pin = Math.floor(100000 + Math.random() * 900000)
  return pin.toString()
}

export async function sendAgentOTP(email: string, fullName: string) {
  try {
    if (!email || !fullName) {
      return { success: false, error: 'Email and full name are required.' }
    }

    const supabase = createAdminClient()

    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return { success: false, error: 'An account is already registered with this email.' }
    }

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins

    const { error: insertError } = await supabase
      .from('signup_otps')
      .insert({
        email,
        otp,
        expires_at: expiresAt
      })

    if (insertError) {
      console.error('Error storing OTP:', insertError)
      return { success: false, error: 'Failed to generate verification code.' }
    }

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, cannot send email.')
      console.log('DEV OTP for', email, ':', otp)
      return { success: true }
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Agent Verification Code</title>
      </head>
      <body style="background-color: #050505; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 40px 0;">
        <div style="background-color: #111111; border: 1px solid #222222; margin: 0 auto; max-width: 600px; padding: 40px; border-radius: 8px;">
          
          <div style="margin-bottom: 20px;">
            <img src="https://housepadi.example/logo.svg" width="40" height="40" alt="HousePadi Logo" style="display: inline-block; vertical-align: middle; filter: brightness(0) invert(1);" />
            <span style="color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 0.3em; margin-left: 12px; text-transform: uppercase; display: inline-block; vertical-align: middle;">HOUSEPADI</span>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #222222; margin: 30px 0;" />
          
          <div style="margin-bottom: 40px;">
            <h2 style="color: #ffffff; font-size: 24px; font-weight: 300; letter-spacing: -0.02em; margin-bottom: 24px; margin-top: 0;">Agent Verification Code</h2>
            <p style="color: #888888; font-size: 14px; line-height: 24px; margin-bottom: 20px; font-weight: 300;">
              Hello ${fullName},
            </p>
            <p style="color: #888888; font-size: 14px; line-height: 24px; margin-bottom: 20px; font-weight: 300;">
              Thank you for registering as an Independent Agent on HousePadi. Please use the verification code below to complete your registration. This code will expire in 10 minutes.
            </p>
            
            <div style="background-color: #000000; border: 1px solid #333333; padding: 24px; border-radius: 4px; text-align: center; margin: 30px 0;">
              <span style="color: #555555; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">Verification Code</span>
              <strong style="color: #ffffff; font-size: 28px; font-family: monospace; letter-spacing: 3px;">${otp}</strong>
            </div>
            
          </div>
          
          <hr style="border: 0; border-top: 1px solid #222222; margin: 30px 0;" />
          
          <div style="text-align: center;">
            <p style="color: #555555; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
              &copy; ${new Date().getFullYear()} HousePadi. The spatial evolution of real estate.
            </p>
          </div>
          
        </div>
      </body>
      </html>
    `

    await resend.emails.send({
      from: 'HousePadi Agent Portal <security@housepadi.example>',
      to: email,
      subject: 'Verification Code - HousePadi Agent',
      html: htmlContent,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Send Agent OTP error:', error)
    return { success: false, error: error.message || 'An unexpected server error occurred.' }
  }
}

export async function signUpAsIndividualAgent(formData: FormData) {
  try {
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const phone = formData.get('phone') as string
    const otp = formData.get('otp') as string
    const avatarUrl = formData.get('avatarUrl') as string
    const tagline = formData.get('tagline') as string
    const website = formData.get('website') as string

    if (!fullName || !email || !password || !otp || !avatarUrl || !tagline) {
      return { success: false, error: 'Please provide all required fields.' }
    }

    const supabase = createAdminClient()

    // 1. Check if email already exists in profiles
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return { success: false, error: 'An account with this email is already registered.' }
    }

    // 2. Check OTP
    const { data: otpRecords, error: otpError } = await supabase
      .from('signup_otps')
      .select('id, expires_at')
      .eq('email', email)
      .eq('otp', otp)
      .order('created_at', { ascending: false })
      .limit(1)

    if (otpError || !otpRecords || otpRecords.length === 0) {
      return { success: false, error: 'Invalid verification code.' }
    }

    const record = otpRecords[0]
    if (new Date(record.expires_at) < new Date()) {
      return { success: false, error: 'Verification code has expired. Please request a new one.' }
    }

    // 3. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        role: 'AGENT',
        full_name: fullName
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

    // 4. Create shadow auth user for Personal Agency
    const shadowEmail = `personal-agency-${userId}@housepadi.example`
    const { data: shadowAuthData, error: shadowAuthError } = await supabase.auth.admin.createUser({
      email: shadowEmail,
      password: crypto.randomBytes(16).toString('hex'),
      email_confirm: true,
      user_metadata: {
        role: 'AGENCY',
        full_name: `${fullName} (Personal Agency)`
      }
    })

    if (shadowAuthError) {
      await supabase.auth.admin.deleteUser(userId)
      throw shadowAuthError
    }

    if (!shadowAuthData.user) {
      await supabase.auth.admin.deleteUser(userId)
      throw new Error('Failed to create shadow agency user.')
    }

    const personalAgencyId = shadowAuthData.user.id

    // 5. Create a Personal Agency profile row
    const { error: agencyProfileError } = await supabase
      .from('profiles')
      .insert({
        id: personalAgencyId,
        email: shadowEmail,
        full_name: `${fullName} (Personal Agency)`,
        role: 'AGENCY',
        is_personal: true,
        suspended: false,
        is_approved: true,
        phone_number: phone || null
      })

    if (agencyProfileError) {
      await supabase.auth.admin.deleteUser(personalAgencyId)
      await supabase.auth.admin.deleteUser(userId)
      throw agencyProfileError
    }

    // 6. Create default subscription for the Personal Agency (Freelancer Plan)
    const { data: freelancerPlan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('name', 'Freelancer')
      .eq('plan_type', 'agent')
      .maybeSingle()

    if (freelancerPlan) {
      await supabase.from('agency_subscriptions').insert({
        agency_id: personalAgencyId,
        plan_id: freelancerPlan.id,
        status: 'active',
        current_period_end: new Date(Date.now() + 36500 * 24 * 60 * 60 * 1000).toISOString() // 100 years
      })
    }

    // 7. Create Agent Profile Row linked to the Personal Agency
    const { error: agentProfileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        role: 'AGENT',
        agency_id: personalAgencyId,
        suspended: false,
        is_approved: true,
        phone_number: phone || null,
        is_personal: true,
        avatar_url: avatarUrl,
        tagline: tagline,
        website_url: website || null
      })

    if (agentProfileError) {
      await supabase.from('profiles').delete().eq('id', personalAgencyId)
      await supabase.auth.admin.deleteUser(personalAgencyId)
      await supabase.auth.admin.deleteUser(userId)
      throw agentProfileError
    }

    // 8. Delete used OTPs for this email
    await supabase.from('signup_otps').delete().eq('email', email)

    return { success: true }
  } catch (error: any) {
    console.error('Agent signup error:', error)
    return { success: false, error: error.message || 'An unexpected error occurred.' }
  }
}

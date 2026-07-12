'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { Resend } from 'resend'

function generateOTP(): string {
  const pin = Math.floor(100000 + Math.random() * 900000)
  return pin.toString()
}

export async function sendDeveloperOTP(email: string, fullName: string) {
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
      // In dev environment without resend, we might want to log the OTP
      console.log('DEV OTP for', email, ':', otp)
      return { success: true }
    }

    const resend = new Resend(process.env.RESEND_API_KEY)

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Developer Verification Code</title>
      </head>
      <body style="background-color: #050505; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 40px 0;">
        <div style="background-color: #111111; border: 1px solid #222222; margin: 0 auto; max-width: 600px; padding: 40px; border-radius: 8px;">
          
          <div style="margin-bottom: 20px;">
            <img src="https://housepadi.example/logo.svg" width="40" height="40" alt="HousePadi Logo" style="display: inline-block; vertical-align: middle; filter: brightness(0) invert(1);" />
            <span style="color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 0.3em; margin-left: 12px; text-transform: uppercase; display: inline-block; vertical-align: middle;">HOUSEPADI</span>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #222222; margin: 30px 0;" />
          
          <div style="margin-bottom: 40px;">
            <h2 style="color: #ffffff; font-size: 24px; font-weight: 300; letter-spacing: -0.02em; margin-bottom: 24px; margin-top: 0;">Developer Verification Code</h2>
            <p style="color: #888888; font-size: 14px; line-height: 24px; margin-bottom: 20px; font-weight: 300;">
              Hello ${fullName},
            </p>
            <p style="color: #888888; font-size: 14px; line-height: 24px; margin-bottom: 20px; font-weight: 300;">
              Thank you for registering as a Developer on HousePadi. Please use the verification code below to complete your registration. This code will expire in 10 minutes.
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
      from: 'HousePadi Developer Portal <security@housepadi.example>',
      to: email,
      subject: 'Verification Code - HousePadi Developer',
      html: htmlContent,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Send OTP error:', error)
    return { success: false, error: error.message || 'An unexpected server error occurred.' }
  }
}

export async function verifyDeveloperOTPAndRegister(formData: FormData) {
  try {
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const otp = formData.get('otp') as string
    const companyName = formData.get('companyName') as string | null

    if (!email || !fullName || !password || !otp) {
      return { success: false, error: 'All fields are required.' }
    }

    const supabase = createAdminClient()

    // Check OTP
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

    // OTP is valid. Register user.
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (authError || !authData.user) {
      console.error('Create user error:', authError)
      return { success: false, error: authError?.message || 'Failed to create user account.' }
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: fullName,
        role: 'DEVELOPER',
        is_approved: true, // Developers auto-approved
        suspended: false,
        tagline: companyName || null
      })

    if (profileError) {
      console.error('Create profile error:', profileError)
      // Cleanup the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return { success: false, error: 'Failed to initialize developer profile.' }
    }

    // Delete used OTPs for this email
    await supabase.from('signup_otps').delete().eq('email', email)

    return { success: true }
  } catch (error: any) {
    console.error('Verify OTP and register error:', error)
    return { success: false, error: error.message || 'An unexpected server error occurred.' }
  }
}

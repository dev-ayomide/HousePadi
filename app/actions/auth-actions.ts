'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

function generateTemporaryPassword(): string {
  const pin = Math.floor(100000 + Math.random() * 900000)
  return `PX-${pin}`
}

export async function requestTemporaryPassword(email: string) {
  try {
    if (!email) {
      return { success: false, error: 'Email address is required.' }
    }

    const supabase = createAdminClient()

    // 1. Verify if user profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('email', email)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return { success: false, error: 'A database error occurred.' }
    }

    if (!profile) {
      return { success: false, error: 'No account registered with this email.' }
    }

    // Block unverified vendors from bypassing OTP via password reset
    if (profile.role === 'PRODUCT_VENDOR' || profile.role === 'product_vendor') {
      const { data: vendorProfile } = await supabase
        .from('vendor_profiles')
        .select('is_verified')
        .eq('id', profile.id)
        .maybeSingle()

      if (!vendorProfile?.is_verified) {
        return { success: false, error: 'Your vendor account is not verified. Please verify your email first.' }
      }
    }

    // 2. Generate temporary password
    const tempPassword = generateTemporaryPassword()

    // 3. Update the user's password in Supabase Auth via Admin Client
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.id,
      { password: tempPassword }
    )

    if (updateError) {
      console.error('Error updating user password:', updateError)
      return { success: false, error: 'Failed to generate temporary security credentials.' }
    }

    // 4. Send the email with Resend
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured, cannot send email.')
      return { success: false, error: 'Email service configuration is missing on the server.' }
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const clientName = profile.full_name || 'User'

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Temporary Security Key</title>
      </head>
      <body style="background-color: #050505; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 40px 0;">
        <div style="background-color: #111111; border: 1px solid #222222; margin: 0 auto; max-width: 600px; padding: 40px; border-radius: 8px;">
          
          <!-- Logo / Brand Header -->
          <div style="margin-bottom: 20px;">
            <img src="https://housepadi.example/logo.svg" width="40" height="40" alt="HousePadi Logo" style="display: inline-block; vertical-align: middle; filter: brightness(0) invert(1);" />
            <span style="color: #ffffff; font-size: 12px; font-weight: 700; letter-spacing: 0.3em; margin-left: 12px; text-transform: uppercase; display: inline-block; vertical-align: middle;">HOUSEPADI</span>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #222222; margin: 30px 0;" />
          
          <!-- Message Content -->
          <div style="margin-bottom: 40px;">
            <h2 style="color: #ffffff; font-size: 24px; font-weight: 300; letter-spacing: -0.02em; margin-bottom: 24px; margin-top: 0;">Temporary Security Key</h2>
            <p style="color: #888888; font-size: 14px; line-height: 24px; margin-bottom: 20px; font-weight: 300;">
              Hello ${clientName},
            </p>
            <p style="color: #888888; font-size: 14px; line-height: 24px; margin-bottom: 20px; font-weight: 300;">
              We received a request to recover your account credentials. A temporary security key has been generated for you to log back into the secure access gateway. 
            </p>
            <p style="color: #888888; font-size: 14px; line-height: 24px; margin-bottom: 20px; font-weight: 300;">
              Please use this key to authenticate, and make sure to change it in your settings immediately.
            </p>
            
            <!-- Code Box -->
            <div style="background-color: #000000; border: 1px solid #333333; padding: 24px; border-radius: 4px; text-align: center; margin: 30px 0;">
              <span style="color: #555555; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">Temporary Security Key</span>
              <strong style="color: #ffffff; font-size: 28px; font-family: monospace; letter-spacing: 3px;">${tempPassword}</strong>
            </div>
            
            <p style="color: #555555; font-size: 11px; line-height: 20px; font-weight: 300; margin-top: 30px;">
              If you did not request this recovery, please access your profile immediately using your credentials to secure your account.
            </p>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #222222; margin: 30px 0;" />
          
          <!-- Footer -->
          <div style="text-align: center;">
            <p style="color: #555555; font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin: 0;">
              &copy; 2026 HousePadi. The spatial evolution of real estate.
            </p>
          </div>
          
        </div>
      </body>
      </html>
    `

    await resend.emails.send({
      from: 'HousePadi Security <security@housepadi.example>',
      to: email,
      subject: 'Temporary Security Key - HousePadi',
      html: htmlContent,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Request temporary password error:', error)
    return { success: false, error: error.message || 'An unexpected server error occurred.' }
  }
}

export async function updateUserPassword(newPassword: string) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, error: 'You must be logged in to change your password.' }
    }

    const adminClient = createAdminClient()
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Password update error:', updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Unexpected password update error:', error)
    return { success: false, error: error.message || 'An unexpected server error occurred.' }
  }
}

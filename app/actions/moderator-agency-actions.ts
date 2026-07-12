'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { AgencyApprovedEmail } from '@/lib/emails/AgencyApprovedEmail'
import { AgencyRevokedEmail } from '@/lib/emails/AgencyRevokedEmail'

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not defined in environment variables.')
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export async function approveAgency(agencyId: string, moderatorId: string, agencyEmail: string, agencyName: string, notes?: string) {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        agency_status: 'approved',
        suspended: false, // Unblock login
        is_approved: true,
        reviewed_by: moderatorId,
        reviewed_at: new Date().toISOString(),
        approval_notes: notes || null
      })
      .eq('id', agencyId)

    if (error) throw error

    // Send Approval Email
    const resend = getResendClient()
    if (resend) {
      try {
        const emailHtml = await render(AgencyApprovedEmail({ agencyName: agencyName || 'Agency Partner' }))
        await resend.emails.send({
          from: 'HousePadi Network <Fumz@housepadi.example>',
          to: agencyEmail,
          subject: 'Account Approved - Welcome to HousePadi',
          html: emailHtml,
        })
      } catch (e) {
        console.error('Failed to send approval email', e)
      }
    }

    revalidatePath('/admin/agencies')
    return { success: true }
  } catch (err: any) {
    console.error('Approve agency error:', err)
    return { success: false, error: err.message }
  }
}

export async function revokeAgency(agencyId: string, moderatorId: string, agencyEmail: string, agencyName: string, notes?: string) {
  try {
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        agency_status: 'revoked',
        suspended: true, // Keep login blocked
        is_approved: false,
        reviewed_by: moderatorId,
        reviewed_at: new Date().toISOString(),
        approval_notes: notes || null
      })
      .eq('id', agencyId)

    if (error) throw error

    // Send Rejection/Revoked Email
    const resend = getResendClient()
    if (resend) {
      try {
        const emailHtml = await render(AgencyRevokedEmail({ agencyName: agencyName || 'Applicant' }))
        await resend.emails.send({
          from: 'HousePadi Network <network@housepadi.example>',
          to: agencyEmail,
          subject: 'Application Update - HousePadi',
          html: emailHtml,
        })
      } catch (e) {
        console.error('Failed to send revocation email', e)
      }
    }

    revalidatePath('/admin/agencies')
    return { success: true }
  } catch (err: any) {
    console.error('Revoke agency error:', err)
    return { success: false, error: err.message }
  }
}

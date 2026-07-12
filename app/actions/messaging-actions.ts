'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { getCurrentConsumer } from './consumer-auth-actions'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface BroadcastData {
  subject: string
  body: string
  priority: 'NORMAL' | 'IMPORTANT' | 'CRITICAL'
  broadcastType: 'SYSTEM' | 'EMAIL'
  recipientGroup: 'AGENCIES' | 'AGENTS' | 'CLIENTS' | 'MODERATORS' | 'VENDORS' | 'ALL'
  expiryDate?: string
}

async function getRecipientsByGroup(group: string) {
  const supabase = createAdminClient()
  // A simplistic mapping, adapt to actual tables
  // We fetch consumer_accounts and map to specific roles if needed
  // This is a naive approach assuming standard users, agents, agencies.
  
  // NOTE: For 'AGENCIES', 'AGENTS', 'CLIENTS', since consumer_account handles all clients...
  // In HousePadi, we'll fetch from consumer_account for clients, 
  // and agent/agency tables for agents/agencies if they exist separately.
  // For simplicity here, we assume consumer_account is standard clients,
  // and there are 'agencies' and 'agents' tables (or unified role system).
  
  let recipients: { id: string, email: string, role: string }[] = []

  if (group === 'CLIENTS' || group === 'ALL') {
    const { data } = await supabase.from('profiles').select('id, email').eq('role', 'CONSUMER')
    if (data) {
      recipients.push(...data.map(d => ({ id: d.id, email: d.email, role: 'CLIENT' })))
    }
  }
  
  if (group === 'AGENTS' || group === 'ALL') {
    const { data } = await supabase.from('profiles').select('id, email').eq('role', 'AGENT')
    if (data) {
      recipients.push(...data.map((d: any) => ({ id: d.id, email: d.email, role: 'AGENT' })))
    }
  }

  if (group === 'AGENCIES' || group === 'ALL') {
    const { data } = await supabase.from('profiles').select('id, email').eq('role', 'AGENCY')
    if (data) {
      recipients.push(...data.map((d: any) => ({ id: d.id, email: d.email, role: 'AGENCY' })))
    }
  }

  if (group === 'MODERATORS' || group === 'ALL') {
    const { data } = await supabase.from('profiles').select('id, email').in('role', ['MODERATOR', 'super_admin'])
    if (data) {
      recipients.push(...data.map((d: any) => ({ id: d.id, email: d.email, role: 'MODERATOR' })))
    }
  }

  if (group === 'VENDORS' || group === 'ALL') {
    const { data } = await supabase.from('profiles').select('id, email').eq('role', 'PRODUCT_VENDOR')
    if (data) {
      recipients.push(...data.map((d: any) => ({ id: d.id, email: d.email, role: 'PRODUCT_VENDOR' })))
    }
  }

  // Deduplicate by email just in case
  const uniqueRecipients = Array.from(new Map(recipients.map(r => [r.email, r])).values())
  return uniqueRecipients
}

export async function sendBroadcast(data: BroadcastData, moderatorId: string) {
  try {
    const supabase = createAdminClient()

    // 1. Create the broadcast record
    const { data: broadcast, error: broadcastErr } = await supabase
      .from('moderator_broadcasts')
      .insert([{
        subject: data.subject,
        body: data.body,
        priority: data.priority,
        broadcast_type: data.broadcastType,
        recipient_group: data.recipientGroup,
        moderator_id: moderatorId,
        expiry_date: data.expiryDate || null
      }])
      .select('id')
      .single()

    if (broadcastErr) throw broadcastErr

    // 2. Fetch target recipients
    const recipients = await getRecipientsByGroup(data.recipientGroup)

    if (data.broadcastType === 'SYSTEM') {
      // 3a. Insert System Notifications
      const notifications = recipients.map(r => ({
        broadcast_id: broadcast.id,
        user_id: r.id,
        user_role: r.role,
        subject: data.subject,
        body: data.body,
        priority: data.priority,
        expiry_date: data.expiryDate || null
      }))

      // Batch insert in chunks if needed
      for (let i = 0; i < notifications.length; i += 500) {
        const chunk = notifications.slice(i, i + 500)
        await supabase.from('system_notifications').insert(chunk)
      }
    } else if (data.broadcastType === 'EMAIL') {
      // 3b. Dispatch Emails and Insert Logs
      for (const r of recipients) {
        let status = 'PENDING'
        let failReason = null

        if (resend) {
          try {
            const { error: emailErr } = await resend.emails.send({
              from: 'HousePadi <noreply@housepadi.example>',
              to: r.email,
              subject: data.subject,
              html: `<div>
                <p>Hello,</p>
                <div style="margin:20px 0;white-space:pre-wrap;">${data.body}</div>
                <p>Best,<br>HousePadi Team</p>
              </div>`
            })

            if (emailErr) {
              status = 'FAILED'
              failReason = emailErr.message
            } else {
              status = 'DELIVERED'
            }
          } catch (e: any) {
            status = 'FAILED'
            failReason = e.message
          }
        } else {
          status = 'FAILED'
          failReason = 'Resend client not initialized.'
        }

        await supabase.from('email_broadcast_logs').insert([{
          broadcast_id: broadcast.id,
          recipient_email: r.email,
          delivery_status: status,
          failure_reason: failReason
        }])
      }
    }

    revalidatePath('/admin/messaging')
    return { success: true }
  } catch (err: any) {
    console.error('Broadcast Error:', err)
    return { success: false, error: err.message }
  }
}

export async function getUserNotifications(userId: string) {
  try {
    // 1. Verify Authorization
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    
    let isAuthorized = false
    if (authData?.user && authData.user.id === userId) {
      isAuthorized = true
    } else {
      const res = await getCurrentConsumer()
      if (res.success && res.consumer && res.consumer.id === userId) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return { success: false, error: 'Unauthorized access to notifications.' }
    }

    // 2. Fetch using Admin Client to bypass RLS for consumers
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('system_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getUserNotifications Supabase error:', error)
      throw error
    }
    
    // Filter expired notifications
    const now = new Date()
    const validData = data?.filter(n => !n.expiry_date || new Date(n.expiry_date) > now) || []

    return { success: true, data: validData }
  } catch (err: any) {
    console.error('getUserNotifications exception:', err)
    return { success: false, error: err.message }
  }
}

export async function markNotificationRead(id: string) {
  try {
    const adminClient = createAdminClient()
    
    // 1. Fetch to verify ownership
    const { data: notif, error: fetchErr } = await adminClient.from('system_notifications').select('user_id').eq('id', id).single()
    if (fetchErr || !notif) throw new Error('Notification not found')

    // 2. Verify Authorization
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    
    let isAuthorized = false
    if (authData?.user && authData.user.id === notif.user_id) {
      isAuthorized = true
    } else {
      const res = await getCurrentConsumer()
      if (res.success && res.consumer && res.consumer.id === notif.user_id) {
        isAuthorized = true
      }
    }

    if (!isAuthorized) throw new Error('Unauthorized')

    // 3. Update using Admin Client
    const { error } = await adminClient
      .from('system_notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (error) throw error
    revalidatePath('/notifications')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function getBroadcastHistory() {
  try {
    const supabase = createAdminClient()
    const { data: broadcasts, error } = await supabase
      .from('moderator_broadcasts')
      .select(`
        *,
        system_notifications ( id, is_read ),
        email_broadcast_logs ( id, delivery_status )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // Process aggregated stats
    const history = broadcasts.map(b => {
      if (b.broadcast_type === 'SYSTEM') {
        const total = b.system_notifications?.length || 0
        const read = b.system_notifications?.filter((n: any) => n.is_read).length || 0
        return { ...b, stats: { total, read, unread: total - read } }
      } else {
        const total = b.email_broadcast_logs?.length || 0
        const delivered = b.email_broadcast_logs?.filter((n: any) => n.delivery_status === 'DELIVERED').length || 0
        const failed = b.email_broadcast_logs?.filter((n: any) => n.delivery_status === 'FAILED').length || 0
        return { ...b, stats: { total, delivered, failed } }
      }
    })

    return { success: true, data: history }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

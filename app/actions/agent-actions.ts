'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { AgentProvisionedEmail } from '@/lib/emails/AgentProvisionedEmail'

const getResendClient = () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not defined in environment variables.')
    return null
  }
  return new Resend(process.env.RESEND_API_KEY)
}

export async function provisionAgent(agentData: { 
  full_name: string, 
  email: string, 
  agency_id: string 
}) {
  try {
    const supabase = createAdminClient()

    // 1. Get Agency Profile & Subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', agentData.agency_id)
      .single()

    const agencyName = profile?.full_name || 'Agency Partner'

    const { data: sub } = await supabase
      .from('agency_subscriptions')
      .select('custom_agent_limit, subscription_plans(*)')
      .eq('agency_id', agentData.agency_id)
      .single()

    let maxAgents = 0
    let planTitle = 'current'
    if (sub && sub.subscription_plans) {
      const plan = Array.isArray(sub.subscription_plans) ? sub.subscription_plans[0] : sub.subscription_plans
      maxAgents = sub.custom_agent_limit ?? plan.agent_limit
      planTitle = plan.name
    }

    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', agentData.agency_id)
      .eq('role', 'AGENT')

    if (countError) throw countError

    if (count !== null && count >= maxAgents) {
      return { 
        success: false, 
        error: `Agent limit reached. Your ${planTitle} plan allows a maximum of ${maxAgents} agents.` 
      }
    }

    // 2. Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-10)

    // 3. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: agentData.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { 
        full_name: agentData.full_name,
        agency_id: agentData.agency_id 
      }
    })

    if (authError) {
      const msg = authError.message.toLowerCase()
      if (msg.includes('already registered') || msg.includes('already exists')) {
        return { success: false, error: 'An agent with this email is already registered.' }
      }
      throw authError
    }

    // 4. Create Profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: agentData.email,
        full_name: agentData.full_name,
        role: 'AGENT',
        agency_id: agentData.agency_id,
        is_approved: true // Agency-created agents are pre-approved
      })

    if (profileError) {
      // Rollback auth user
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    // 5. Send Email
    const resend = getResendClient()
    if (resend) {
      try {
        const emailHtml = await render(
          AgentProvisionedEmail({ 
            agentName: agentData.full_name,
            agencyName: agencyName,
            agentEmail: agentData.email,
            tempPassword: tempPassword
          }) as any
        )
        
        await resend.emails.send({
          from: 'HousePadi Network <network@housepadi.example>',
          to: agentData.email,
          subject: `You have been invited to join ${agencyName} on HousePadi`,
          html: emailHtml,
        })
      } catch (e) {
        console.error('Failed to send provision email', e)
      }
    }

    revalidatePath('/agency/agents')
    // Note: No longer returning the password to the client side.
    return { success: true }
  } catch (err: any) {
    console.error('Agent Provisioning Error:', err)
    return { success: false, error: err.message || 'Internal System Error' }
  }
}

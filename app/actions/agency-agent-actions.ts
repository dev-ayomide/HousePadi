'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Toggle agent suspension (Agency side)
export async function toggleAgentSuspension(agentId: string, currentStatus: boolean) {
  try {
    const supabase = await createClient()
    
    // Verify the user is an agency and owns this agent
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: agent } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', agentId)
      .single()

    if (!agent || agent.agency_id !== user.id || agent.role !== 'AGENT') {
      throw new Error('Unauthorized: Cannot modify this agent')
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('profiles')
      .update({ suspended: !currentStatus })
      .eq('id', agentId)

    if (error) throw error

    revalidatePath('/agency/agents')
    return { success: true, newStatus: !currentStatus }
  } catch (err: any) {
    console.error('Toggle Agent Suspension Error:', err)
    return { success: false, error: err.message }
  }
}

// Delete agent (Agency side)
export async function deleteAgent(agentId: string) {
  try {
    const supabase = await createClient()
    
    // Verify ownership
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: agent } = await supabase
      .from('profiles')
      .select('agency_id, role')
      .eq('id', agentId)
      .single()

    if (!agent || agent.agency_id !== user.id || agent.role !== 'AGENT') {
      throw new Error('Unauthorized: Cannot delete this agent')
    }

    const adminClient = createAdminClient()
    
    // First, delete from auth.users (this will cascade to profiles if setup correctly)
    const { error } = await adminClient.auth.admin.deleteUser(agentId)

    if (error) {
      // Fallback
      const { error: profileError } = await adminClient
        .from('profiles')
        .delete()
        .eq('id', agentId)
      if (profileError) throw profileError
    }

    revalidatePath('/agency/agents')
    return { success: true }
  } catch (err: any) {
    console.error('Delete Agent Error:', err)
    return { success: false, error: err.message }
  }
}

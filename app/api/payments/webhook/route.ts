import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const CONSUMER_TIER_UPGRADE_SENTINEL_LISTING_ID = 'c0000000-c000-c000-c000-c00000000000'
const SUCCESS_STATUS_TOKENS = ['success', 'successful', 'completed', 'paid']

/**
 * Handles the sandbox "simulate transfer received" flow from /explore/payment, and acts as a
 * secondary confirmation path if ALATPay calls back directly. The primary confirmation path is
 * the status-poll in /explore/payment (via checkTransactionStatus), because ALATPay's real
 * webhook payload shape isn't confirmed by public docs. No signature verification is applied
 * here for the same reason — add it once ALATPay's webhook signing scheme is documented.
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null)
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Malformed JSON payload.' }, { status: 400 })
    }

    const reference = payload.reference || payload.data?.reference || payload.transactionId || payload.data?.transactionId
    const status = payload.status || payload.data?.status

    if (!reference) {
      return NextResponse.json({ success: false, error: 'Missing transaction reference.' }, { status: 400 })
    }

    const isSuccess = typeof status === 'string'
      ? SUCCESS_STATUS_TOKENS.includes(status.toLowerCase())
      : payload.event === 'charge.success'

    if (!isSuccess) {
      return NextResponse.json({ success: true, ignored: true })
    }

    const adminClient = createAdminClient()

    const { data: txRecord, error: txError } = await adminClient
      .from('payment_transaction')
      .update({
        status: 'SUCCESSFUL',
        updated_at: new Date().toISOString()
      })
      .eq('paystack_reference', reference)
      .select()
      .maybeSingle()

    if (txError) {
      console.error('Failed to update payment_transaction state:', txError)
      return NextResponse.json({ success: false, error: 'Database update failed.' }, { status: 500 })
    }

    if (!txRecord) {
      console.error(`Transaction record not found in DB for reference: ${reference}`)
      return NextResponse.json({ success: false, error: 'Transaction reference not found.' }, { status: 404 })
    }

    const isTierUpgrade = txRecord.listing_id === CONSUMER_TIER_UPGRADE_SENTINEL_LISTING_ID

    if (isTierUpgrade) {
      const { error: tierError } = await adminClient
        .from('consumer_profiles')
        .update({
          tier: txRecord.listing_type
        })
        .eq('user_id', txRecord.consumer_id)

      if (tierError) {
        console.error('Failed to update consumer tier profile:', tierError)
      }
    } else if (txRecord.payment_type === 'CONTACT') {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const { error: permError } = await adminClient
        .from('contact_access_permissions')
        .upsert({
          user_id: txRecord.consumer_id,
          listing_id: txRecord.listing_id,
          payment_id: reference,
          expires_at: expiresAt
        }, {
          onConflict: 'user_id,listing_id'
        })

      if (permError) {
        console.error('Failed to insert/upsert contact_access_permissions:', permError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Payment Webhook Handler Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal webhook error.' }, { status: 500 })
  }
}

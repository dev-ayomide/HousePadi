import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentConsumer } from '@/app/actions/consumer-auth-actions'
import { generateVirtualAccount, isAlatPayConfigured } from '@/lib/payments/alatpay'
import crypto from 'node:crypto'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { listingId, listingType, paymentType, requestedDate } = body

    if (!listingId || !listingType || !paymentType) {
      return NextResponse.json({ success: false, error: 'Missing required parameters.' }, { status: 400 })
    }

    if (paymentType !== 'CONTACT' && paymentType !== 'CONSUMER_TIER_UPGRADE') {
      return NextResponse.json({ success: false, error: 'Payment type not supported.' }, { status: 400 })
    }

    // 1. Authenticate consumer/user
    let consumerId = ''
    let consumerEmail = ''

    const sessionRes = await getCurrentConsumer()
    const { createClient } = await import('@/lib/supabase/server')
    const supabaseUser = await createClient()
    const { data: { user } } = await supabaseUser.auth.getUser()

    if (sessionRes.success && sessionRes.consumer) {
      consumerId = sessionRes.consumer.id
      consumerEmail = sessionRes.consumer.email
    } else if (user) {
      consumerId = user.id
      consumerEmail = user.email || ''
    }

    if (!consumerId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Login required.' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    let amount = 0
    if (paymentType === 'CONSUMER_TIER_UPGRADE') {
      if (listingType === 'PREMIUM') amount = 5000
      else if (listingType === 'PRO') amount = 15000
      else {
        return NextResponse.json({ success: false, error: 'Invalid target tier selected.' }, { status: 400 })
      }
    } else {
      // 2. Fetch fee from Registry
      const { data: registryItem, error: registryError } = await adminClient
        .from('listing_type_registry')
        .select('contact_fee')
        .eq('slug', listingType)
        .maybeSingle()

      if (registryError || !registryItem) {
        return NextResponse.json({ success: false, error: 'Listing category registry item not found.' }, { status: 404 })
      }

      amount = Number(registryItem.contact_fee)
    }

    if (amount <= 0) {
      return NextResponse.json({ success: false, error: 'This action does not require payment (fee is 0).' }, { status: 400 })
    }

    // 3. Bypass foreign key constraints by ensuring consumer_profile exists
    const { data: existingConsumer } = await adminClient
      .from('consumer_profiles')
      .select('user_id')
      .eq('user_id', consumerId)
      .maybeSingle()

    if (!existingConsumer) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(consumerId).catch(() => ({ data: { user: null } }))
      const userEmail = authUser?.user?.email || consumerEmail || `dummy_${consumerId.substring(0,8)}@housepadi.internal`

      // Ensure global profile exists
      await adminClient.from('profiles').upsert({
        id: consumerId,
        email: userEmail.toLowerCase(),
        full_name: userEmail.split('@')[0],
        role: 'CONSUMER',
        is_approved: true
      }, { onConflict: 'id' })

      await adminClient.from('consumer_profiles').insert({
        user_id: consumerId,
        full_name: userEmail.split('@')[0],
        is_verified: true
      })
    }

    // 4. Generate a virtual account via ALATPay, or fall back to a local sandbox reference
    // when ALATPay credentials aren't configured.
    const orderId = 'HP_' + crypto.randomBytes(8).toString('hex').toUpperCase()
    let reference = orderId
    let accountNumber = ''
    let bankName = ''
    let expiresAt = ''

    if (isAlatPayConfigured()) {
      try {
        const account = await generateVirtualAccount({
          amount,
          orderId,
          description: paymentType === 'CONSUMER_TIER_UPGRADE'
            ? `HousePadi tier upgrade (${listingType})`
            : `HousePadi contact reveal (${listingType})`,
          customer: { email: consumerEmail || `dummy_${consumerId.substring(0, 8)}@housepadi.internal` }
        })
        // ALATPay's own transactionId becomes our canonical reference from here on.
        reference = account.transactionId
        accountNumber = account.virtualBankAccountNumber
        bankName = account.bankName || ''
        expiresAt = account.expiredAt || ''
      } catch (alatpayErr) {
        console.error('Failed to generate ALATPay virtual account, falling back to sandbox flow:', alatpayErr)
      }
    }

    // 5. Create pending transaction row in payment_transaction
    const { error: insertError } = await adminClient
      .from('payment_transaction')
      .insert([
        {
          paystack_reference: reference,
          consumer_id: consumerId,
          listing_id: paymentType === 'CONSUMER_TIER_UPGRADE' ? 'c0000000-c000-c000-c000-c00000000000' : listingId,
          listing_type: listingType,
          amount,
          status: 'PENDING',
          payment_type: 'CONTACT'
        }
      ])

    if (insertError) {
      throw insertError
    }

    const params = new URLSearchParams({
      reference,
      amount: String(amount),
      type: paymentType,
      consumerId,
      listingId,
      listingType,
      requestedDate: requestedDate || '',
    })
    if (accountNumber) {
      params.set('accountNumber', accountNumber)
      params.set('bankName', bankName)
      params.set('expiresAt', expiresAt)
    }

    return NextResponse.json({
      success: true,
      authorization_url: `/explore/payment?${params.toString()}`,
      reference
    })
  } catch (err: any) {
    console.error('Initialize Transaction Route Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal server error.' }, { status: 500 })
  }
}

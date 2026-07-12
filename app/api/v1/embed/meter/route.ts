import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'node:crypto'

function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

function extractDomain(urlStr: string): string {
  try {
    const url = new URL(urlStr)
    return url.hostname.toLowerCase()
  } catch (e) {
    // Fallback if not a fully qualified URL
    return urlStr.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase()
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { apiKey, origin } = body
    const refererHeader = req.headers.get('referer')
    const originHeader = req.headers.get('origin')

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'Missing parameter: "apiKey" is required.' }, { status: 400 })
    }

    const keyHash = hashApiKey(apiKey)
    const adminClient = createAdminClient()

    // 1. Authenticate and retrieve billing limits
    const { data: keyRecord, error: keyError } = await adminClient
      .from('api_keys')
      .select(`
        id,
        is_active,
        current_period_calls_count,
        allowed_domain,
        billing_tiers (
          name,
          included_calls
        )
      `)
      .eq('key_hash', keyHash)
      .maybeSingle()

    if (keyError || !keyRecord) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid developer API key.' }, { status: 401 })
    }

    if (!keyRecord.is_active) {
      return NextResponse.json({ success: false, error: 'Forbidden: This API Key has been suspended or deactivated.' }, { status: 403 })
    }

    // 1.5 Validate Domain restriction if defined on key
    if (keyRecord.allowed_domain) {
      const clientUrl = origin || refererHeader || originHeader
      if (!clientUrl) {
        return NextResponse.json({ 
          success: false, 
          error: 'Forbidden: This API Key is restricted to specific domains, but no origin referrer was provided.' 
        }, { status: 403 })
      }

      const clientDomain = extractDomain(clientUrl)
      const allowedDomain = extractDomain(keyRecord.allowed_domain)

      const matches = clientDomain === allowedDomain || clientDomain.endsWith('.' + allowedDomain)
      if (!matches) {
        return NextResponse.json({ 
          success: false, 
          error: `Unauthorized Origin: The domain "${clientDomain}" is not authorized to use this API Key.` 
        }, { status: 403 })
      }
    }

    const billingTier: any = Array.isArray(keyRecord.billing_tiers)
      ? keyRecord.billing_tiers[0]
      : keyRecord.billing_tiers
    const includedCalls = billingTier?.included_calls || 1000
    const currentCount = keyRecord.current_period_calls_count || 0

    // 2. Validate Usage Cap (Rate Limit Hard Gating for Calls)
    if (currentCount >= includedCalls) {
      return NextResponse.json({ 
        success: false, 
        error: 'Usage Limit Exceeded: Your monthly call quota has been exhausted. Upgrade your pricing tier in the developer console.' 
      }, { status: 429 })
    }

    // 3. Record Usage log and increment counters
    await Promise.all([
      adminClient.from('api_usage_logs').insert([
        {
          api_key_id: keyRecord.id,
          type: 'EMBED_CALL'
        }
      ]),
      adminClient.from('api_keys').update({
        current_period_calls_count: currentCount + 1,
        last_used_at: new Date().toISOString()
      }).eq('id', keyRecord.id)
    ])

    return NextResponse.json({
      success: true,
      message: 'Embedded viewer session metered successfully.'
    })
  } catch (err: any) {
    console.error('API Embed Metering Route Error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal metering error.' }, { status: 500 })
  }
}

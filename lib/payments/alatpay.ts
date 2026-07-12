/**
 * ALATPay Bank Transfer / Virtual Account API client.
 *
 * ALATPay does not have a fully public interactive API reference (their docs portal
 * is a JS-gated Azure API Management site). The base URL, auth header, endpoint paths,
 * and request/response field names below are reconstructed from the open-source
 * `Royal-Bcode-Ventures/laravel-alatpay` SDK source, not ALATPay's own documentation.
 * Verify these against a real ALATPay sandbox dashboard before going live, and correct
 * this file in one place if any field names differ.
 */

const ALATPAY_BASE_URL = process.env.ALATPAY_BASE_URL || 'https://apibox.alatpay.ng'
const ALATPAY_SECRET_KEY = process.env.ALATPAY_SECRET_KEY
const ALATPAY_BUSINESS_ID = process.env.ALATPAY_BUSINESS_ID

export function isAlatPayConfigured(): boolean {
  return Boolean(ALATPAY_SECRET_KEY && ALATPAY_BUSINESS_ID)
}

interface AlatPayCustomer {
  email: string
  phone?: string
  firstName?: string
  lastName?: string
}

export interface AlatPayVirtualAccount {
  transactionId: string
  virtualBankAccountNumber: string
  bankName?: string
  expiredAt?: string
}

export async function generateVirtualAccount(params: {
  amount: number
  orderId: string
  description: string
  customer: AlatPayCustomer
}): Promise<AlatPayVirtualAccount> {
  if (!ALATPAY_SECRET_KEY || !ALATPAY_BUSINESS_ID) {
    throw new Error('ALATPay is not configured (missing ALATPAY_SECRET_KEY or ALATPAY_BUSINESS_ID).')
  }

  const res = await fetch(`${ALATPAY_BASE_URL}/bank-transfer/api/v1/bankTransfer/virtualAccount`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': ALATPAY_SECRET_KEY,
    },
    body: JSON.stringify({
      amount: params.amount,
      currency: 'NGN',
      orderId: params.orderId,
      description: params.description,
      businessId: ALATPAY_BUSINESS_ID,
      customer: params.customer,
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.data) {
    throw new Error(data?.message || 'Failed to generate ALATPay virtual account.')
  }

  return {
    transactionId: data.data.transactionId,
    virtualBankAccountNumber: data.data.virtualBankAccountNumber,
    bankName: data.data.bankName,
    expiredAt: data.data.expiredAt,
  }
}

// ALATPay's status string casing/values aren't confirmed by public docs — this checks
// the common tokens seen across similar NG payment gateways. Correct here if a real
// sandbox transaction comes back with a different value.
const SUCCESS_STATUS_TOKENS = ['success', 'successful', 'completed', 'paid']

export function isAlatPaySuccessful(status: string | undefined | null): boolean {
  if (!status) return false
  return SUCCESS_STATUS_TOKENS.includes(status.toLowerCase())
}

export async function checkTransactionStatus(transactionId: string): Promise<{ status: string; raw: any }> {
  if (!ALATPAY_SECRET_KEY) {
    throw new Error('ALATPay is not configured (missing ALATPAY_SECRET_KEY).')
  }

  const res = await fetch(
    `${ALATPAY_BASE_URL}/bank-transfer/api/v1/bankTransfer/transactions/${encodeURIComponent(transactionId)}`,
    {
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': ALATPAY_SECRET_KEY,
      },
    }
  )

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.message || 'Failed to check ALATPay transaction status.')
  }

  return { status: data?.data?.status ?? data?.status, raw: data }
}

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'

// Use service role for webhook processing (no user context)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    // Verify webhook signature
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecret || !signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const hash = crypto
      .createHmac('sha512', paystackSecret)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const event = JSON.parse(body)
    const supabase = getAdminClient()

    switch (event.event) {
      case 'subscription.create': {
        const userId = event.data.metadata?.user_id
        if (userId) {
          await supabase
            .from('profiles')
            .update({
              plan_tier: 'professional',
              paystack_customer_code: event.data.customer.customer_code,
              paystack_subscription_code: event.data.subscription_code,
            })
            .eq('id', userId)
        }
        break
      }

      case 'subscription.disable':
      case 'subscription.not_renew': {
        const customerCode = event.data.customer?.customer_code
        if (customerCode) {
          await supabase
            .from('profiles')
            .update({ plan_tier: 'free' })
            .eq('paystack_customer_code', customerCode)
        }
        break
      }

      case 'charge.success': {
        // Successful payment - could log invoice
        break
      }

      case 'charge.failed': {
        // Failed payment - could notify user
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await request.json()

    if (plan !== 'professional') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY
    if (!paystackSecretKey) {
      return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
    }

    // Initialize Paystack transaction
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: 49900, // R499.00 in kobo
        currency: 'ZAR',
        plan: process.env.PAYSTACK_PROFESSIONAL_PLAN_CODE,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/practice/billing?success=true`,
        metadata: {
          user_id: user.id,
          plan: 'professional',
        },
      }),
    })

    const data = await response.json()

    if (!data.status) {
      return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 })
    }

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

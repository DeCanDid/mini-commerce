import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUser } from '@/lib/getUser'

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: cart } = await supabaseAdmin
    .from('cart_items').select('quantity, products(price)').eq('user_id', user.id)
  if (!cart || cart.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const total = cart.reduce((s, c: any) => s + c.quantity * Number(c.products.price), 0)

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      amount: Math.round(total * 100), // Paystack uses kobo
      currency: 'NGN',
      callback_url: `${new URL(req.url).origin}/payment/callback`,
      metadata: { user_id: user.id },
    }),
  })
  const json = await res.json()
  if (!json.status) return NextResponse.json({ error: json.message }, { status: 500 })

  return NextResponse.json({ url: json.data.authorization_url })
}
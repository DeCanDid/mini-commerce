import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUser } from '@/lib/getUser'
import { sendReceiptEmail, sendOwnerEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { reference } = await req.json()
  if (!reference) return NextResponse.json({ error: 'Missing reference' }, { status: 400 })

  // Already processed (e.g. page refreshed)? Just return OK.
  const { data: existing } = await supabaseAdmin
    .from('orders').select('id').eq('paystack_reference', reference).maybeSingle()
  if (existing) return NextResponse.json({ ok: true, orderId: existing.id })

  // 1. Ask Paystack if the payment really succeeded
  const pay = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  ).then((r) => r.json())

  if (!pay.status || pay.data.status !== 'success') {
    return NextResponse.json({ error: 'Payment was not successful' }, { status: 400 })
  }
  if (pay.data.metadata?.user_id !== user.id) {
    return NextResponse.json({ error: 'Payment does not belong to this user' }, { status: 403 })
  }

  // 2. Load the cart and check the amount paid matches
  const { data: cart } = await supabaseAdmin
    .from('cart_items').select('quantity, products(name, price, emoji)').eq('user_id', user.id)
  if (!cart || cart.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const items = cart.map((c: any) => ({
    name: c.products.name as string,
    emoji: c.products.emoji as string,
    price: Number(c.products.price),
    quantity: c.quantity as number,
  }))
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

  if (pay.data.amount !== Math.round(total * 100)) {
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
  }

  // 3. Save the order (the unique reference blocks duplicates)
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({ user_id: user.id, email: user.email, total, paystack_reference: reference })
    .select().single()

  if (orderError) {
    if (orderError.code === '23505') return NextResponse.json({ ok: true }) // already created
    return NextResponse.json({ error: orderError.message }, { status: 500 })
  }

  await supabaseAdmin.from('order_items').insert(
    items.map(({ name, price, quantity }) => ({ order_id: order.id, name, price, quantity }))
  )
  await supabaseAdmin.from('cart_items').delete().eq('user_id', user.id)

  // 4. Send both emails (customer confirmation + owner notification)
  const mailData = {
    to: user.email!,
    customerName: user.user_metadata?.full_name || user.email!.split('@')[0],
    orderNumber: order.id.slice(0, 8).toUpperCase(),
    reference,
    items,
    total,
    siteUrl: new URL(req.url).origin,
  }

  const [emailSent, ownerEmailSent] = await Promise.all([
    sendReceiptEmail(mailData),
    sendOwnerEmail(mailData),
  ])

  return NextResponse.json({ ok: true, orderId: order.id, emailSent, ownerEmailSent })
}
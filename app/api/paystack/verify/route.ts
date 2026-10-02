import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUser } from '@/lib/getUser'

const naira = (n: number) => '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2 })

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
    .from('cart_items').select('quantity, products(name, price)').eq('user_id', user.id)
  if (!cart || cart.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const items = cart.map((c: any) => ({
    name: c.products.name, price: Number(c.products.price), quantity: c.quantity,
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

  await supabaseAdmin.from('order_items').insert(items.map((i) => ({ ...i, order_id: order.id })))
  await supabaseAdmin.from('cart_items').delete().eq('user_id', user.id)

  // 4. Send the receipt
  const rows = items.map((i) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${naira(i.price * i.quantity)}</td>
    </tr>`).join('')

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #fecdd3;border-radius:8px;overflow:hidden">
    <div style="background:#e11d48;color:#fff;padding:20px;text-align:center">
      <h1 style="margin:0">🍰 Sweet Treats</h1>
      <p style="margin:6px 0 0">Payment Receipt</p>
    </div>
    <div style="padding:20px">
      <p style="color:#16a34a;font-weight:bold;font-size:18px;margin-top:0">✓ Payment successful</p>
      <p style="font-size:13px;color:#555;margin:0">
        Order #${order.id.slice(0, 8)}<br/>
        Reference: ${reference}<br/>
        Date: ${new Date().toLocaleString('en-NG')}<br/>
        Paid via Paystack (test mode)
      </p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <tr style="background:#fff1f2">
          <th style="padding:8px;text-align:left">Item</th>
          <th style="padding:8px">Qty</th>
          <th style="padding:8px;text-align:right">Amount</th>
        </tr>
        ${rows}
      </table>
      <p style="text-align:right;font-size:18px"><strong>Total paid: ${naira(total)}</strong></p>
      <p style="font-size:12px;color:#888;text-align:center">Thank you for shopping with us!</p>
    </div>
  </div>`

  const form = new FormData()
  form.append('from', `Sweet Treats <postmaster@${process.env.MAILGUN_DOMAIN}>`)
  form.append('to', user.email!)
  form.append('subject', 'Your Sweet Treats payment receipt')
  form.append('html', html)

  const mailRes = await fetch(
    `${process.env.MAILGUN_BASE_URL}/v3/${process.env.MAILGUN_DOMAIN}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from('api:' + process.env.MAILGUN_API_KEY).toString('base64'),
      },
      body: form,
    }
  )
  if (!mailRes.ok) console.error('Mailgun error:', await mailRes.text())

  return NextResponse.json({ ok: true, orderId: order.id })
}
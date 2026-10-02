import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  // 1. Verify the logged-in user from their token
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = userData.user

  // 2. Load their cart (prices come from the DB, never from the browser)
  const { data: cart } = await supabaseAdmin
    .from('cart_items').select('quantity, products(name, price)').eq('user_id', user.id)

  if (!cart || cart.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

  const items = cart.map((c: any) => ({
    name: c.products.name, price: Number(c.products.price), quantity: c.quantity,
  }))
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)

  // 3. Save the order
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders').insert({ user_id: user.id, email: user.email, total }).select().single()
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 })

  await supabaseAdmin.from('order_items').insert(items.map((i) => ({ ...i, order_id: order.id })))

  // 4. Clear the cart
  await supabaseAdmin.from('cart_items').delete().eq('user_id', user.id)

  // 5. Send the email via Mailgun
  const rows = items.map((i) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${i.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(i.price * i.quantity).toFixed(2)}</td>
    </tr>`).join('')

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #f3c9d8;border-radius:8px;overflow:hidden">
    <div style="background:#ec4899;color:#fff;padding:20px;text-align:center">
      <h1 style="margin:0">🍰 Sweet Treats</h1>
    </div>
    <div style="padding:20px">
      <h2>Thank you for your order!</h2>
      <p>Order #${order.id.slice(0, 8)}</p>
      <table style="width:100%;border-collapse:collapse">
        <tr style="background:#fdf2f8">
          <th style="padding:8px;text-align:left">Item</th>
          <th style="padding:8px">Qty</th>
          <th style="padding:8px;text-align:right">Price</th>
        </tr>
        ${rows}
      </table>
      <p style="text-align:right;font-size:18px"><strong>Total: $${total.toFixed(2)}</strong></p>
    </div>
  </div>`

  const form = new FormData()
  form.append('from', `Sweet Treats <postmaster@${process.env.MAILGUN_DOMAIN}>`)
  form.append('to', user.email!)
  form.append('subject', 'Your Sweet Treats order confirmation')
  form.append('html', html)

  const mailRes = await fetch(`${process.env.MAILGUN_BASE_URL}/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from('api:' + process.env.MAILGUN_API_KEY).toString('base64') },
    body: form,
  })
  if (!mailRes.ok) console.error('Mailgun error:', await mailRes.text())

  return NextResponse.json({ orderId: order.id })
}
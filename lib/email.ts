type OrderItem = { name: string; emoji?: string; price: number; quantity: number }

export type ReceiptData = {
  to: string // the customer's email
  customerName: string
  orderNumber: string
  reference: string
  items: OrderItem[]
  total: number
  siteUrl: string
}

const naira = (n: number) =>
  '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const formatDate = () =>
  new Date().toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' })

/* ---------- Shared building blocks ---------- */

const detailBox = (rows: [string, string][]) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background:#fff1f2;border-radius:12px;padding:12px 16px;">
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding:6px 0;font-size:13px;color:#78716c;">${label}</td>
            <td align="right" style="padding:6px 0;font-size:13px;color:#1c1917;font-weight:bold;word-break:break-all;">${value}</td>
          </tr>`
          )
          .join('')}
      </table>
    </td></tr>
  </table>`

const itemsTable = (d: ReceiptData, totalLabel: string) => {
  const rows = d.items
    .map(
      (i) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #f1f1f1;font-size:15px;color:#1c1917;">
          ${i.emoji ? esc(i.emoji) + ' ' : ''}${esc(i.name)}
          <div style="font-size:13px;color:#78716c;margin-top:3px;">${i.quantity} × ${naira(i.price)}</div>
        </td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid #f1f1f1;font-size:15px;font-weight:bold;color:#1c1917;white-space:nowrap;">
          ${naira(i.price * i.quantity)}
        </td>
      </tr>`
    )
    .join('')

  return `
  <h2 style="margin:28px 0 4px;font-size:16px;color:#1c1917;">Order summary</h2>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${rows}
    <tr>
      <td style="padding:18px 0 0;font-size:17px;font-weight:bold;color:#1c1917;">${totalLabel}</td>
      <td align="right" style="padding:18px 0 0;font-size:20px;font-weight:bold;color:#e11d48;white-space:nowrap;">
        ${naira(d.total)}
      </td>
    </tr>
  </table>`
}

const badge = (text: string, bg: string, color: string) =>
  `<div style="display:inline-block;background:${bg};color:${color};font-size:13px;font-weight:bold;padding:6px 14px;border-radius:999px;">${text}</div>`

const shell = (preheader: string, content: string, footerNote: string) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sweet Treats</title>
</head>
<body style="margin:0;padding:0;background:#fff1f2;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff1f2;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #fecdd3;">
          <tr>
            <td align="center" style="background:#e11d48;padding:28px 20px;">
              <div style="font-size:36px;line-height:1;">🍰</div>
              <div style="color:#ffffff;font-size:22px;font-weight:bold;margin-top:8px;">Sweet Treats</div>
            </td>
          </tr>
          <tr><td style="padding:32px 28px;">${content}</td></tr>
          <tr>
            <td align="center" style="background:#fafaf9;padding:20px;border-top:1px solid #f1f1f1;">
              <p style="margin:0;font-size:12px;color:#a8a29e;line-height:1.6;">
                ${footerNote}<br>© ${new Date().getFullYear()} Sweet Treats. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

/* ---------- Customer email: order confirmation ---------- */

export function buildCustomerHtml(d: ReceiptData) {
  const content = `
    ${badge('✓ Payment successful', '#dcfce7', '#15803d')}
    <h1 style="margin:16px 0 8px;font-size:24px;color:#1c1917;">Thank you, ${esc(d.customerName)}!</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#57534e;">
      We've received your payment and your order is confirmed. Here are your order details.
    </p>
    ${detailBox([
      ['Order number', '#' + esc(d.orderNumber)],
      ['Payment reference', esc(d.reference)],
      ['Date', esc(formatDate())],
      ['Payment method', 'Paystack'],
    ])}
    ${itemsTable(d, 'Total paid')}
    <div style="text-align:center;margin-top:32px;">
      <a href="${esc(d.siteUrl)}"
        style="display:inline-block;background:#e11d48;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 30px;border-radius:999px;">
        Continue shopping
      </a>
    </div>`

  return shell(
    `Your order #${esc(d.orderNumber)} is confirmed. Total paid: ${naira(d.total)}.`,
    content,
    'You received this email because you made a purchase at Sweet Treats.'
  )
}

export function buildCustomerText(d: ReceiptData) {
  return [
    `Hi ${d.customerName},`,
    '',
    'Thank you! Your payment was successful and your order is confirmed.',
    '',
    `Order number: #${d.orderNumber}`,
    `Payment reference: ${d.reference}`,
    `Date: ${formatDate()}`,
    '',
    ...d.items.map((i) => `- ${i.name} (${i.quantity} x ${naira(i.price)}): ${naira(i.price * i.quantity)}`),
    '',
    `Total paid: ${naira(d.total)}`,
    '',
    `Continue shopping: ${d.siteUrl}`,
  ].join('\n')
}

/* ---------- Owner email: order placed ---------- */

export function buildOwnerHtml(d: ReceiptData) {
  const content = `
    ${badge('🛍️ New order', '#fef3c7', '#b45309')}
    <h1 style="margin:16px 0 8px;font-size:24px;color:#1c1917;">You have a new order!</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#57534e;">
      <strong>${esc(d.customerName)}</strong> just placed an order and the payment was confirmed. Please prepare it.
    </p>
    ${detailBox([
      ['Customer', esc(d.customerName)],
      ['Customer email', esc(d.to)],
      ['Order number', '#' + esc(d.orderNumber)],
      ['Payment reference', esc(d.reference)],
      ['Date', esc(formatDate())],
      ['Payment status', 'Paid via Paystack'],
    ])}
    ${itemsTable(d, 'Order total')}`

  return shell(
    `New order #${esc(d.orderNumber)} from ${esc(d.customerName)}: ${naira(d.total)}`,
    content,
    'This is an automatic notification from your Sweet Treats store. Reply to contact the customer.'
  )
}

export function buildOwnerText(d: ReceiptData) {
  return [
    'You have a new order!',
    '',
    `Customer: ${d.customerName} (${d.to})`,
    `Order number: #${d.orderNumber}`,
    `Payment reference: ${d.reference}`,
    `Date: ${formatDate()}`,
    '',
    ...d.items.map((i) => `- ${i.name} (${i.quantity} x ${naira(i.price)}): ${naira(i.price * i.quantity)}`),
    '',
    `Order total: ${naira(d.total)}`,
  ].join('\n')
}

/* ---------- Sending via Mailgun ---------- */

async function sendMail(opts: {
  to: string
  subject: string
  text: string
  html: string
  tag: string
  replyTo?: string
}): Promise<boolean> {
  const domain = process.env.MAILGUN_DOMAIN
  const key = process.env.MAILGUN_API_KEY
  const base = process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'

  if (!domain || !key) {
    console.error('Mailgun env variables are missing')
    return false
  }

  const form = new FormData()
  form.append('from', process.env.MAILGUN_FROM || `Sweet Treats <postmaster@${domain}>`)
  form.append('to', opts.to)
  form.append('subject', opts.subject)
  form.append('text', opts.text)
  form.append('html', opts.html)
  form.append('o:tag', opts.tag)
  if (opts.replyTo) form.append('h:Reply-To', opts.replyTo)

  try {
    const res = await fetch(`${base}/v3/${domain}/messages`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from('api:' + key).toString('base64') },
      body: form,
    })
    if (!res.ok) {
      console.error(`Mailgun error (${opts.tag}):`, res.status, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error(`Mailgun request failed (${opts.tag}):`, err)
    return false
  }
}

// Email to the customer: order confirmation
export function sendReceiptEmail(d: ReceiptData) {
  return sendMail({
    to: d.to,
    subject: `Order confirmed: #${d.orderNumber}`,
    text: buildCustomerText(d),
    html: buildCustomerHtml(d),
    tag: 'order-confirmation',
  })
}

// Email to the store owner: order placed
export async function sendOwnerEmail(d: ReceiptData) {
  const owner = process.env.OWNER_EMAIL
  if (!owner) {
    console.error('OWNER_EMAIL is not set, skipping owner notification')
    return false
  }
  return sendMail({
    to: owner,
    subject: `New order #${d.orderNumber} from ${d.customerName} (${naira(d.total)})`,
    text: buildOwnerText(d),
    html: buildOwnerHtml(d),
    tag: 'order-placed',
    replyTo: d.to, // replying goes straight to the customer
  })
}
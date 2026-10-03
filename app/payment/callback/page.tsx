'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function PaymentCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
    const [message, setMessage] = useState('')
    const [emailSent, setEmailSent] = useState(true)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return // avoids the double-run in dev mode
    ran.current = true

    const run = async () => {
      const reference = new URLSearchParams(window.location.search).get('reference')
      const { data } = await supabase.auth.getSession()

      if (!reference || !data.session) {
        setStatus('failed')
        setMessage('Missing payment reference or you are not logged in.')
        return
      }

      const res = await fetch('/api/paystack/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({ reference }),
      })
      const json = await res.json()

      if (res.ok) {
          window.dispatchEvent(new Event('cart-updated')) // resets the navbar badge
          setEmailSent(json.emailSent !== false)
        setStatus('success')
      } else {
        setStatus('failed')
        setMessage(json.error || 'Something went wrong.')
      }
    }
    run()
  }, [])

  return (
    <main className="max-w-md mx-auto mt-20 px-4 text-center">
      <div className="bg-white rounded-2xl border border-rose-100 p-10">
        {status === 'loading' && <p className="text-stone-600">Confirming your payment...</p>}

        {status === 'success' && (
  <>
    <div className="text-6xl">🎉</div>
    <h1 className="text-2xl font-bold text-rose-700 mt-3">Payment successful!</h1>
    <p className="text-stone-600 mt-2">
      {emailSent
        ? 'Your receipt is on its way to your email.'
        : "Your payment went through, but we couldn't send the receipt email."}
    </p>
    <Link href="/" className="inline-block mt-6 bg-rose-600 text-white px-5 py-2 rounded-full">
      Continue shopping
    </Link>
  </>
)}

        {status === 'failed' && (
          <>
            <div className="text-6xl">😕</div>
            <h1 className="text-2xl font-bold text-rose-700 mt-3">Payment not confirmed</h1>
            <p className="text-stone-600 mt-2">{message}</p>
            <Link href="/cart" className="inline-block mt-6 bg-rose-600 text-white px-5 py-2 rounded-full">
              Back to cart
            </Link>
          </>
        )}
      </div>
    </main>
  )
}
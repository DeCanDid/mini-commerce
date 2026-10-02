'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'

export default function CartPage() {
  const { user, loading } = useUser()
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('cart_items').select('id, quantity, products(id, name, price, emoji)')
    setItems(data ?? [])
  }, [])

  useEffect(() => {
    if (loading) return
    if (!user) return router.push('/login')
    load()
  }, [user, loading, load, router])

    
    const remove = async (id: string) => {
  await supabase.from('cart_items').delete().eq('id', id)
  window.dispatchEvent(new Event('cart-updated'))
  load()
}

  const total = items.reduce((sum, i) => sum + i.quantity * i.products.price, 0)

  const checkout = async () => {
  setBusy(true)
  const { data } = await supabase.auth.getSession()
  const res = await fetch('/api/paystack/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session?.access_token}` },
  })
  const json = await res.json()

  if (res.ok && json.url) {
    window.location.href = json.url // go to Paystack
  } else {
    setBusy(false)
    alert(json.error || 'Could not start payment')
  }
}

  return (
    <main className="max-w-2xl mx-auto p-6">
    <h1 className="text-3xl font-bold text-rose-700 mb-6">Your Cart</h1>

    {items.length === 0 && (
      <div className="bg-white rounded-2xl border border-rose-100 p-10 text-center text-stone-500">
        Your cart is empty 🍩
      </div>
    )}

    <div className="flex flex-col gap-3">
      {items.map((i) => (
        <div key={i.id} className="bg-white rounded-xl border border-rose-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{i.products.emoji}</span>
            <div>
              <p className="font-semibold">{i.products.name}</p>
              <p className="text-sm text-stone-500">Qty {i.quantity} × ${Number(i.products.price).toFixed(2)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold">${(i.quantity * i.products.price).toFixed(2)}</p>
            <button className="text-xs text-rose-600 hover:underline" onClick={() => remove(i.id)}>Remove</button>
          </div>
        </div>
      ))}
    </div>

    {items.length > 0 && (
      <div className="mt-6 bg-white rounded-xl border border-rose-100 p-5">
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span><span>${total.toFixed(2)}</span>
        </div>
        <button disabled={busy} onClick={checkout}
          className="mt-4 w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-full font-medium disabled:opacity-50">
          {busy ? 'Processing...' : 'Checkout'}
        </button>
      </div>
    )}
  </main>
  )
}



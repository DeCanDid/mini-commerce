'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'

type Product = { id: string; name: string; description: string; price: number; emoji: string }

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [addedId, setAddedId] = useState<string | null>(null)
  const { user } = useUser()
  const router = useRouter()

  useEffect(() => {
    supabase.from('products').select('*').then(({ data }) => setProducts(data ?? []))
  }, [])

  const addToCart = async (productId: string) => {
    if (!user) return router.push('/login')

    const { data: existing } = await supabase
      .from('cart_items').select('id, quantity').eq('product_id', productId).maybeSingle()

    if (existing) {
      await supabase.from('cart_items').update({ quantity: existing.quantity + 1 }).eq('id', existing.id)
    } else {
      await supabase.from('cart_items').insert({ user_id: user.id, product_id: productId, quantity: 1 })
    }

    window.dispatchEvent(new Event('cart-updated')) // updates the navbar badge
    setAddedId(productId)
    setTimeout(() => setAddedId(null), 1200)
  }

  return (
    <main>
      <section className="text-center py-14 px-4 bg-gradient-to-b from-rose-100 to-rose-50">
        <h1 className="text-4xl md:text-5xl font-bold text-rose-700">Freshly baked, just for you</h1>
        <p className="mt-3 text-stone-600">Cakes, cupcakes, donuts and more. Order in a few clicks.</p>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <div key={p.id}
            className="bg-white rounded-2xl border border-rose-100 shadow-sm hover:shadow-lg
              hover:-translate-y-1 transition p-6 flex flex-col">
            <div className="text-7xl text-center bg-rose-50 rounded-xl py-6">{p.emoji}</div>
            <h2 className="mt-4 text-lg font-semibold">{p.name}</h2>
            <p className="text-sm text-stone-500 flex-1">{p.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xl font-bold text-rose-600">${Number(p.price).toFixed(2)}</span>
              <button onClick={() => addToCart(p.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium text-white transition
                  ${addedId === p.id ? 'bg-green-500' : 'bg-rose-600 hover:bg-rose-700'}`}>
                {addedId === p.id ? 'Added ✓' : 'Add to cart'}
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
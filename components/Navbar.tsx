'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'

export default function Navbar() {
  const { user } = useUser()
  const router = useRouter()
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)

  const loadCount = useCallback(async () => {
    if (!user) return setCount(0)
    const { data } = await supabase.from('cart_items').select('quantity')
    setCount((data ?? []).reduce((sum, i) => sum + i.quantity, 0))
  }, [user])

  useEffect(() => {
    loadCount()
    window.addEventListener('cart-updated', loadCount)
    return () => window.removeEventListener('cart-updated', loadCount)
  }, [loadCount])

  const logout = async () => {
    setOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  const meta = user?.user_metadata
  const avatar = meta?.avatar_url || meta?.picture
  const name = meta?.full_name || user?.email || ''
  const initial = name.charAt(0).toUpperCase()

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-rose-100">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <Link href="/" className="text-xl font-bold text-rose-600">🍰 Sweet Treats</Link>

        <div className="flex items-center gap-4">
          {/* Cart */}
          <Link href="/cart" className="relative p-2 rounded-full hover:bg-rose-50" aria-label="Cart">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-stone-700" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3a1 1 0 00.7 1.7H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center
                rounded-full bg-rose-600 text-white text-xs font-semibold">
                {count}
              </span>
            )}
          </Link>

          {/* Profile / Login */}
          {user ? (
            <div className="relative">
              <button onClick={() => setOpen(!open)} className="block">
                {avatar ? (
                  <img src={avatar} alt={name} referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full border-2 border-rose-200 object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center font-semibold">
                    {initial}
                  </div>
                )}
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-rose-100 rounded-xl shadow-lg p-3">
                  <p className="font-semibold text-sm truncate">{meta?.full_name || 'My account'}</p>
                  <p className="text-xs text-stone-500 truncate mb-3">{user.email}</p>
                  <button onClick={logout}
                    className="w-full text-left text-sm text-rose-600 hover:bg-rose-50 rounded-lg px-2 py-2">
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium px-4 py-2 rounded-full">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
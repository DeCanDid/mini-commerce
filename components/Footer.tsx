import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-rose-100 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-stone-500">
        <Link href="/" className="font-semibold text-rose-600">🍰 Sweet Treats</Link>

        <div className="flex gap-5">
          <Link href="/" className="hover:text-rose-600">Home</Link>
          <Link href="/cart" className="hover:text-rose-600">Cart</Link>
          <Link href="/login" className="hover:text-rose-600">Login</Link>
        </div>

        <p>© {new Date().getFullYear()} Sweet Treats. All rights reserved.</p>
      </div>
    </footer>
  )
}
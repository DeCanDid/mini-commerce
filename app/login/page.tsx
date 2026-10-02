'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUser } from '@/lib/useUser'

const inputClass =
  'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 ' +
  'placeholder:text-stone-400 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useUser()

  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Already logged in? Go home.
  useEffect(() => {
    if (!authLoading && user) router.replace('/')
  }, [user, authLoading, router])

  const switchMode = (m: 'login' | 'signup') => {
    setMode(m)
    setError('')
    setInfo('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/')
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      })
      if (error) setError(error.message)
      else if (data.session) router.push('/')
      else setInfo('Account created! Check your email to confirm it, then log in.')
    }
    setBusy(false)
  }

  const google = async () => {
    setError('')
    setBusy(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
      setBusy(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      {/* Left brand panel (desktop only) */}
      <section className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-rose-500 via-rose-600 to-rose-800 p-12 text-white">
        <div className="text-2xl font-bold">🍰 Sweet Treats</div>

        <div>
          <div className="grid grid-cols-3 gap-4 w-fit text-6xl mb-10">
            {['🍫', '🧁', '🍩', '🍨', '🍪', '🍰'].map((e) => (
              <div key={e} className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
                {e}
              </div>
            ))}
          </div>
          <h2 className="text-4xl font-bold leading-tight">Sweet moments,<br />delivered fresh.</h2>
          <p className="mt-3 max-w-sm text-rose-100">
            Create an account to save your cart, pay securely, and get your receipt by email.
          </p>
        </div>

        <p className="text-sm text-rose-200">© {new Date().getFullYear()} Sweet Treats</p>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <div className="text-5xl">🍰</div>
            <p className="mt-1 text-xl font-bold text-rose-600">Sweet Treats</p>
          </div>

          <div className="rounded-2xl border border-rose-100 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold text-stone-900">
              {mode === 'login' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              {mode === 'login' ? 'Log in to continue to your cart.' : 'It only takes a few seconds.'}
            </p>

            {/* Tabs */}
            <div className="mt-6 grid grid-cols-2 rounded-xl bg-rose-50 p-1 text-sm font-medium">
              {(['login', 'signup'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`rounded-lg py-2 transition ${
                    mode === m ? 'bg-white text-rose-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  {m === 'login' ? 'Login' : 'Sign up'}
                </button>
              ))}
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={google}
              disabled={busy}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
            >
              <svg viewBox="0 0 48 48" className="h-5 w-5">
                <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z" />
              </svg>
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wide text-stone-400">
              <span className="h-px flex-1 bg-stone-200" />
              or with email
              <span className="h-px flex-1 bg-stone-200" />
            </div>

            {/* Email form */}
            <form onSubmit={submit} className="flex flex-col gap-4">
              {mode === 'signup' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-stone-700">Full name</label>
                  <input
                    className={inputClass}
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Email</label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-stone-700">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className={inputClass + ' pr-16'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-rose-600 hover:text-rose-700"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}
              {info && (
                <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{info}</p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {busy ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-stone-500">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="font-medium text-rose-600 hover:underline"
              >
                {mode === 'login' ? 'Sign up' : 'Login'}
              </button>
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
# AGENTS.md

Guidance for AI coding agents working on this project. Keep changes simple: this is a small dessert shop built as a quick task, so avoid over-engineering and new dependencies.

## Project overview

**Sweet Treats** is a mini e-commerce site for desserts.

- Users sign up / log in (email + password, or Google).
- Users add desserts to a cart. The cart is stored in the database, so it persists across logout and login.
- Checkout goes through Paystack (test mode). After a verified payment, an order is saved, the cart is cleared, and a receipt email is sent via Mailgun.

## Tech stack

- **Next.js** (App Router, TypeScript), **no `src/` directory**: `app/`, `components/` and `lib/` live at the project root
- **Tailwind CSS** for styling (rose/stone palette)
- **Supabase**: Auth (email + Google OAuth) and Postgres database
- **Paystack**: payments, hosted checkout page, test mode, currency NGN
- **Mailgun**: transactional email, called with plain `fetch` (no SDK)
- Only extra package: `@supabase/supabase-js`

## Folder structure

```
app/
├── layout.tsx                      # Navbar + children + Footer
├── page.tsx                        # Product list, add to cart
├── login/page.tsx                  # Login / signup / Google
├── cart/page.tsx                   # Cart + "Pay with Paystack"
├── payment/callback/page.tsx       # Paystack redirects here, calls verify
└── api/paystack/
    ├── initialize/route.ts         # Creates Paystack payment link
    └── verify/route.ts             # Verifies payment, saves order, sends receipt
components/
├── Navbar.tsx                      # Cart badge, profile avatar, login/logout
└── Footer.tsx
lib/
├── supabase.ts                     # Browser client (anon/publishable key)
├── supabaseAdmin.ts                # Server-only client (service role key)
├── getUser.ts                      # Gets the user from a Bearer token in API routes
└── useUser.ts                      # Client hook for the current user
```

Imports use the `@/` alias, which points to the project root.

## Environment variables

Set in `.env.local` (never commit it). Restart `npm run dev` after any change.

```env
NEXT_PUBLIC_SUPABASE_URL=            # https://<project-ref>.supabase.co  (no /rest/v1, no trailing slash)
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # anon or publishable key
SUPABASE_SERVICE_ROLE_KEY=           # service_role or secret key, server only
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILGUN_BASE_URL=https://api.mailgun.net   # use https://api.eu.mailgun.net for EU accounts
PAYSTACK_SECRET_KEY=                 # sk_test_..., server only
```

Only variables prefixed `NEXT_PUBLIC_` are exposed to the browser. Never add that prefix to the service role key, Mailgun key, or Paystack secret key.

## Commands

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

## Database (Supabase)

Tables: `products`, `cart_items`, `orders`, `order_items`.

- `products`: `id, name, description, price, emoji`
- `cart_items`: `id, user_id, product_id, quantity` (unique on `user_id, product_id`)
- `orders`: `id, user_id, email, total, paystack_reference (unique), created_at`
- `order_items`: `id, order_id, name, price, quantity`

Row Level Security is enabled on all tables:

- `products`: anyone can read
- `cart_items`: users can only access their own rows (so client queries on `cart_items` do not need a `user_id` filter)
- `orders` / `order_items`: users can only read their own; inserts happen server-side with the service role key

## Key flows and conventions

**Auth**
- Client code uses `lib/supabase.ts`. Google login uses `signInWithOAuth` with `redirectTo: window.location.origin`.
- The Google avatar comes from `user.user_metadata.avatar_url` (fallback: first letter of name or email).
- API routes identify the user by reading the `Authorization: Bearer <access_token>` header via `lib/getUser.ts`.

**Cart**
- The cart lives in `cart_items`, not in local state or localStorage.
- After any cart change (add, remove, payment success), dispatch `window.dispatchEvent(new Event('cart-updated'))`. The Navbar listens to this event to refresh the cart badge.

**Checkout and payments**
1. Cart page calls `POST /api/paystack/initialize` with the user's access token and redirects to the returned Paystack URL.
2. Paystack sends the user to `/payment/callback?reference=...`.
3. The callback page calls `POST /api/paystack/verify`, which verifies the payment with Paystack, checks the paid amount against the cart total, inserts the order, clears the cart, and sends the receipt email.

Rules:
- **Never trust prices or totals from the browser.** Always compute the total on the server from the database.
- Amounts sent to Paystack are in **kobo** (`naira * 100`), currency `NGN`. Prices are displayed with the `₦` symbol.
- The verify route must stay **idempotent**: it checks for an existing order with the same `paystack_reference` and relies on the unique constraint, so refreshing the callback page never creates duplicate orders or emails.
- Use `supabaseAdmin` only inside API routes (server code). Never import it into a client component.

**Email**
- Receipts are sent with Mailgun's REST API via `fetch` and `FormData` (HTML email with inline styles).
- A Mailgun failure is logged but must not fail the order.

**Styling**
- Tailwind utility classes only, with the rose/stone palette. Keep the UI simple and responsive (mobile first, `sm`/`lg` breakpoints).

## Known gotchas

- Google login errors: the Google OAuth client needs `https://<project-ref>.supabase.co/auth/v1/callback` in **Authorized redirect URIs**, and `http://localhost:3000` in **Authorized JavaScript origins**.
- Supabase **URL Configuration**: Site URL `http://localhost:3000` and Redirect URL `http://localhost:3000/**` (add the production URL after deploying).
- A JSON "No API key found in request" page after login usually means `NEXT_PUBLIC_SUPABASE_URL` wrongly includes `/rest/v1`.
- The Mailgun sandbox domain can only email **authorized recipients**.
- Paystack test card: `4084 0840 8408 4081`, any future expiry, CVV `408`, PIN `0000`, OTP `123456`.

## Do / Don't

- Do keep changes small and match the existing code style.
- Do keep secrets in `.env.local` only.
- Do keep payment and order logic on the server.
- Don't add heavy libraries (state managers, UI kits, ORMs) without a clear need.
- Don't store the cart in localStorage; it belongs in Supabase.
- Don't expose server keys to the client or commit `.env.local`.

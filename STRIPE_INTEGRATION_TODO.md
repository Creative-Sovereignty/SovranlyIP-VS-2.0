# Stripe Checkout Integration Guide & Next Steps

This document is your single source of truth for the Sovranly IP Stripe Checkout integration, configured parameters, and production deployment checklist.

---

## Values to Replace

The following values should be verified or updated prior to production launch.

**Files containing configurable parameters & environment keys:**
- [app/api/stripe/checkout/route.ts](app/api/stripe/checkout/route.ts)
- [lib/stripe.ts](lib/stripe.ts)
- [.env.example](.env.example)

| Field | Current Value | What to Set |
|-------|---------------|-------------|
| `STRIPE_SECRET_KEY` | Environment variable (`process.env.STRIPE_SECRET_KEY`) | Your live Secret Key starting with `rk_live_` or `sk_live_` from [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys). |
| `STRIPE_WEBHOOK_SECRET` | Environment variable (`process.env.STRIPE_WEBHOOK_SECRET`) | Webhook signing secret starting with `whsec_` obtained from [Stripe Workbench / Webhooks](https://dashboard.stripe.com/workbench/webhooks). |
| `line_items` (Optional Price IDs) | Dynamic inline `price_data` ($9 Lite, $29 Pro, $99 Studio) | If you prefer referencing catalog Price IDs directly, replace `price_data` with `{ price: "price_1...", quantity: 1 }` from [Stripe Products & Prices](https://dashboard.stripe.com/prices). |
| `success_url` | `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&plan=${normalizedPlan}` | Validated URL redirected to after successful checkout (preserves `{CHECKOUT_SESSION_ID}`). |
| `cancel_url` | `${origin}/pricing` | Return URL when checkout is canceled. |

---

## Configured Parameters

These parameters were configured according to your Checkout Studio specification and are set in the codebase.

**Files containing these parameters:**
- [app/api/stripe/checkout/route.ts](app/api/stripe/checkout/route.ts)

| Parameter | Value | Description |
|-----------|-------|-------------|
| `ui_mode` | `hosted_page` | Uses Stripe-hosted checkout page (Stripe SDK v23.0.1 >= 21.0.0). |
| `mode` | `subscription` | Configured for recurring creator subscription tiers (Lite, Pro, Studio). |
| `billing_address_collection` | `auto` | Automatically collects billing address when required by payment method. |
| `phone_number_collection` | `{ "enabled": false }` | Phone number collection disabled. |
| `automatic_tax` | `{ "enabled": false }` | Automated Stripe Tax calculation disabled. |
| `allow_promotion_codes` | `false` | Customer promotional discount code entry disabled at checkout. |
| `payment_method_collection` | `always` | Enforces payment method capture for active recurring subscriptions. |
| `submit_type` | `auto` | Dynamically adapts submit button wording to transaction context. |
| `integration_identifier` | `hosted_web_0001` | Unique tracking tag for Sovranly IP hosted checkout integration. |
| `origin_context` | `web` | Specifies web platform context. |

---

## Setup and Next Steps

### 1. Environment Variables & Keys
Ensure the following variables are declared in your production environment (Google Cloud Run / AI Studio Secrets / `.env.local`):

```bash
# Server-side secret keys (never prefix with NEXT_PUBLIC_)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Client-accessible keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Direct Payment Links (configured on pricing and lead funnel pages)
NEXT_PUBLIC_STRIPE_LINK_LITE=https://buy.stripe.com/4gM5kxdTrgPq1r4bOFf3a01
NEXT_PUBLIC_STRIPE_LINK_PRO=https://buy.stripe.com/cNi5kx3eN6aM1r46ulf3a02
NEXT_PUBLIC_STRIPE_LINK_STUDIO=https://buy.stripe.com/7sYeV76qZ2YA2v82e5f3a03
```

### 2. Architecture & Request Flow
1. **Initiation**: User selects a plan on `/pricing`, `/funnel` (lead.sovranlyip.com), or inside the Command Center modal.
2. **Session Creation**: The client calls `POST /api/stripe/checkout` with `{ planId, billingPeriod, email }`.
3. **Redirection**: The server constructs a Stripe Checkout Session with `ui_mode: hosted_page` and returns the session URL (`https://checkout.stripe.com/...`).
4. **Fulfillment via Webhook**:
   - Stripe sends `checkout.session.completed` to `https://<DOMAIN>/api/webhooks/stripe`.
   - The webhook securely updates Firestore (`subscriptions` and `users` collections) with the user's Decentralized Vault limit (Lite: 10 Vaults, Pro: 50 Vaults, Studio: Unlimited).
   - Subsequent subscription updates (`customer.subscription.updated` / `deleted`) keep account quotas in sync.

### 3. Testing with Stripe Test Mode
When using test keys (`sk_test_...` / `pk_test_...`):
- Use standard test card numbers: `4242 •••• •••• 4242`
- Expiration: Any future date (e.g., `12/32`)
- CVC: Any 3 digits (e.g., `123`)
- Postal Code: Any valid format (e.g., `90210`)

### 4. Stripe Documentation & Resources
- [Stripe Checkout Documentation](https://docs.stripe.com/checkout)
- [Stripe Webhook Best Practices](https://docs.stripe.com/webhooks)
- [Stripe Support](https://support.stripe.com)
- [Stripe MCP](https://docs.stripe.com/mcp)

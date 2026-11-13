import { NextResponse } from 'next/server';
import { stripe, STRIPE_PAYMENT_LINKS } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const { planId, billingPeriod = 'monthly', email } = await req.json();
    const normalizedPlan = String(planId || 'pro').toLowerCase();

    const paymentLinkUrl = STRIPE_PAYMENT_LINKS[normalizedPlan];
    if (!paymentLinkUrl) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    const finalPaymentLink = email
      ? `${paymentLinkUrl}?prefilled_email=${encodeURIComponent(email)}`
      : paymentLinkUrl;

    // If a live/test STRIPE_SECRET_KEY is explicitly configured, attempt session creation,
    // otherwise return the verified Stripe Payment Link URL directly.
    const hasCustomSecretKey =
      Boolean(process.env.STRIPE_SECRET_KEY) &&
      process.env.STRIPE_SECRET_KEY !== 'sk_test_placeholder';

    if (!hasCustomSecretKey) {
      return NextResponse.json({
        url: finalPaymentLink,
        paymentLink: finalPaymentLink,
        planId: normalizedPlan,
      });
    }

    const planNames: Record<string, string> = {
      lite: 'Creator Lite',
      starter: 'Creator Lite',
      pro: 'Creator Pro',
      growth: 'Creator Pro',
      studio: 'Creator Studio',
      enterprise: 'Creator Studio',
    };

    const unitAmounts: Record<string, { monthly: number; annual: number }> = {
      lite: { monthly: 900, annual: 700 },
      starter: { monthly: 900, annual: 700 },
      pro: { monthly: 2900, annual: 2400 },
      growth: { monthly: 2900, annual: 2400 },
      studio: { monthly: 9900, annual: 7900 },
      enterprise: { monthly: 9900, annual: 7900 },
    };

    const amountObj = unitAmounts[normalizedPlan] || unitAmounts.pro;
    const unitAmount = billingPeriod === 'annual' ? amountObj.annual * 12 : amountObj.monthly;
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://sovranlyip.com';

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'hosted_page',
      billing_address_collection: 'auto',
      phone_number_collection: {
        enabled: false,
      },
      automatic_tax: {
        enabled: false,
      },
      allow_promotion_codes: false,
      payment_method_collection: 'always',
      submit_type: 'auto',
      integration_identifier: 'hosted_web_0001',
      origin_context: 'web',
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Sovranly IP — ${planNames[normalizedPlan] || 'Creator Pro'}`,
              description: `${billingPeriod === 'annual' ? 'Annual' : 'Monthly'} subscription for Sovereign IP Management & Zero Trust Registry.`,
            },
            unit_amount: unitAmount,
            recurring: {
              interval: billingPeriod === 'annual' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}&plan=${normalizedPlan}`,
      cancel_url: `${origin}/pricing`,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url || finalPaymentLink,
      paymentLink: finalPaymentLink,
    });
  } catch (error: any) {
    console.error('Stripe Checkout Fallback to Payment Link:', error?.message);
    return NextResponse.json({
      url: STRIPE_PAYMENT_LINKS.pro,
      paymentLink: STRIPE_PAYMENT_LINKS.pro,
    });
  }
}


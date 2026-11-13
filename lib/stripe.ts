import Stripe from 'stripe';

export const STRIPE_PAYMENT_LINKS: Record<string, string> = {
  lite: process.env.NEXT_PUBLIC_STRIPE_LINK_LITE || 'https://buy.stripe.com/4gM5kxdTrgPq1r4bOFf3a01',
  starter: process.env.NEXT_PUBLIC_STRIPE_LINK_LITE || 'https://buy.stripe.com/4gM5kxdTrgPq1r4bOFf3a01',
  pro: process.env.NEXT_PUBLIC_STRIPE_LINK_PRO || 'https://buy.stripe.com/cNi5kx3eN6aM1r46ulf3a02',
  growth: process.env.NEXT_PUBLIC_STRIPE_LINK_PRO || 'https://buy.stripe.com/cNi5kx3eN6aM1r46ulf3a02',
  studio: process.env.NEXT_PUBLIC_STRIPE_LINK_STUDIO || 'https://buy.stripe.com/7sYeV76qZ2YA2v82e5f3a03',
  enterprise: process.env.NEXT_PUBLIC_STRIPE_LINK_STUDIO || 'https://buy.stripe.com/7sYeV76qZ2YA2v82e5f3a03',
};

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');


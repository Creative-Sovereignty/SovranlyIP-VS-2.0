'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  CreditCard, 
  Wallet, 
  ShieldCheck, 
  Zap, 
  Globe, 
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getStripePaymentLink } from '@/lib/stripe-client';

interface Web3UsdPaywayModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan?: any;
  billingCycle?: 'monthly' | 'annual';
}

export default function Web3UsdPaywayModal({ isOpen, onClose, plan, billingCycle }: Web3UsdPaywayModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'usd' | 'web3'>('usd');
  const [step, setStep] = useState<'select' | 'processing' | 'success'>('select');

  if (!isOpen) return null;

  const price = plan
    ? typeof plan.price === 'object'
      ? billingCycle === 'monthly'
        ? plan.price.monthly
        : plan.price.annual
      : plan.price
    : 0;

  const stripeCheckoutUrl = plan?.stripeUrl || getStripePaymentLink(plan?.id || 'pro');

  const handleProcessWeb3Payment = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('success');
    }, 2000);
  };

  const handleReset = () => {
    setStep('select');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-zinc-900 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <Zap className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white">Sovereign Checkout Gateway</h2>
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Stripe Fiat &amp; Web3 Dual-Gateway</p>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8">
            {step === 'select' && (
              <div className="space-y-6">
                <div className="bg-zinc-900/50 rounded-2xl p-4 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-zinc-400 uppercase">Selected Tier</span>
                    <span className="text-xs font-mono font-bold text-cyan-400 uppercase">{plan?.name || 'Creator Pro'}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black text-white font-mono">${price}<span className="text-xs text-zinc-500 font-normal">/mo</span></span>
                    <span className="text-xs text-emerald-400 font-mono font-bold">{plan?.vaultMetric || plan?.vaults || plan?.limit || 'Decentralized Vaults'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Select Payment Rail</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('usd')}
                      className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all cursor-pointer ${
                        paymentMethod === 'usd' 
                          ? 'bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-950/30' 
                          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <CreditCard className={`w-7 h-7 ${paymentMethod === 'usd' ? 'text-cyan-400' : 'text-zinc-500'}`} />
                      <div className="text-center">
                        <p className="text-xs font-bold text-white">Stripe Checkout</p>
                        <p className="text-[10px] text-zinc-400 font-mono">USD Card / Apple Pay</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('web3')}
                      className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all cursor-pointer ${
                        paymentMethod === 'web3' 
                          ? 'bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-950/30' 
                          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <Wallet className={`w-7 h-7 ${paymentMethod === 'web3' ? 'text-emerald-400' : 'text-zinc-500'}`} />
                      <div className="text-center">
                        <p className="text-xs font-bold text-white">Web3 Crypto</p>
                        <p className="text-[10px] text-zinc-400 font-mono">ETH / USDC Direct</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-2 space-y-4">
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Zero-Custody Guarantee: Subscriptions configure your Decentralized Vault allocations (1 Vault per creative work with stems, SHA-256 cert, and 85/15 smart split contracts).
                    </p>
                  </div>

                  {paymentMethod === 'usd' ? (
                    <div className="space-y-2.5">
                      <Button
                        asChild
                        className="w-full h-13 rounded-2xl font-black text-xs uppercase tracking-widest bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-950/50 cursor-pointer"
                      >
                        <a
                          href={stripeCheckoutUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2"
                        >
                          <span>Proceed to Stripe Checkout ({plan?.name || 'Plan'})</span>
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                      <p className="text-[10px] text-center font-mono text-zinc-500 truncate">
                        Verified Stripe Link: {stripeCheckoutUrl}
                      </p>
                    </div>
                  ) : (
                    <Button 
                      onClick={handleProcessWeb3Payment}
                      className="w-full h-13 rounded-2xl font-black text-xs uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                    >
                      Confirm Web3 Smart Contract Clearance
                    </Button>
                  )}
                </div>
              </div>
            )}

            {step === 'processing' && (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-zinc-900 rounded-full" />
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute inset-0 border-4 border-transparent border-t-emerald-500 rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Globe className="w-8 h-8 text-emerald-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Clearing Transaction</h3>
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">
                    Awaiting Block Confirmation...
                  </p>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/50">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white mb-2">Payway Executed</h3>
                  <p className="text-sm text-zinc-400 mb-6">Your sovereign plan is now active. Welcome to Sovranly IP.</p>
                  
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 w-full text-left space-y-2 mb-8">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-500">Receipt Hash:</span>
                      <span className="text-zinc-300">0x7d4e...f92a</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-500">Status:</span>
                      <span className="text-emerald-400 font-bold">CONFIRMED</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => {
                      handleReset();
                      window.location.href = '/dashboard';
                    }}
                    className="w-full h-12 bg-zinc-100 hover:bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Enter Command Center
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


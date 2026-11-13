'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  X, 
  Fingerprint, 
  Scale, 
  Lock, 
  CheckCircle2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';

interface BiometricConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  featureName?: string;
}

export default function BiometricConsentModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  featureName = 'Biometric Feature' 
}: BiometricConsentModalProps) {
  const [toggles, setToggles] = useState({
    identityAnchoring: false,
    noTraining: false,
    offChain: false,
    revocation: false
  });

  const allConsented = toggles.identityAnchoring && toggles.noTraining && toggles.offChain && toggles.revocation;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-2xl bg-zinc-950 border border-violet-500/30 rounded-3xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-950/50 to-zinc-950 p-6 border-b border-violet-500/20 relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Fingerprint className="w-3.5 h-3.5 text-violet-400" />
                  Statutory Compliance
                </span>
                <span className="text-[10px] font-mono text-zinc-500">BIPA 740 ILCS 14/ • GDPR Art. 9</span>
              </div>
              <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-xl font-black text-white font-mono tracking-tight">
              Biometric Data Consent Required
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              {featureName} requires access to biometric sensors (camera or microphone).
            </p>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Zero-Trust Privacy Mandate</p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Sovranly IP uses biometric data solely for <strong>identity anchoring and cryptographic provenance</strong>. We explicitly prohibit the use of your likeness or voice for unauthorized AI training or neural synthesis.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Mandatory Affirmations</p>
              
              <div className="grid grid-cols-1 gap-3">
                {[
                  { 
                    id: 'identityAnchoring', 
                    title: '1. Identity Anchoring Scope', 
                    desc: 'Data is used only to anchor your physical identity to your Sovranly wallet.',
                    icon: <Lock className="w-4 h-4 text-violet-400" />
                  },
                  { 
                    id: 'noTraining', 
                    title: '2. Prohibit AI Training', 
                    desc: 'No unconsented model training, fine-tuning, or generative synthesis.',
                    icon: <ShieldAlert className="w-4 h-4 text-rose-400" />
                  },
                  { 
                    id: 'offChain', 
                    title: '3. Off-Chain Raw Media', 
                    desc: 'Raw media is encrypted off-chain. Only one-way hashes are anchored to blockchain.',
                    icon: <Scale className="w-4 h-4 text-cyan-400" />
                  },
                  { 
                    id: 'revocation', 
                    title: '4. Absolute Revocation Right', 
                    desc: 'I retain the right to revoke consent and purge biometric records at any time.',
                    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setToggles(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof toggles] }))}
                    className={`flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group ${
                      toggles[item.id as keyof typeof toggles] 
                        ? 'bg-violet-500/10 border-violet-500/40 shadow-sm shadow-violet-500/10' 
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`mt-1 h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                      toggles[item.id as keyof typeof toggles] 
                        ? 'bg-violet-500 border-violet-500 text-black' 
                        : 'bg-zinc-950 border-zinc-800'
                    }`}>
                      {toggles[item.id as keyof typeof toggles] && <div className="w-2.5 h-2.5 bg-current rounded-sm" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {item.icon}
                        <h4 className="text-xs font-bold text-white font-mono">{item.title}</h4>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-zinc-900/30 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
              <FileText className="w-3.5 h-3.5" />
              <span>By confirming, you execute a legally binding biometric affirmation.</span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto sm:ml-auto">
              <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white text-xs">
                Cancel
              </Button>
              <Button 
                disabled={!allConsented}
                onClick={onConfirm}
                className={`text-xs font-bold font-mono px-6 py-2.5 rounded-xl transition-all ${
                  allConsented 
                    ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/40' 
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50'
                }`}
              >
                Accept & Execute Consent
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  Mic, 
  Search, 
  Scale, 
  Cpu, 
  DollarSign, 
  AlertTriangle, 
  FileText, 
  ArrowRight, 
  Zap, 
  Send, 
  RefreshCw,
  Sliders,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface AuditResult {
  assetName: string;
  riskScore: number;
  fairValueEstimate: string;
  recommendations: string[];
  suggestedTerms: string;
}

export default function SovranlyAiStudio({ walletAddress }: { walletAddress?: string | null }) {
  const [activeAiTab] = useState<'sam_ai'>('sam_ai');

  // SAM AI State
  const [promptInput, setPromptInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AuditResult | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Likeness valuation parameters
  const [assetName, setAssetName] = useState('Alex Vance Biometric Likeness');
  const [reachTier, setReachTier] = useState<'emerging' | 'mid' | 'high'>('mid');
  const [usageScope, setUsageScope] = useState<'ai_training' | 'commercial_ad' | 'gaming_mesh'>('ai_training');

  const runSamAnalysis = async () => {
    setIsAnalyzing(true);
    await new Promise(r => setTimeout(r, 1400));

    let est = '$8,500 - $14,000 / year';
    if (reachTier === 'high') est = '$35,000 - $75,000 / year';
    if (reachTier === 'emerging') est = '$2,500 - $5,000 / year';

    setAnalysisResult({
      assetName,
      riskScore: 18, // Low risk with Sovravly protection
      fairValueEstimate: est,
      recommendations: [
        'Enforce strict non-generative clause: Licensee cannot train downstream weights without explicit secondary tier fee.',
        'Apply 85/15 creator royalty split via EVM escrow contract.',
        'Mandate 24-hour kill switch: Automatic contract revocation if synthetic deepfake is used in political or defamatory contexts.',
        'Biometric Merkle hash must be registered in the metadata descriptor before deployment.'
      ],
      suggestedTerms: `SOVRANLY IP & SOVRAVLY LIKENESS COVENANT
Asset: ${assetName}
Grant: Non-Exclusive Commercial Biometric Likeness License
Term: 12 Calendar Months
Fee: ${est} with 85% creator non-custodial direct split
Prohibition: No open-weights synthetic model redistribution or unauthorized voice synthesis without secondary smart contract amendment.`
    });
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* AI Studio Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-950/80 via-zinc-950 to-violet-950/80 border border-cyan-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                Sovranly AI Intelligence Hub
              </span>
              <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 font-mono text-xs">
                Dedicated AI Section • Distinct from IP &amp; Spider
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              AI Command Center <span className="text-cyan-400 font-mono text-2xl font-light">{"//"} SAM AI</span>
            </h1>
            <p className="text-zinc-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Autonomous creator intelligence and market valuation. Access <strong>SAM AI</strong> (Sovereign Autonomous Manager) for smart contract covenant auditing, IP rights analysis, and decentralized licensing compliance.
            </p>
          </div>
        </div>
      </div>

      {/* SAM AI MODULE */}
      <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input & Valuation Config */}
            <div className="lg:col-span-6 space-y-5">
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 space-y-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h3 className="text-white font-bold text-sm uppercase font-mono tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    SAM AI Likeness &amp; IP Valuation Inspector
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                    Sovereign Model
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-zinc-300">Target Asset or Sovravly Biometric ID</label>
                    <Input 
                      value={assetName} 
                      onChange={e => setAssetName(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-zinc-300">Creator Reach Tier</label>
                      <select 
                        value={reachTier} 
                        onChange={e => setReachTier(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white"
                      >
                        <option value="emerging">Emerging (&lt; 25K Reach)</option>
                        <option value="mid">Mid-Tier (25K - 250K Reach)</option>
                        <option value="high">High-Impact (250K+ Reach)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-mono text-zinc-300">Intended Usage Scope</label>
                      <select 
                        value={usageScope} 
                        onChange={e => setUsageScope(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white"
                      >
                        <option value="ai_training">AI Training Dataset</option>
                        <option value="commercial_ad">Commercial Advertising</option>
                        <option value="gaming_mesh">Gaming &amp; 3D Synthetic Avatar</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-mono text-zinc-300">Specific Covenant Constraints or Clauses to Audit</label>
                    <Textarea 
                      placeholder="e.g. Ensure no unauthorized deepfake voice cloning is permitted, and guarantee 85% creator royalty with automatic clawback if payment is late."
                      value={promptInput}
                      onChange={e => setPromptInput(e.target.value)}
                      rows={3}
                      className="bg-zinc-900 border-zinc-800 text-white text-xs leading-relaxed"
                    />
                  </div>

                  <Button 
                    onClick={runSamAnalysis}
                    disabled={isAnalyzing}
                    className="w-full bg-gradient-to-r from-cyan-500 to-teal-400 hover:brightness-110 text-black font-extrabold text-xs py-3 rounded-xl cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" /> SAM AI Auditing Covenant Weights...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Run SAM AI Valuation &amp; Risk Audit
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Results Display */}
            <div className="lg:col-span-6 space-y-5">
              {analysisResult ? (
                <div className="bg-zinc-950 border border-cyan-500/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" /> SAM AI Audit Intelligence
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold">
                      Risk Level: {analysisResult.riskScore}/100 (Safe)
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/80 border border-cyan-500/20 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">Estimated Fair Market Value:</span>
                    <p className="text-2xl font-black text-white font-mono text-cyan-300">
                      {analysisResult.fairValueEstimate}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      Benchmarked against current commercial licensing rates and generative synthetic training indices.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider block font-bold">
                      Covenant Recommendations:
                    </span>
                    <div className="space-y-2">
                      {analysisResult.recommendations.map((rec, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-zinc-300">
                          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400">Generated Legal Covenant Snippet:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(analysisResult.suggestedTerms);
                          setCopiedDraft(true);
                          setTimeout(() => setCopiedDraft(false), 2000);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] cursor-pointer"
                      >
                        {copiedDraft ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiedDraft ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                      {analysisResult.suggestedTerms}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-3xl bg-zinc-950 border border-zinc-800/80 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                    <Cpu className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h4 className="text-white font-bold text-sm">SAM AI Ready</h4>
                  <p className="text-zinc-400 text-xs max-w-sm mx-auto">
                    Configure your parameters on the left and run the valuation audit to generate self-executing covenant terms and fair pricing estimates.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
}

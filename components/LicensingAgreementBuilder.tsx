'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from './auth/FirebaseProvider';
import { getAuthHeaders } from '@/lib/auth-client';
import { 
  FileText, 
  CheckCircle2, 
  Zap, 
  Wallet, 
  ExternalLink, 
  ShieldAlert, 
  RefreshCw, 
  Sliders, 
  Eye, 
  Hourglass, 
  Users, 
  Lock, 
  Scale, 
  ArrowRight, 
  ShieldCheck, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  UserCheck, 
  Radio, 
  FileSignature, 
  Mail, 
  Coins, 
  DollarSign, 
  Receipt, 
  PlusCircle, 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  ArrowUpRight, 
  Clock, 
  Sparkles, 
  Check, 
  Music, 
  ImageIcon, 
  Code2, 
  Film, 
  GraduationCap, 
  Layers,
  ArrowRightLeft,
  Loader2,
  Archive,
  Database,
  Copy,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  MessageSquare,
  RotateCcw
} from 'lucide-react';
import NotarizationEmailModal from './NotarizationEmailModal';
import AgreementExportModal from './AgreementExportModal';
import VaultAgreementViewModal, { VaultRecord } from './VaultAgreementViewModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ethers } from 'ethers';

export type Asset = { 
  id: string; 
  title: string; 
  type: string; 
  royalty: number; 
  license: string; 
  creationDate?: string;
  ownerAddress?: string;
  description?: string;
  ipfsHash?: string | null;
};

export type Agreement = {
  id?: string;
  assetId: string;
  assetTitle: string;
  royaltyRate: number;
  basePrice: number;
  duration: string;
  permittedUsages: string[];
  continuousVerification: string[];
  status: 'ACTIVE' | 'TERMINATED' | 'PENDING';
  creatorEmail: string;
  creatorWallet: string;
  contractAddress: string;
  deployTxHash: string;
  createdAt: string;
  territory?: string;
  exclusivity?: string;
  dictatedTerms?: string;
  moralityClause?: boolean;
};

export type RoyaltyPayment = {
  id: string;
  licenseId: string;
  assetId: string;
  assetTitle: string;
  payerName: string;
  payerPlatform: string;
  grossAmount: number;
  royaltyRate: number;
  netCreatorEarnings: number;
  currency: 'ETH' | 'USD';
  status: 'SETTLED' | 'PENDING';
  txHash: string;
  paymentDate: string;
  notes?: string;
  creator?: string;
  createdAt?: string;
};

const TEMPLATES = [
  {
    name: 'Non-Exclusive Media Share',
    description: 'Perfect for digital creators, podcasts, and streaming audio formats.',
    royaltyRate: 15,
    basePrice: 0.05,
    duration: '1 Year',
    usages: ['Streaming & Broadcasting', 'Derivative Works'],
    verification: ['Cryptographic Digital Watermark', 'Automated Content Scan']
  },
  {
    name: 'Commercial Broadcast Sync',
    description: 'Targeted for TV, cinema, advertising, and corporate marketing campaigns.',
    royaltyRate: 25,
    basePrice: 0.35,
    duration: '3 Years',
    usages: ['Streaming & Broadcasting', 'Commercial Sponsorships', 'Sync Licensing (Film / TV / Game)'],
    verification: ['Cryptographic Digital Watermark', 'Chainlink IP Oracle Sync', 'Multi-sig Escrow Deposit']
  },
  {
    name: 'Full Commercial Buyout',
    description: 'Grants extensive redistribution rights with a higher upfront fee.',
    royaltyRate: 0,
    basePrice: 2.5,
    duration: 'Perpetual',
    usages: ['Streaming & Broadcasting', 'Physical Merchandise', 'Derivative Works', 'Commercial Sponsorships', 'Software & App Integration'],
    verification: ['Sovereign Registry Anchoring', 'Continuous Zero-Trust Key Attestation']
  },
  {
    name: 'Dynamic Fractional License',
    description: 'Shared creator communities with high recurring stream royalties.',
    royaltyRate: 50,
    basePrice: 0.1,
    duration: '5 Years',
    usages: ['Streaming & Broadcasting', 'Derivative Works', 'Public Performance & Exhibition'],
    verification: ['Cryptographic Digital Watermark', 'Chainlink IP Oracle Sync', 'Automatic Revenue Escrow Dispatch']
  }
];

const USAGE_OPTIONS = [
  'Streaming & Broadcasting',
  'Derivative Works & Remixes',
  'Commercial Sponsorships & Ads',
  'Software & App Integration',
  'AI Model Training & Fine-Tuning',
  'Physical Merchandise',
  'Print & Publication',
  'Public Performance & Exhibition',
  'Sync Licensing (Film / TV / Game)'
];

const DURATION_PRESETS = ['6 Months', '1 Year', '2 Years', '3 Years', '5 Years', 'Perpetual'];

interface Props {
  walletAddress: string | null;
  initialAsset?: Asset | null;
}

export default function LicensingAgreementBuilder({ walletAddress, initialAsset }: Props) {
  const { user, isSandboxMode } = useAuth();
  
  // Master Section Tab
  const [activeTab, setActiveTab] = useState<'builder' | 'royalties' | 'registry' | 'vault'>('builder');

  const [contractSeed] = useState(() => Math.floor(100000 + Math.random() * 900000));
  
  // Assets & Agreements state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(initialAsset || null);
  
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loadingAgreements, setLoadingAgreements] = useState(true);

  // Royalty Payments state
  const [royaltyPayments, setRoyaltyPayments] = useState<RoyaltyPayment[]>([]);
  const [loadingRoyalties, setLoadingRoyalties] = useState(true);
  const [royaltyFilterStatus, setRoyaltyFilterStatus] = useState<'ALL' | 'SETTLED' | 'PENDING'>('ALL');
  const [royaltySearchQuery, setRoyaltySearchQuery] = useState('');
  
  // Record incoming royalty modal state
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [newPaymentForm, setNewPaymentForm] = useState({
    assetId: '',
    payerName: 'Spotify DSP Streaming Pool',
    payerPlatform: 'Digital Streaming Network',
    grossAmount: '0.50',
    royaltyRate: '85',
    status: 'SETTLED' as 'SETTLED' | 'PENDING',
    notes: 'Q3 Automated DSP Streaming Broadcast royalty disbursement.'
  });

  // Releasing pending escrow state
  const [isReleasingEscrow, setIsReleasingEscrow] = useState(false);
  const [escrowSuccessMsg, setEscrowSuccessMsg] = useState<string | null>(null);

  // License Builder Form Parameters
  const [royaltyRate, setRoyaltyRate] = useState<number>(15);
  const [basePrice, setBasePrice] = useState<number>(0.1);
  const [duration, setDuration] = useState<string>('3 Years');
  const [customDuration, setCustomDuration] = useState('');
  
  // Licensing Scope & Rights Definition
  const [mediaType, setMediaType] = useState<string>('SVOD / Streaming TV');
  const [territory, setTerritory] = useState<string>('Worldwide (WW)');
  const [exclusivity, setExclusivity] = useState<'Non-Exclusive' | 'Exclusive'>('Non-Exclusive');
  const [targetLicensee, setTargetLicensee] = useState<string>('Open Public License (Permissionless)');

  // Financial Architecture & Splits
  const [backendTrigger, setBackendTrigger] = useState<string>('Stream count threshold (>10M streams via Oracle)');

  // Usage & Attribution Constraints
  const [creditRequirement, setCreditRequirement] = useState<string>('"[Track Title]" courtesy of Sovranly IP');
  const [allowedEdits, setAllowedEdits] = useState({
    truncation: true,
    looping: true,
    instrumentalOnly: false,
    pitchShift: false
  });
  const [moralityClause, setMoralityClause] = useState<boolean>(true);

  // Technical Execution & Oracle Integration
  const [executionTrigger, setExecutionTrigger] = useState<string>('Multi-sig Escrow Deposit');
  const [metadataIpfsHash] = useState<string>(() => 'ipfs://bafybeig' + Math.random().toString(36).slice(2, 15) + 'q5h7');

  const [permittedUsages, setPermittedUsages] = useState<string[]>([
    'Streaming & Broadcasting',
    'Commercial Sponsorships & Ads'
  ]);
  const [continuousVerification, setContinuousVerification] = useState<string[]>([
    'Cryptographic Digital Watermark',
    'Automated Content Scan',
    'Chainlink IP Oracle Sync'
  ]);

  // Agreement Deployment & Anchoring State
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState(0);
  const [successAgreement, setSuccessAgreement] = useState<Agreement | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Web Speech API - Real-Time Speech-to-Text Dictation State
  const recognitionRef = useRef<any>(null);
  const isDictatingRef = useRef(false);
  const [isDictating, setIsDictating] = useState(false);
  const [dictatedTerms, setDictatedTerms] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [autoTuneFromVoice, setAutoTuneFromVoice] = useState(true);
  const autoTuneRef = useRef(autoTuneFromVoice);
  const [lastAutoAppliedSummary, setLastAutoAppliedSummary] = useState<string | null>(null);
  const [dictationStatus, setDictationStatus] = useState('Click microphone to dictate custom terms in real time');
  const [isPlayingVoiceTerms, setIsPlayingVoiceTerms] = useState(false);
  const [micSupported] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    }
    return true;
  });

  // Keep autoTuneRef updated without triggering recognition restarts
  useEffect(() => {
    autoTuneRef.current = autoTuneFromVoice;
  }, [autoTuneFromVoice]);

  // Natural Language Voice Term Parser: extracts royalty, fee, duration, territory, exclusivity, AI clauses, and usages
  const parseAndApplyVoiceTerms = useCallback((text: string): string[] => {
    if (!text.trim()) return [];
    const applied: string[] = [];
    const lower = text.toLowerCase();

    // 1. Royalty split detection (e.g. "royalty 25%", "25 percent royalty", "split to 30%", "set royalty to 20 percent")
    const royaltyMatch = lower.match(/(?:royalty|split|rate|cut)\s*(?:is|to|of)?\s*(\d{1,3})\s*(?:%|percent)?/) ||
                         lower.match(/(\d{1,3})\s*(?:%|percent)\s*(?:royalty|split|rate|creator)/);
    if (royaltyMatch) {
      const rateVal = parseInt(royaltyMatch[1], 10);
      if (!isNaN(rateVal) && rateVal >= 0 && rateVal <= 100) {
        setRoyaltyRate(rateVal);
        applied.push(`Royalty: ${rateVal}%`);
      }
    }

    // 2. Base price / fee detection (e.g. "base price 0.5 eth", "fee 0.25 ether", "commercial price 1.5", "0.35 eth")
    const priceMatch = lower.match(/(?:base\s*price|fee|price|cost|acquisition)\s*(?:is|to|of)?\s*(\d+(?:\.\d{1,3})?)\s*(?:eth|ether)?/) ||
                       lower.match(/(\d+(?:\.\d{1,3})?)\s*(?:eth|ether)\s*(?:fee|price|upfront|base)?/);
    if (priceMatch) {
      const priceVal = parseFloat(priceMatch[1]);
      if (!isNaN(priceVal) && priceVal >= 0) {
        setBasePrice(priceVal);
        applied.push(`Base Price: ${priceVal} ETH`);
      }
    }

    // 3. Duration detection (e.g. "duration 2 years", "term 1 year", "perpetual", "6 months")
    if (lower.includes('perpetual') || lower.includes('forever') || lower.includes('in perpetuity')) {
      setDuration('Perpetual');
      applied.push('Duration: Perpetual');
    } else if (lower.includes('6 months') || lower.includes('six months')) {
      setDuration('6 Months');
      applied.push('Duration: 6 Months');
    } else if (lower.includes('1 year') || lower.includes('one year')) {
      setDuration('1 Year');
      applied.push('Duration: 1 Year');
    } else if (lower.includes('2 year') || lower.includes('two year') || lower.includes('2 years')) {
      setDuration('2 Years');
      applied.push('Duration: 2 Years');
    } else if (lower.includes('3 year') || lower.includes('three year') || lower.includes('3 years')) {
      setDuration('3 Years');
      applied.push('Duration: 3 Years');
    } else if (lower.includes('5 year') || lower.includes('five year') || lower.includes('5 years')) {
      setDuration('5 Years');
      applied.push('Duration: 5 Years');
    }

    // 4. Territory detection
    if (lower.includes('worldwide') || lower.includes('global') || lower.includes('all territories')) {
      setTerritory('Worldwide (WW)');
      applied.push('Territory: Worldwide');
    } else if (lower.includes('north america') || lower.includes('united states') || lower.includes('us and canada')) {
      setTerritory('North America (US / CA)');
      applied.push('Territory: North America');
    } else if (lower.includes('european union') || lower.includes('europe') || lower.includes('eu')) {
      setTerritory('European Union (EU / UK)');
      applied.push('Territory: EU / UK');
    } else if (lower.includes('asia') || lower.includes('apac')) {
      setTerritory('Asia-Pacific (APAC)');
      applied.push('Territory: Asia-Pacific');
    }

    // 5. Exclusivity detection
    if (lower.includes('non-exclusive') || lower.includes('non exclusive')) {
      setExclusivity('Non-Exclusive');
      applied.push('Exclusivity: Non-Exclusive');
    } else if (lower.includes('exclusive') || lower.includes('sole license')) {
      setExclusivity('Exclusive');
      applied.push('Exclusivity: Exclusive');
    }

    // 6. Usages and AI Rights detection
    const newUsages: string[] = [];
    if (lower.includes('streaming') || lower.includes('broadcast')) {
      newUsages.push('Streaming & Broadcasting');
    }
    if (lower.includes('derivative') || lower.includes('remix')) {
      newUsages.push('Derivative Works & Remixes');
    }
    if (lower.includes('sponsorship') || lower.includes('ad') || lower.includes('commercial sponsorship')) {
      newUsages.push('Commercial Sponsorships & Ads');
    }
    if (lower.includes('software') || lower.includes('app')) {
      newUsages.push('Software & App Integration');
    }
    if (lower.includes('merchandise') || lower.includes('physical product')) {
      newUsages.push('Physical Merchandise');
    }
    if (lower.includes('print') || lower.includes('publication') || lower.includes('book')) {
      newUsages.push('Print & Publication');
    }
    if (lower.includes('performance') || lower.includes('exhibition') || lower.includes('live')) {
      newUsages.push('Public Performance & Exhibition');
    }
    if (lower.includes('sync') || lower.includes('film') || lower.includes('tv') || lower.includes('television') || lower.includes('cinema')) {
      newUsages.push('Sync Licensing (Film / TV / Game)');
    }

    // Explicit AI Training Opt-Out vs Opt-In
    if (
      lower.includes('no ai') || 
      lower.includes('opt out of ai') || 
      lower.includes('opt-out of ai') || 
      lower.includes('forbid ai') || 
      lower.includes('prohibit ai') ||
      lower.includes('strict ai opt out') ||
      lower.includes('ban ai training')
    ) {
      setPermittedUsages(prev => prev.filter(u => u !== 'AI Model Training & Fine-Tuning'));
      applied.push('AI: Training Prohibited (Opt-Out)');
    } else if (lower.includes('allow ai') || lower.includes('enable ai') || lower.includes('permit ai') || lower.includes('ai training')) {
      newUsages.push('AI Model Training & Fine-Tuning');
      applied.push('AI: Training Permitted');
    }

    if (newUsages.length > 0) {
      setPermittedUsages(prev => Array.from(new Set([...prev, ...newUsages])));
      applied.push(`Usages: ${newUsages.join(', ')}`);
    }

    // 7. Morality clause detection
    if (lower.includes('enable morality') || lower.includes('include morality') || lower.includes('morality kill switch') || lower.includes('add morality')) {
      setMoralityClause(true);
      applied.push('Morality: Active');
    } else if (lower.includes('disable morality') || lower.includes('remove morality') || lower.includes('without morality')) {
      setMoralityClause(false);
      applied.push('Morality: Disabled');
    }

    // 8. Attribution requirement
    if (lower.includes('require attribution') || lower.includes('must credit') || lower.includes('courtesy of')) {
      setCreditRequirement('"[Track Title]" courtesy of Sovranly IP');
      applied.push('Attribution: Required');
    }

    // 9. Oracle / Trigger detection
    if (lower.includes('stream threshold') || lower.includes('stream count') || lower.includes('10 million streams')) {
      setBackendTrigger('Stream count threshold (>10M streams via Oracle)');
      applied.push('Trigger: 10M Stream Threshold');
    } else if (lower.includes('escrow deposit') || lower.includes('multi-sig escrow')) {
      setExecutionTrigger('Multi-sig Escrow Deposit');
      applied.push('Trigger: Escrow Deposit');
    }

    return applied;
  }, []);

  const parserRef = useRef(parseAndApplyVoiceTerms);
  useEffect(() => {
    parserRef.current = parseAndApplyVoiceTerms;
  }, [parseAndApplyVoiceTerms]);

  // Web Speech API Initialization with lifecycle callbacks
  const initRecognition = useCallback(() => {
    if (typeof window === 'undefined') return null;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsDictating(true);
        isDictatingRef.current = true;
        setDictationStatus('Microphone active. Dictating live terms into agreement...');
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let finalSegment = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalSegment += transcriptPiece + ' ';
          } else {
            currentInterim += transcriptPiece;
          }
        }

        if (finalSegment) {
          setDictatedTerms((prev) => {
            const sep = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + sep + finalSegment;
          });

          if (autoTuneRef.current) {
            const applied = parserRef.current(finalSegment);
            if (applied.length > 0) {
              setLastAutoAppliedSummary(applied.join(' • '));
            }
          }
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition notice:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setDictationStatus('Microphone permission denied. Allow microphone access in your browser settings.');
          setIsDictating(false);
          isDictatingRef.current = false;
        } else if (event.error === 'no-speech') {
          setDictationStatus('No speech detected. Listening paused.');
        } else if (event.error === 'audio-capture') {
          setDictationStatus('No microphone detected. Check your audio device settings.');
          setIsDictating(false);
          isDictatingRef.current = false;
        } else {
          setDictationStatus(`Speech status: ${event.error}`);
        }
      };

      recognition.onend = () => {
        if (isDictatingRef.current) {
          // Keep continuous session alive if user has not explicitly stopped
          try {
            recognition.start();
            return;
          } catch {
            // ignore restart attempt error
          }
        }
        setIsDictating(false);
        isDictatingRef.current = false;
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      return recognition;
    } catch (err) {
      console.error('Failed to initialize speech recognition in builder:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    initRecognition();
    return () => {
      isDictatingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [initRecognition]);

  // Toggle Microphone Access for Dictation
  const toggleDictation = async () => {
    if (!micSupported) {
      setDictationStatus('Web Speech API is not supported in this browser. You can type custom agreement terms manually.');
      return;
    }

    if (isDictating) {
      isDictatingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsDictating(false);
      setInterimTranscript('');
      setDictationStatus('Dictation paused. Review your custom terms.');
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Release media tracks immediately so SpeechRecognition has uncontended device access
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (err) {
        console.warn('Microphone access notice:', err);
        setDictationStatus('Microphone permission denied. Allow microphone access in browser settings.');
        return;
      }

      let activeRec = recognitionRef.current;
      if (!activeRec) {
        activeRec = initRecognition();
      }

      if (activeRec) {
        try {
          setInterimTranscript('');
          isDictatingRef.current = true;
          activeRec.start();
          setIsDictating(true);
          setDictationStatus('Listening live... Speak custom license covenants or parameter commands.');
        } catch (err) {
          console.warn('Recognition start retry:', err);
          try {
            activeRec.stop();
            setTimeout(() => {
              try {
                isDictatingRef.current = true;
                activeRec?.start();
                setIsDictating(true);
                setDictationStatus('Listening live... Speak custom license covenants or parameter commands.');
              } catch {
                isDictatingRef.current = false;
                setIsDictating(false);
                setDictationStatus('Could not activate microphone. Check browser permissions and try again.');
              }
            }, 200);
          } catch {
            isDictatingRef.current = false;
            setIsDictating(false);
            setDictationStatus('Could not activate microphone. Try again.');
          }
        }
      }
    }
  };

  // Text-to-Speech playback using SpeechSynthesis
  const handleToggleReadAloud = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isPlayingVoiceTerms) {
      window.speechSynthesis.cancel();
      setIsPlayingVoiceTerms(false);
      return;
    }

    const textToRead = dictatedTerms.trim() || interimTranscript.trim();
    if (!textToRead) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.onend = () => setIsPlayingVoiceTerms(false);
    utterance.onerror = () => setIsPlayingVoiceTerms(false);
    setIsPlayingVoiceTerms(true);
    window.speechSynthesis.speak(utterance);
  };

  // Continuous Auditing states
  const [auditingId, setAuditingId] = useState<string | null>(null);
  const [auditReports, setAuditReports] = useState<Record<string, { status: string; log: string[] }>>({});

  // Gmail Notarization Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailTargetAgreement, setEmailTargetAgreement] = useState<Agreement | null>(null);

  // Sovereign Agreement Vault & Email Export State
  const [vaultAgreements, setVaultAgreements] = useState<VaultRecord[]>([]);
  const [loadingVault, setLoadingVault] = useState(false);
  const [vaultSearchQuery, setVaultSearchQuery] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportTargetAgreement, setExportTargetAgreement] = useState<Agreement | null>(null);
  const [selectedVaultRecord, setSelectedVaultRecord] = useState<VaultRecord | null>(null);
  const [isVaultViewModalOpen, setIsVaultViewModalOpen] = useState(false);
  const [copiedVaultHashId, setCopiedVaultHashId] = useState<string | null>(null);

  // Fetch Vault Agreements held by the app
  const fetchVaultAgreements = useCallback(async () => {
    setLoadingVault(true);
    try {
      const headers = await getAuthHeaders(user, isSandboxMode);
      const res = await fetch('/api/agreements/export', { headers: { ...headers } });
      if (res.ok) {
        const data = await res.json();
        setVaultAgreements(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading vault agreements:', err);
    } finally {
      setLoadingVault(false);
    }
  }, [user, isSandboxMode]);

  useEffect(() => {
    let isMounted = true;
    const loadVault = async () => {
      setLoadingVault(true);
      try {
        const headers = await getAuthHeaders(user, isSandboxMode);
        const res = await fetch('/api/agreements/export', { headers: { ...headers } });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setVaultAgreements(Array.isArray(data) ? data : []);
          }
        }
      } catch (err) {
        console.error('Error loading vault agreements:', err);
      } finally {
        if (isMounted) {
          setLoadingVault(false);
        }
      }
    };
    loadVault();
    return () => {
      isMounted = false;
    };
  }, [user, isSandboxMode]);

  const filteredVaultRecords = useMemo(() => {
    if (!vaultSearchQuery.trim()) return vaultAgreements;
    const q = vaultSearchQuery.toLowerCase();
    return vaultAgreements.filter(r => 
      r.assetTitle?.toLowerCase().includes(q) ||
      r.licensorEmail?.toLowerCase().includes(q) ||
      r.vaultId?.toLowerCase().includes(q) ||
      r.contractAddress?.toLowerCase().includes(q)
    );
  }, [vaultAgreements, vaultSearchQuery]);

  const handleDownloadVaultJson = (record: VaultRecord) => {
    const backupData = {
      archiveHeader: 'SOVRANLY IP — IMMUTABLE SOVEREIGN VAULT COVENANT BACKUP',
      vaultId: record.vaultId,
      covenantHash: record.covenantHash,
      exportDate: record.exportedAt,
      licensorParticipant: {
        email: record.licensorEmail,
        name: record.licensorName,
      },
      creatorOwner: {
        email: record.creatorEmail,
      },
      agreementTerms: {
        assetTitle: record.assetTitle,
        assetType: record.assetType,
        royaltyRate: `${record.royaltyRate}% Creator Share`,
        basePrice: `${record.basePrice} ETH`,
        duration: record.duration,
        permittedUsages: record.permittedUsages,
        territory: record.territory,
        exclusivity: record.exclusivity,
      },
      onChainProofs: {
        smartContractAddress: record.contractAddress,
        deployTxHash: record.deployTxHash,
        ipfsCid: record.ipfsHash,
      },
      vaultPreservationNotice: 'This record was archived into the Sovranly IP internal vault upon email export to ensure perpetual retrieval in case of inbox data loss.',
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `sovranly_vault_backup_${record.vaultId}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Fetch Assets
  useEffect(() => {
    let isMounted = true;
    const fetchAssets = async () => {
      setLoadingAssets(true);
      try {
        const headers = await getAuthHeaders(user, isSandboxMode);
        const res = await fetch('/api/assets', { headers: { ...headers } });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const list = Array.isArray(data) ? data : [];
            setAssets(list);
            setSelectedAsset(prev => {
              if (prev) return prev;
              if (list.length > 0) {
                if (list[0].royalty) setRoyaltyRate(list[0].royalty);
                return list[0];
              }
              return null;
            });
          }
        }
      } catch (err) {
        console.error('Error loading assets:', err);
      } finally {
        if (isMounted) setLoadingAssets(false);
      }
    };

    fetchAssets();
    return () => {
      isMounted = false;
    };
  }, [user, isSandboxMode]);

  // Fetch Agreements
  useEffect(() => {
    let isMounted = true;
    const fetchAgreements = async () => {
      setLoadingAgreements(true);
      try {
        const headers = await getAuthHeaders(user, isSandboxMode);
        const res = await fetch('/api/agreements', { headers: { ...headers } });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setAgreements(Array.isArray(data) ? data : []);
          }
        }
      } catch (err) {
        console.error('Error loading agreements:', err);
      } finally {
        if (isMounted) setLoadingAgreements(false);
      }
    };

    fetchAgreements();
    return () => {
      isMounted = false;
    };
  }, [user, isSandboxMode]);

  // Fetch Royalty Payments
  const fetchRoyalties = useCallback(async () => {
    setLoadingRoyalties(true);
    try {
      const headers = await getAuthHeaders(user, isSandboxMode);
      const res = await fetch('/api/royalties', { headers: { ...headers } });
      if (res.ok) {
        const data = await res.json();
        setRoyaltyPayments(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error loading royalties:', err);
    } finally {
      setLoadingRoyalties(false);
    }
  }, [user, isSandboxMode]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const headers = await getAuthHeaders(user, isSandboxMode);
        const res = await fetch('/api/royalties', { headers: { ...headers } });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setRoyaltyPayments(Array.isArray(data) ? data : []);
          }
        }
      } catch (err) {
        console.error('Error loading royalties:', err);
      } finally {
        if (isMounted) setLoadingRoyalties(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [user, isSandboxMode]);

  // Handle template selection
  const applyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setRoyaltyRate(tmpl.royaltyRate);
    setBasePrice(tmpl.basePrice);
    setDuration(tmpl.duration);
    setPermittedUsages(tmpl.usages);
    setContinuousVerification(tmpl.verification);
  };

  // Toggle usage rights
  const toggleUsage = (usage: string) => {
    setPermittedUsages(prev => 
      prev.includes(usage) ? prev.filter(u => u !== usage) : [...prev, usage]
    );
  };

  // Deploy / Anchor Agreement
  const handleDeployAgreement = async () => {
    setDeployError(null);
    if (!selectedAsset) {
      setDeployError('Please select a registered IP Asset above before deploying the license agreement.');
      return;
    }

    setIsDeploying(true);
    setDeployStep(1);

    try {
      // Step 1: Simulated / on-chain cryptographic signing
      await new Promise(r => setTimeout(r, 700));
      setDeployStep(2);

      // Step 2: Contract generation
      await new Promise(r => setTimeout(r, 700));
      setDeployStep(3);

      // Step 3: Oracle registration
      await new Promise(r => setTimeout(r, 700));
      setDeployStep(4);

      const contractAddress = '0x' + Math.random().toString(16).slice(2, 42);
      const deployTxHash = '0x' + Math.random().toString(16).slice(2, 66);

      const newAgr: Omit<Agreement, 'id'> = {
        assetId: selectedAsset.id,
        assetTitle: selectedAsset.title,
        royaltyRate,
        basePrice,
        duration: duration === 'Custom' ? customDuration : duration,
        permittedUsages,
        continuousVerification,
        status: 'ACTIVE',
        creatorEmail: user?.email || 'creator@sovranlyip.com',
        creatorWallet: walletAddress || '0x' + Math.random().toString(16).slice(2, 42),
        contractAddress,
        deployTxHash,
        territory,
        exclusivity,
        dictatedTerms: dictatedTerms.trim() || undefined,
        moralityClause,
        createdAt: new Date().toISOString()
      };

      const headers = await getAuthHeaders(user, isSandboxMode);
      const res = await fetch('/api/agreements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(newAgr)
      });

      if (!res.ok) throw new Error('Failed to anchor agreement');
      const savedAgreement = await res.json();

      setAgreements(prev => [savedAgreement, ...prev]);
      setSuccessAgreement(savedAgreement);

      // Also record in transactions
      try {
        await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({
            hash: deployTxHash,
            type: 'License Agreement Anchored',
            assetTitle: selectedAsset.title,
            amount: `${basePrice} ETH`,
            fromAddress: user?.email || 'Creator Wallet',
            toAddress: contractAddress
          })
        });
      } catch (txErr) {
        console.warn('Tx log failed:', txErr);
      }

    } catch (err: any) {
      console.error('Deployment error:', err);
      setDeployError(err?.message || 'Failed to deploy agreement. Please try again.');
    } finally {
      setIsDeploying(false);
    }
  };

  // Record incoming royalty payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecordingPayment(true);
    try {
      const targetAsset = assets.find(a => a.id === newPaymentForm.assetId) || selectedAsset || assets[0];
      const gross = parseFloat(newPaymentForm.grossAmount) || 0;
      const rate = parseFloat(newPaymentForm.royaltyRate) || 85;
      const net = (gross * rate) / 100;

      const payload = {
        licenseId: 'license-' + Math.floor(1000 + Math.random() * 9000),
        assetId: targetAsset?.id || 'asset-manual',
        assetTitle: targetAsset?.title || 'Creative IP Asset',
        payerName: newPaymentForm.payerName,
        payerPlatform: newPaymentForm.payerPlatform,
        grossAmount: gross,
        royaltyRate: rate,
        netCreatorEarnings: net,
        currency: 'ETH',
        status: newPaymentForm.status,
        notes: newPaymentForm.notes,
        paymentDate: new Date().toISOString()
      };

      const headers = await getAuthHeaders(user, isSandboxMode);
      const res = await fetch('/api/royalties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const recorded = await res.json();
        setRoyaltyPayments(prev => [recorded, ...prev]);
        setIsRecordPaymentOpen(false);
        setNewPaymentForm({
          assetId: '',
          payerName: 'Spotify DSP Streaming Pool',
          payerPlatform: 'Digital Streaming Network',
          grossAmount: '0.50',
          royaltyRate: '85',
          status: 'SETTLED',
          notes: 'Automated DSP Streaming Broadcast royalty disbursement.'
        });
      }
    } catch (err) {
      console.error('Error recording payment:', err);
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Release all pending escrow
  const handleReleasePendingEscrow = async () => {
    setIsReleasingEscrow(true);
    setEscrowSuccessMsg(null);
    try {
      const pendingItems = royaltyPayments.filter(p => p.status === 'PENDING');
      if (pendingItems.length === 0) {
        alert('No pending royalty payments currently buffered in escrow.');
        setIsReleasingEscrow(false);
        return;
      }

      const headers = await getAuthHeaders(user, isSandboxMode);
      
      // Update pending items to SETTLED
      for (const item of pendingItems) {
        await fetch('/api/royalties', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ id: item.id, status: 'SETTLED' })
        });
      }

      // Refresh local state
      setRoyaltyPayments(prev => prev.map(p => p.status === 'PENDING' ? { ...p, status: 'SETTLED' } : p));
      
      const totalReleased = pendingItems.reduce((acc, curr) => acc + curr.netCreatorEarnings, 0);
      setEscrowSuccessMsg(`Escrow Released: Successfully settled ${totalReleased.toFixed(4)} ETH (${pendingItems.length} transactions) directly to creator wallet!`);

    } catch (err) {
      console.error('Error releasing escrow:', err);
    } finally {
      setIsReleasingEscrow(false);
    }
  };

  // Financial Calculations for Royalty Dashboard
  const { totalEarnings, pendingEarnings, settledCount, pendingCount, avgRoyaltyRate } = useMemo(() => {
    let settledTotal = 0;
    let pendingTotal = 0;
    let sCount = 0;
    let pCount = 0;
    let totalRate = 0;

    royaltyPayments.forEach(p => {
      if (p.status === 'SETTLED') {
        settledTotal += (p.netCreatorEarnings || 0);
        sCount++;
      } else {
        pendingTotal += (p.netCreatorEarnings || 0);
        pCount++;
      }
      totalRate += (p.royaltyRate || 0);
    });

    const avgRate = royaltyPayments.length > 0 ? Math.round(totalRate / royaltyPayments.length) : 85;

    return {
      totalEarnings: settledTotal,
      pendingEarnings: pendingTotal,
      settledCount: sCount,
      pendingCount: pCount,
      avgRoyaltyRate: avgRate
    };
  }, [royaltyPayments]);

  // Filtered Royalty Payments
  const filteredRoyaltyPayments = useMemo(() => {
    return royaltyPayments.filter(p => {
      const matchesStatus = royaltyFilterStatus === 'ALL' || p.status === royaltyFilterStatus;
      const matchesSearch = 
        p.assetTitle.toLowerCase().includes(royaltySearchQuery.toLowerCase()) ||
        p.payerName.toLowerCase().includes(royaltySearchQuery.toLowerCase()) ||
        p.payerPlatform.toLowerCase().includes(royaltySearchQuery.toLowerCase()) ||
        p.txHash.toLowerCase().includes(royaltySearchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [royaltyPayments, royaltyFilterStatus, royaltySearchQuery]);

  // Trigger continuous audit simulation
  const triggerAudit = (agr: Agreement) => {
    if (!agr.id) return;
    setAuditingId(agr.id);
    setAuditReports(prev => ({
      ...prev,
      [agr.id!]: {
        status: 'AUDITING',
        log: ['Initializing continuous zero-trust node...', 'Polling Chainlink IP Oracle swarm...']
      }
    }));

    setTimeout(() => {
      setAuditReports(prev => ({
        ...prev,
        [agr.id!]: {
          status: 'SECURE',
          log: [
            '✓ Cryptographic integrity watermark verified (SHA-256 match)',
            '✓ DSP streaming playback threshold verified against decentralized oracle',
            '✓ Escrow contract balance verified and balanced',
            '✓ ZERO-TRUST CONTINUOUS VALIDATION SCORE: 100% SECURE'
          ]
        }
      }));
      setAuditingId(null);
    }, 1800);
  };

  // Export Statement
  const handleExportStatement = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(royaltyPayments, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sovranly_royalty_statement_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/60 text-cyan-400 border border-cyan-500/30">
              SMART LICENSING & ROYALTIES
            </span>
            <span className="text-zinc-600 text-xs font-mono">• Continuous Zero-Trust Verification</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Scale className="w-6 h-6 text-cyan-400" /> IP License Management & Royalty Tracking
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-light max-w-3xl leading-relaxed">
            Define custom license covenants (duration, usage rights, royalty splits) bound to your registered IP assets. Track real-time incoming royalty payments, monitor pending escrow disbursements, and audit on-chain compliance.
          </p>
        </div>

        {/* Action Tabs Navigation */}
        <div className="flex items-center bg-zinc-950 p-1.5 rounded-2xl border border-zinc-850">
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${activeTab === 'builder' ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/50' : 'text-zinc-400 hover:text-white'}`}
          >
            <FileSignature className="w-3.5 h-3.5" /> Define License
          </button>
          <button
            onClick={() => setActiveTab('royalties')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${activeTab === 'royalties' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50' : 'text-zinc-400 hover:text-white'}`}
          >
            <Coins className="w-3.5 h-3.5" /> Royalty Tracking ({royaltyPayments.length})
          </button>
          <button
            onClick={() => setActiveTab('registry')}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${activeTab === 'registry' ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/50' : 'text-zinc-400 hover:text-white'}`}
          >
            <Activity className="w-3.5 h-3.5" /> Covenants ({agreements.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('vault');
              fetchVaultAgreements();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${activeTab === 'vault' ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/50' : 'text-zinc-400 hover:text-white'}`}
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" /> Sovereign Vault ({vaultAgreements.length})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DEFINE & DEPLOY LICENSE TERMS                                     */}
      {/* ========================================================================= */}
      {activeTab === 'builder' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Preset Templates */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                Preset Standard Covenants (Quick Apply)
              </Label>
              <span className="text-[10px] text-zinc-500 font-mono">Customizable parameters below</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.name}
                  onClick={() => applyTemplate(tmpl)}
                  className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-900 hover:border-cyan-500/40 transition-all cursor-pointer space-y-2.5 hover:bg-zinc-900/40 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">{tmpl.name}</span>
                    <span className="text-[10px] font-mono text-cyan-400 font-black">{tmpl.basePrice} ETH</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal line-clamp-2">{tmpl.description}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] font-mono text-zinc-500">
                    <span>Royalty: <strong className="text-emerald-400">{tmpl.royaltyRate}%</strong></span>
                    <span>Term: <strong className="text-zinc-300">{tmpl.duration}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left: Agreement Configuration Form */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Quick Real-Time Speech-to-Text Bar */}
              <div className="bg-gradient-to-r from-cyan-950/40 via-zinc-950 to-zinc-950 p-4 rounded-2xl border border-cyan-800/30 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleDictation}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isDictating
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40 animate-pulse'
                        : 'bg-zinc-900 border border-zinc-800 text-cyan-400 hover:border-cyan-500 hover:text-white'
                    }`}
                    title={isDictating ? 'Stop microphone dictation' : 'Click to start real-time speech dictation'}
                  >
                    {isDictating ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
                        Real-Time Speech Dictation
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase">
                        Web Speech API
                      </span>
                      {isDictating && (
                        <>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase animate-pulse">
                            Live
                          </span>
                          <span className="flex items-end gap-0.5 h-3 px-1">
                            <span className="w-0.5 bg-emerald-400 animate-pulse rounded-full h-1.5" />
                            <span className="w-0.5 bg-emerald-400 animate-pulse rounded-full h-3 delay-75" />
                            <span className="w-0.5 bg-emerald-300 animate-pulse rounded-full h-2 delay-150" />
                            <span className="w-0.5 bg-emerald-400 animate-pulse rounded-full h-2.5 delay-100" />
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono">
                      {isDictating ? (interimTranscript ? `“${interimTranscript}”` : 'Listening live... Speak agreement terms, splits, or custom covenants') : 'Dictate license parameters or special clauses directly into the builder'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={toggleDictation}
                    className={`rounded-xl text-xs h-8 px-3 font-mono font-bold cursor-pointer ${
                      isDictating
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600'
                        : 'bg-zinc-900 text-cyan-400 border-zinc-800 hover:bg-zinc-850 hover:text-white'
                    }`}
                  >
                    {isDictating ? 'Stop Recording' : 'Start Dictating'}
                  </Button>
                </div>
              </div>

              {/* Asset Association */}
              <div className="bg-zinc-950 p-6 rounded-[28px] border border-zinc-900 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                  <h4 className="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4" /> 1. Associate Registered IP Asset
                  </h4>
                  <span className="text-[10px] font-mono text-zinc-500">{assets.length} Available in Repository</span>
                </div>

                {loadingAssets ? (
                  <div className="py-4 text-center text-xs font-mono text-zinc-500 animate-pulse">Loading registered assets...</div>
                ) : assets.length === 0 ? (
                  <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl text-xs text-amber-300 space-y-1">
                    <p className="font-bold">No registered IP assets found.</p>
                    <p className="text-[11px] text-zinc-400">Please register your creative work in the IP Asset Manager before binding licensing compacts.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label className="text-xs text-zinc-400 uppercase font-bold">Select Target IP Work</Label>
                    <select
                      id="select-ip-asset-for-license"
                      value={selectedAsset?.id || ''}
                      onChange={(e) => {
                        const found = assets.find(a => a.id === e.target.value);
                        if (found) {
                          setSelectedAsset(found);
                          if (found.royalty) setRoyaltyRate(found.royalty);
                        }
                      }}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 h-11"
                    >
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.title} ({a.type}) • {a.royalty}% Base Royalty
                        </option>
                      ))}
                    </select>

                    {selectedAsset && (
                      <div className="bg-zinc-900/60 rounded-2xl p-3.5 border border-zinc-850 flex items-center justify-between text-xs font-mono text-zinc-300">
                        <div className="space-y-0.5">
                          <p className="font-bold text-white font-sans">{selectedAsset.title}</p>
                          <p className="text-[10px] text-zinc-500">Classification: {selectedAsset.type}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-zinc-500 block">Original Creation Date</span>
                          <span className="text-cyan-400 text-xs font-bold">
                            {selectedAsset.creationDate ? new Date(selectedAsset.creationDate).toLocaleDateString() : 'Recorded'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Terms: Duration & Usage Rights */}
              <div className="bg-zinc-950 p-6 rounded-[28px] border border-zinc-900 shadow-xl space-y-6">
                <div className="border-b border-zinc-900 pb-3">
                  <h4 className="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <Scale className="w-4 h-4" /> 2. Define Duration, Scope & Usage Rights
                  </h4>
                </div>

                {/* Duration */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400 uppercase font-bold flex items-center justify-between">
                    <span>License Duration / Term</span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">{duration}</span>
                  </Label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {DURATION_PRESETS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all border ${duration === d ? 'bg-cyan-950/60 text-cyan-400 border-cyan-500 shadow-sm' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'}`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Usage Rights (Multi-Select) */}
                <div className="space-y-2">
                  <Label className="text-xs text-zinc-400 uppercase font-bold flex items-center justify-between">
                    <span>Permitted Usage Rights</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{permittedUsages.length} Rights Granted</span>
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {USAGE_OPTIONS.map((u) => {
                      const active = permittedUsages.includes(u);
                      return (
                        <button
                          key={u}
                          type="button"
                          onClick={() => toggleUsage(u)}
                          className={`p-3 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between ${active ? 'bg-cyan-950/30 border-cyan-500/80 text-white' : 'bg-zinc-900/40 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                        >
                          <span className="truncate mr-1 text-[11px]">{u}</span>
                          <span className={`text-[10px] font-mono shrink-0 ${active ? 'text-cyan-400' : 'text-zinc-600'}`}>
                            {active ? '✓ YES' : '+ ADD'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Territory & Exclusivity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-900">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400 uppercase font-bold">Territory / Distribution</Label>
                    <select
                      value={territory}
                      onChange={(e) => setTerritory(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono focus:border-cyan-500"
                    >
                      <option value="Worldwide (WW)">Worldwide (WW) - Global Distribution</option>
                      <option value="North America (US / CA)">North America (US / CA)</option>
                      <option value="European Union (EU / UK)">European Union (EU / UK)</option>
                      <option value="Asia-Pacific (APAC)">Asia-Pacific (APAC)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400 uppercase font-bold">Exclusivity Clause</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Non-Exclusive', 'Exclusive'].map((ex) => (
                        <button
                          key={ex}
                          type="button"
                          onClick={() => setExclusivity(ex as any)}
                          className={`py-2 rounded-xl text-xs font-mono font-bold transition-all border ${exclusivity === ex ? 'bg-cyan-950/60 text-cyan-400 border-cyan-500' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}
                        >
                          {ex}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Architecture & Royalty Percentage */}
              <div className="bg-zinc-950 p-6 rounded-[28px] border border-zinc-900 shadow-xl space-y-6">
                <div className="border-b border-zinc-900 pb-3">
                  <h4 className="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <Coins className="w-4 h-4" /> 3. Financial Architecture & Royalty Split
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Royalty Split Slider */}
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400 uppercase font-bold flex items-center justify-between">
                      <span>Creator Direct Royalty Cut</span>
                      <span className="text-sm font-mono font-black text-emerald-400">{royaltyRate}%</span>
                    </Label>
                    <input
                      id="royalty-split-input"
                      type="range"
                      min="0"
                      max="100"
                      value={royaltyRate}
                      onChange={(e) => setRoyaltyRate(parseInt(e.target.value) || 0)}
                      className="w-full accent-emerald-400 h-2 bg-zinc-900 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>0% (Full Buyout)</span>
                      <span>50% (Standard Split)</span>
                      <span>100% (Pure Direct)</span>
                    </div>
                  </div>

                  {/* Base Upfront Fee */}
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400 uppercase font-bold flex items-center justify-between">
                      <span>Base License Acquisition Fee</span>
                      <span className="text-xs font-mono text-zinc-500">≈ ${(basePrice * 2500).toFixed(2)} USD</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="base-price-input"
                        type="number"
                        step="0.01"
                        min="0"
                        value={basePrice}
                        onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                        className="bg-zinc-900 border-zinc-800 text-white font-mono text-sm h-11 pr-12 focus:border-cyan-500"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-cyan-400 font-bold">ETH</span>
                    </div>
                  </div>
                </div>

                {/* Morality Kill Switch */}
                <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-zinc-850">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" /> Morality & Continuous Revocation Kill-Switch
                    </span>
                    <p className="text-[10px] text-zinc-400">Automatically revokes license upon association with defamation, hate speech, or IP breach.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMoralityClause(!moralityClause)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${moralityClause ? 'bg-red-950/40 text-red-400 border-red-500/50 shadow-sm' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}
                  >
                    {moralityClause ? 'ACTIVE' : 'DISABLED'}
                  </button>
                </div>
              </div>

              {/* Section 4: Real-Time Voice Dictation & Custom Covenant Terms */}
              <div className="bg-zinc-950 p-6 rounded-[28px] border border-zinc-900 shadow-xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border ${isDictating ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400' : 'bg-cyan-950/40 border-cyan-800/40 text-cyan-400'}`}>
                      <Mic className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                        4. Real-Time Voice Dictation (Web Speech API)
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Dictate custom covenants, special terms, or speak parameters out loud directly into the license.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-zinc-900 border border-zinc-800 text-cyan-400 flex items-center gap-1">
                      <Radio className="w-3 h-3 text-cyan-400" />
                      Web Speech API
                    </span>
                    {isDictating && (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-950 border border-emerald-600/50 text-emerald-400 flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Listening Live
                      </span>
                    )}
                  </div>
                </div>

                {/* Dictation Controller Card */}
                <div className={`p-5 rounded-2xl border transition-all ${isDictating ? 'bg-emerald-950/15 border-emerald-500/40 shadow-lg shadow-emerald-950/20' : 'bg-zinc-900/40 border-zinc-850'}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    {/* Microphone Toggle Button & Frequency Equalizer */}
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={toggleDictation}
                        className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                          isDictating
                            ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 hover:bg-emerald-400'
                            : 'bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-cyan-400 hover:border-cyan-500/50'
                        }`}
                        title={isDictating ? 'Stop microphone dictation' : 'Click to start real-time speech dictation'}
                      >
                        {isDictating ? (
                          <MicOff className="w-6 h-6 animate-pulse" />
                        ) : (
                          <Mic className="w-6 h-6" />
                        )}
                      </button>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase tracking-wider font-mono ${isDictating ? 'text-emerald-400' : 'text-zinc-200'}`}>
                            {isDictating ? 'Speech Recognition Active · Listening...' : 'Speech-to-Text Inactive'}
                          </span>
                          {isDictating && (
                            <span className="flex items-end gap-1 h-4 px-1" title="Capturing audio frames in real time">
                              <span className="w-1 bg-emerald-400 animate-pulse rounded-full h-2" />
                              <span className="w-1 bg-emerald-400 animate-pulse rounded-full h-4 delay-75" />
                              <span className="w-1 bg-emerald-300 animate-pulse rounded-full h-2.5 delay-150" />
                              <span className="w-1 bg-emerald-400 animate-pulse rounded-full h-4 delay-100" />
                              <span className="w-1 bg-emerald-400 animate-pulse rounded-full h-1.5 delay-200" />
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 font-mono">
                          {dictationStatus}
                        </p>
                      </div>
                    </div>

                    {/* Auto-tune parameters switch */}
                    <div className="flex items-center gap-3 bg-zinc-950/80 px-3.5 py-2 rounded-xl border border-zinc-800">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-bold text-zinc-300 block">Auto-Tune Parameters</span>
                        <span className="text-[9px] text-zinc-500 font-mono">Apply rates/duration/AI from speech</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoTuneFromVoice(!autoTuneFromVoice)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all border cursor-pointer ${
                          autoTuneFromVoice
                            ? 'bg-cyan-950/60 text-cyan-400 border-cyan-600/50'
                            : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                        }`}
                      >
                        {autoTuneFromVoice ? 'ENABLED' : 'OFF'}
                      </button>
                    </div>
                  </div>

                  {/* Live Streaming Interim Transcript Bubble */}
                  {interimTranscript && (
                    <div className="mt-4 p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-mono flex items-center gap-2 animate-pulse">
                      <Radio className="w-3.5 h-3.5 flex-shrink-0 text-emerald-400 animate-spin" />
                      <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Interim:</span>
                      <span className="italic font-sans text-white text-xs">&ldquo;{interimTranscript}&rdquo;</span>
                    </div>
                  )}

                  {/* Auto-Applied Parameters Feedback Banner */}
                  {lastAutoAppliedSummary && (
                    <div className="mt-3 p-2.5 bg-cyan-950/30 border border-cyan-500/30 rounded-xl text-[11px] text-cyan-300 font-mono flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-cyan-400" />
                        Auto-tuned parameters: <strong className="text-white">{lastAutoAppliedSummary}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setLastAutoAppliedSummary(null)}
                        className="text-zinc-500 hover:text-zinc-300 text-[10px] cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>

                {/* Dictated Terms Textarea & Action Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                      <span>Custom Dictated Terms &amp; Covenants</span>
                      <span className="text-[10px] text-zinc-500 font-mono font-normal">
                        ({dictatedTerms.split(/\s+/).filter(Boolean).length} words · {dictatedTerms.length} chars)
                      </span>
                    </Label>
                    <div className="flex items-center gap-2">
                      {dictatedTerms && (
                        <>
                          <button
                            type="button"
                            onClick={handleToggleReadAloud}
                            className={`text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors ${
                              isPlayingVoiceTerms 
                                ? 'text-emerald-400 font-bold animate-pulse' 
                                : 'text-zinc-400 hover:text-cyan-400'
                            }`}
                            title={isPlayingVoiceTerms ? 'Stop text-to-speech audio' : 'Listen to dictated terms read aloud'}
                          >
                            {isPlayingVoiceTerms ? <VolumeX className="w-3 h-3 text-emerald-400" /> : <Volume2 className="w-3 h-3 text-cyan-400" />}
                            <span>{isPlayingVoiceTerms ? 'Stop Audio' : 'Read Aloud'}</span>
                          </button>
                          <span className="text-zinc-700">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              const applied = parseAndApplyVoiceTerms(dictatedTerms);
                              if (applied.length > 0) {
                                setLastAutoAppliedSummary(applied.join(' • '));
                              }
                            }}
                            className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Parse and apply all terms in the textarea"
                          >
                            <RefreshCw className="w-3 h-3" /> Re-parse
                          </button>
                          <span className="text-zinc-700">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(dictatedTerms);
                              setDictationStatus('Dictated terms copied to clipboard.');
                              setTimeout(() => setDictationStatus('Click microphone to dictate custom terms in real time'), 2500);
                            }}
                            className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                          <span className="text-zinc-700">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (isPlayingVoiceTerms && typeof window !== 'undefined' && window.speechSynthesis) {
                                window.speechSynthesis.cancel();
                                setIsPlayingVoiceTerms(false);
                              }
                              setDictatedTerms('');
                            }}
                            className="text-[11px] font-mono text-zinc-500 hover:text-rose-400 flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" /> Clear
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <Textarea
                    rows={4}
                    value={dictatedTerms}
                    onChange={(e) => setDictatedTerms(e.target.value)}
                    placeholder="Dictate or type custom legal terms here... For example: 'Licensee agrees to provide prominent attribution on all digital stream titles. Stems must not be shared with unverified neural networks without prior written cryptographic sign-off.'"
                    className="w-full bg-zinc-900/80 border-zinc-800 text-white rounded-2xl p-4 text-xs sm:text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 leading-relaxed font-sans resize-y"
                  />
                </div>

                {/* Quick Dictation Presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Example Spoken Directives (Click to Test):</span>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {[
                      'Commercial broadcast sync with 25% royalty and 0.35 ETH base fee for 3 years worldwide.',
                      'Non-exclusive streaming share, 85% creator royalty, allow derivative works and remixes.',
                      'Strict AI model training opt-out with worldwide sync licensing for film and TV.',
                      'Perpetual full buyout at 2.5 ETH with physical merchandise and enable morality kill switch.',
                      'Set royalty to 20 percent, fee 0.5 ETH, duration 2 years, European Union territory.'
                    ].map((sample, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setDictatedTerms((prev) => prev ? `${prev} ${sample}` : sample);
                          if (autoTuneFromVoice) {
                            const applied = parseAndApplyVoiceTerms(sample);
                            if (applied.length > 0) {
                              setLastAutoAppliedSummary(applied.join(' • '));
                            }
                          }
                        }}
                        className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors cursor-pointer text-left"
                      >
                        + &ldquo;{sample}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Flowchart Preview & Deploy Terminal */}
            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
              
              {/* Payment Flow Visualizer */}
              <div className="bg-zinc-950 p-6 rounded-[28px] border border-zinc-900 shadow-xl space-y-3">
                <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">Algorithmic Royalty Routing Node</p>
                
                <div className="flex flex-col items-center gap-2.5 py-2 bg-zinc-900/30 rounded-2xl p-4 border border-zinc-850">
                  <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800 text-xs font-mono font-black text-cyan-400 shadow-md">
                    <Wallet className="w-3.5 h-3.5 text-cyan-400" /> Inflow License Fee: {basePrice} ETH
                  </div>
                  
                  <div className="h-3 w-px border-l border-dashed border-zinc-700" />

                  <div className="bg-[#0c0d12] border border-cyan-500/20 px-4 py-2.5 rounded-xl flex flex-col items-center gap-0.5 text-center">
                    <span className="text-[9px] uppercase tracking-wider font-mono text-cyan-400 font-bold">Multi-Sig Smart Escrow</span>
                    <span className="text-[10px] font-mono text-zinc-500">Autonomous Instant Split</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 w-full pt-1">
                    <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
                      <span className="text-xs font-black text-emerald-400 font-mono">{royaltyRate}%</span>
                      <span className="text-[8px] text-zinc-400 uppercase mt-0.5 font-bold">Creator Wallet</span>
                    </div>
                    <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
                      <span className="text-xs font-black text-violet-400 font-mono">{Math.round((100 - royaltyRate) * 0.7)}%</span>
                      <span className="text-[8px] text-zinc-400 uppercase mt-0.5 font-bold">Reserve Pool</span>
                    </div>
                    <div className="bg-zinc-900/70 p-2.5 rounded-xl border border-zinc-800 flex flex-col items-center text-center">
                      <span className="text-xs font-black text-cyan-400 font-mono">{Math.round((100 - royaltyRate) * 0.3)}%</span>
                      <span className="text-[8px] text-zinc-400 uppercase mt-0.5 font-bold">Security Nodes</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cryptographic Covenant Terminal */}
              <div className="bg-black p-6 rounded-[28px] border border-zinc-900 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="font-mono text-xs text-zinc-400 uppercase tracking-widest font-black">Legal Covenant Preview</span>
                  </div>
                  <span className="font-mono text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded uppercase font-bold">v2.4 Ready</span>
                </div>

                <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-900 font-mono text-[11px] leading-relaxed text-zinc-400 space-y-2 max-h-[220px] overflow-auto select-none">
                  <p><span className="text-cyan-400 font-bold">COMPACT:</span> SEC-L-{contractSeed}</p>
                  <p><span className="text-zinc-300">Target Asset:</span> &quot;{selectedAsset?.title || 'Creative IP Work'}&quot;</p>
                  <p><span className="text-zinc-300">Duration:</span> {duration}</p>
                  <p><span className="text-zinc-300">Royalty Split:</span> {royaltyRate}% Direct Creator Allocation</p>
                  <p><span className="text-zinc-300">Base Price:</span> {basePrice} ETH</p>
                  <div className="border-t border-zinc-900 pt-1 text-[10px] text-zinc-500">
                    <p className="text-zinc-400">Permitted Rights:</p>
                    {permittedUsages.map(u => `✓ ${u}`).join('\n')}
                  </div>
                  {dictatedTerms.trim() && (
                    <div className="border-t border-zinc-900 pt-1.5 text-[10px] space-y-0.5">
                      <p className="text-cyan-400 font-bold flex items-center gap-1">
                        <Mic className="w-3 h-3 text-cyan-400" /> Custom Dictated Terms:
                      </p>
                      <p className="text-zinc-300 italic whitespace-pre-wrap">&ldquo;{dictatedTerms}&rdquo;</p>
                    </div>
                  )}
                </div>

                {/* Deploy Actions */}
                <div className="space-y-3 pt-2">
                  {isDeploying ? (
                    <div className="space-y-2 bg-[#0c0d12] p-4 rounded-2xl border border-cyan-900/30">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-cyan-300 font-bold">Anchoring to Sovereign Ledger...</span>
                        <span className="text-zinc-500">{deployStep}/4</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden bg-zinc-900">
                        <div className="bg-gradient-to-r from-cyan-400 to-violet-500 h-full transition-all duration-300" style={{ width: `${(deployStep / 4) * 100}%` }} />
                      </div>
                    </div>
                  ) : successAgreement ? (
                    <div className="space-y-3 bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/25">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <p className="text-xs font-bold text-white uppercase tracking-wider leading-none">Covenant Deployed Successfully</p>
                      </div>
                      <p className="text-[10px] text-zinc-400">Deployed Transaction Hash:</p>
                      <p className="text-[9px] font-mono text-emerald-400 bg-black/50 p-2 rounded truncate border border-emerald-950">
                        {successAgreement.deployTxHash}
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => setSuccessAgreement(null)}
                          type="button"
                          variant="outline"
                          className="flex-1 bg-zinc-900 border-zinc-800 text-white text-xs h-9"
                        >
                          Build Another
                        </Button>
                        <Button
                          onClick={() => {
                            setExportTargetAgreement(successAgreement);
                            setIsExportModalOpen(true);
                          }}
                          type="button"
                          className="flex-1 bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 text-white font-mono text-xs font-bold h-9 flex items-center justify-center gap-1.5 shadow-lg shadow-amber-950/40"
                        >
                          <Mail className="w-3.5 h-3.5" /> Export to Email
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {deployError && (
                        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center justify-between">
                          <span>{deployError}</span>
                          <button type="button" onClick={() => setDeployError(null)} className="text-zinc-500 hover:text-white text-[10px] ml-2 cursor-pointer">✕</button>
                        </div>
                      )}
                      <Button
                        id="deploy-agreement-btn"
                        onClick={handleDeployAgreement}
                        type="button"
                        disabled={!selectedAsset}
                        className="w-full py-6 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:brightness-110 text-white font-bold transition-all shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                      >
                        <FileSignature className="w-4 h-4" /> Sign & Anchor License Compact
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ROYALTY EARNINGS & PAYMENTS HUB (TRACKING SYSTEM)                  */}
      {/* ========================================================================= */}
      {activeTab === 'royalties' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Top Metrics Cards (Total Earnings & Pending Amounts) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Royalty Earnings */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-[24px] p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="uppercase font-bold tracking-wider">Total Royalty Earnings</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
                  {totalEarnings.toFixed(4)} ETH
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  ≈ ${(totalEarnings * 2500).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD Settled
                </p>
              </div>
              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>{settledCount} Received Payments</span>
                <span className="text-emerald-400">✓ In Creator Wallet</span>
              </div>
            </div>

            {/* Pending Royalty Escrow */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-[24px] p-5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="uppercase font-bold tracking-wider">Pending Royalty Escrow</span>
                <div className="w-8 h-8 rounded-xl bg-amber-950/50 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Hourglass className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-mono tracking-tight">
                  {pendingEarnings.toFixed(4)} ETH
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  ≈ ${(pendingEarnings * 2500).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD in Buffer
                </p>
              </div>
              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>{pendingCount} Pending Inflows</span>
                <span className="text-amber-400">● Awaiting Release</span>
              </div>
            </div>

            {/* Active License Compacts */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-[24px] p-5 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="uppercase font-bold tracking-wider">Active License Compacts</span>
                <div className="w-8 h-8 rounded-xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">
                  {agreements.filter(a => a.status === 'ACTIVE').length}
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">Deployed across global channels</p>
              </div>
              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>{assets.length} IP Assets Covered</span>
                <span className="text-cyan-400">100% Zero-Trust Active</span>
              </div>
            </div>

            {/* Average Royalty Split */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-[24px] p-5 shadow-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="uppercase font-bold tracking-wider">Avg Creator Royalty Cut</span>
                <div className="w-8 h-8 rounded-xl bg-violet-950/50 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-violet-400 font-mono tracking-tight">
                  {avgRoyaltyRate}%
                </p>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">Direct sovereign share</p>
              </div>
              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>No intermediary cut</span>
                <span className="text-violet-400">Sovereign Direct</span>
              </div>
            </div>
          </div>

          {/* Action & Control Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-900">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsRecordPaymentOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-950/30"
              >
                <PlusCircle className="w-4 h-4" /> Record Royalty Payment
              </Button>

              <Button
                onClick={handleReleasePendingEscrow}
                disabled={isReleasingEscrow || pendingEarnings === 0}
                variant="outline"
                className="border-amber-500/40 bg-amber-950/20 hover:bg-amber-900/30 text-amber-300 font-mono text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-2"
              >
                {isReleasingEscrow ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                )}
                Release Pending Escrow ({pendingEarnings.toFixed(3)} ETH)
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportStatement}
                variant="outline"
                className="border-zinc-800 text-zinc-300 hover:text-white text-xs font-mono py-2 px-3 rounded-xl flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" /> Export Statement
              </Button>
              <Button
                onClick={fetchRoyalties}
                variant="outline"
                className="border-zinc-800 text-zinc-400 hover:text-white text-xs font-mono py-2 px-3 rounded-xl"
                title="Refresh payments"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Success Banner if Escrow Released */}
          {escrowSuccessMsg && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs font-mono animate-in fade-in duration-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{escrowSuccessMsg}</span>
            </div>
          )}

          {/* Search and Status Filters for Payments Table */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-[28px] p-6 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-cyan-400" /> Royalty Payments & Settlement Ledger
                </h3>
                <p className="text-xs text-zinc-500">Continuous on-chain auditing of received licensee disbursements and escrow buffers.</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search asset, platform, or tx..."
                    value={royaltySearchQuery}
                    onChange={(e) => setRoyaltySearchQuery(e.target.value)}
                    className="bg-zinc-900/90 border-zinc-800 text-xs pl-9 h-9 text-white rounded-xl focus:border-cyan-500"
                  />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs font-mono">
                  {(['ALL', 'SETTLED', 'PENDING'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setRoyaltyFilterStatus(st)}
                      className={`px-3 py-1 rounded-lg transition-all ${royaltyFilterStatus === st ? 'bg-cyan-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Payments Table */}
            {loadingRoyalties ? (
              <div className="py-12 text-center text-xs font-mono text-zinc-500 animate-pulse">Loading royalty ledger...</div>
            ) : filteredRoyaltyPayments.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs font-mono">
                No royalty payments match your filter. Record a payment above to track earnings.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900/60 border-b border-zinc-850 text-[10px] text-zinc-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Date & Platform</th>
                      <th className="p-3.5">IP Asset / License</th>
                      <th className="p-3.5">Gross Revenue</th>
                      <th className="p-3.5">Creator Cut</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Tx Hash</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900 text-zinc-300">
                    {filteredRoyaltyPayments.map((pay) => (
                      <tr key={pay.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="p-3.5">
                          <div className="space-y-0.5">
                            <span className="font-bold text-white font-sans text-xs block">{pay.payerName}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(pay.paymentDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • {pay.payerPlatform}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-cyan-300 block">{pay.assetTitle}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">{pay.notes || 'Automated smart contract payout'}</span>
                        </td>
                        <td className="p-3.5 text-zinc-400">
                          {pay.grossAmount.toFixed(3)} {pay.currency}
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-emerald-400 block text-xs">
                            +{pay.netCreatorEarnings.toFixed(4)} {pay.currency}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">{pay.royaltyRate}% Split</span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] border ${pay.status === 'SETTLED' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900' : 'bg-amber-950/40 text-amber-400 border-amber-900 animate-pulse'}`}>
                            {pay.status === 'SETTLED' ? '✓ SETTLED' : '● PENDING ESCROW'}
                          </span>
                        </td>
                        <td className="p-3.5 text-[10px] font-mono text-zinc-500 truncate max-w-[120px]">
                          {pay.txHash.slice(0, 10)}...{pay.txHash.slice(-6)}
                        </td>
                        <td className="p-3.5 text-right">
                          {pay.status === 'PENDING' ? (
                            <button
                              onClick={async () => {
                                const headers = await getAuthHeaders(user, isSandboxMode);
                                await fetch('/api/royalties', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', ...headers },
                                  body: JSON.stringify({ id: pay.id, status: 'SETTLED' })
                                });
                                setRoyaltyPayments(prev => prev.map(p => p.id === pay.id ? { ...p, status: 'SETTLED' } : p));
                              }}
                              className="px-2.5 py-1 bg-amber-950/30 hover:bg-amber-900/40 border border-amber-500/40 text-amber-300 text-[10px] rounded-lg font-mono font-bold"
                            >
                              Release
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-500 font-mono">Disbursed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ACTIVE COVENANTS & VERIFICATION REGISTRY                           */}
      {/* ========================================================================= */}
      {activeTab === 'registry' && (
        <div className="bg-zinc-950 border border-zinc-900 rounded-[32px] p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" /> Active Licensing Covenants Registry
              </h3>
              <p className="text-xs text-zinc-400 font-light">
                Continuous real-time verification and compliance pipelines across all active smart contract licenses.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
              <RefreshCw className="w-3.5 h-3.5 text-zinc-500" /> Updated continuously
            </div>
          </div>

          {loadingAgreements ? (
            <div className="py-12 text-center text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">
              Querying sovereign agreement records...
            </div>
          ) : agreements.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-zinc-850 rounded-2xl text-zinc-500 space-y-3">
              <Award className="w-8 h-8 mx-auto text-zinc-650" />
              <p className="text-xs uppercase tracking-wider font-bold">No sovereign agreements dispatched</p>
              <p className="text-[10px] text-zinc-400 max-w-md mx-auto">
                Use the &quot;Define License&quot; tab to create and anchor your first licensing contract on the Sovranly ledger.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {agreements.map((agr) => {
                const audit = auditReports[agr.id!] || null;
                return (
                  <div key={agr.id || agr.contractAddress} className="bg-zinc-900/30 p-5 rounded-2xl border border-zinc-900 flex flex-col justify-between space-y-4 hover:border-zinc-850 transition-all hover:bg-zinc-900/40">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${agr.status === 'ACTIVE' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900' : 'bg-red-950/40 text-red-400 border-red-900'}`}>
                          {agr.status} • Continuous Active Verification
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {new Date(agr.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-white">{agr.assetTitle}</h4>
                        <p className="text-[10px] font-mono text-zinc-400 truncate">Contract: {agr.contractAddress}</p>
                      </div>

                      {/* Compact Specs Grid */}
                      <div className="grid grid-cols-3 gap-2 bg-zinc-950/60 p-2.5 border border-zinc-900 rounded-xl text-center">
                        <div>
                          <p className="text-[8px] text-zinc-500 uppercase tracking-wider font-extrabold">Fee</p>
                          <p className="text-[10px] font-mono text-zinc-300 font-black mt-0.5">{agr.basePrice} ETH</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-zinc-500 uppercase tracking-wider font-extrabold">Royalty</p>
                          <p className="text-[10px] font-mono text-emerald-400 font-black mt-0.5">{agr.royaltyRate}%</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-zinc-500 uppercase tracking-wider font-extrabold">Term</p>
                          <p className="text-[10px] font-mono text-zinc-300 font-black mt-0.5">{agr.duration}</p>
                        </div>
                      </div>

                      {/* Custom Spoken Covenant Terms if present */}
                      {agr.dictatedTerms && (
                        <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-900 text-left space-y-1">
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                            <Mic className="w-3 h-3 text-cyan-400" />
                            <span>Custom Dictated Covenant Terms</span>
                          </div>
                          <p className="text-[11px] text-zinc-300 italic font-sans leading-relaxed line-clamp-3">
                            &ldquo;{agr.dictatedTerms}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Continuous Auditing Section */}
                      {audit && (
                        <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl space-y-2">
                          <div className="flex items-center justify-between text-[9px] font-mono font-bold leading-none">
                            <span className="text-zinc-500 uppercase tracking-widest">Live Audit Logs</span>
                            <span className={audit.status === 'SECURE' ? 'text-emerald-400' : 'text-cyan-400 animate-pulse'}>
                              {audit.status === 'SECURE' ? '✓ SYSTEM SECURED' : '● RUNNING AUDIT...'}
                            </span>
                          </div>
                          <div className="font-mono text-[8px] text-zinc-500 space-y-1 text-left max-h-[80px] overflow-auto leading-normal">
                            {audit.log.map((logLine, idx) => (
                              <p key={idx} className={logLine.startsWith('✓') ? 'text-emerald-500' : logLine.startsWith('●') ? 'text-cyan-400' : 'text-zinc-650'}>
                                {logLine}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center gap-3 pt-2 border-t border-zinc-900/60">
                      <button
                        onClick={() => triggerAudit(agr)}
                        type="button"
                        disabled={auditingId === agr.id}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-zinc-800"
                      >
                        <Activity className={`w-3.5 h-3.5 text-cyan-400 ${auditingId === agr.id ? 'animate-spin' : ''}`} />
                        {auditingId === agr.id ? 'Auditing...' : 'Analyze Integrity'}
                      </button>
                      
                      <button
                        onClick={() => {
                          setExportTargetAgreement(agr);
                          setIsExportModalOpen(true);
                        }}
                        className="py-2.5 px-3 bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 rounded-xl text-xs font-bold transition-all border border-amber-500/30 flex items-center gap-1.5 shadow-sm"
                        title="Export to Licensor Email & Seal in App Vault"
                      >
                        <Mail className="w-3.5 h-3.5" /> Export to Email
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SOVEREIGN AGREEMENT VAULT (APP-HOSTED IMMUTABLE BACKUP)             */}
      {/* ========================================================================= */}
      {activeTab === 'vault' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          
          {/* Vault Security Banner */}
          <div className="bg-gradient-to-r from-amber-950/40 via-zinc-950 to-zinc-950 p-6 sm:p-8 rounded-[28px] border border-amber-500/30 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-amber-400" />
                    SOVEREIGN APP VAULT &amp; REDUNDANCY ARCHIVE
                  </span>
                  <span className="text-zinc-500 text-xs font-mono">• Permanent In-App Backup</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                  App-Preserved Agreement &amp; Contract Vault
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-light">
                  Whenever a creative exports an agreement to a participant&apos;s inbox, Sovranly IP automatically seals an immutable cryptographic duplicate directly inside the application. Even if emails are lost, misfiled, deleted, or mail servers fail, your executed terms and cryptographic proof remain permanently held by the app.
                </p>
              </div>

              {/* Vault Metric Counter Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
                <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 text-center min-w-[100px]">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 block">Archived</span>
                  <span className="text-xl font-mono font-black text-amber-400">{vaultAgreements.length}</span>
                  <span className="text-[9px] text-zinc-400 block font-mono">Covenants</span>
                </div>
                <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 text-center min-w-[100px]">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 block">Integrity</span>
                  <span className="text-xl font-mono font-black text-emerald-400">100%</span>
                  <span className="text-[9px] text-zinc-400 block font-mono">SHA-256</span>
                </div>
                <div className="bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800 text-center col-span-2 sm:col-span-1 min-w-[100px]">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 block">Redundancy</span>
                  <span className="text-xl font-mono font-black text-cyan-400">Dual</span>
                  <span className="text-[9px] text-zinc-400 block font-mono">App + Inbox</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search, Filter & Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-850">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search by asset, licensor, or vault ID..."
                value={vaultSearchQuery}
                onChange={(e) => setVaultSearchQuery(e.target.value)}
                className="bg-zinc-900/80 border-zinc-800 pl-10 text-xs font-mono text-white placeholder:text-zinc-600 focus:border-amber-500 h-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                onClick={() => fetchVaultAgreements()}
                variant="outline"
                size="sm"
                disabled={loadingVault}
                className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white text-xs h-9 flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${loadingVault ? 'animate-spin' : ''}`} />
                Refresh Vault
              </Button>

              <Button
                onClick={() => setActiveTab('builder')}
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold h-9 flex items-center gap-1.5 shadow-md shadow-amber-950/40"
              >
                <FileSignature className="w-3.5 h-3.5" /> Define &amp; Export New
              </Button>
            </div>
          </div>

          {/* Vault Records Listing */}
          {loadingVault ? (
            <div className="p-16 text-center space-y-3 bg-zinc-950 rounded-3xl border border-zinc-900">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
              <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Accessing Sovranly IP Sovereign Vault...</p>
            </div>
          ) : filteredVaultRecords.length === 0 ? (
            <div className="p-16 text-center space-y-4 bg-zinc-950 rounded-3xl border border-zinc-900 border-dashed">
              <div className="w-16 h-16 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-base font-bold text-white">No Sealed Agreements in Vault</h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-light">
                  {vaultSearchQuery 
                    ? `No vault records matched "${vaultSearchQuery}". Try clearing your search query.`
                    : 'When you export an agreement to a licensor or participant, an authentic cryptographic duplicate is automatically archived in this vault for perpetual retrieval.'}
                </p>
              </div>
              {!vaultSearchQuery && (
                <Button
                  onClick={() => setActiveTab('builder')}
                  className="bg-gradient-to-r from-amber-600 to-cyan-600 hover:brightness-110 text-white font-mono text-xs font-bold"
                >
                  <FileSignature className="w-3.5 h-3.5 mr-1.5" /> Build &amp; Export First Agreement
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredVaultRecords.map((record) => {
                const isCopied = copiedVaultHashId === record.vaultId;
                return (
                  <div
                    key={record.vaultId}
                    className="bg-zinc-950/90 border border-zinc-850 hover:border-amber-500/40 rounded-3xl p-6 transition-all duration-200 space-y-4 shadow-xl relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

                    {/* Top Tag & Status */}
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-amber-950/50 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                          <Lock className="w-3 h-3 text-amber-400" />
                          {record.vaultId}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        SEALED IN APP VAULT
                      </span>
                    </div>

                    {/* Asset & Participant Details */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-base font-extrabold text-white group-hover:text-amber-300 transition-colors leading-snug">
                            {record.assetTitle}
                          </h4>
                          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block mt-0.5">
                            {record.assetType || 'Intellectual Property'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                        <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850">
                          <span className="text-zinc-500 text-[10px] block uppercase">Participant / Licensor</span>
                          <span className="text-zinc-200 font-bold block truncate" title={record.licensorEmail}>
                            {record.licensorEmail}
                          </span>
                          {record.licensorName && (
                            <span className="text-zinc-500 text-[9px] block truncate">{record.licensorName}</span>
                          )}
                        </div>
                        <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-850">
                          <span className="text-zinc-500 text-[10px] block uppercase">Export Timestamp</span>
                          <span className="text-zinc-300 block truncate">
                            {new Date(record.exportedAt).toLocaleDateString()}
                          </span>
                          <span className="text-emerald-400 text-[9px] block">Dual-Inbox Archived</span>
                        </div>
                      </div>

                      {/* Covenant Highlights */}
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1">
                        <div className="bg-zinc-900/40 p-2 rounded-lg border border-zinc-850 text-center">
                          <span className="text-zinc-500 text-[9px] block uppercase">Royalty</span>
                          <span className="text-emerald-400 font-bold">{record.royaltyRate}%</span>
                        </div>
                        <div className="bg-zinc-900/40 p-2 rounded-lg border border-zinc-850 text-center">
                          <span className="text-zinc-500 text-[9px] block uppercase">Base Fee</span>
                          <span className="text-white font-bold">{record.basePrice} ETH</span>
                        </div>
                        <div className="bg-zinc-900/40 p-2 rounded-lg border border-zinc-850 text-center">
                          <span className="text-zinc-500 text-[9px] block uppercase">Duration</span>
                          <span className="text-cyan-400 font-bold">{record.duration}</span>
                        </div>
                      </div>

                      {/* Cryptographic SHA-256 Proof */}
                      <div className="p-2.5 bg-black/50 rounded-xl border border-zinc-900 flex items-center justify-between gap-2 font-mono text-[10px]">
                        <span className="text-zinc-500 uppercase">SHA-256 Hash:</span>
                        <span className="text-amber-400/90 truncate max-w-[200px]" title={record.covenantHash}>
                          {record.covenantHash.slice(0, 16)}...{record.covenantHash.slice(-8)}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(record.covenantHash);
                            setCopiedVaultHashId(record.vaultId);
                            setTimeout(() => setCopiedVaultHashId(null), 2000);
                          }}
                          className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition"
                          title="Copy SHA-256 Hash"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-zinc-900 flex items-center justify-between gap-2">
                      <Button
                        onClick={() => {
                          setSelectedVaultRecord(record);
                          setIsVaultViewModalOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200 text-xs h-9 flex-1"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Inspect Sealed Terms
                      </Button>

                      <Button
                        onClick={() => handleDownloadVaultJson(record)}
                        variant="outline"
                        size="sm"
                        className="bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-200 text-xs h-9 px-3"
                        title="Download Vault Backup JSON"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                      </Button>

                      <Button
                        onClick={() => {
                          setExportTargetAgreement({
                            id: record.agreementId,
                            assetId: record.assetId || '',
                            assetTitle: record.assetTitle,
                            royaltyRate: record.royaltyRate,
                            basePrice: record.basePrice,
                            duration: record.duration,
                            permittedUsages: record.permittedUsages,
                            continuousVerification: ['Cryptographic Digital Watermark', 'App Vault Backup Sealed'],
                            status: 'ACTIVE',
                            creatorEmail: record.creatorEmail,
                            creatorWallet: walletAddress || user?.uid || '0x...',
                            contractAddress: record.contractAddress,
                            deployTxHash: record.deployTxHash,
                            createdAt: record.exportedAt,
                            territory: record.territory,
                            exclusivity: record.exclusivity,
                          });
                          setIsExportModalOpen(true);
                        }}
                        size="sm"
                        className="bg-amber-600/90 hover:bg-amber-600 text-white font-mono text-xs font-bold h-9 px-3"
                        title="Re-Send to Email"
                      >
                        <Mail className="w-3.5 h-3.5 mr-1" /> Re-Send
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Record Royalty Payment Modal */}
      {isRecordPaymentOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Record Royalty Payment</h3>
                  <p className="text-xs text-zinc-400">Log an incoming license distribution disbursement.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRecordPaymentOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              
              {/* Asset Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-bold uppercase">Associated IP Asset</Label>
                <select
                  value={newPaymentForm.assetId}
                  onChange={(e) => setNewPaymentForm({ ...newPaymentForm, assetId: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white font-mono focus:border-cyan-500"
                >
                  <option value="">Default IP Asset (or select below)</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.title} ({a.type})</option>
                  ))}
                </select>
              </div>

              {/* Payer Platform */}
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-bold uppercase">Payer / Licensee Platform</Label>
                <Input
                  value={newPaymentForm.payerName}
                  onChange={(e) => setNewPaymentForm({ ...newPaymentForm, payerName: e.target.value })}
                  placeholder="e.g. Spotify Distribution Pool, Netflix Sync, Epic Games"
                  className="bg-zinc-900 border-zinc-800 text-xs text-white"
                  required
                />
              </div>

              {/* Amounts & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">Gross Amount (ETH)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPaymentForm.grossAmount}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, grossAmount: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 text-xs text-white font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300 font-bold uppercase">Royalty Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newPaymentForm.royaltyRate}
                    onChange={(e) => setNewPaymentForm({ ...newPaymentForm, royaltyRate: e.target.value })}
                    className="bg-zinc-900 border-zinc-800 text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>

              {/* Net preview */}
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-850 flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">Net Creator Earnings:</span>
                <span className="font-bold text-emerald-400">
                  +{((parseFloat(newPaymentForm.grossAmount) || 0) * (parseFloat(newPaymentForm.royaltyRate) || 0) / 100).toFixed(4)} ETH
                </span>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-bold uppercase">Initial Payment Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewPaymentForm({ ...newPaymentForm, status: 'SETTLED' })}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border ${newPaymentForm.status === 'SETTLED' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
                  >
                    ✓ Settled (Paid)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPaymentForm({ ...newPaymentForm, status: 'PENDING' })}
                    className={`py-2 rounded-xl text-xs font-mono font-bold border ${newPaymentForm.status === 'PENDING' ? 'bg-amber-950/40 text-amber-400 border-amber-500/50' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}
                  >
                    ● Pending Escrow
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="flex-1 border-zinc-800 text-zinc-400 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isRecordingPayment}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs"
                >
                  {isRecordingPayment ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gmail Notarization Email Modal */}
      <NotarizationEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        documentTitle={emailTargetAgreement?.assetTitle || selectedAsset?.title || 'Sovereign Licensing Covenant'}
        documentHash={emailTargetAgreement?.contractAddress || emailTargetAgreement?.id || '0x7a2f...e421'}
        txHash={emailTargetAgreement?.deployTxHash || '0x991f...3281'}
        defaultClientName={emailTargetAgreement?.creatorEmail || ''}
      />

      {/* Agreement Export to Email Modal with App Vault Archival */}
      <AgreementExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        agreement={exportTargetAgreement}
        onExportSuccess={(newRecord) => {
          setVaultAgreements(prev => [newRecord, ...prev.filter(r => r.vaultId !== newRecord.vaultId)]);
        }}
        onOpenVault={() => {
          setActiveTab('vault');
          fetchVaultAgreements();
        }}
      />

      {/* Sealed Vault Covenant Inspection Modal */}
      <VaultAgreementViewModal
        isOpen={isVaultViewModalOpen}
        onClose={() => setIsVaultViewModalOpen(false)}
        record={selectedVaultRecord}
        onReExport={(record) => {
          setExportTargetAgreement({
            id: record.agreementId,
            assetId: record.assetId || '',
            assetTitle: record.assetTitle,
            royaltyRate: record.royaltyRate,
            basePrice: record.basePrice,
            duration: record.duration,
            permittedUsages: record.permittedUsages,
            continuousVerification: ['Cryptographic Digital Watermark', 'App Vault Backup Sealed'],
            status: 'ACTIVE',
            creatorEmail: record.creatorEmail,
            creatorWallet: walletAddress || user?.uid || '0x...',
            contractAddress: record.contractAddress,
            deployTxHash: record.deployTxHash,
            createdAt: record.exportedAt,
            territory: record.territory,
            exclusivity: record.exclusivity,
          });
          setIsExportModalOpen(true);
        }}
      />
    </div>
  );
}

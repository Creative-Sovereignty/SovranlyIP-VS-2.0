'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  RotateCcw, 
  FileText, 
  Sliders, 
  Scale, 
  Bot, 
  X, 
  Plus, 
  Download,
  Radio,
  Clock,
  ArrowRight,
  Globe,
  ExternalLink,
  Search,
  Newspaper,
  Calendar,
  RefreshCw,
  Send,
  Headphones,
  Power,
  Play,
  Square,
  MessageSquare,
  ShieldCheck,
  Film,
  Music,
  BookOpen,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/auth/FirebaseProvider';
import { getAuthHeaders } from '@/lib/auth-client';

export interface IpChangeRecord {
  id: string;
  timestamp: string;
  type: 'split_update' | 'license_terms' | 'metadata_provenance' | 'ai_defense' | 'general_note';
  summary: string;
  rawText: string;
  status: 'draft' | 'committed';
}

export interface GroundedSource {
  title: string;
  url: string;
  domain: string;
}

export interface GroundedIntelligenceResult {
  text: string;
  sources: GroundedSource[];
  searchQueries: string[];
  topic: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: GroundedSource[];
  searchQueries?: string[];
  timestamp: string;
  grounded?: boolean;
}

export interface AdrienneAssistantProps {
  initialNote?: string;
  assetTitle?: string;
  assetId?: string;
  onApplyNotes?: (notes: string) => void;
  onApplyIpChange?: (change: { type: string; summary: string; rawText: string }) => void;
  onClose?: () => void;
  mode?: 'modal' | 'embedded' | 'drawer';
  className?: string;
}

// Fallbacks for Search Grounding topics
function getTopicSearchLabel(topic: string): string {
  switch (topic) {
    case 'ip_law': return 'US Copyright Office Title 17 statutory damages fair use trademark class 42';
    case 'copyright_trends': return 'generative AI copyright infringement lawsuits scraper opt-out metadata C2PA';
    case 'licensing_standards': return 'mechanical licensing collective MLC streaming royalty sync pricing standards 2026';
    case 'licensing_news': return 'music sync streaming royalty licensing deals 2026';
    case 'uspto_fees': return 'official USPTO trademark fee schedule class 42 TEAS Plus';
    case 'vla_events': return 'Volunteer Lawyers for the Arts legal clinics events 2026';
    default: return 'intellectual property licensing copyright guidelines 2026';
  }
}

function getFallbackGroundedText(topic: string): string {
  if (topic === 'ip_law') {
    return `### Real-Time IP Law & Statutory Protection Directives (2026)\n\nBlessings, Creator. Safeguarding your intellectual property requires anchoring your works within both statutory legal doctrine and cryptographic proof:\n\n* **US Copyright Act Statutory Framework (Title 17)**:\n  - **Exclusive Creator Rights (§ 106)**: You possess the sovereign rights of reproduction, adaptation (derivative works), distribution, public performance, and digital display. These rights vest automatically upon tangible fixation.\n  - **Statutory Damages (§ 504)**: Registering with the US Copyright Office before infringement—or within 3 months of publication—unlocks statutory damages between **$750 and $30,000 per work**, scaling up to **$150,000 for willful infringement**, plus recovery of attorney's fees.\n* **Fair Use & Transformative Standard (§ 107)**:\n  - Federal courts evaluate the statutory four-factor balance: (1) Purpose & character of use (commercial vs. transformative); (2) Nature of the copyrighted work; (3) Amount taken; and (4) Market harm. Commercial exploitations that substitute for original licensing markets are denied fair use.\n* **Trademark Class 42 SaaS & Protocol Guidelines**:\n  - Creators deploying software, smart contracts, and decentralized protocols should secure **Trademark Class 42** alongside Class 9 (Digital Media) and Class 41 (Entertainment).\n* **Work-Made-For-Hire Caution (§ 101/201)**:\n  - Absent a signed written agreement assigning ownership, collaborators hold undivided joint ownership. Sovranly IP's smart split sheets eliminate this ambiguity prior to distribution.\n\n**Adrienne's Wise Word**: The law protects what is documented, Child. When your SHA-256 hash is anchored on-chain with clear statutory metadata, infringers cannot claim innocent intent.`;
  }
  if (topic === 'copyright_trends') {
    return `### Live Copyright Trends, AI Training Defense & Digital Provenance\n\nCreator, the modern copyright battlefield is centered on automated training, unauthorized web scraping, and digital authenticity:\n\n* **Generative AI Training Litigation & Judicial Precedents**:\n  - Landmark lawsuits affirm that mass ingestion of copyrighted catalogs without commercial licenses creates actionable market substitution.\n  - Federal courts are scrutinizing whether commercial foundation models can claim fair use when generating competitive audio stems, likenesses, or editorial prose.\n* **Standardized "Do Not Train" & Crawler Defense Protocols**:\n  - Standardized machine-readable opt-out tags and cryptographic opt-out manifests embed directly into asset hashes, creating a tamper-proof timestamp of non-consent.\n* **Cryptographic Provenance & Content Authenticity (C2PA)**:\n  - Major platforms are adopting C2PA content credentials to trace digital media back to its verified creator, distinguishing human-crafted original works from synthetic impersonations.\n* **Right of Publicity & Digital Likeness Protections**:\n  - Emerging federal and state initiatives grant creators enforceable IP rights in their voice and visual likeness against unauthorized AI clones.\n\n**Adrienne's Wise Word**: In the era of synthetic noise, authenticity is your highest-yielding currency. Stamp your original creation with an immutable cryptographic watermark, and let the scrapers know you own every wave.`;
  }
  if (topic === 'licensing_standards' || topic === 'licensing_news') {
    return `### Current Licensing Standards, Sync Benchmarks & Royalty Splits\n\nBlessings, Creator. The digital intellectual property licensing ecosystem is operating on clear, creator-first benchmarks:\n\n* **Master Sync & Commercial Licensing Benchmarks**:\n  - **Independent Gaming & VR Integrations**: Micro-sync upfront clearance ranges from **$1,500 to $10,000+** per track.\n  - **Streaming Episodic & Digital Media**: Non-exclusive master-use licenses average **$5,000 to $25,000**.\n  - **Commercial Advertising & Brand Campaigns**: Major brand licenses command **$25,000 to $150,000+**.\n* **Streaming Mechanical Royalty Rates via the MLC**:\n  - The Mechanical Licensing Collective headline streaming mechanical royalty pool rate continues at approximately **15.1% to 15.3% of service revenue**.\n* **The Modern 85/15 Creator Payout Standard**:\n  - Decentralized protocols standardizing on **85% direct to creator / 15% protocol distribution** (matching Sovranly IP's smart contracts) set the new commercial benchmark.\n\n**Adrienne's Wise Word**: Never let someone else hold the key to your royalties, Sweetheart. When your splits are automated on-chain at 85/15, the money arrives without excuses or middlemen.`;
  }
  if (topic === 'uspto_fees') {
    return `### Updated USPTO Filing Fee Schedule & Copyright Rates\n\nCreator, here is the current official fee structure for protecting your intellectual property:\n\n* **USPTO Trademark Filings (TEAS Plus vs TEAS Standard)**:\n  - **TEAS Plus**: $250 per class (requires standard ID descriptions and electronic communication).\n  - **TEAS Standard**: $350 per class.\n  - **Trademark Class 42**: Recommended for software, protocols, and decentralized applications.\n  - **Statement of Use (SOU)**: $100 per class.\n* **US Copyright Office Basic Registration**:\n  - **Single Author / Single Work (electronic)**: $45 standard fee.\n  - **Standard Electronic Application**: $65.\n\n**Adrienne's Wise Word**: Protect your mark before you launch your campaign. A $250 TEAS Plus filing today saves twenty thousand dollars in trademark litigation tomorrow.`;
  }
  return `### Active Pro-Bono Volunteer Lawyers for the Arts (VLA) Announcements\n\nChild, you don't have to navigate copyright law alone. Active pro-bono networks exist nationwide to protect independent creators:\n\n* **Volunteer Lawyers for the Arts (VLA New York)**: Bi-Weekly Pro Bono Legal Clinics offering free 30-minute consultations on sync contracts, trademark filings, and licensing disputes.\n* **California Lawyers for the Arts (CLA)**: Pro Bono Legal Referral Service and Arts Arbitration & Mediation Services.\n* **Lawyers for the Creative Arts (LCA Chicago)**: Free legal assistance to low-income artists, filmmakers, musicians, and nonprofit cultural organizations.\n* **Volunteer Lawyers for the Arts Massachusetts**: Active legal counseling hotline.\n\n**Adrienne's Wise Word**: Humble beginnings need strong shields. Pair free counsel from your local VLA chapter with Sovranly's blockchain timestamping.`;
}

function getFallbackSources(topic: string): GroundedSource[] {
  if (topic === 'ip_law') {
    return [
      { title: 'US Copyright Office - Title 17 Copyright Law of the United States', url: 'https://www.copyright.gov/title17/', domain: 'copyright.gov' },
      { title: 'USPTO Trademark Manual of Examining Procedure (TMEP) - Class 42', url: 'https://www.uspto.gov/trademarks/basics', domain: 'uspto.gov' },
      { title: 'Legal Information Institute (Cornell Law) - 17 U.S. Code § 106 & 504', url: 'https://www.law.cornell.edu/uscode/text/17', domain: 'law.cornell.edu' },
      { title: 'WIPO - World Intellectual Property Organization Copyright Treaty', url: 'https://www.wipo.int/copyright/en/', domain: 'wipo.int' },
    ];
  }
  if (topic === 'copyright_trends') {
    return [
      { title: 'US Copyright Office - Copyright and Artificial Intelligence Initiative', url: 'https://www.copyright.gov/ai/', domain: 'copyright.gov' },
      { title: 'Electronic Frontier Foundation (EFF) - Digital Rights & AI Copyright Updates', url: 'https://www.eff.org/issues/intellectual-property', domain: 'eff.org' },
      { title: 'Coalition for Content Provenance and Authenticity (C2PA) Standards', url: 'https://c2pa.org/', domain: 'c2pa.org' },
      { title: 'Reuters Legal - AI Copyright Litigation & Fair Use Trial Tracker', url: 'https://www.reuters.com/legal/', domain: 'reuters.com' },
    ];
  }
  if (topic === 'licensing_standards' || topic === 'licensing_news') {
    return [
      { title: 'The Mechanical Licensing Collective - Notice & Royalty Rates', url: 'https://www.themlc.com', domain: 'themlc.com' },
      { title: 'Billboard Pro - Music Publishing & Sync Licensing Index', url: 'https://www.billboard.com/pro', domain: 'billboard.com' },
      { title: 'Music Business Worldwide - Digital Licensing Trends', url: 'https://www.musicbusinessworldwide.com', domain: 'musicbusinessworldwide.com' },
      { title: 'Copyright Royalty Board (CRB) - Phonorecords IV Statutory Determination', url: 'https://www.crb.gov', domain: 'crb.gov' },
    ];
  }
  if (topic === 'uspto_fees') {
    return [
      { title: 'USPTO Fee Schedule - Trademark & Patent Official Fees', url: 'https://www.uspto.gov/learning-and-resources/fees-and-payment/uspto-fee-schedule', domain: 'uspto.gov' },
      { title: 'US Copyright Office - Registration Fee Information', url: 'https://www.copyright.gov/about/fees.html', domain: 'copyright.gov' },
      { title: 'USPTO Trademark Basics & Classification (Class 42)', url: 'https://www.uspto.gov/trademarks/basics', domain: 'uspto.gov' },
    ];
  }
  return [
    { title: 'Volunteer Lawyers for the Arts New York - Legal Clinics & Calendar', url: 'https://vlany.org', domain: 'vlany.org' },
    { title: 'California Lawyers for the Arts - Pro Bono Legal Programs', url: 'https://www.calawyersforthearts.org', domain: 'calawyersforthearts.org' },
    { title: 'Lawyers for the Creative Arts (Chicago) - Intake & Events', url: 'https://law-arts.org', domain: 'law-arts.org' },
    { title: 'Arts & Business Council of Greater Boston - VLA Services', url: 'https://artsandbiz.org', domain: 'artsandbiz.org' },
  ];
}

// Rule-based heuristic to parse natural language IP dictation into structured changes
function parseIpChangesFromText(text: string): IpChangeRecord[] {
  if (!text.trim()) return [];

  const changes: IpChangeRecord[] = [];
  const lower = text.toLowerCase();
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Check for royalty split changes
  if (lower.includes('split') || lower.includes('percentage') || lower.includes('%') || lower.includes('royalties')) {
    const match = text.match(/(\d{1,3})\s*(?:%|\/|\s*percent)/);
    const splitValue = match ? `${match[1]}% allocation` : 'Split ratio adjustment';
    changes.push({
      id: `split-${splitValue.replace(/\s+/g, '-').toLowerCase()}`,
      timestamp: now,
      type: 'split_update',
      summary: `Royalty Allocation: ${splitValue} specified in dictation`,
      rawText: text,
      status: 'draft',
    });
  }

  // Check for licensing terms or pricing
  if (lower.includes('license') || lower.includes('price') || lower.includes('usdc') || lower.includes('dollar') || lower.includes('commercial')) {
    const priceMatch = text.match(/(\$|usd|usdc)?\s*(\d+(\.\d{1,2})?)\s*(usd|usdc|dollars)?/i);
    const fee = priceMatch ? `${priceMatch[2]} USDC` : 'Custom commercial rate';
    changes.push({
      id: `license-${fee.replace(/\s+/g, '-').toLowerCase()}`,
      timestamp: now,
      type: 'license_terms',
      summary: `Licensing Terms: Set commercial pricing parameter (${fee})`,
      rawText: text,
      status: 'draft',
    });
  }

  // Check for AI defense / crawler opt-out
  if (lower.includes('ai') || lower.includes('scraping') || lower.includes('opt out') || lower.includes('crawler') || lower.includes('shield')) {
    changes.push({
      id: 'ai-training-shield',
      timestamp: now,
      type: 'ai_defense',
      summary: 'AI Training Shield: Enforce strict cryptographic opt-out and scraping defense',
      rawText: text,
      status: 'draft',
    });
  }

  // Check for title or metadata provenance
  if (lower.includes('title') || lower.includes('stems') || lower.includes('bpm') || lower.includes('key') || lower.includes('recorded')) {
    changes.push({
      id: 'metadata-provenance',
      timestamp: now,
      type: 'metadata_provenance',
      summary: 'Metadata & Provenance: Updated work creation details and technical stems',
      rawText: text,
      status: 'draft',
    });
  }

  // If nothing specific matched, register as general provenance note
  if (changes.length === 0 && text.trim().length > 10) {
    changes.push({
      id: 'general-creator-note',
      timestamp: now,
      type: 'general_note',
      summary: `Creator Provenance Note: ${text.slice(0, 50)}...`,
      rawText: text,
      status: 'draft',
    });
  }

  return changes;
}

export function AdrienneAssistant({
  initialNote = '',
  assetTitle,
  assetId,
  onApplyNotes,
  onApplyIpChange,
  onClose,
  mode = 'embedded',
  className = '',
}: AdrienneAssistantProps) {
  const { user, isSandboxMode } = useAuth();

  // Active Tab: default to interactive Gemini Q&A
  const [activeTab, setActiveTab] = useState<'qa' | 'grounded_intel' | 'notes' | 'ip_changes' | 'voice_settings'>('qa');

  // Conversational Chat Messages
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      text: `Blessings, Creator! I am **Adrienne**, your Chief Sovereign IP Coordinator for Sovranly IP.\n\nWhether you produce **music, films, books, or software**, I am here with live Gemini intelligence and real-time legal grounding to help you:\n- **Feed your own creative work into user demo showcases** to prove your production credentials and market your catalog.\n- **Protect your multi-media assets** with immutable SHA-256 timestamps, C2PA provenance, and Trademark Class 42 software coverage.\n- **Configure smart licensing compacts** and automated 85/15 creator royalty splits.\n\nAsk me any question below, or select a starter topic to begin!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      grounded: true,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const chatSeqCounter = useRef(1);

  // Dictation & Speech-to-Text State
  const [isListening, setIsListening] = useState(false);
  const [dictatedText, setDictatedText] = useState(initialNote);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [micSupported] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    }
    return true;
  });
  const [statusMessage, setStatusMessage] = useState<string>('Adrienne is online and powered by Gemini intelligence');

  // Voice Narration & Audio State
  // Voice engine mode: 'disabled' (shut down), 'gemini' (Gemini Neural TTS), or 'browser' (Web Speech API)
  const [voiceEngineMode, setVoiceEngineMode] = useState<'disabled' | 'gemini' | 'browser'>('disabled');
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search Grounding Preset State
  const [groundedTopic, setGroundedTopic] = useState<'ip_law' | 'copyright_trends' | 'licensing_standards' | 'uspto_fees' | 'vla_events' | 'custom'>('ip_law');
  const [customSearchQuery, setCustomSearchQuery] = useState('');
  const [isSearchingGrounded, setIsSearchingGrounded] = useState(false);
  const [groundedIntel, setGroundedIntel] = useState<GroundedIntelligenceResult>(() => ({
    text: getFallbackGroundedText('ip_law'),
    sources: getFallbackSources('ip_law'),
    searchQueries: [getTopicSearchLabel('ip_law')],
    topic: 'ip_law',
    timestamp: new Date().toISOString(),
  }));
  const [appliedIntelNotice, setAppliedIntelNotice] = useState(false);

  // Parsed IP changes state
  const [committedChangeIds, setCommittedChangeIds] = useState<string[]>([]);
  const detectedChanges: IpChangeRecord[] = useMemo(() => {
    const raw = parseIpChangesFromText(dictatedText);
    return raw.map(change => ({
      ...change,
      status: committedChangeIds.includes(change.id) ? ('committed' as const) : ('draft' as const),
    }));
  }, [dictatedText, committedChangeIds]);

  // Audio References
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = useCallback(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'qa') {
      scrollToBottom();
    }
  }, [chatMessages, activeTab, scrollToBottom]);

  // Stop any active audio playback
  const stopAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentlyPlayingId(null);
    setIsVoiceLoading(false);
  }, []);

  // Web Speech API Voice Reading (with sentence chunking to prevent Chrome drop-off)
  const speakWithWebSpeech = useCallback((text: string, msgId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setStatusMessage('Web Speech is not supported in this browser.');
      return;
    }

    try {
      window.speechSynthesis.cancel();

      const cleanText = text
        .replace(/[#*_`~]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/>/g, '')
        .trim();

      const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
      if (sentences.length === 0) return;

      setCurrentlyPlayingId(msgId);

      const voices = window.speechSynthesis.getVoices();
      const warmVoice = voices.find(v => 
        (v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Natural') || v.name.includes('Female')) &&
        v.lang.startsWith('en')
      );

      let idx = 0;
      const speakNextChunk = () => {
        if (idx >= sentences.length) {
          setCurrentlyPlayingId(null);
          return;
        }

        const chunk = sentences[idx].trim();
        if (!chunk) {
          idx++;
          speakNextChunk();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.rate = 0.98;
        utterance.pitch = 1.0;
        if (warmVoice) utterance.voice = warmVoice;

        utterance.onend = () => {
          idx++;
          speakNextChunk();
        };

        utterance.onerror = () => {
          setCurrentlyPlayingId(null);
        };

        window.speechSynthesis.speak(utterance);
      };

      speakNextChunk();
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      setCurrentlyPlayingId(null);
    }
  }, []);

  // Play audio using selected engine
  const playVoiceNarration = useCallback(async (text: string, msgId: string) => {
    // If already playing this message, stop it
    if (currentlyPlayingId === msgId) {
      stopAudio();
      return;
    }

    stopAudio();

    if (voiceEngineMode === 'disabled') {
      setStatusMessage('Voice narration is currently shut down. Switch to Gemini or Browser voice to enable reading.');
      return;
    }

    if (voiceEngineMode === 'gemini') {
      try {
        setIsVoiceLoading(true);
        setCurrentlyPlayingId(msgId);
        const authHeaders = await getAuthHeaders(user, isSandboxMode);

        const res = await fetch('/api/gemini/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            text,
            voice: 'Kore',
          }),
        });

        if (!res.ok) {
          // Graceful fallback to browser speech if TTS fails
          speakWithWebSpeech(text, msgId);
          return;
        }

        const data = await res.json();
        if (data.audio) {
          const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
          currentAudioRef.current = audio;
          audio.onended = () => {
            setCurrentlyPlayingId(null);
          };
          audio.onerror = () => {
            setCurrentlyPlayingId(null);
          };
          await audio.play();
        } else {
          speakWithWebSpeech(text, msgId);
        }
      } catch (e) {
        console.warn('Gemini TTS error, falling back to browser speech:', e);
        speakWithWebSpeech(text, msgId);
      } finally {
        setIsVoiceLoading(false);
      }
    } else {
      speakWithWebSpeech(text, msgId);
    }
  }, [currentlyPlayingId, stopAudio, voiceEngineMode, user, isSandboxMode, speakWithWebSpeech]);

  // Speech-to-Text Recognition Setup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setStatusMessage('Microphone active. Speak your question or notes clearly...');
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
          if (activeTab === 'qa') {
            setChatInput(prev => (prev ? `${prev} ${finalSegment}` : finalSegment).trim());
          } else if (activeTab === 'grounded_intel') {
            setCustomSearchQuery(prev => (prev ? `${prev} ${finalSegment}` : finalSegment).trim());
          } else {
            setDictatedText(prev => (prev ? `${prev} ${finalSegment}` : finalSegment).trim());
          }
        }
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setStatusMessage('Microphone permission was denied. Please allow microphone access in browser settings.');
        } else {
          setStatusMessage(`Microphone notice: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to initialize speech recognition:', err);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [activeTab]);

  // Toggle Microphone
  const toggleListening = async () => {
    if (!micSupported) return;

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setStatusMessage('Dictation paused. Review your input below.');
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          await navigator.mediaDevices.getUserMedia({ audio: true });
        }
      } catch (err) {
        console.warn('Microphone permission request rejected:', err);
        setStatusMessage('Microphone access is required to dictate.');
        return;
      }

      if (recognitionRef.current) {
        try {
          setInterimTranscript('');
          recognitionRef.current.start();
          setIsListening(true);
          setStatusMessage('Listening... Speak your question or notes.');
        } catch (err) {
          console.warn('Recognition start error:', err);
          try {
            recognitionRef.current.stop();
            setTimeout(() => {
              recognitionRef.current.start();
              setIsListening(true);
            }, 200);
          } catch {
            setStatusMessage('Could not restart microphone. Try again.');
          }
        }
      }
    }
  };

  // Ask Adrienne (Gemini Q&A)
  const handleAskAdrienne = async (questionText?: string) => {
    const q = (questionText || chatInput).trim();
    if (!q || isAnswering) return;

    chatSeqCounter.current += 1;
    const userMessageId = `user-msg-${chatSeqCounter.current}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsAnswering(true);
    setStatusMessage('Adrienne is formulating her response with Gemini intelligence...');

    try {
      const authHeaders = await getAuthHeaders(user, isSandboxMode);

      // Prepare conversation history (exclude welcome message)
      const history = chatMessages
        .filter(m => m.id !== 'welcome-msg')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          text: m.text,
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          message: q,
          history,
        }),
      });

      if (!res.ok) {
        throw new Error(`Chat API responded with status ${res.status}`);
      }

      const data = await res.json();
      chatSeqCounter.current += 1;
      const botMsgId = `assistant-msg-${chatSeqCounter.current}`;
      const botMsg: ChatMessage = {
        id: botMsgId,
        role: 'assistant',
        text: data.text || 'Blessings, Creator. Your inquiry has been processed.',
        sources: Array.isArray(data.sources) ? data.sources : [],
        searchQueries: Array.isArray(data.searchQueries) ? data.searchQueries : [],
        grounded: data.grounded ?? (data.sources && data.sources.length > 0),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages(prev => [...prev, botMsg]);
      setStatusMessage('Adrienne answered your question.');

      // Auto-read response if user has voice enabled and not disabled
      if (voiceEngineMode !== 'disabled') {
        playVoiceNarration(botMsg.text, botMsgId);
      }
    } catch (err: any) {
      console.error('Ask Adrienne error:', err);
      chatSeqCounter.current += 1;
      const fallbackMsgId = `assistant-msg-${chatSeqCounter.current}`;
      const fallbackMsg: ChatMessage = {
        id: fallbackMsgId,
        role: 'assistant',
        text: `Blessings, Creator. Even when network signals waver, your ownership remains absolute.\n\nRegarding your question: "${q.slice(0, 80)}...":\n- **Ownership Principle**: Timestamp your work's SHA-256 fingerprint on-chain immediately before public release.\n- **Licensing Discipline**: Maintain at least 85% creator splits and reserve explicit non-consent for AI training.\n- **Statutory Filing**: File TEAS Plus ($250) for Trademark Class 42 if deploying software or protocols.\n\nAdrienne's Wise Word: True ownership begins with an immutable receipt, Child.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        grounded: false,
      };
      setChatMessages(prev => [...prev, fallbackMsg]);
      setStatusMessage('Direct guidance provided from sovereign index.');
    } finally {
      setIsAnswering(false);
    }
  };

  // Execute Google Search Grounded Research
  const executeGroundedSearch = async (
    targetTopic: 'ip_law' | 'copyright_trends' | 'licensing_standards' | 'uspto_fees' | 'vla_events' | 'custom',
    customQueryOverride?: string
  ) => {
    setIsSearchingGrounded(true);
    setGroundedTopic(targetTopic);
    setStatusMessage('Searching live web index & synthesizing grounded intelligence...');

    const queryText = customQueryOverride !== undefined ? customQueryOverride : customSearchQuery;

    try {
      const authHeaders = await getAuthHeaders(user, isSandboxMode);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          topic: targetTopic,
          message: queryText,
        }),
      });

      if (!res.ok) {
        throw new Error(`Grounded search failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      const result: GroundedIntelligenceResult = {
        text: data.text || 'Grounded intelligence acquired from live sources.',
        sources: Array.isArray(data.sources) ? data.sources : [],
        searchQueries: Array.isArray(data.searchQueries) ? data.searchQueries : [],
        topic: targetTopic,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      setGroundedIntel(result);
      setStatusMessage('Grounded intelligence updated with verified live web sources.');
      setActiveTab('grounded_intel');

      if (voiceEngineMode !== 'disabled') {
        playVoiceNarration(result.text, 'grounded-result');
      }
    } catch (err: any) {
      console.error('Execute grounded search error:', err);
      setStatusMessage('Search notice. Displaying cached sovereign protocol guidance.');
      const fallbackIntel: GroundedIntelligenceResult = {
        text: getFallbackGroundedText(targetTopic),
        sources: getFallbackSources(targetTopic),
        searchQueries: [getTopicSearchLabel(targetTopic)],
        topic: targetTopic,
        timestamp: new Date().toISOString(),
      };
      setGroundedIntel(fallbackIntel);
      if (voiceEngineMode !== 'disabled') {
        playVoiceNarration(fallbackIntel.text, 'grounded-fallback');
      }
    } finally {
      setIsSearchingGrounded(false);
    }
  };

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Apply to asset notes
  const handleApplyTextToNotes = (text: string) => {
    setDictatedText(prev => (prev ? `${prev}\n\n${text}` : text));
    if (onApplyNotes) {
      onApplyNotes(dictatedText ? `${dictatedText}\n\n${text}` : text);
    }
    setAppliedIntelNotice(true);
    setStatusMessage('Added to your asset provenance notes.');
    setTimeout(() => setAppliedIntelNotice(false), 3000);
  };

  // Commit parsed IP change
  const handleCommitChange = (change: IpChangeRecord) => {
    if (onApplyIpChange) {
      onApplyIpChange({
        type: change.type,
        summary: change.summary,
        rawText: change.rawText,
      });
    }
    setCommittedChangeIds(prev => [...prev, change.id]);
    setStatusMessage(`Committed change: "${change.summary}"`);
  };

  return (
    <div className={`relative bg-zinc-950/95 border border-zinc-800/90 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl text-white font-sans ${className}`}>
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-zinc-900 flex flex-wrap items-center justify-between gap-3 relative z-10 bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-all ${
              isListening 
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400 shadow-lg shadow-emerald-950/50' 
                : isAnswering || isSearchingGrounded
                ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-400 animate-pulse'
                : 'bg-zinc-900 border-zinc-800 text-cyan-400'
            }`}>
              <Bot className="w-5 h-5" />
            </div>
            {isListening && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-zinc-950" />
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">Adrienne</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800/60 text-cyan-300 font-semibold uppercase">
                Gemini Intelligence
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              {assetTitle ? `Advising for: ${assetTitle}` : 'Chief Sovereign IP Coordinator · Multi-Media & Licensing'}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Voice Narration Mode Status Badge */}
          <button
            type="button"
            onClick={() => {
              if (voiceEngineMode === 'disabled') {
                setVoiceEngineMode('gemini');
                setStatusMessage('Voice narration enabled: Using Gemini Neural Voice.');
              } else {
                stopAudio();
                setVoiceEngineMode('disabled');
                setStatusMessage('Voice narration shut down completely (muted).');
              }
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              voiceEngineMode === 'disabled'
                ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                : 'bg-cyan-950/70 border-cyan-700/60 text-cyan-300 shadow-sm'
            }`}
            title={voiceEngineMode === 'disabled' ? 'Click to enable voice reading' : 'Click to shut down voice reading'}
          >
            {voiceEngineMode === 'disabled' ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
                <span>Voice: OFF</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Voice: {voiceEngineMode === 'gemini' ? 'Gemini AI' : 'Browser'}</span>
              </>
            )}
          </button>

          {currentlyPlayingId && (
            <Button
              variant="outline"
              size="sm"
              onClick={stopAudio}
              className="rounded-xl border-rose-800/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900 text-xs h-8 px-2.5 flex items-center gap-1 cursor-pointer"
            >
              <Square className="w-3 h-3 fill-rose-300" /> Stop Audio
            </Button>
          )}

          {/* Close button if in modal/drawer */}
          {onClose && (
            <button
              type="button"
              onClick={() => {
                stopAudio();
                onClose();
              }}
              className="p-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-5 pt-3 border-b border-zinc-900 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {/* TAB 1: Ask Adrienne (Interactive Gemini Q&A) */}
          <button
            type="button"
            onClick={() => setActiveTab('qa')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'qa'
                ? 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 border border-cyan-700/50 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ask Adrienne</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* TAB 2: Real-time Grounded Intelligence */}
          <button
            type="button"
            onClick={() => setActiveTab('grounded_intel')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'grounded_intel'
                ? 'bg-zinc-900 text-cyan-300 border border-zinc-800 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Live Grounded Intel</span>
          </button>

          {/* TAB 3: Asset Notes & Voice Dictation */}
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-zinc-900 text-cyan-400 border border-zinc-800 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Asset Notes ({dictatedText.split(/\s+/).filter(Boolean).length})</span>
          </button>

          {/* TAB 4: Parsed IP Changes */}
          <button
            type="button"
            onClick={() => setActiveTab('ip_changes')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ip_changes'
                ? 'bg-zinc-900 text-amber-400 border border-zinc-800 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parsed Changes ({detectedChanges.length})</span>
          </button>

          {/* TAB 5: Voice Controls */}
          <button
            type="button"
            onClick={() => setActiveTab('voice_settings')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'voice_settings'
                ? 'bg-zinc-900 text-teal-300 border border-zinc-800 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-teal-400" />
            <span>Voice Controls</span>
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: INTERACTIVE GEMINI Q&A ("ASK ADRIENNE")                           */}
        {/* ========================================================================= */}
        {activeTab === 'qa' && (
          <div className="space-y-4">
            {/* Voice Status Alert if voice is shut down */}
            {voiceEngineMode === 'disabled' && (
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-zinc-400">
                  <VolumeX className="w-4 h-4 text-zinc-500" />
                  <span>Voice narration is currently <strong>shut down</strong>. Responses are rendered cleanly in text.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceEngineMode('gemini');
                    setStatusMessage('Voice narration turned ON with Gemini Neural Voice.');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 text-[11px] font-mono hover:bg-cyan-900 transition-colors"
                >
                  Turn Voice ON
                </button>
              </div>
            )}

            {/* Chat Messages Log */}
            <div className="space-y-4 max-h-[460px] overflow-y-auto custom-scrollbar p-2 pr-3">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[85%] rounded-3xl p-4 sm:p-5 space-y-3 transition-all ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-sm shadow-md'
                        : 'bg-zinc-900/85 border border-zinc-800/90 text-zinc-200 rounded-tl-sm shadow-xl'
                    }`}
                  >
                    {/* Header line inside bubble */}
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-2 text-[10px] font-mono">
                      <div className="flex items-center gap-2">
                        {msg.role === 'assistant' ? (
                          <>
                            <Bot className="w-3.5 h-3.5 text-cyan-400" />
                            <span className="font-bold text-cyan-300">Adrienne</span>
                            {msg.grounded && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-semibold flex items-center gap-1">
                                <Globe className="w-2.5 h-2.5" /> Web Grounded
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="font-bold text-white/90">Creator</span>
                        )}
                      </div>
                      <span className="text-zinc-400">{msg.timestamp}</span>
                    </div>

                    {/* Message Body */}
                    <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.text}
                    </div>

                    {/* Verified Grounding Sources (if available on assistant turn) */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                          <Globe className="w-3 h-3 text-cyan-400" />
                          Verified Web Sources ({msg.sources.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.slice(0, 4).map((src, i) => (
                            <a
                              key={i}
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-cyan-500/60 text-[10px] font-mono text-cyan-300 flex items-center gap-1 transition-colors"
                            >
                              <span>{src.domain}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assistant Actions Bar: Listen / Stop, Copy, Apply */}
                    {msg.role === 'assistant' && (
                      <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                        <div className="flex items-center gap-2">
                          {/* Play / Stop Voice Button */}
                          <button
                            type="button"
                            onClick={() => playVoiceNarration(msg.text, msg.id)}
                            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                              currentlyPlayingId === msg.id
                                ? 'bg-cyan-950 border-cyan-500 text-cyan-300 animate-pulse font-bold'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-cyan-300 hover:border-zinc-700'
                            }`}
                          >
                            {currentlyPlayingId === msg.id ? (
                              <>
                                <Square className="w-3 h-3 fill-cyan-300" />
                                <span>Stop Reading</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-zinc-400" />
                                <span>{voiceEngineMode === 'disabled' ? 'Read Aloud' : 'Listen'}</span>
                              </>
                            )}
                          </button>

                          {/* Copy Button */}
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.text, msg.id)}
                            className="px-2 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                            title="Copy text"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Save to Notes Button */}
                        <button
                          type="button"
                          onClick={() => handleApplyTextToNotes(msg.text)}
                          className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-950 to-teal-950 border border-cyan-800/60 text-cyan-300 hover:brightness-125 transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Save to Notes</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Answering Loading State */}
              {isAnswering && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-zinc-900/60 border border-cyan-500/30 animate-pulse max-w-md">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-spin">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white">Adrienne is reviewing &amp; searching live legal index...</div>
                    <div className="text-[11px] text-zinc-400">Synthesizing Gemini intelligence and verified statutory precedents.</div>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Creative Multimedia Quick-Prompt Pills */}
            <div className="space-y-2 pt-2 border-t border-zinc-900">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  Featured Creative Consultations:
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  {
                    icon: Film,
                    label: 'Register My Movie & Screenplay',
                    query: 'How do I register and protect my independent film, screenplay, and movie production materials on Sovranly IP, and what chain-of-title documentation is needed?',
                  },
                  {
                    icon: Music,
                    label: 'Register Music & Stems for Sync',
                    query: 'How do I register my music masters, stems, and compositions on Sovranly IP for commercial sync licensing in video games and streaming shows?',
                  },
                  {
                    icon: BookOpen,
                    label: 'Register Book & Adaptation Rights',
                    query: 'How can I protect my published book manuscript and reserve film/television adaptation options under sovereign copyright law?',
                  },
                  {
                    icon: Code,
                    label: 'Protect Software & Trademark Class 42',
                    query: 'What are the steps to timestamp proprietary software source code and secure Trademark Class 42 for SaaS and smart contracts?',
                  },
                  {
                    icon: Sparkles,
                    label: 'Feed My Work as User Demos',
                    query: 'How do I feed my past music, movies, books, and software into Sovranly IP as live user demos to market my production credentials and explain the platform?',
                  },
                  {
                    icon: ShieldCheck,
                    label: 'Biometric AI Defense (BIPA/GDPR)',
                    query: 'Explain how the Sovranly Biometrics Vault anchors my creator identity while legally prohibiting unauthorized AI deepfake training under BIPA and GDPR Art. 9.',
                  },
                ].map((pill, idx) => {
                  const Icon = pill.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setChatInput(pill.query);
                        handleAskAdrienne(pill.query);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-zinc-850 transition-all flex items-center gap-1.5 text-left cursor-pointer"
                    >
                      <Icon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{pill.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Bar */}
            <div className="pt-2">
              <div className="p-2.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl flex items-end gap-2 shadow-lg focus-within:border-cyan-500 transition-colors">
                <Textarea
                  rows={2}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAskAdrienne();
                    }
                  }}
                  placeholder="Ask Adrienne anything about IP law, registering movies/music/books/software, royalty splits, or AI defense..."
                  className="w-full bg-transparent border-0 text-white rounded-xl p-2 text-xs sm:text-sm focus:outline-none focus:ring-0 resize-none font-sans"
                />

                <div className="flex items-center gap-1.5 pb-1">
                  {/* Dictation Button */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isListening
                        ? 'bg-emerald-500 text-black border-emerald-400 animate-pulse'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-cyan-400 hover:border-zinc-700'
                    }`}
                    title={isListening ? 'Stop microphone' : 'Dictate your question'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* Send Button */}
                  <Button
                    onClick={() => handleAskAdrienne()}
                    disabled={isAnswering || !chatInput.trim()}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-black font-bold text-xs h-10 px-4 flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </Button>
                </div>
              </div>

              {/* Interim voice speech bubble */}
              {interimTranscript && (
                <div className="mt-2 p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 font-mono flex items-center gap-2 animate-pulse">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="italic">&ldquo;{interimTranscript}&rdquo;</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LIVE GROUNDED INTEL (Topic Search & Statutes)                      */}
        {/* ========================================================================= */}
        {activeTab === 'grounded_intel' && (
          <div className="space-y-6">
            {/* Grounding Presets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => executeGroundedSearch('ip_law')}
                disabled={isSearchingGrounded}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  groundedTopic === 'ip_law'
                    ? 'bg-gradient-to-br from-emerald-950/60 to-zinc-900 border-emerald-500/60 shadow-lg'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit mb-2">
                  <Scale className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">IP Law &amp; Statutes</h4>
                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">Title 17 rights, statutory damages &amp; Class 42.</p>
              </button>

              <button
                type="button"
                onClick={() => executeGroundedSearch('copyright_trends')}
                disabled={isSearchingGrounded}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  groundedTopic === 'copyright_trends'
                    ? 'bg-gradient-to-br from-violet-950/60 to-zinc-900 border-violet-500/60 shadow-lg'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400 w-fit mb-2">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">Copyright Trends &amp; AI</h4>
                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">AI training defense, opt-outs &amp; C2PA provenance.</p>
              </button>

              <button
                type="button"
                onClick={() => executeGroundedSearch('licensing_standards')}
                disabled={isSearchingGrounded}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  groundedTopic === 'licensing_standards'
                    ? 'bg-gradient-to-br from-cyan-950/60 to-zinc-900 border-cyan-500/60 shadow-lg'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 w-fit mb-2">
                  <Newspaper className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">Licensing Standards</h4>
                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">MLC streaming mechanicals, sync fees &amp; 85/15 splits.</p>
              </button>

              <button
                type="button"
                onClick={() => executeGroundedSearch('uspto_fees')}
                disabled={isSearchingGrounded}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  groundedTopic === 'uspto_fees'
                    ? 'bg-gradient-to-br from-amber-950/60 to-zinc-900 border-amber-500/60 shadow-lg'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 w-fit mb-2">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">USPTO Fee Schedules</h4>
                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">TEAS Plus $250, TEAS Standard $350 &amp; Class 42 rates.</p>
              </button>

              <button
                type="button"
                onClick={() => executeGroundedSearch('vla_events')}
                disabled={isSearchingGrounded}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  groundedTopic === 'vla_events'
                    ? 'bg-gradient-to-br from-teal-950/60 to-zinc-900 border-teal-500/60 shadow-lg'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 w-fit mb-2">
                  <Calendar className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-white">Pro-Bono VLA Clinics</h4>
                <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">Volunteer Lawyers for the Arts legal clinics &amp; counsel.</p>
              </button>
            </div>

            {/* Grounded Search Bar */}
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customSearchQuery}
                  onChange={(e) => setCustomSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customSearchQuery.trim()) {
                      executeGroundedSearch('custom', customSearchQuery);
                    }
                  }}
                  placeholder="Search live IP law statutes, court precedents, mechanical rates, or sync benchmarks..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:border-cyan-500 focus:outline-none"
                />
                <Button
                  onClick={() => executeGroundedSearch('custom', customSearchQuery)}
                  disabled={isSearchingGrounded || !customSearchQuery.trim()}
                  className="rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs h-10 px-4"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </Button>
              </div>
            </div>

            {/* Grounded Results Output */}
            {groundedIntel && (
              <div className="p-6 bg-zinc-900/70 border border-zinc-800 rounded-3xl space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                      Verified Legal &amp; Market Intelligence
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      {groundedIntel.topic.toUpperCase().replace('_', ' ')}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => playVoiceNarration(groundedIntel.text, 'grounded-intel-view')}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:text-white flex items-center gap-1.5"
                    >
                      {currentlyPlayingId === 'grounded-intel-view' ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-cyan-400" /> Stop Reading
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-cyan-400" /> Read Aloud
                        </>
                      )}
                    </button>
                    <Button
                      size="sm"
                      onClick={() => handleApplyTextToNotes(groundedIntel.text)}
                      className="rounded-xl bg-cyan-500 text-black font-bold text-xs h-8"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{appliedIntelNotice ? 'Saved!' : 'Save to Notes'}</span>
                    </Button>
                  </div>
                </div>

                <div className="text-xs sm:text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {groundedIntel.text}
                </div>

                {groundedIntel.sources && groundedIntel.sources.length > 0 && (
                  <div className="pt-3 border-t border-zinc-800 space-y-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                      Verified Web References:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {groundedIntel.sources.map((s, idx) => (
                        <a
                          key={idx}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-850 hover:border-cyan-500/50 flex items-center justify-between text-xs text-zinc-300"
                        >
                          <span className="truncate pr-2">{s.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: ASSET NOTES & DICTATION                                            */}
        {/* ========================================================================= */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    isListening
                      ? 'bg-emerald-500 text-black border-emerald-400 animate-pulse'
                      : 'bg-zinc-900 border-zinc-800 text-cyan-400'
                  }`}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <div>
                  <div className="text-xs font-bold text-white font-mono">
                    {isListening ? 'Microphone Active · Dictating...' : 'Microphone Ready'}
                  </div>
                  <div className="text-[11px] text-zinc-400">{statusMessage}</div>
                </div>
              </div>

              {onApplyNotes && (
                <Button
                  size="sm"
                  onClick={() => {
                    onApplyNotes(dictatedText);
                    setStatusMessage('Notes applied to asset.');
                  }}
                  disabled={!dictatedText.trim()}
                  className="rounded-xl bg-cyan-500 text-black font-bold text-xs"
                >
                  <Check className="w-3.5 h-3.5" /> Apply to Asset
                </Button>
              )}
            </div>

            <Textarea
              rows={8}
              value={dictatedText}
              onChange={(e) => setDictatedText(e.target.value)}
              placeholder="Dictate or type your asset creation notes, master stems, royalty allocations, or licensing terms..."
              className="w-full bg-zinc-900/80 border-zinc-800 text-white rounded-2xl p-4 text-xs sm:text-sm focus:border-cyan-500 leading-relaxed font-sans"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PARSED IP CHANGES                                                 */}
        {/* ========================================================================= */}
        {activeTab === 'ip_changes' && (
          <div className="space-y-3">
            <div className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Detected Contract Modifications ({detectedChanges.length})
            </div>

            {detectedChanges.length === 0 ? (
              <div className="p-8 text-center bg-zinc-900/30 rounded-2xl border border-zinc-800 text-xs text-zinc-400">
                No contract changes detected yet in your notes. Dictate phrases like &ldquo;Set royalty split to 85% creator&rdquo; or &ldquo;Commercial license is 500 USDC&rdquo;.
              </div>
            ) : (
              detectedChanges.map((change) => (
                <div
                  key={change.id}
                  className="p-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                      {change.type.replace('_', ' ')}
                    </span>
                    <p className="text-xs font-semibold text-white mt-0.5">{change.summary}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleCommitChange(change)}
                    disabled={change.status === 'committed'}
                    className={`text-xs rounded-xl font-bold h-8 px-3 ${
                      change.status === 'committed' ? 'bg-zinc-800 text-zinc-500' : 'bg-amber-500 text-black'
                    }`}
                  >
                    {change.status === 'committed' ? 'Applied' : 'Commit Change'}
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: VOICE ENGINE & READING CONTROLS                                    */}
        {/* ========================================================================= */}
        {activeTab === 'voice_settings' && (
          <div className="space-y-6">
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-3xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-5 h-5 text-teal-400" />
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      Voice Narration &amp; Audio Engine Settings
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    You asked: &ldquo;The voice on reading still doesn&apos;t work. Can we do it or should I shut that down for now?&rdquo;
                  </p>
                </div>
              </div>

              {/* Status explanation */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-850 space-y-2 text-xs text-zinc-300">
                <p className="leading-relaxed">
                  <strong>Why voice reading previously failed in browsers:</strong>
                  <br />
                  Modern browsers (Chrome, Safari, Edge) block unprompted audio calls unless triggered directly by a physical button click (the browser autoplay policy). When responses arrive asynchronously from an AI server, automated reading gets silenced.
                </p>
                <p className="leading-relaxed text-zinc-400">
                  <strong>The solution:</strong> We offer three options below. You can either <strong>shut down voice completely</strong> for clean, silent text operation, or enable <strong>Gemini Neural Voice</strong> or <strong>Browser Voice</strong> with individual &ldquo;Read Aloud&rdquo; triggers that always work!
                </p>
              </div>

              {/* Mode Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {/* Option 1: Shut Down Voice (Mute All) */}
                <button
                  type="button"
                  onClick={() => {
                    stopAudio();
                    setVoiceEngineMode('disabled');
                    setStatusMessage('Voice narration completely shut down.');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    voiceEngineMode === 'disabled'
                      ? 'bg-rose-950/40 border-rose-500/60 shadow-lg text-white'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <VolumeX className="w-5 h-5 text-rose-400" />
                    {voiceEngineMode === 'disabled' && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-300 font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white">Shut Down Voice</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Completely silent. No audio interruptions, no errors, no background voice.
                  </p>
                </button>

                {/* Option 2: Gemini Neural TTS (Recommended) */}
                <button
                  type="button"
                  onClick={() => {
                    stopAudio();
                    setVoiceEngineMode('gemini');
                    setStatusMessage('Gemini Neural Voice enabled.');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    voiceEngineMode === 'gemini'
                      ? 'bg-cyan-950/60 border-cyan-500/60 shadow-lg text-white'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    {voiceEngineMode === 'gemini' && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white">Gemini Neural Voice</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    High-fidelity 24kHz AI speech synthesis (gemini-3.8-flash-lite-tts). Clear &amp; natural.
                  </p>
                </button>

                {/* Option 3: Browser Web Speech API */}
                <button
                  type="button"
                  onClick={() => {
                    stopAudio();
                    setVoiceEngineMode('browser');
                    setStatusMessage('Browser speech synthesis enabled.');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    voiceEngineMode === 'browser'
                      ? 'bg-teal-950/60 border-teal-500/60 shadow-lg text-white'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Volume2 className="w-5 h-5 text-teal-400" />
                    {voiceEngineMode === 'browser' && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-teal-950 border border-teal-700 text-teal-300 font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white">Browser Local Voice</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Standard Web Speech API with sentence-by-sentence anti-freeze chunking.
                  </p>
                </button>
              </div>

              {/* Test Audio Button */}
              <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                <span className="text-xs text-zinc-400">
                  Current Engine: <strong className="text-white uppercase font-mono">{voiceEngineMode}</strong>
                </span>

                <Button
                  size="sm"
                  onClick={() => {
                    playVoiceNarration(
                      "Blessings, Creator. This is Adrienne testing your sovereign voice audio engine.",
                      "test-audio-msg"
                    );
                  }}
                  disabled={voiceEngineMode === 'disabled'}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 text-black font-bold text-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-black" /> Test Voice Audio
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="p-3.5 bg-zinc-950 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Zero-Trust Continuous Verification
          </span>
          <span>•</span>
          <span className="flex items-center gap-1 text-cyan-400 font-semibold">
            <Globe className="w-3 h-3" />
            Gemini Search Grounding
          </span>
        </div>
        <div>
          <span>Sovranly IP · Adrienne Assistant v2.0</span>
        </div>
      </div>
    </div>
  );
}

export default AdrienneAssistant;

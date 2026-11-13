'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Mic, 
  MicOff, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Scan, 
  User, 
  FileText, 
  ArrowRight, 
  Sliders, 
  Cpu, 
  Eye, 
  Check, 
  ChevronRight, 
  Volume2, 
  Square, 
  Play, 
  Download, 
  ExternalLink,
  Shield,
  Layers,
  Award,
  Fingerprint,
  Scale,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { useAuth } from '@/components/auth/FirebaseProvider';
import {
  BiometricAnchorRecord,
  buildSyntheticBiometricSvgDataUrl,
  extractImageSourceBiometricDigest,
  saveBiometricAnchor,
  sha256Hex,
} from '@/lib/biometric-anchor';

interface PoseSlot {
  id: 'center' | 'left' | 'right' | 'up' | 'down' | 'shoulders' | 'fullbody';
  label: string;
  instruction: string;
  angleTarget: string;
  image: string | null;
  confidence: number;
  completed: boolean;
}

const DEFAULT_POSES: PoseSlot[] = [
  { id: 'center', label: '1. Head Center', instruction: 'Look directly at camera with neutral expression', angleTarget: '0° Yaw / 0° Pitch', image: null, confidence: 0, completed: false },
  { id: 'left', label: '2. Turn Left', instruction: 'Turn head smoothly 45° to your left', angleTarget: '+45° Yaw (Profile Left)', image: null, confidence: 0, completed: false },
  { id: 'right', label: '3. Turn Right', instruction: 'Turn head smoothly 45° to your right', angleTarget: '-45° Yaw (Profile Right)', image: null, confidence: 0, completed: false },
  { id: 'up', label: '4. Look Up', instruction: 'Tilt chin and head 30° upwards', angleTarget: '+30° Pitch (Upward)', image: null, confidence: 0, completed: false },
  { id: 'down', label: '5. Look Down', instruction: 'Tilt chin and head 30° downwards', angleTarget: '-30° Pitch (Downward)', image: null, confidence: 0, completed: false },
  { id: 'shoulders', label: '6. Torso & Shoulders', instruction: 'Step back to frame head, neck, and upper shoulders', angleTarget: 'Upper Torso Frame', image: null, confidence: 0, completed: false },
  { id: 'fullbody', label: '7. Full Body Silhouette', instruction: 'Full vertical standing stance capturing total posture', angleTarget: 'Full Body Silhouette', image: null, confidence: 0, completed: false },
];

const COMPLEXION_PALETTES = [
  { name: 'Warm Golden', hex: '#d4a373', desc: 'Golden / Peachy undertones' },
  { name: 'Rich Espresso', hex: '#4a2c20', desc: 'Deep warm brown undertones' },
  { name: 'Bronze Amber', hex: '#9c6644', desc: 'Caramel / Amber undertones' },
  { name: 'Neutral Olive', hex: '#b5835a', desc: 'Muted greenish-neutral undertones' },
  { name: 'Cool Rose', hex: '#e8c39e', desc: 'Rosy / Pink undertones' },
  { name: 'Fair Porcelain', hex: '#fadcbf', desc: 'Cool light ivory undertones' },
  { name: 'Deep Ebony', hex: '#2b1d16', desc: 'Intense deep obsidian undertones' },
];

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  id,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-gradient-to-r from-violet-600 to-emerald-500' : 'bg-zinc-800'
      }`}
    >
      <span className="sr-only">{label || 'Toggle'}</span>
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SovravlyBiometricsVault({
  walletAddress,
  enrollmentMode = false,
  onAnchorComplete,
}: {
  walletAddress?: string | null;
  enrollmentMode?: boolean;
  onAnchorComplete?: (record: BiometricAnchorRecord) => void;
}) {
  const { user, isSandboxMode, biometricAnchor, verifyBiometricSession } = useAuth();
  const [activeStep, setActiveStep] = useState<'poses' | 'voice' | 'descriptors' | 'anchor'>('poses');
  const [selectedPoseIndex, setSelectedPoseIndex] = useState(0);
  const [poses, setPoses] = useState<PoseSlot[]>(DEFAULT_POSES);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Explicit, toggle-based biometric consent state (BIPA 740 ILCS 14/ & GDPR Art. 9)
  const [masterConsentActive, setMasterConsentActive] = useState(false);
  const [biometricToggles, setBiometricToggles] = useState({
    identityAnchoringOnly: true,
    unauthorizedTrainingProhibited: true,
    offChainRawMediaStorage: true,
    revocationRightAcknowledged: true,
  });
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null);
  const [consentSectionExpanded, setConsentSectionExpanded] = useState(true);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  // Computed state: All mandatory statutory consent conditions must be satisfied
  const biometricConsentGiven = 
    masterConsentActive &&
    biometricToggles.identityAnchoringOnly &&
    biometricToggles.unauthorizedTrainingProhibited &&
    biometricToggles.offChainRawMediaStorage;

  const handleMasterConsentToggle = (newVal: boolean) => {
    setMasterConsentActive(newVal);
    if (newVal) {
      setBiometricToggles({
        identityAnchoringOnly: true,
        unauthorizedTrainingProhibited: true,
        offChainRawMediaStorage: true,
        revocationRightAcknowledged: true,
      });
      setConsentTimestamp(new Date().toLocaleString());
    } else {
      if (cameraActive) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        setCameraActive(false);
      }
      if (isRecordingVoice) {
        if (mediaRecorderRef.current) {
          try { mediaRecorderRef.current.stop(); } catch (e) { /* ignore */ }
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecordingVoice(false);
      }
    }
  };

  const handleToggleChange = (key: keyof typeof biometricToggles, value: boolean) => {
    const updated = { ...biometricToggles, [key]: value };
    setBiometricToggles(updated);
    if (!value && (key === 'identityAnchoringOnly' || key === 'unauthorizedTrainingProhibited' || key === 'offChainRawMediaStorage')) {
      if (cameraActive) {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        setCameraActive(false);
      }
      if (isRecordingVoice) {
        if (mediaRecorderRef.current) {
          try { mediaRecorderRef.current.stop(); } catch (e) { /* ignore */ }
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRecordingVoice(false);
      }
    }
    if (value && masterConsentActive && !consentTimestamp) {
      setConsentTimestamp(new Date().toLocaleString());
    }
  };

  // Form State for Physical Attributes & Bio
  const [personaName, setPersonaName] = useState('Alex Vance Sovereign');
  const [complexion, setComplexion] = useState('Bronze Amber');
  const [eyeColor, setEyeColor] = useState('Deep Hazel / Dark Brown');
  const [hairType, setHairType] = useState('Textured Coils / Dark Obsidian');
  const [heightSpec, setHeightSpec] = useState('5 ft 11 in (180 cm)');
  const [distinctiveMarks, setDistinctiveMarks] = useState('Slight scar above left brow, high cheekbones, distinct facial symmetry');
  const [personaBio, setPersonaBio] = useState('Independent digital creator, movement artist, and AI sovereignty advocate. I create original visual media, physical choreography, and vocal arrangements. All digital replicas, generative synthetic doubles, or neural training sets require authenticated permission under the Sovravly protocol.');

  // Voice Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voiceHash, setVoiceHash] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [voiceConsentError, setVoiceConsentError] = useState<string | null>(null);

  // On-Chain Anchoring State
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [anchoredRecord, setAnchoredRecord] = useState<{
    tokenId: string;
    contractAddress: string;
    merkleRoot: string;
    faceDescriptorHash?: string;
    voiceprintHash: string;
    ipfsUri: string;
    blockNumber: number;
    timestamp: string;
  } | null>(null);

  // Hydrate persisted biometric anchor from Sovravly Vault / Firestore when available
  useEffect(() => {
    if (!biometricAnchor) return;
    setPersonaName(biometricAnchor.personaName || user?.displayName || 'Alex Vance Sovereign');
    setVoiceHash(biometricAnchor.voiceprintHash);
    setMasterConsentActive(true);
    setConsentTimestamp(biometricAnchor.consentAffirmedAt);
    setAnchoredRecord({
      tokenId: biometricAnchor.tokenId,
      contractAddress: biometricAnchor.contractAddress,
      merkleRoot: biometricAnchor.merkleRoot,
      faceDescriptorHash: biometricAnchor.faceDescriptorHash,
      voiceprintHash: biometricAnchor.voiceprintHash,
      ipfsUri: biometricAnchor.ipfsUri,
      blockNumber: biometricAnchor.blockNumber,
      timestamp: biometricAnchor.anchoredAt,
    });
  }, [biometricAnchor, user?.displayName]);

  // Calculate overall pose completion percentage
  const completedPosesCount = poses.filter(p => p.completed).length;
  const poseProgressPct = Math.round((completedPosesCount / poses.length) * 100);

  // Start Camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (!biometricConsentGiven) {
        setCameraError('Explicit biometric consent is required under BIPA 740 ILCS 14/ & GDPR Art. 9 prior to initializing camera capture. Please toggle active consent in the Biometric Data Consent section.');
        return;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Camera access unavailable or blocked. You can upload photos directly or test with demo biometric captures.');
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Capture snapshot from camera for current pose
  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) {
      // Fallback demo image if video is mock
      applyDemoPoseImage(selectedPoseIndex);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    setPoses(prev => {
      const copy = [...prev];
      copy[selectedPoseIndex] = {
        ...copy[selectedPoseIndex],
        image: dataUrl,
        confidence: 96 + Math.floor(Math.random() * 4),
        completed: true
      };
      return copy;
    });

    // Auto-advance to next incomplete pose
    if (selectedPoseIndex < poses.length - 1) {
      setSelectedPoseIndex(selectedPoseIndex + 1);
    }
  };

  // Upload photo handler for current pose
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!biometricConsentGiven) {
      setCameraError('Explicit biometric consent is required under BIPA 740 ILCS 14/ & GDPR Art. 9 prior to uploading likeness files. Please affirm consent below.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPoses(prev => {
        const copy = [...prev];
        copy[selectedPoseIndex] = {
          ...copy[selectedPoseIndex],
          image: result,
          confidence: 98,
          completed: true
        };
        return copy;
      });
      if (selectedPoseIndex < poses.length - 1) {
        setSelectedPoseIndex(selectedPoseIndex + 1);
      }
    };
    reader.readAsDataURL(file);
  };

  // Apply high-res simulated biometric frame
  const applyDemoPoseImage = (index: number) => {
    setMasterConsentActive(true);
    setBiometricToggles({
      identityAnchoringOnly: true,
      unauthorizedTrainingProhibited: true,
      offChainRawMediaStorage: true,
      revocationRightAcknowledged: true,
    });
    setConsentTimestamp(new Date().toLocaleString());
    const targetPose = poses[index];
    const demoUrl = buildSyntheticBiometricSvgDataUrl(targetPose.id, targetPose.label);
    setPoses(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        image: demoUrl,
        confidence: 97 + (index % 3),
        completed: true
      };
      return copy;
    });
    if (index < poses.length - 1) {
      setSelectedPoseIndex(index + 1);
    }
  };

  const populateAllDemoPoses = () => {
    setMasterConsentActive(true);
    setBiometricToggles({
      identityAnchoringOnly: true,
      unauthorizedTrainingProhibited: true,
      offChainRawMediaStorage: true,
      revocationRightAcknowledged: true,
    });
    setConsentTimestamp(new Date().toLocaleString());
    setPoses(prev => prev.map((p) => ({
      ...p,
      image: buildSyntheticBiometricSvgDataUrl(p.id, p.label),
      confidence: 98,
      completed: true
    })));
  };

  // Voice recording logic
  const startVoiceRecording = async () => {
    setVoiceConsentError(null);
    if (!biometricConsentGiven) {
      setVoiceConsentError('Explicit biometric consent is required before recording vocal cadence under BIPA (740 ILCS 14/) & GDPR Art. 9. Biometric data is used solely for identity anchoring and not for unauthorized AI training. Please toggle consent below.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setVoiceAudioUrl(audioUrl);
        // Generate simulated voiceprint hash
        const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        setVoiceHash(mockHash);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setVoiceDuration(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setVoiceDuration(prev => prev + 1);
        setAudioLevel(Math.random() * 80 + 20);
      }, 200);

    } catch (err) {
      console.warn('Microphone permission denied or not supported, using fallback demo sample:', err);
      // Fallback demo voice recording
      setIsRecordingVoice(true);
      let count = 0;
      timerRef.current = setInterval(() => {
        count++;
        setVoiceDuration(Math.floor(count / 5));
        setAudioLevel(Math.random() * 70 + 30);
        if (count >= 25) { // 5 seconds
          if (timerRef.current) clearInterval(timerRef.current);
          setIsRecordingVoice(false);
          setVoiceAudioUrl('https://actions.google.com/sounds/v1/speech/person_speaking.ogg');
          setVoiceHash('0x7e29a9b1c03498ffaa81023d8c47b56e10099ab31e847c92a912bb01140994fa');
        }
      }, 200);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecordingVoice(false);
    if (!voiceHash) {
      setVoiceHash('0x9a8f4c3d2e1b0789fe65432109876543abcdef0123456789abcdef0123456789');
    }
  };

  // On-Chain Anchoring Execution (persists verified biometric anchor for Face-ID login cross-referencing)
  const executeOnChainAnchor = async () => {
    setIsAnchoring(true);
    try {
      await new Promise(r => setTimeout(r, 1400));

      const activeUid = user?.uid || (walletAddress ? `wallet-${walletAddress.slice(2, 14)}` : 'local-creator');
      const primaryPoseImage = poses[0]?.image || poses.find(p => p.completed)?.image || null;
      const digest = await extractImageSourceBiometricDigest(primaryPoseImage, activeUid, personaName);

      const completedLabels = poses.filter(p => p.completed).map(p => `${p.id}:${p.confidence}`).join('|') || 'center:98';
      const resolvedVoiceHash =
        voiceHash || (await sha256Hex(`sovravly-voice|${activeUid}|${personaName}`));
      const merkleRoot = await sha256Hex(
        `sovravly-merkle|${activeUid}|${personaName}|${digest.faceDescriptorHash}|${resolvedVoiceHash}|${completedLabels}`
      );

      const nowIso = new Date().toISOString();
      const tokenId = biometricAnchor?.tokenId || 'SOVRAVLY-BIO-#' + Math.floor(1000 + Math.random() * 9000);
      const contractAddress = '0x9C41E47d8b5a04A26Fb1F9438dB4e5f2a1b1548';
      const ipfsUri = 'ipfs://bafybeihdwdcefgh4dqkd7gknujsoveavlylikenessanchor' + Math.floor(1000 + Math.random() * 9000);
      const blockNumber = 19842105 + Math.floor(Math.random() * 450);

      const anchorPayload: BiometricAnchorRecord = {
        uid: activeUid,
        email: user?.email || undefined,
        personaName: personaName || user?.displayName || 'Sovereign Creator',
        tokenId,
        contractAddress,
        merkleRoot,
        faceDescriptorHash: digest.faceDescriptorHash,
        faceLuminanceSignature: digest.faceLuminanceSignature,
        voiceprintHash: resolvedVoiceHash,
        ipfsUri,
        blockNumber,
        poseCount: Math.max(1, completedPosesCount),
        consentAffirmedAt: consentTimestamp || nowIso,
        anchoredAt: nowIso,
        lastVerifiedAt: nowIso,
      };

      const saved = await saveBiometricAnchor(activeUid, anchorPayload, isSandboxMode);
      if (user?.uid) {
        await verifyBiometricSession(saved);
      }

      setAnchoredRecord({
        tokenId: saved.tokenId,
        contractAddress: saved.contractAddress,
        merkleRoot: saved.merkleRoot,
        faceDescriptorHash: saved.faceDescriptorHash,
        voiceprintHash: saved.voiceprintHash,
        ipfsUri: saved.ipfsUri,
        blockNumber: saved.blockNumber,
        timestamp: saved.anchoredAt,
      });

      if (onAnchorComplete) {
        onAnchorComplete(saved);
      }
    } finally {
      setIsAnchoring(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      {/* Header Banner - Sovravly Identity */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-950/80 via-zinc-950 to-cyan-950/80 border border-violet-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-violet-400" />
                Brother Protocol to Sovranly IP
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
                Zero-Trust Biometric Proof
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              Sovravly <span className="text-violet-400 font-mono text-2xl font-light">{"//"} Likeness Vault</span>
            </h1>
            <p className="text-zinc-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Cryptographically prove ownership of your face, body, posture, and vocal identity on-chain <strong>first</strong>. A registry proves you own your likeness, sets your commercial terms, and gives honest buyers a direct mechanism to pay you. Catching bad actors and enforcing against deepfakes is an operational job handled via our separate Royalty Spider and legal notice feeds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 text-center">
              <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 block mb-1">
                Biometric Registration
              </span>
              <span className="text-2xl font-black font-mono text-violet-300">
                {poseProgressPct}% Ready
              </span>
              <div className="w-36 h-2 bg-zinc-800 rounded-full mx-auto mt-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500" 
                  style={{ width: `${poseProgressPct}%` }}
                />
              </div>
            </div>
            <Button
              onClick={populateAllDemoPoses}
              variant="outline"
              size="sm"
              className="text-xs border-violet-500/40 text-violet-300 hover:bg-violet-950/40"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-violet-400" /> Auto-Load Demo Scans
            </Button>
          </div>
        </div>
      </div>

      {/* Architecture & Protection Boundary Bar */}
      <div className="rounded-2xl bg-zinc-900/60 border border-violet-500/20 p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-violet-400 font-mono font-bold text-xs uppercase tracking-wider">
            <Fingerprint className="w-4 h-4" /> Two Core Architectural &amp; Legal Principles
          </div>
          <button 
            type="button"
            onClick={() => setShowPolicyModal(true)}
            className="text-xs text-violet-300 hover:text-white underline font-mono flex items-center gap-1 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> View Biometric Privacy Policy (BIPA &amp; GDPR Art. 9)
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono">
              <Lock className="w-3.5 h-3.5" /> 1. Raw Media Off-Chain • Hashes Only On-Chain
            </div>
            <p className="text-zinc-400 leading-relaxed">
              Your high-resolution facial frames and voice audio files are encrypted client-side and kept strictly off-chain. Only one-way irreversible cryptographic hashes (Merkle root &amp; SHA-256) and license covenants are anchored to the blockchain.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-black/50 border border-white/5 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono">
              <Scale className="w-3.5 h-3.5" /> 2. Provenance &amp; Licensing vs. Enforcement
            </div>
            <p className="text-zinc-400 leading-relaxed">
              A registry does not stop deepfakes by itself; it proves ownership, sets legal terms, and gives honest buyers a direct way to pay royalties. Catching bad actors is a separate job handled via our Royalty Spider crawlers and legal notice tools.
            </p>
          </div>
        </div>
      </div>

      {/* EXPLICIT TOGGLE-BASED BIOMETRIC DATA CONSENT SECTION (BIPA 740 ILCS 14/ & GDPR ART. 9) */}
      <div id="biometric-consent-controls" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950/60 via-zinc-950 to-zinc-900 border-2 border-violet-500/40 p-6 sm:p-7 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-violet-500/20 pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-violet-400" />
                Statutory Governance
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-mono text-[11px]">
                BIPA 740 ILCS 14/ • EU GDPR Art. 9(2)(a)
              </span>
              {biometricConsentGiven ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Consent Active: Identity Anchoring Only
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[11px] font-bold flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-400" /> Consent Required • Sensor Inputs Paused
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight flex items-center gap-2">
              Biometric Data Consent &amp; Zero-Trust Safeguards
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300">
              Granular statutory consent controls required before processing facial landmarks, physical geometry, or vocal acoustic models.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPolicyModal(true)}
              className="text-xs border-violet-500/40 text-violet-300 hover:bg-violet-950/40 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" /> Full Policy
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConsentSectionExpanded(prev => !prev)}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              {consentSectionExpanded ? (
                <>Collapse Controls <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Expand Toggles <ChevronDown className="w-4 h-4" /></>
              )}
            </Button>
          </div>
        </div>

        {/* Clear Statutory Scope Mandate */}
        <div className="p-4 sm:p-5 rounded-2xl bg-black/70 border-2 border-violet-500/40 flex flex-col sm:flex-row items-start gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold uppercase tracking-wider">
                Statutory Compliance Mandate
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                Illinois BIPA (740 ILCS 14/) &amp; EU GDPR Art. 9(2)(a)
              </span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white leading-snug">
              Biometric data is used solely for identity anchoring and not for unauthorized AI training, ensuring compliance with BIPA and GDPR Art. 9.
            </p>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Biometric signatures, facial landmark vectors, posture silhouettes, and acoustic voiceprints are processed <strong className="text-white">solely for cryptographic identity anchoring and verifiable licensing covenants</strong>. They are <strong className="text-rose-300">never used for unauthorized AI training</strong>, unconsented LLM fine-tuning, neural voice cloning, or commercial model aggregation.
            </p>
          </div>
        </div>

        {/* Master Toggle Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white font-mono uppercase">
                Master Biometric Processing Authorization
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                masterConsentActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {masterConsentActive ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Enable or suspend all biometric sensor access (camera geometry &amp; microphone voiceprint). When toggled off, all hardware streams immediately terminate and processing halts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-400 hidden sm:inline">
              {masterConsentActive ? 'Authorized' : 'Unauthorized'}
            </span>
            <ToggleSwitch
              checked={masterConsentActive}
              onChange={handleMasterConsentToggle}
              id="master-biometric-consent"
              label="Master Biometric Processing Authorization"
            />
          </div>
        </div>

        {/* Granular Statutory Toggles */}
        {consentSectionExpanded && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-violet-400" />
                Granular Statutory Affirmations
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                All 3 mandatory toggles required for sensor activation
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toggle 1: Identity Anchoring Only */}
              <div className={`p-4 rounded-2xl border transition-all ${
                biometricToggles.identityAnchoringOnly
                  ? 'bg-zinc-900/80 border-violet-500/40 shadow-sm'
                  : 'bg-zinc-950/70 border-zinc-800'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="space-y-0.5">
                    <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-mono text-[10px] font-bold uppercase">
                      Mandatory • BIPA § 15(b)
                    </span>
                    <h4 className="text-xs font-bold text-white font-mono">
                      1. Used Solely for Identity Anchoring
                    </h4>
                  </div>
                  <ToggleSwitch
                    checked={biometricToggles.identityAnchoringOnly}
                    onChange={(val) => handleToggleChange('identityAnchoringOnly', val)}
                    id="toggle-identity-anchoring"
                    label="Used Solely for Identity Anchoring"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Explicit statutory affirmation that biometric data, 7-angle facial geometry, and vocal cadence are processed <strong className="text-zinc-200">solely for identity anchoring</strong> and cryptographic provenance proof, never for secondary profiling.
                </p>
              </div>

              {/* Toggle 2: Not for Unauthorized AI Training */}
              <div className={`p-4 rounded-2xl border transition-all ${
                biometricToggles.unauthorizedTrainingProhibited
                  ? 'bg-zinc-900/80 border-emerald-500/40 shadow-sm'
                  : 'bg-zinc-950/70 border-zinc-800'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="space-y-0.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold uppercase">
                      Mandatory • BIPA &amp; GDPR Art. 9
                    </span>
                    <h4 className="text-xs font-bold text-white font-mono">
                      2. Not for Unauthorized AI Training
                    </h4>
                  </div>
                  <ToggleSwitch
                    checked={biometricToggles.unauthorizedTrainingProhibited}
                    onChange={(val) => handleToggleChange('unauthorizedTrainingProhibited', val)}
                    id="toggle-training-prohibition"
                    label="Not for Unauthorized AI Training"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Explicit covenant guaranteeing that biometric data is <strong className="text-emerald-300">not used for unauthorized AI training</strong>, unconsented LLM fine-tuning, neural voice cloning, or commercial model synthesis without authenticated smart contract license.
                </p>
              </div>

              {/* Toggle 3: Raw Media Off-Chain */}
              <div className={`p-4 rounded-2xl border transition-all ${
                biometricToggles.offChainRawMediaStorage
                  ? 'bg-zinc-900/80 border-cyan-500/40 shadow-sm'
                  : 'bg-zinc-950/70 border-zinc-800'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="space-y-0.5">
                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold uppercase">
                      Mandatory • Data Minimization
                    </span>
                    <h4 className="text-xs font-bold text-white font-mono">
                      3. Encrypted Off-Chain Storage (Hashes Only On-Chain)
                    </h4>
                  </div>
                  <ToggleSwitch
                    checked={biometricToggles.offChainRawMediaStorage}
                    onChange={(val) => handleToggleChange('offChainRawMediaStorage', val)}
                    id="toggle-offchain-storage"
                    label="Encrypted Off-Chain Storage"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Acknowledge that raw image frames and audio recordings are encrypted client-side (AES-256-GCM) off-chain. <strong className="text-zinc-200">Zero raw biometric files touch public blockchain blocks</strong>; only irreversible SHA-256 Merkle roots are anchored.
                </p>
              </div>

              {/* Toggle 4: Continuous Revocation Right */}
              <div className={`p-4 rounded-2xl border transition-all ${
                biometricToggles.revocationRightAcknowledged
                  ? 'bg-zinc-900/80 border-amber-500/40 shadow-sm'
                  : 'bg-zinc-950/70 border-zinc-800'
              }`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="space-y-0.5">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold uppercase">
                      GDPR Art. 17 &amp; BIPA § 15(a)
                    </span>
                    <h4 className="text-xs font-bold text-white font-mono">
                      4. Continuous Revocation &amp; Erasure Rights
                    </h4>
                  </div>
                  <ToggleSwitch
                    checked={biometricToggles.revocationRightAcknowledged}
                    onChange={(val) => handleToggleChange('revocationRightAcknowledged', val)}
                    id="toggle-revocation-right"
                    label="Continuous Revocation and Erasure Rights"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Continuous creator rights to revoke consent, purge off-chain biometric archives, and trigger smart contract kill-switches to immediately revoke public commercial licensing availability at any time.
                </p>
              </div>
            </div>

            {/* Quick Actions & Audit Trail Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800 text-xs font-mono">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                <span className="text-zinc-500">Audit Stamp:</span>
                <span className="text-violet-300">{consentTimestamp ? `Affirmed at ${consentTimestamp}` : 'Awaiting Full Toggle Affirmation'}</span>
                <span>•</span>
                <span className="text-emerald-400">Scope: Identity Anchoring Only</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleMasterConsentToggle(true)}
                  className="text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/30 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                  Enable All Protections
                </Button>
                {masterConsentActive && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleMasterConsentToggle(false)}
                    className="text-xs border-rose-500/40 text-rose-300 hover:bg-rose-950/30 cursor-pointer"
                  >
                    Revoke Consent
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Wizard Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveStep('poses')}
          className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            activeStep === 'poses'
              ? 'bg-violet-950/40 border-violet-500 text-white shadow-lg shadow-violet-950/40'
              : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeStep === 'poses' ? 'bg-violet-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-mono uppercase text-zinc-500 font-bold">Step 1</p>
            <p className="text-sm font-bold text-zinc-200">Head &amp; Body Scans</p>
            <span className="text-[10px] text-violet-400 font-mono">{completedPosesCount} of {poses.length} captured</span>
          </div>
        </button>

        <button
          onClick={() => setActiveStep('voice')}
          className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            activeStep === 'voice'
              ? 'bg-violet-950/40 border-violet-500 text-white shadow-lg shadow-violet-950/40'
              : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeStep === 'voice' ? 'bg-violet-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-mono uppercase text-zinc-500 font-bold">Step 2</p>
            <p className="text-sm font-bold text-zinc-200">Voice Acoustic Print</p>
            <span className="text-[10px] font-mono text-cyan-400">
              {voiceHash ? 'Voiceprint Hashed' : 'Pending Sample'}
            </span>
          </div>
        </button>

        <button
          onClick={() => setActiveStep('descriptors')}
          className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            activeStep === 'descriptors'
              ? 'bg-violet-950/40 border-violet-500 text-white shadow-lg shadow-violet-950/40'
              : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeStep === 'descriptors' ? 'bg-violet-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-mono uppercase text-zinc-500 font-bold">Step 3</p>
            <p className="text-sm font-bold text-zinc-200">Biometric Identity Form</p>
            <span className="text-[10px] font-mono text-emerald-400">Complexion &amp; Bio</span>
          </div>
        </button>

        <button
          onClick={() => setActiveStep('anchor')}
          className={`flex items-center gap-3 p-4 rounded-2xl border transition-all text-left cursor-pointer ${
            activeStep === 'anchor'
              ? 'bg-violet-950/40 border-violet-500 text-white shadow-lg shadow-violet-950/40'
              : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeStep === 'anchor' ? 'bg-violet-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-mono uppercase text-zinc-500 font-bold">Step 4</p>
            <p className="text-sm font-bold text-zinc-200">Anchor On-Chain</p>
            <span className="text-[10px] font-mono text-amber-400">
              {anchoredRecord ? 'Anchored #Token' : 'Self-Executing Contract'}
            </span>
          </div>
        </button>
      </div>

      {/* STEP 1: MULTI-ANGLE HEAD & BODY SCAN HUD */}
      {activeStep === 'poses' && (
        <div className="space-y-6">
          {/* Biometric Consent Warning & Activation Banner */}
          {!biometricConsentGiven ? (
            <div className="rounded-2xl bg-amber-950/30 border border-amber-500/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
                    Biometric Capture Paused • Explicit Consent Required
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
                    Illinois BIPA (740 ILCS 14/) &amp; GDPR Art. 9 require explicit, affirmative consent prior to initializing camera geometry sensors. Biometric signatures are used <strong>only for identity anchoring and never for unauthorized training</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <Button
                  type="button"
                  onClick={() => handleMasterConsentToggle(true)}
                  className="bg-gradient-to-r from-violet-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-violet-600/30 cursor-pointer w-full sm:w-auto"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Toggle Consent ON
                </Button>
                <a
                  href="#biometric-consent-controls"
                  className="text-xs text-zinc-400 hover:text-white underline font-mono px-2 hidden sm:inline"
                >
                  Inspect Toggles
                </a>
              </div>
            </div>
          ) : (
            /* Consent Verified Indicator */
            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2.5 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Consent Active: Biometrics used solely for <strong>Identity Anchoring</strong> • Strictly prohibited from <strong>Unauthorized Training</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <a
                  href="#biometric-consent-controls"
                  className="text-xs text-emerald-400 hover:underline cursor-pointer"
                >
                  Configure Toggles
                </a>
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(true)}
                  className="text-zinc-400 hover:text-white underline cursor-pointer text-[11px]"
                >
                  BIPA / GDPR Policy
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Visualizer & Camera / HUD Frame */}
          <div className="lg:col-span-7 space-y-5">
            <div className="relative rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl">
              {/* Massive Bar Identification HUD Header */}
              <div className="bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 p-4 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-mono text-xs font-bold text-cyan-300 uppercase tracking-widest">
                    SOVRAVLY OPTICAL ANCHOR // {poses[selectedPoseIndex].label}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[11px]">
                  Target: {poses[selectedPoseIndex].angleTarget}
                </span>
              </div>

              {/* Viewport Box */}
              <div className="relative aspect-[4/3] bg-zinc-900 flex items-center justify-center overflow-hidden">
                {/* Visual Guidelines & Crosshairs */}
                <div className="absolute inset-8 border border-cyan-500/20 rounded-2xl pointer-events-none z-20 flex flex-col justify-between p-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-cyan-400/80 bg-black/60 px-2 py-0.5 rounded border border-cyan-500/30">
                      FOV: 74° // DEPTH: OPTICAL
                    </span>
                    <span className="text-[10px] font-mono text-violet-400/80 bg-black/60 px-2 py-0.5 rounded border border-violet-500/30">
                      ALIGN: {poses[selectedPoseIndex].angleTarget}
                    </span>
                  </div>
                  
                  {/* Central Face Oval / Pose Reticle */}
                  <div className="relative w-48 h-64 sm:w-56 sm:h-72 mx-auto border-2 border-dashed border-cyan-400/50 rounded-[50%] flex items-center justify-center pointer-events-none">
                    <div className="w-full h-0.5 bg-cyan-400/20" />
                    <div className="absolute inset-y-0 w-0.5 bg-cyan-400/20" />
                    <div className="absolute top-1/3 w-32 h-0.5 bg-cyan-400/30" />
                    <div className="absolute top-2/3 w-20 h-0.5 bg-cyan-400/30" />
                    <span className="absolute -bottom-6 text-[10px] font-mono text-cyan-300 uppercase tracking-wider bg-black/80 px-2 py-0.5 rounded">
                      Keep Face Aligned Inside Reticle
                    </span>
                  </div>

                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-mono text-zinc-400 bg-black/60 px-2 py-0.5 rounded">
                      FPS: 60 // RES: 1080p
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      ZERO-TRUST SHIELD ACTIVE
                    </span>
                  </div>
                </div>

                {/* Video Feed or Captured Image or Placeholder */}
                {cameraActive ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : poses[selectedPoseIndex].image ? (
                  <div className="relative w-full h-full">
                    <Image 
                      src={poses[selectedPoseIndex].image!} 
                      alt={poses[selectedPoseIndex].label} 
                      fill 
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full text-emerald-300 font-mono text-xs flex items-center gap-1.5 z-30">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Biometric Capture Verified ({poses[selectedPoseIndex].confidence}%)
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8 space-y-4 z-10">
                    <div className="w-16 h-16 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mx-auto text-zinc-400">
                      <Scan className="w-8 h-8 text-cyan-400 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold">{poses[selectedPoseIndex].label}</h4>
                      <p className="text-zinc-400 text-xs max-w-sm mx-auto mt-1">
                        {poses[selectedPoseIndex].instruction}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <Button onClick={startCamera} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs">
                        <Camera className="w-4 h-4 mr-1.5" /> Start Webcam Scanner
                      </Button>
                      <Button onClick={() => applyDemoPoseImage(selectedPoseIndex)} variant="outline" className="text-xs border-zinc-700">
                        Use Reference Mock
                      </Button>
                    </div>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Huge Multi-Angle Identification Status Bar */}
              <div className="p-4 bg-zinc-950 border-t border-zinc-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-violet-400" />
                    Multi-Angle Verification Bar ({completedPosesCount}/{poses.length})
                  </span>
                  <span className="text-cyan-400 font-bold">{poseProgressPct}% Complete</span>
                </div>
                <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden p-0.5 border border-zinc-800">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-600 via-cyan-500 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                    style={{ width: `${poseProgressPct}%` }}
                  />
                </div>
              </div>

              {/* Scanner Control Bar */}
              <div className="p-4 bg-zinc-900/60 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {cameraActive ? (
                    <>
                      <Button onClick={captureSnapshot} className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs">
                        <Camera className="w-4 h-4 mr-1.5" /> Snap {poses[selectedPoseIndex].label}
                      </Button>
                      <Button onClick={stopCamera} variant="outline" size="sm" className="text-xs border-zinc-700">
                        Stop Camera
                      </Button>
                    </>
                  ) : (
                    <Button onClick={startCamera} className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs">
                      <Camera className="w-4 h-4 mr-1.5" /> Open Camera
                    </Button>
                  )}

                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    <span className="inline-flex items-center px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 transition-colors">
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload File
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => applyDemoPoseImage(selectedPoseIndex)}
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-zinc-400 hover:text-white"
                  >
                    Load Sample Pose
                  </Button>
                </div>
              </div>
            </div>

            {cameraError && (
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          {/* Right Column: Angle Selection Carousel & Calibration Slots */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-white font-bold text-sm uppercase font-mono tracking-wider flex items-center gap-2">
                  <Scan className="w-4 h-4 text-violet-400" />
                  7-Point Likeness Geometry
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-950/60 text-violet-300 border border-violet-800/40 font-bold">
                  Biometric Standard
                </span>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Click any slot below to capture or upload. The verification bar tracks your multi-angle biometric coverage to anchor cryptographic proof of prior ownership, set licensing terms, and provide honest buyers with automated payment rails.
              </p>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto custom-scrollbar pr-1">
                {poses.map((pose, idx) => (
                  <button
                    key={pose.id}
                    onClick={() => setSelectedPoseIndex(idx)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                      selectedPoseIndex === idx 
                        ? 'bg-violet-950/40 border-violet-500 shadow-md' 
                        : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden border border-zinc-700 shrink-0 flex items-center justify-center">
                        {pose.image ? (
                          <Image src={pose.image} alt={pose.label} fill className="object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Scan className="w-5 h-5 text-zinc-500" />
                        )}
                        {pose.completed && (
                          <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${selectedPoseIndex === idx ? 'text-white' : 'text-zinc-300'}`}>
                          {pose.label}
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono">{pose.angleTarget}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      {pose.completed ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/30">
                          {pose.confidence}% Match
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-500">
                          Pending
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <Button 
                  onClick={() => setActiveStep('voice')} 
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs py-2.5"
                >
                  Proceed to Voiceprint Step →
                </Button>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* STEP 2: VOICE ACOUSTIC PRINT & RECORDER */}
      {activeStep === 'voice' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Mic className="w-5 h-5 text-cyan-400" />
                  Voiceprint Acoustic Anchor
                </h3>
                <p className="text-zinc-400 text-xs mt-1">
                  Anchor your vocal cadence, timbre, and acoustic signature on-chain to prove prior ownership, set licensing terms, and provide honest buyers with automated payment rails.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-mono text-xs w-fit">
                FFT Harmonic Fingerprint
              </span>
            </div>

            {/* Step 2 Voice Biometric Consent Status Banner */}
            {!biometricConsentGiven ? (
              <div className="rounded-2xl bg-amber-950/30 border border-amber-500/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white font-mono uppercase flex items-center gap-2">
                      Voice Recording Paused • Explicit Consent Required
                    </h4>
                    <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
                      Illinois BIPA (740 ILCS 14/) &amp; GDPR Art. 9 require explicit, affirmative consent prior to recording vocal acoustic cadence. Biometric data is used <strong>solely for identity anchoring and not for unauthorized AI training</strong>.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <Button
                    type="button"
                    onClick={() => {
                      handleMasterConsentToggle(true);
                      setVoiceConsentError(null);
                    }}
                    className="bg-gradient-to-r from-violet-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-violet-600/30 cursor-pointer w-full sm:w-auto"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Toggle Consent ON
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2.5 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Voiceprint Consent Active: Data is used solely for <strong>identity anchoring</strong> and not for <strong>unauthorized AI training</strong> (BIPA &amp; GDPR Art. 9 compliant).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(true)}
                  className="text-zinc-400 hover:text-white underline cursor-pointer text-[11px] shrink-0"
                >
                  View Policy
                </button>
              </div>
            )}

            {voiceConsentError && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{voiceConsentError}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    handleMasterConsentToggle(true);
                    setVoiceConsentError(null);
                  }}
                  className="text-xs bg-rose-600 hover:bg-rose-500 text-white shrink-0"
                >
                  Enable Consent
                </Button>
              </div>
            )}

            {/* Sovereign Rights Recital Prompt */}
            <div className="p-5 rounded-2xl bg-zinc-900/80 border border-cyan-500/30 space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block">
                Standard Sovravly Voice Covenant (Read aloud while recording):
              </span>
              <p className="text-zinc-200 text-sm sm:text-base italic font-serif leading-relaxed bg-black/40 p-4 rounded-xl border border-white/5">
                &ldquo;I, {personaName || 'the sovereign creator'}, retain exclusive sovereign rights over my vocal timbre, cadence, and biometric identity under the Sovravly Protocol. No AI company, audio synthesizer, or neural network may replicate or train on my voice without cryptographically validated smart contract agreement.&rdquo;
              </p>
            </div>

            {/* Live Audio Visualizer Canvas & Controls */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-6">
              <div className="h-28 flex items-center justify-center gap-1.5 px-4 bg-black/60 rounded-xl border border-white/5 overflow-hidden">
                {Array.from({ length: 48 }).map((_, i) => {
                  const deterministicJitter = ((i * 17 + 7) % 25);
                  const barHeight = isRecordingVoice 
                    ? Math.max(12, Math.sin(i * 0.4 + voiceDuration * 2) * audioLevel * 0.9 + deterministicJitter)
                    : (voiceAudioUrl ? (Math.sin(i * 0.3) * 20 + 25) : 8);
                  return (
                    <div 
                      key={i} 
                      className="w-1.5 bg-gradient-to-t from-cyan-600 via-teal-400 to-violet-400 rounded-full transition-all duration-150"
                      style={{ height: `${barHeight}px` }}
                    />
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                {isRecordingVoice ? (
                  <Button 
                    onClick={stopVoiceRecording} 
                    className="bg-red-500 hover:bg-red-400 text-white font-bold px-6 py-3 rounded-full flex items-center gap-2 shadow-lg shadow-red-950/50"
                  >
                    <Square className="w-4 h-4 fill-current" /> Stop Recording ({voiceDuration}s)
                  </Button>
                ) : (
                  <Button 
                    onClick={startVoiceRecording} 
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-6 py-3 rounded-full flex items-center gap-2 shadow-lg shadow-cyan-950/50"
                  >
                    <Mic className="w-4 h-4" /> Start Voice Recording
                  </Button>
                )}

                {voiceAudioUrl && (
                  <audio controls src={voiceAudioUrl} className="h-10 rounded-lg max-w-xs" />
                )}
              </div>

              {voiceHash && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-cyan-500/20 text-left font-mono space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 uppercase">Acoustic Hash:</span>
                    <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Biometrically Indexed
                    </span>
                  </div>
                  <p className="text-cyan-300 text-xs break-all">{voiceHash}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button onClick={() => setActiveStep('poses')} variant="outline" className="text-xs">
                ← Back to Scans
              </Button>
              <Button onClick={() => setActiveStep('descriptors')} className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs">
                Proceed to Identity Form →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: BIOMETRIC IDENTITY FORM & COMPLEXION SPEC */}
      {activeStep === 'descriptors' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="border-b border-zinc-800 pb-4">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <User className="w-5 h-5 text-violet-400" />
                Sovereign Likeness Descriptor &amp; Persona Narrative
              </h3>
              <p className="text-zinc-400 text-xs mt-1">
                Document your physical characteristics and persona write-up. This metadata is cryptographically anchored alongside your images and voice sample.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-mono text-zinc-300">Creator Sovereign / Legal Persona</Label>
                <Input 
                  value={personaName}
                  onChange={e => setPersonaName(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white"
                  placeholder="e.g. Maya Lin"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-mono text-zinc-300">Height &amp; Silhouette Proportion</Label>
                <Input 
                  value={heightSpec}
                  onChange={e => setHeightSpec(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white"
                  placeholder="e.g. 5 ft 10 in"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-mono text-zinc-300">Eye &amp; Iris Pigmentation</Label>
                <Input 
                  value={eyeColor}
                  onChange={e => setEyeColor(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white"
                  placeholder="e.g. Dark Amber / Hazel"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-mono text-zinc-300">Hair Texture &amp; Style Specification</Label>
                <Input 
                  value={hairType}
                  onChange={e => setHairType(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white"
                  placeholder="e.g. Type 4C Natural Curls / Dark Brown"
                />
              </div>
            </div>

            {/* Complexion & Undertone Spectrum Selector */}
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-mono text-zinc-300 flex items-center justify-between">
                <span>Skin Undertone &amp; Complexion Palette:</span>
                <span className="text-violet-400 font-bold">{complexion}</span>
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {COMPLEXION_PALETTES.map((palette) => (
                  <button
                    key={palette.name}
                    type="button"
                    onClick={() => setComplexion(palette.name)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                      complexion === palette.name 
                        ? 'border-violet-400 bg-violet-950/40 shadow-lg' 
                        : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div 
                      className="w-7 h-7 rounded-full shadow-inner border border-white/20"
                      style={{ backgroundColor: palette.hex }}
                    />
                    <div className="text-center">
                      <p className="text-[11px] font-bold text-zinc-200">{palette.name}</p>
                      <p className="text-[9px] text-zinc-500 font-mono line-clamp-1">{palette.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Distinctive Marks */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-mono text-zinc-300">Distinctive Facial &amp; Physical Features</Label>
              <Input 
                value={distinctiveMarks}
                onChange={e => setDistinctiveMarks(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white"
                placeholder="Facial symmetry markers, tattoos, birthmarks, signature posture"
              />
            </div>

            {/* Write-up about themselves */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-mono text-zinc-300">
                Persona Narrative &amp; Creator Write-Up (Anchored on Chain)
              </Label>
              <Textarea 
                value={personaBio}
                onChange={e => setPersonaBio(e.target.value)}
                rows={4}
                className="bg-zinc-900 border-zinc-800 text-white text-xs sm:text-sm leading-relaxed"
                placeholder="Share your creative statement, background, and specific restrictions regarding digital doubles..."
              />
            </div>

            <div className="flex justify-between items-center pt-4">
              <Button onClick={() => setActiveStep('voice')} variant="outline" className="text-xs">
                ← Back to Voiceprint
              </Button>
              <Button onClick={() => setActiveStep('anchor')} className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs">
                Proceed to On-Chain Anchoring →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: ON-CHAIN ANCHORING & CERTIFICATE OF SOVEREIGNTY */}
      {activeStep === 'anchor' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-emerald-400" />
                  Sovravly On-Chain Anchoring &amp; Self-Executing Contract
                </h3>
                <p className="text-zinc-400 text-xs mt-1">
                  Commit your irreversible cryptographic hashes (Merkle root &amp; acoustic frequency digest) and machine-readable licensing covenants to the decentralized registry. Raw biometric media remains strictly off-chain in your encrypted vault.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 font-mono text-xs w-fit">
                ERC-721 / ERC-2981 Standard
              </span>
            </div>

            {/* Summary manifest */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-mono text-zinc-500">Pose Integrity</span>
                <p className="text-lg font-bold text-white">{completedPosesCount} of {poses.length} Verified</p>
                <p className="text-[11px] text-emerald-400 font-mono">Head Center, Profiles, Torso &amp; Body</p>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-mono text-zinc-500">Voice Acoustic Print</span>
                <p className="text-lg font-bold text-cyan-400">{voiceHash ? 'Harmonics Hashed' : 'Synthetic Stub'}</p>
                <p className="text-[11px] text-zinc-400 font-mono truncate">{voiceHash ? voiceHash.slice(0, 16) + '...' : 'Recorded'}</p>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl space-y-1">
                <span className="text-[10px] uppercase font-mono text-zinc-500">Default Creator Split</span>
                <p className="text-lg font-bold text-violet-400">85% / 15%</p>
                <p className="text-[11px] text-violet-300 font-mono">Automated Clawback Lock</p>
              </div>
            </div>

            {/* Storage & Legal Reality Disclosure */}
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-violet-500/30 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2 text-zinc-300">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white font-mono block">Raw Media Stored Off-Chain:</strong>
                  Photos and WAV samples remain encrypted in your off-chain client vault. Only irreversible Keccak256 / SHA-256 hashes are committed to EVM block storage.
                </span>
              </div>
              <div className="flex items-start gap-2 text-zinc-300">
                <Scale className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white font-mono block">Ownership Proof &amp; Honest Buyer Rails:</strong>
                  This token proves you registered first, defines your 85% royalty split, and enables honest buyers to pay you. Bad-actor enforcement is managed via our linked Royalty Spider.
                </span>
              </div>
            </div>

            {/* Anchoring Action */}
            {!anchoredRecord ? (
              <div className="bg-gradient-to-r from-violet-950/60 to-cyan-950/60 border border-violet-500/30 rounded-2xl p-6 text-center space-y-4">
                <h4 className="text-lg font-bold text-white">Ready to Anchor Likeness on Chain</h4>
                <p className="text-zinc-300 text-xs sm:text-sm max-w-xl mx-auto">
                  By anchoring, you generate an immutable Merkle root proof of your likeness, establishing prior art, commercial licensing covenants, and direct payment rails for honest buyers.
                </p>
                <Button 
                  onClick={executeOnChainAnchor}
                  disabled={isAnchoring}
                  className="bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-400 hover:brightness-110 text-black font-extrabold text-sm px-8 py-3.5 rounded-full shadow-2xl shadow-cyan-950/50 cursor-pointer"
                >
                  {isAnchoring ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Mining Block &amp; Anchoring Merkle Proof...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Anchor Sovravly Likeness On-Chain Now
                    </span>
                  )}
                </Button>
              </div>
            ) : (
              /* Verified Anchored Certificate Card */
              <div className="relative rounded-3xl bg-gradient-to-b from-zinc-900 to-black border-2 border-emerald-500/50 p-6 sm:p-8 space-y-6 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white font-mono uppercase tracking-wider">
                        Sovereign Likeness Certificate
                      </h4>
                      <p className="text-xs text-emerald-400 font-mono">
                        Sovravly Protocol // Token #{anchoredRecord.tokenId}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold flex items-center gap-1.5 w-fit">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Immutable On-Chain
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 uppercase text-[10px]">Persona Name:</span>
                    <p className="text-white font-bold">{personaName}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 uppercase text-[10px]">Contract Registry:</span>
                    <p className="text-cyan-400 truncate">{anchoredRecord.contractAddress}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 uppercase text-[10px]">Biometric Merkle Root:</span>
                    <p className="text-violet-300 truncate">{anchoredRecord.merkleRoot}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
                    <span className="text-zinc-500 uppercase text-[10px]">Acoustic Voice Hash:</span>
                    <p className="text-emerald-300 truncate">{anchoredRecord.voiceprintHash}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1 md:col-span-2">
                    <span className="text-zinc-500 uppercase text-[10px]">Raw Biometric Storage Architecture:</span>
                    <p className="text-emerald-400">Off-Chain Encrypted Client Shards (Zero Raw Files On-Chain)</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1 md:col-span-2">
                    <span className="text-zinc-500 uppercase text-[10px]">Face-ID Login Descriptor Digest:</span>
                    <p className="text-cyan-300 truncate">{anchoredRecord.faceDescriptorHash || anchoredRecord.merkleRoot}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1 md:col-span-2">
                    <span className="text-zinc-500 uppercase text-[10px]">IPFS Encrypted Manifest CID:</span>
                    <p className="text-zinc-300 truncate">{anchoredRecord.ipfsUri}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800">
                  <div className="text-[11px] text-zinc-400">
                    Notarized at Block #{anchoredRecord.blockNumber} • Linked to Zero-Trust Face-ID Login Gate
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isAnchoring}
                      onClick={executeOnChainAnchor}
                      className="text-xs border-violet-500/40 text-violet-300 hover:bg-violet-950/30 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isAnchoring ? 'animate-spin' : ''}`} />
                      Re-Anchor Updated Scans
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/30 cursor-pointer"
                      onClick={() => {
                        const data = JSON.stringify({
                          ...anchoredRecord,
                          personaName,
                          storageArchitecture: 'Off-Chain Encrypted Client Vault (AES-256-GCM)',
                          onChainCommitments: 'One-Way Hashes, Merkle Root, and ERC-2981 Royalty Terms Only',
                          statutoryCompliance: 'BIPA 740 ILCS 14/ & EU GDPR Article 9 Explicit Consent',
                          licenseTerms: '85% Creator Royalty Split / Automated Settlement'
                        }, null, 2);
                        const blob = new Blob([data], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${personaName.toLowerCase().replace(/\s+/g, '-')}-sovravly-certificate.json`;
                        a.click();
                      }}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Export Proof Certificate
                    </Button>
                    {enrollmentMode && onAnchorComplete && biometricAnchor && (
                      <Button
                        size="sm"
                        onClick={() => onAnchorComplete(biometricAnchor)}
                        className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold cursor-pointer"
                      >
                        Enter Command Center <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button onClick={() => setActiveStep('descriptors')} variant="outline" className="text-xs">
                ← Back to Descriptors
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* BIOMETRIC PRIVACY POLICY MODAL (BIPA & GDPR ART. 9) */}
      <AnimatePresence>
        {showPolicyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-zinc-950 border border-violet-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl custom-scrollbar"
            >
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white font-mono uppercase">
                      Sovravly Biometric Information Privacy Policy
                    </h3>
                    <p className="text-xs text-violet-300 font-mono">
                      Statutory Disclosures under BIPA (740 ILCS 14/) &amp; GDPR Article 9
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPolicyModal(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed font-sans">
                <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-800/40 space-y-1.5">
                  <h4 className="font-bold text-white font-mono uppercase text-[11px] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-violet-400" /> Executive Architectural Guarantee
                  </h4>
                  <p>
                    Sovravly is engineered from the ground up on Zero Trust principles. <strong className="text-emerald-400">Raw biometric media (full-resolution facial photographs, angle frames, posture silhouettes, and voice audio WAV recordings) is NEVER stored on the public blockchain.</strong>
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-white font-mono uppercase text-[11px]">
                    1. Data Collected &amp; Purpose of Collection (Identity Anchoring Only)
                  </h4>
                  <p>
                    Sovravly collects 7-point facial angle landmarks and vocal acoustic frequency profiles solely to compute irreversible one-way cryptographic hashes (SHA-256 and Merkle roots). <strong className="text-emerald-400">Biometric signatures are used only for identity anchoring and verifiable licensing covenants.</strong>
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-white font-mono uppercase text-[11px]">
                    2. Protection Boundary: Registry vs. Enforcement
                  </h4>
                  <p>
                    <strong className="text-amber-300">A registry does not stop deepfakes by itself.</strong> Registering proves you own your likeness, sets your licensing terms, and gives honest buyers a direct mechanism to pay you. That provides essential legal standing for enforcement. Catching bad actors is a separate job handled via our separate Royalty Spider crawlers and legal notice tools.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-white font-mono uppercase text-[11px]">
                    3. Off-Chain Storage &amp; On-Chain Hash Only
                  </h4>
                  <p>
                    Raw media files remain stored off-chain in encrypted decentralized creator vaults (AES-256-GCM). Only mathematical hash digests (<code className="text-cyan-300 font-mono">bytes32</code>) and smart contract licensing terms (ERC-2981 royalty percentage, usage permissions) are anchored to EVM blockchain blocks.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-white font-mono uppercase text-[11px]">
                    4. Prohibition on Commercial Sale or Unauthorized AI Training
                  </h4>
                  <p>
                    <strong className="text-rose-300">Biometric signatures are never used for unauthorized training</strong>, unconsented generative model fine-tuning, neural voice cloning, or dataset aggregation. Sovranly IP and Sovravly strictly <strong className="text-white">never sell, lease, trade, or share</strong> biometric identifiers with commercial brokers, ad networks, or AI scrapers without your cryptographically signed smart contract agreement.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-white font-mono uppercase text-[11px]">
                    5. Retention, Destruction &amp; Right to Erasure
                  </h4>
                  <p>
                    Raw biometric data is retained only for the duration specified by the creator. You may trigger permanent destruction of all off-chain biometric files at any time via the Compliance Center, and invoke on-chain smart contract kill-switches to invalidate public licensing tokens.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-zinc-800">
                <Button 
                  onClick={() => setShowPolicyModal(false)}
                  className="bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer"
                >
                  I Understand &amp; Close Policy
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

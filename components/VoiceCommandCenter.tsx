'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Sparkles, 
  CornerDownLeft, 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Radio,
  X,
  ShieldAlert
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import BiometricConsentModal from '@/components/BiometricConsentModal';
import { Button } from '@/components/ui/button';

interface VoiceCommandCenterProps {
  onNavigate?: (pageId: number) => void;
  className?: string;
  compact?: boolean;
}

export default function VoiceCommandCenter({ onNavigate, className = '', compact = false }: VoiceCommandCenterProps) {
  const { theme, toggleTheme, setTheme } = useTheme();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [statusMessage, setStatusMessage] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Ready for voice command';
    const hasSpeech = Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    return hasSpeech ? 'Ready for voice command' : 'Voice recognition not supported';
  });
  const [lastExecuted, setLastExecuted] = useState<{ action: string; time: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  });
  const [showCheatsheet, setShowCheatsheet] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>('');

  // Biometric Consent State
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false);
  const [hasVoiceConsent, setHasVoiceConsent] = useState(false);

  const recognitionRef = useRef<any>(null);
  const executionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processVoiceCommand = useCallback((rawText: string) => {
    const text = rawText.toLowerCase().trim();
    if (!text) return;

    // Navigation Mapping (Simplified for reconstruction)
    const commands: any = {
      profile: { action: 'User Profile', execute: () => onNavigate?.(1) },
      assets: { action: 'Asset Management', execute: () => onNavigate?.(2) },
      analytics: { action: 'Economics', execute: () => onNavigate?.(3) },
      licensing: { action: 'Licensing', execute: () => onNavigate?.(4) },
      help: { action: 'Help', execute: () => setShowCheatsheet(true) },
    };

    let matched: any = null;
    if (text.includes('profile')) matched = commands.profile;
    else if (text.includes('asset') || text.includes('media')) matched = commands.assets;
    else if (text.includes('analytic') || text.includes('revenue')) matched = commands.analytics;
    else if (text.includes('license') || text.includes('agreement')) matched = commands.licensing;
    else if (text.includes('help')) matched = commands.help;

    if (matched) {
      const now = new Date().toLocaleTimeString();
      setLastExecuted({ action: matched.action, time: now });
      setStatusMessage(`Executing: ${matched.action}`);
      matched.execute();
    } else {
      setStatusMessage(`Command not recognized: "${rawText}"`);
    }
  }, [onNavigate]);

  const toggleMicrophone = useCallback(() => {
    if (!isSupported) {
      setErrorMessage('Speech Recognition not supported.');
      return;
    }

    if (!hasVoiceConsent) {
      setIsConsentModalOpen(true);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setStatusMessage('Microphone standby');
    } else {
      setErrorMessage(null);
      setTranscript('');
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error('Mic start error:', e);
      }
    }
  }, [isListening, isSupported, hasVoiceConsent]);

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setStatusMessage('Listening...');
    };

    recognition.onresult = (event: any) => {
      let currentInterim = '';
      let currentFinal = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) currentFinal += event.results[i][0].transcript;
        else currentInterim += event.results[i][0].transcript;
      }
      setInterimTranscript(currentInterim);
      if (currentFinal) {
        setTranscript(currentFinal);
        processVoiceCommand(currentFinal);
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      setStatusMessage(`Error: ${event.error}`);
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => recognition.abort();
  }, [processVoiceCommand]);

  const handleConsentConfirm = () => {
    setHasVoiceConsent(true);
    setIsConsentModalOpen(false);
    // Auto-start after consent
    setTimeout(() => {
      toggleMicrophone();
    }, 300);
  };

  return (
    <div className={`w-full relative ${className}`}>
      <BiometricConsentModal 
        isOpen={isConsentModalOpen}
        onClose={() => setIsConsentModalOpen(false)}
        onConfirm={handleConsentConfirm}
        featureName="Voice Command Center"
      />

      <div className="bg-zinc-950/90 border border-zinc-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-white">Voice Command Center</h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-[10px] font-mono border ${isListening ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
            {isListening ? 'LISTENING' : 'STANDBY'}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={toggleMicrophone}
            className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-rose-600 hover:bg-rose-500 animate-pulse' : 'bg-cyan-500 hover:bg-cyan-400'}`}
          >
            {isListening ? <Mic className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-black" />}
          </Button>

          <div className="flex-1 bg-black/40 border border-zinc-900 rounded-2xl p-4 min-h-[60px] flex flex-col justify-center">
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Status: {statusMessage}</p>
            <div className="text-sm font-mono">
              {interimTranscript ? (
                <span className="text-cyan-400 italic">"{interimTranscript}..."</span>
              ) : transcript ? (
                <span className="text-white">"{transcript}"</span>
              ) : (
                <span className="text-zinc-600 italic">Say "Open Asset Manager" or "Show Analytics"</span>
              )}
            </div>
          </div>
        </div>

        {!hasVoiceConsent && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-2 text-[10px] text-amber-300 font-mono">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Biometric consent required for microphone access. Click the mic to view terms.</span>
          </div>
        )}
      </div>
    </div>
  );
}

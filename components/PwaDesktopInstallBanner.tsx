'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Laptop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SovranlyLogo } from '@/components/SovranlyLogo';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = 'sovranly-install-dismissed';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const DESKTOP_BREAKPOINT = 1024;
const DISPLAY_DELAY_MS = 20000; // 20 seconds

export default function PwaDesktopInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to test if app is running standalone (already installed)
  const checkIsStandalone = (): boolean => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://')
    );
  };

  // Helper to check if user dismissed within last 30 days
  const isDismissed = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(DISMISS_KEY);
      if (!stored) return false;
      const timestamp = parseInt(stored, 10);
      if (isNaN(timestamp)) {
        return true;
      }
      return Date.now() - timestamp < THIRTY_DAYS_MS;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Check if already installed
    const standalone = checkIsStandalone();
    setIsInstalled(standalone);
    if (standalone) return;

    // 2. Check if screen is wider than 1024px
    const desktopCheck = window.innerWidth > DESKTOP_BREAKPOINT;
    setIsDesktop(desktopCheck);

    // 3. Listen for window resize to hide immediately if resized below desktop
    const handleResize = () => {
      const isWide = window.innerWidth > DESKTOP_BREAKPOINT;
      setIsDesktop(isWide);
      if (!isWide) {
        setShowBanner(false);
      }
    };
    window.addEventListener('resize', handleResize);

    // 4. Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvent;
      setDeferredPrompt(promptEvent);

      // Verify all criteria before initiating the 20-second timer
      if (
        !checkIsStandalone() &&
        window.innerWidth > DESKTOP_BREAKPOINT &&
        !isDismissed()
      ) {
        if (timerRef.current) clearTimeout(timerRef.current);
        
        // Start 20 seconds delay timer
        timerRef.current = setTimeout(() => {
          if (
            deferredPromptRef.current &&
            !checkIsStandalone() &&
            window.innerWidth > DESKTOP_BREAKPOINT &&
            !isDismissed()
          ) {
            setShowBanner(true);
          }
        }, DISPLAY_DELAY_MS);
      }
    };

    // 5. Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      deferredPromptRef.current = null;
      setDeferredPrompt(null);
      if (timerRef.current) clearTimeout(timerRef.current);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    setShowBanner(false);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        deferredPromptRef.current = null;
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn('Install prompt was canceled or failed:', err);
    }
  };

  const handleNotNowClick = () => {
    setShowBanner(false);
    try {
      // Store current timestamp to suppress for 30 days
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch (err) {
      console.warn('Unable to write to localStorage:', err);
    }
  };

  // Guard: Never render on mobile screens, if already installed, or if banner shouldn't show
  if (!showBanner || isInstalled || !isDesktop || !deferredPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      {showBanner && (
        <aside 
          aria-label="PWA Installation Banner"
          className="fixed bottom-6 right-6 z-[9999] hidden min-[1025px]:block max-w-xl animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="bg-zinc-950/95 border border-zinc-800 rounded-2xl p-4 shadow-2xl shadow-cyan-950/30 backdrop-blur-md flex items-center justify-between gap-4 text-zinc-100 ring-1 ring-cyan-500/20">
            {/* Logo / App Icon */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-inner">
                <SovranlyLogo size="sm" />
              </div>
              <div className="text-xs text-zinc-200 leading-snug">
                <span className="font-semibold text-white">
                  Install Sovranly IP as an app for faster access
                </span>
                <span className="text-zinc-400 block text-[11px] mt-0.5">
                  Launch directly from your desktop dock with native Zero Trust speed.
                </span>
              </div>
            </div>

            {/* Actions: [Install] [Not now] and Dismiss 'X' */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleInstallClick}
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs h-8 px-3.5 rounded-lg shadow-md shadow-cyan-950/40 cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install</span>
              </Button>
              <Button
                onClick={handleNotNowClick}
                variant="ghost"
                size="sm"
                className="text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs h-8 px-3 rounded-lg cursor-pointer"
              >
                Not now
              </Button>
              <button
                onClick={handleNotNowClick}
                aria-label="Dismiss banner"
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer ml-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>
      )}
    </AnimatePresence>
  );
}

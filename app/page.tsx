'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, LogOut, X } from 'lucide-react';
import { useAuth } from '@/components/auth/FirebaseProvider';
import FaceIdVerificationGate from '@/components/auth/FaceIdVerificationGate';
import WalletConnect from '@/components/WalletConnect';
import { SovranlyLogo } from '@/components/SovranlyLogo';
import ThemeToggle from '@/components/ThemeToggle';
import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';

type FooterModalType = 'privacy' | 'tos' | 'settings' | null;

export default function LandingSignInPage() {
  const { user, loading, biometricLoading, biometricVerified, signInWithGoogle, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [authenticating, setAuthenticating] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<FooterModalType>(null);
  const [autoEnterConsole, setAutoEnterConsole] = useState(true);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAuto = localStorage.getItem('sovranly_auto_enter');
      if (savedAuto !== null) {
        setAutoEnterConsole(savedAuto === 'true');
      }
      const savedWallet = localStorage.getItem('sovranly_connected_wallet');
      if (savedWallet) {
        setWalletAddress(savedWallet);
      }
    }
  }, []);

  useEffect(() => {
    if (!loading && !biometricLoading && user && biometricVerified && autoEnterConsole) {
      router.replace('/dashboard');
    }
  }, [loading, biometricLoading, user, biometricVerified, autoEnterConsole, router]);

  const handleGoogleSignIn = async () => {
    setAuthenticating(true);
    try {
      await signInWithGoogle();
    } finally {
      setAuthenticating(false);
    }
  };

  const handleWalletConnected = (addr: string) => {
    setWalletAddress(addr);
    if (typeof window !== 'undefined') {
      if (addr) {
        localStorage.setItem('sovranly_connected_wallet', addr);
      } else {
        localStorage.removeItem('sovranly_connected_wallet');
      }
    }
    if (addr && !user && autoEnterConsole) {
      router.push('/dashboard');
    }
  };

  const handleToggleAutoEnter = () => {
    const next = !autoEnterConsole;
    setAutoEnterConsole(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sovranly_auto_enter', String(next));
    }
  };

  const handleClearLocalSession = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sovranly_connected_wallet');
      localStorage.removeItem('sovranly_sandbox_user');
      localStorage.removeItem('sovranly_notifications');
    }
    setWalletAddress(null);
    if (user) {
      await logout();
    }
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 2500);
  };

  const isAuthenticatedAndVerified = Boolean((user && biometricVerified) || (!user && walletAddress));

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      {/* Main Centered Sign-In or Post-Auth Face-ID Verification Surface */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {!loading && user && !biometricVerified ? (
          <FaceIdVerificationGate
            embedded
            onVerified={() => {
              if (autoEnterConsole) {
                router.replace('/dashboard');
              }
            }}
            onOpenVaultEnrollment={() => router.push('/dashboard?page=20&enroll=1')}
          />
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center space-y-8">
            {/* Logo */}
            <div className="flex flex-col items-center space-y-3">
              <SovranlyLogo size="xl" variant="v3" />
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Sovranly IP
              </h1>
            </div>

            {/* Sign-In Controls */}
            {loading ? (
              <div className="py-6 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              </div>
            ) : (
              <div className="w-full space-y-3">
                {/* Google Sign-In */}
                {user ? (
                  <div className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm">
                    <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                      {user.displayName || user.email || 'Signed in with Google'}
                    </span>
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="text-xs text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 inline-flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={authenticating}
                    className="w-full h-12 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-semibold text-sm flex items-center justify-center gap-3 shadow-sm transition-colors cursor-pointer"
                  >
                    {authenticating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                    )}
                    <span>{authenticating ? 'Signing in...' : 'Sign in with Google'}</span>
                  </Button>
                )}

                {/* Wallet Sign-In */}
                <WalletConnect
                  onConnect={handleWalletConnected}
                  buttonLabel="Sign in with Wallet"
                  className="w-full h-12 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white hover:bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-100 font-semibold text-sm flex items-center justify-center gap-2.5 shadow-sm transition-colors cursor-pointer"
                />

                {/* Direct Console Action when verified and auto-redirect is disabled */}
                {isAuthenticatedAndVerified && (
                  <Button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="w-full h-11 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Minimal Footer: Privacy, TOS, Settings, Light Toggle */}
      <footer className="border-t border-zinc-200 dark:border-zinc-900 py-4 px-6">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-600 dark:text-zinc-400">
          <button
            type="button"
            onClick={() => setActiveModal('privacy')}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            Privacy
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('tos')}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            TOS
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('settings')}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer whitespace-nowrap"
          >
            Settings
          </button>
          <ThemeToggle />
        </div>
      </footer>

      {/* Lightweight Modal for Privacy, TOS, and Settings */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6 shadow-xl space-y-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h2 className="text-base font-semibold">
                {activeModal === 'privacy' && 'Privacy Policy'}
                {activeModal === 'tos' && 'Terms of Service'}
                {activeModal === 'settings' && 'Settings'}
              </h2>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close dialog"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeModal === 'privacy' && (
              <div className="space-y-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                <p>
                  Sovranly IP operates on a Zero Trust, non-custodial architecture. Authentication credentials are verified through Firebase Google OAuth and self-custodial Web3 signatures.
                </p>
                <p>
                  We do not sell personal data, scrape private creative assets for AI training, or store private wallet keys on platform servers. Data received from Google APIs adheres strictly to the Google API Services User Data Policy, including Limited Use requirements.
                </p>
                <p>
                  Authenticated users may export or erase their account metadata at any time inside the Compliance Center.
                </p>
              </div>
            )}

            {activeModal === 'tos' && (
              <div className="space-y-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                <p>
                  Sovranly IP provides software-as-a-service (SaaS) intellectual property notarization, licensing agreement tooling, and decentralized vault management.
                </p>
                <p>
                  Creators retain 100% ownership of their intellectual property. On-chain smart contract royalty splits and peer-to-peer settlements execute directly between counterparties without platform custody of funds.
                </p>
                <p>
                  By signing in with Google or connecting a Web3 wallet, you confirm that you have the legal authority to register and license the works managed under your account.
                </p>
              </div>
            )}

            {activeModal === 'settings' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between gap-4 py-2 border-b border-zinc-200 dark:border-zinc-900">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">Appearance</p>
                    <p className="text-zinc-500 dark:text-zinc-400">Select Light, Dark, or System theme</p>
                  </div>
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-900">
                    {(['light', 'dark', 'system'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setTheme(mode)}
                        className={`px-2.5 py-1 rounded-md capitalize font-medium transition-colors cursor-pointer ${
                          theme === mode
                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 py-2 border-b border-zinc-200 dark:border-zinc-900">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">Auto-open Console</p>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      Automatically open the dashboard after signing in
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoEnterConsole}
                    onClick={handleToggleAutoEnter}
                    className={`w-10 h-6 rounded-full transition-colors p-0.5 cursor-pointer ${
                      autoEnterConsole ? 'bg-cyan-600' : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                        autoEnterConsole ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">Reset Session</p>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      Sign out and clear cached wallet state
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearLocalSession}
                    className="rounded-lg text-xs cursor-pointer"
                  >
                    {cacheCleared ? 'Cleared' : 'Clear Session'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
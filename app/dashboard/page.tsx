'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Overview from '@/components/Overview';
import Profile from '@/components/Profile';
import AssetManager from '@/components/AssetManager';
import Analytics from '@/components/Analytics';
import LicensingAgreementBuilder from '@/components/LicensingAgreementBuilder';
import RoyaltySandbox from '@/components/RoyaltySandbox';
import Inbox from '@/components/Inbox';
import GoogleSlidesManager from '@/components/GoogleSlidesManager';
import LaunchPlanner from '@/components/LaunchPlanner';
import TechStackLedger from '@/components/TechStackLedger';
import CloudflareHandshakeDiagnostics from '@/components/CloudflareHandshakeDiagnostics';
import OfficialIpNotices from '@/components/OfficialIpNotices';
import AboutUs from '@/components/AboutUs';
import AiLicensingCenter from '@/components/AiLicensingCenter';
import DataTokenizationHub from '@/components/DataTokenizationHub';
import CreatorNetwork from '@/components/CreatorNetwork';
import Permissions from '@/components/Permissions';
import ComplianceCenter from '@/components/ComplianceCenter';
import SovravlyBiometricsVault from '@/components/SovravlyBiometricsVault';
import RoyaltySpiderAgreementBuilder from '@/components/RoyaltySpiderAgreementBuilder';
import SovranlyAiStudio from '@/components/SovranlyAiStudio';
import MobileBottomNav from '@/components/MobileBottomNav';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/components/auth/FirebaseProvider';
import FaceIdVerificationGate from '@/components/auth/FaceIdVerificationGate';
import { SignIn } from '@/components/auth/SignIn';
import { SovranlyLogo } from '@/components/SovranlyLogo';
import Link from 'next/link';
import { Eye, ArrowRight, ArrowLeft, Lock, LogOut } from 'lucide-react';
import NonCustodialBadge from '@/components/NonCustodialBadge';
import { Button } from '@/components/ui/button';

function DashboardInner() {
  const { user, loading, biometricLoading, biometricVerified, logout } = useAuth();
  const searchParams = useSearchParams();
  const pageParam = searchParams.get('page') || searchParams.get('tab');
  const enrollParam = searchParams.get('enroll');
  const [activePage, setActivePage] = useState<number>(() => {
    if (pageParam !== null) {
      const parsed = parseInt(pageParam, 10);
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return 0;
  });
  const [vaultEnrollmentOpen, setVaultEnrollmentOpen] = useState<boolean>(enrollParam === '1');
  const [currentAccount, setCurrentAccount] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sovranly_connected_wallet');
    }
    return null;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedAssetForLicensing, setSelectedAssetForLicensing] = useState<any>(null);
  const [guestPreview, setGuestPreview] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      return host.includes('run.app') || host.includes('localhost') || host.includes('127.0.0.1');
    }
    return true;
  });

  // Sync active page if URL query parameter changes
  useEffect(() => {
    if (pageParam !== null) {
      const parsed = parseInt(pageParam, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActivePage(parsed);
      }
    }
  }, [pageParam]);

  useEffect(() => {
    if (enrollParam === '1') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVaultEnrollmentOpen(true);
    }
  }, [enrollParam]);

  const walletStatus = currentAccount 
    ? `${currentAccount.slice(0, 6)}...${currentAccount.slice(-4)}` 
    : 'Disconnected';

  if (loading || (user && biometricLoading)) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-[0.2em]">
          Verifying Sovereign Biometric Session...
        </p>
      </div>
    );
  }

  // Zero-Trust Gate: Authenticated Firebase sessions MUST pass Face-ID verification against SovravlyBiometricsVault before full dashboard access
  if (user && !biometricVerified) {
    if (vaultEnrollmentOpen) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
          <header className="h-16 border-b border-zinc-800 px-6 flex items-center justify-between gap-8 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-3 shrink-0">
              <SovranlyLogo size="sm" />
              <span className="font-bold tracking-tight text-white text-sm whitespace-nowrap">
                Sovranly IP
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400 whitespace-nowrap">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Restricted Enrollment Mode · Anchor biometric identity to unlock full dashboard</span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVaultEnrollmentOpen(false)}
                className="h-8 text-xs border-zinc-800 bg-zinc-900 text-zinc-200 hover:text-white cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back to Face-ID Check
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="h-8 text-xs text-zinc-400 hover:text-red-400 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6 sm:p-8 lg:p-10">
            <SovravlyBiometricsVault
              walletAddress={currentAccount}
              enrollmentMode
              onAnchorComplete={() => {
                setVaultEnrollmentOpen(false);
                setActivePage(0);
              }}
            />
          </main>
        </div>
      );
    }

    return (
      <FaceIdVerificationGate
        onOpenVaultEnrollment={() => setVaultEnrollmentOpen(true)}
      />
    );
  }

  if (!user && !guestPreview) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-[140px] pointer-events-none" />

        {/* Minimal Header */}
        <header className="border-b border-white/5 py-6 bg-zinc-950/80 backdrop-blur-md relative z-10">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <SovranlyLogo size="sm" />
              <span className="font-bold tracking-tighter text-white uppercase text-lg group-hover:text-cyan-400 transition-colors">SOVRANLY IP</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider font-extrabold flex items-center gap-2">
                Sign In →
              </Link>
            </div>
          </div>
        </header>

        {/* Public Notice Banner & Instant Demo Explorer for Guests */}
        <div className="relative z-10 max-w-3xl mx-auto px-4 pt-8 space-y-6">
          <div className="p-6 rounded-3xl bg-zinc-900/80 border border-cyan-500/30 text-xs text-zinc-300 space-y-4 backdrop-blur-md shadow-2xl shadow-cyan-950/40">
            <p className="text-sm text-zinc-200 leading-relaxed">
              Sign in with Google or your Web3 Wallet, or preview the Command Center directly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Button 
                onClick={() => setGuestPreview(true)}
                className="w-full py-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                Explore Live Demo
              </Button>
              <Button 
                asChild
                variant="outline"
                className="w-full py-6 rounded-2xl border-zinc-700 bg-zinc-950/80 hover:bg-zinc-800 text-zinc-200 font-semibold text-sm flex items-center justify-center gap-2"
              >
                <Link href="/">
                  Return to Sign-In <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Creator Sign In Portal */}
        <div className="flex-1 flex flex-col items-center justify-center py-8 relative z-10">
          <SignIn />
        </div>

        {/* Footer */}
        <footer className="border-t border-white/5 py-8 flex flex-col items-center justify-center gap-4 text-center text-zinc-600 text-xs">
          <NonCustodialBadge variant="compact" />
          <span className="font-mono text-[10px]">Sovranly IP Continuous Verification Environment</span>
        </footer>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans relative transition-colors">
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        walletStatus={walletStatus} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        <Header 
          pageTitle={
            activePage === 0 ? 'Command Center' :
            activePage === 1 ? 'User Profile' :
            activePage === 2 ? 'Asset Management (Folders & Metadata)' : 
            activePage === 3 ? 'Economics & Analytics' :
            activePage === 4 ? 'Licensing Compacts' :
            activePage === 5 ? 'Royalty Sandbox' :
            activePage === 6 ? 'Creator Inbox' :
            activePage === 7 ? 'Google Slides Gateway' :
            activePage === 8 ? 'Launch Planner' :
            activePage === 9 ? 'Tech Stack Ledger' :
            activePage === 10 ? 'About Platform' :
            activePage === 11 ? 'AI Training Vault' :
            activePage === 12 ? 'Sovereign Tokenizer' :
            activePage === 13 ? 'Creator Network' :
            activePage === 14 ? 'Permissions Hub (Instant Video Rights)' :
            activePage === 15 ? 'Cloudflare Handshake & Tunnel Diagnostics' :
            activePage === 16 ? 'Official IP Communications & Legal Notices' :
            activePage === 17 ? 'Compliance Center (Data Retention & GDPR/CCPA Rights)' :
            activePage === 20 ? 'Sovravly Likeness Vault (Biometric & Identity Anchor)' :
            activePage === 21 ? 'Royalty Spider Engine (Deterministic Agreement Crawler)' :
            activePage === 22 ? 'AI Intelligence Center (SAM AI & Adrienne Grounded)' :
            'Permissions Hub'
          } 
          setWalletAddress={setCurrentAccount} 
          walletAddress={currentAccount} 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {guestPreview && !user && (
          <div className="bg-gradient-to-r from-cyan-950/90 via-zinc-900/90 to-violet-950/90 border-b border-cyan-500/30 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-cyan-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>GUEST PREVIEW ACTIVE — Exploring Sovranly IP without login. All tabs and features are open for inspection.</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setGuestPreview(false)} className="h-7 text-[11px] rounded-lg border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white">
                Exit Preview / Sign In
              </Button>
            </div>
          </div>
        )}



        <main className="flex-1 overflow-auto p-6 sm:p-8 lg:p-10 pb-32 md:pb-12 bg-zinc-950 transition-colors">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              {activePage === 0 && <Overview onNavigate={setActivePage} />}
              {activePage === 1 && <Profile />}
              {activePage === 2 && (
                <AssetManager 
                  walletAddress={currentAccount} 
                  onNavigateToLicensing={(asset) => {
                    setSelectedAssetForLicensing(asset);
                    setActivePage(4);
                  }}
                  onNavigateToPermissions={(asset) => {
                    setSelectedAssetForLicensing(asset);
                    setActivePage(14);
                  }}
                />
              )}
              {activePage === 3 && <Analytics />}
              {activePage === 4 && (
                <LicensingAgreementBuilder 
                  walletAddress={currentAccount} 
                  initialAsset={selectedAssetForLicensing} 
                />
              )}
              {activePage === 5 && <RoyaltySandbox />}
              {activePage === 6 && <Inbox walletAddress={currentAccount} />}
              {activePage === 7 && <GoogleSlidesManager />}
              {activePage === 8 && <LaunchPlanner />}
              {activePage === 9 && <TechStackLedger />}
              {activePage === 10 && <AboutUs />}
              {activePage === 11 && <AiLicensingCenter />}
              {activePage === 12 && <DataTokenizationHub />}
              {activePage === 13 && <CreatorNetwork />}
              {activePage === 14 && (
                <Permissions 
                  initialAsset={selectedAssetForLicensing}
                  walletAddress={currentAccount}
                  onNavigate={setActivePage}
                />
              )}
              {activePage === 15 && <CloudflareHandshakeDiagnostics />}
              {activePage === 16 && <OfficialIpNotices walletAddress={currentAccount} />}
              {activePage === 17 && <ComplianceCenter />}
              {activePage === 18 && (
                <SovranlyAiStudio walletAddress={currentAccount} />
              )}
              {activePage === 20 && (
                <SovravlyBiometricsVault walletAddress={currentAccount} />
              )}
              {activePage === 21 && (
                <RoyaltySpiderAgreementBuilder walletAddress={currentAccount} />
              )}
              {activePage === 22 && (
                <SovranlyAiStudio walletAddress={currentAccount} />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Persistent Non-Custodial Architecture Footer */}
          <footer className="mt-16 pt-8 border-t border-zinc-900 flex flex-col items-center justify-center gap-3 text-center">
            <NonCustodialBadge variant="compact" />
            <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] text-zinc-600 font-mono">
              <span>ZERO CUSTODY PROTOCOL</span>
              <span>•</span>
              <span>NON-INTERMEDIARY ROYALTY SPLITS</span>
            </div>
          </footer>
        </main>



        <MobileBottomNav 
          activePage={activePage} 
          setActivePage={setActivePage} 
          onOpenMenu={() => setSidebarOpen(true)} 
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-zinc-650 font-mono text-[9px] uppercase tracking-[0.25em] animate-pulse">Initializing Sovereign UI Gateway...</p>
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}

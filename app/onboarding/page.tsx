'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OnboardingRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Graceful immediate redirect to the sovereign Command Center
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-12 h-12 bg-zinc-950 border border-cyan-500/40 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-950/40">
        <ShieldCheck className="w-6 h-6 text-cyan-400" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-xl font-bold">Entering Sovereign Command Center</h1>
        <p className="text-xs text-zinc-400">
          The guided tour is currently paused for scheduled updates. Directing you to the live dashboard...
        </p>
      </div>
      <Button asChild className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl px-6 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Gauge className="w-4 h-4" />
          <span>Launch Command Center</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </Button>
    </div>
  );
}

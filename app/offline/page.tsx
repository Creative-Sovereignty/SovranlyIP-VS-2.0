import Link from "next/link";
import { ShieldAlert, RefreshCw, Home, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Offline | Sovranly IP",
  description: "You are currently offline. Check your internet connection.",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-sm space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Offline Mode</h1>
          <p className="text-sm text-zinc-400">
            Sovranly IP requires an active network connection to verify Zero Trust cryptographic proofs and synchronize decentralized vaults.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl"
          >
            <Link href="/" className="flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Connection</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full sm:w-auto border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 text-xs rounded-xl"
          >
            <Link href="/" className="flex items-center justify-center gap-2">
              <Home className="w-3.5 h-3.5" />
              <span>Homepage</span>
            </Link>
          </Button>
        </div>

        <div className="text-[11px] font-mono text-zinc-500 border-t border-zinc-800/80 pt-4">
          Sovranly IP Zero Trust Protocol • Safe-Harbor Provenance
        </div>
      </div>
    </div>
  );
}

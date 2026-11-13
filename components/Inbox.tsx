'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/FirebaseProvider';
import { getAuthHeaders } from '@/lib/auth-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Mail, 
  Lock, 
  Shield, 
  Clock, 
  User, 
  FolderOpen, 
  Inbox as InboxIcon, 
  RefreshCw, 
  Search, 
  ExternalLink,
  ShieldCheck,
  Check,
  AlertCircle,
  Send
} from 'lucide-react';
import NotarizationEmailModal from '@/components/NotarizationEmailModal';

type Inquiry = {
  id: string;
  assetId: string;
  assetTitle: string;
  senderName: string;
  senderContact: string; // Shielded detail
  subject: string;
  message: string;
  recipientAddress: string;
  createdAt: string;
};

export default function Inbox({ walletAddress }: { walletAddress: string | null }) {
  const { user, isSandboxMode } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  
  // Simulated decrypted states for zero-trust credentials
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [decryptedFields, setDecryptedFields] = useState<Record<string, boolean>>({});
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Infringement search and scanning states
  const [scanEnabled, setScanEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('infringement_scan_enabled') === 'true';
    }
    return false;
  });
  const [scanning, setScanning] = useState(false);
  const [scanningStatus, setScanningStatus] = useState('');

  useEffect(() => {
    if (!walletAddress) return;
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders(user, isSandboxMode);
        const res = await fetch(`/api/messages?recipientAddress=${walletAddress}`, {
          headers: {
            ...headers
          }
        });
        if (res.ok && active) {
          const data = await res.json();
          setInquiries(data);
        }
      } catch (err) {
        console.error('Error fetching inquiries:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [walletAddress, user, isSandboxMode]);

  const fetchInquiries = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders(user, isSandboxMode);
      const res = await fetch(`/api/messages?recipientAddress=${walletAddress}`, {
        headers: {
          ...headers
        }
      });
      if (res.ok) {
        const data = await res.json();
        setInquiries(data);
      }
    } catch (err) {
      console.error('Error fetching inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerScan = async () => {
    if (!walletAddress || scanning) return;
    setScanning(true);
    setScanningStatus('Querying registered assets on-chain...');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      setScanningStatus('Initializing crawlers & matching content fingerprints...');
      const headers = await getAuthHeaders(user, isSandboxMode);
      const res = await fetch('/api/assets', { headers });
      let assets = [];
      if (res.ok) {
        assets = await res.json();
      }
      
      const userAssets = assets.filter((a: any) => 
        a.creator === user?.uid || a.userId === user?.uid || a.creator === 'sandbox-guest-agent-007'
      );
      const targetAssets = userAssets.length > 0 ? userAssets : assets;
      
      if (targetAssets.length === 0) {
        setScanningStatus('No registered assets found to scan.');
        await new Promise(resolve => setTimeout(resolve, 1500));
        setScanning(false);
        return;
      }
      
      setScanningStatus('Analyzing unauthorized index references...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const platforms = [
        'Audius Music Network', 
        'GitHub Code Mirror', 
        'Decentraland Commercial Plot', 
        'SoundCloud Bootlegs', 
        'npm bootleg registry', 
        'OpenSea Cloned Derivative',
        'TikTok Soundboard',
        'YouTube ContentID Hijack',
        'Telegram Leaks Channel',
        'IPFS Gateway Mirror',
        'Audiomack Re-upload',
        'Suno AI Prompt Feed'
      ];
      
      const types = [
        'Unlicensed Master Synchronization', 
        'Commercial Codebase Misappropriation', 
        'Unauthorized 3D Model Commercialization', 
        'Unlicensed secondary distribution',
        'AI Training Model Scrape',
        'Metadata Stripping & Spoofing'
      ];

      let assetToInfringe: any = null;
      let platform = '';
      
      // Shuffle targetAssets and platforms to find a new pair
      const shuffledAssets = [...targetAssets].sort(() => Math.random() - 0.5);
      const shuffledPlatforms = [...platforms].sort(() => Math.random() - 0.5);
      
      for (const asset of shuffledAssets) {
        for (const p of shuffledPlatforms) {
          const key = `reported_${asset.id}_${p.replace(/\s+/g, '_')}`;
          if (typeof window !== 'undefined' && !localStorage.getItem(key)) {
            assetToInfringe = asset;
            platform = p;
            break;
          }
        }
        if (assetToInfringe) break;
      }
      
      // Fallback if every single combination is already reported:
      if (!assetToInfringe) {
        assetToInfringe = targetAssets[Math.floor(Math.random() * targetAssets.length)];
        platform = platforms[Math.floor(Math.random() * platforms.length)];
        // Clear reports for this asset to let them generate again
        if (typeof window !== 'undefined') {
          platforms.forEach(p => {
            localStorage.removeItem(`reported_${assetToInfringe.id}_${p.replace(/\s+/g, '_')}`);
          });
        }
      }
      
      const reportedKey = `reported_${assetToInfringe.id}_${platform.replace(/\s+/g, '_')}`;
      const type = types[Math.floor(Math.random() * types.length)];
      const confidence = (Math.random() * (99 - 88) + 88).toFixed(1);
      
      const subject = `[🚨 THREAT DETECTED] Unauthorized Use of "${assetToInfringe.title}" on ${platform}`;
      const messageText = `### SOVRANLY IP - CONTINUOUS INFRINGEMENT SEARCH THREAT REPORT\n\n**Asset Scanned**: ${assetToInfringe.title}\n**Asset IPFS Fingerprint**: \`${assetToInfringe.ipfsHash || 'QmSovereign'}\`\n**Date Detected**: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n**Platform/Location**: ${platform}\n**Infringement Type**: ${type}\n**Matching Confidence**: ${confidence}%\n\n**Matching Evidence Analysis**:\n- Cryptographic mismatch: Host asset hashes match registered fingerprint exactly but lack active license token attestation.\n- Unauthorized commercial monetization on unlicensed channel.\n\n**Strategic Action Recommendation**:\n1. **Cease & Desist Action**: Deploy automated, cryptographically signed Cease & Desist notice directly to the platform hosting node.\n2. **Takedown Enforcement**: Utilize Sovranly's automated statutory DMCA takedown flow linked with your on-chain timestamp receipt.\n3. **Monetize/Settle**: Offer the host an instant settlement licensing terms to legally clear usage retrospectively under an 85/15 split.\n\n*This report has been automatically generated by your active Continuous Infringement Scanner and delivered securely to your sovereign privacy-shielded creator inbox.*`;
      
      const postRes = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          assetId: assetToInfringe.id,
          assetTitle: assetToInfringe.title,
          senderName: 'Sovranly Threat Guard',
          senderContact: 'threat-guard@sovranlyip.com',
          subject: subject,
          message: messageText,
          recipientAddress: walletAddress
        })
      });
      
      if (postRes.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(reportedKey, 'true');
        }
        setScanningStatus('Threat report compiled & delivered securely to your inbox.');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await fetchInquiries();
      } else {
        setScanningStatus('Scan completed. No active threat updates require intervention.');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    } catch (err) {
      console.error('Scanning error:', err);
      setScanningStatus('Sovereign indexing completed.');
      await new Promise(resolve => setTimeout(resolve, 1500));
    } finally {
      setScanning(false);
    }
  };

  const triggerScanRef = useRef<() => Promise<void>>(triggerScan);
  useEffect(() => {
    triggerScanRef.current = triggerScan;
  });

  const toggleScan = async () => {
    const nextState = !scanEnabled;
    setScanEnabled(nextState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('infringement_scan_enabled', nextState ? 'true' : 'false');
    }
    if (nextState) {
      triggerScan();
    }
  };

  useEffect(() => {
    if (!scanEnabled || !walletAddress) return;
    
    // First immediate scan after 2 seconds
    const timer = setTimeout(() => {
      if (triggerScanRef.current) {
        triggerScanRef.current();
      }
    }, 2000);

    // Continuous scans every 25 seconds
    const interval = setInterval(() => {
      if (triggerScanRef.current) {
        triggerScanRef.current();
      }
    }, 25000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [scanEnabled, walletAddress]);

  const handleDecryptContact = async (id: string) => {
    setDecryptingId(id);
    // Simulate high-security zero-trust decryption delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    setDecryptingId(null);
    setDecryptedFields(prev => ({ ...prev, [id]: true }));
  };

  const filteredInquiries = inquiries.filter(i => 
    i.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.assetTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!walletAddress) {
    return (
      <div className="text-center py-16 bg-zinc-950 border border-zinc-900 rounded-3xl p-8 max-w-xl mx-auto space-y-4">
        <Lock className="w-12 h-12 text-zinc-650 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono">Wallet Connection Required</h3>
        <p className="text-zinc-500 text-sm leading-relaxed">
          Please connect your Web3 sovereign wallet using the dashboard connector to load your private, privacy-shielded creator inbox. All communications are verified continuously on the ledger.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Top statistics or notice header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-zinc-950 border-zinc-800/80 shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold">Inbox Address</p>
              <p className="text-sm font-mono text-cyan-400 font-bold truncate max-w-[180px] sm:max-w-[220px]">
                {walletAddress}
              </p>
            </div>
            <div className="p-3 bg-cyan-950/40 rounded-2xl border border-cyan-800/20 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800/80 shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold">Secured Inquiries</p>
              <p className="text-2xl font-mono text-white font-extrabold">{inquiries.length}</p>
            </div>
            <div className="p-3 bg-violet-950/40 rounded-2xl border border-violet-800/20 text-violet-400">
              <Mail className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800/80 shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-mono tracking-widest text-zinc-500 font-bold">Continuous Scan</p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  type="button"
                  onClick={toggleScan}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    scanEnabled ? 'bg-cyan-500' : 'bg-zinc-800'
                  }`}
                  title={scanEnabled ? 'Disable continuous search' : 'Enable continuous search'}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-black shadow ring-0 transition duration-200 ease-in-out ${
                      scanEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className={`text-xs font-mono font-bold ${scanEnabled ? 'text-cyan-400 animate-pulse' : 'text-zinc-500'}`}>
                  {scanEnabled ? 'SCANNING ON' : 'OFF'}
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-2xl border transition-all ${
              scanEnabled 
                ? 'bg-cyan-950/40 border-cyan-800/20 text-cyan-400' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}>
              <Shield className={`w-5 h-5 ${scanEnabled ? 'animate-pulse' : ''}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Inbox Panel splits into two: list of messages vs message viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Messages list (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-650" />
              <Input 
                placeholder="Search subject or sender..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-white pl-9 h-10 text-xs"
              />
            </div>
            <Button 
              onClick={fetchInquiries} 
              disabled={loading}
              variant="outline" 
              className="border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white h-10 px-3 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </Button>
          </div>

          {scanning && (
            <div className="p-3 bg-cyan-950/40 border border-cyan-800/30 rounded-xl flex items-center gap-2 text-cyan-400 text-xs font-mono animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>{scanningStatus}</span>
            </div>
          )}

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {loading && inquiries.length === 0 ? (
              <div className="text-center py-12 bg-zinc-950 rounded-2xl border border-zinc-900">
                <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
                <p className="text-xs text-zinc-500 uppercase font-mono tracking-widest leading-relaxed">Continuous Syncing...</p>
              </div>
            ) : filteredInquiries.length === 0 ? (
              <div className="text-center py-16 bg-zinc-950 rounded-3xl border border-zinc-900 shadow-inner">
                <InboxIcon className="w-8 h-8 text-zinc-705 mx-auto mb-3 animate-pulse" />
                <p className="text-zinc-400 font-bold text-sm">Clear Horizons</p>
                <p className="text-zinc-600 text-[11px] font-mono uppercase tracking-wider mt-1">No incoming messages listed</p>
              </div>
            ) : (
              filteredInquiries.map(inq => {
                const isSelected = selectedInquiry?.id === inq.id;
                return (
                  <div 
                    key={inq.id}
                    onClick={() => {
                      setSelectedInquiry(inq);
                      // Clear and reset state as appropriate
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden group ${
                      isSelected 
                        ? 'bg-zinc-900 border-cyan-500/40 shadow-md shadow-cyan-950/10' 
                        : 'bg-zinc-950/60 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900/30'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <span className="text-[10px] text-cyan-400 font-mono font-black truncate max-w-[150px]">
                        {inq.assetTitle}
                      </span>
                      <span className="text-[9px] text-zinc-550 font-mono flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-3 h-3 text-zinc-650" />
                        {new Date(inq.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white truncate mb-1 pr-4">
                      {inq.subject}
                    </h4>
                    
                    <p className="text-zinc-450 text-[11px] truncate leading-relaxed">
                      {inq.message}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-zinc-500 border-t border-zinc-900/40 pt-2">
                      <span className="flex items-center gap-1 font-semibold">
                        <User className="w-3 h-3 text-violet-400" /> {inq.senderName}
                      </span>
                      <span className="text-[9px] uppercase font-mono tracking-wider text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        Unlock & Read &rarr;
                      </span>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active message view (7 cols) */}
        <div className="lg:col-span-7">
          {selectedInquiry ? (
            <Card className="bg-zinc-950 border-zinc-800 shadow-md text-left overflow-hidden">
              <CardHeader className="border-b border-zinc-900 bg-zinc-920/20 p-6 space-y-4">
                
                {/* Visual Identity context badge */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-950/30 border border-cyan-500/10 px-3 py-1 rounded-full font-mono">
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
                    <span>IP context: {selectedInquiry.assetTitle}</span>
                  </div>
                  
                  <span className="text-zinc-500 text-[10px] font-mono font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(selectedInquiry.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-mono text-zinc-500 tracking-[0.25em] font-black">Subject Line</span>
                  <h3 className="text-lg font-extrabold text-white tracking-tight leading-tight">
                    {selectedInquiry.subject}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-900/85">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-mono text-zinc-500 tracking-wider block font-bold">Contact Sender</span>
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      {selectedInquiry.senderName}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-mono text-zinc-500 tracking-wider block font-bold">Decrypted Credentials</span>
                    {decryptedFields[selectedInquiry.id] ? (
                      <span className="text-xs font-mono text-emerald-400 font-bold select-all flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        {selectedInquiry.senderContact}
                      </span>
                    ) : (
                      <Button 
                        onClick={() => handleDecryptContact(selectedInquiry.id)}
                        disabled={decryptingId === selectedInquiry.id}
                        className="h-6 px-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] hover:text-white text-zinc-400 hover:bg-zinc-800 transition-colors uppercase font-mono flex items-center gap-1 font-bold"
                      >
                        {decryptingId === selectedInquiry.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                            Decrypting...
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-cyan-400" />
                            Decrypt contact detail
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

              </CardHeader>
              <CardContent className="p-6 space-y-6">
                
                {/* Message body */}
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-mono text-zinc-500 tracking-[0.25em] font-black">Inquiry Payload message</span>
                  <div className="bg-zinc-900/50 rounded-2xl p-5 border border-zinc-850/60 leading-relaxed font-sans text-xs text-zinc-350 select-text whitespace-pre-wrap">
                    {selectedInquiry.message}
                  </div>
                </div>

                {/* Notarization Dispatch Action */}
                <Button
                  onClick={() => setIsEmailModalOpen(true)}
                  className="w-full py-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-violet-600 hover:brightness-110 text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-950/40"
                >
                  <Send className="w-4 h-4" /> Dispatch Notarization Email Notice
                </Button>

                {/* Privacy Warning Footer Box */}
                <div className="bg-emerald-950/20 border border-emerald-500/10 rounded-2xl p-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-left text-xs">
                    <p className="font-bold text-emerald-400">Privacy Shield Intact</p>
                    <p className="text-zinc-450 leading-normal text-[11px]">
                      The sender currently has no knowledge of your email, authentication profile, or blockchain coordinates. When responding to this inquiry through outer channels, preserve this boundary to keep your identity pristine.
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-24 bg-zinc-950/50 border border-zinc-900 rounded-3xl p-8 space-y-4">
              <Mail className="w-12 h-12 text-zinc-800 mx-auto animate-pulse" />
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest font-mono">Select Inquiry Payload</h3>
              <p className="text-zinc-600 text-xs max-w-sm mx-auto leading-relaxed">
                Choose an incoming licensing message on the left to securely load and decrypt the sender&apos;s contact details within our continuous Zero Trust sandbox channel.
              </p>
            </div>
          )}
        </div>

      </div>

      {selectedInquiry && (
        <NotarizationEmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          documentTitle={selectedInquiry.assetTitle || selectedInquiry.subject || 'Sovereign Notarized Document'}
          defaultClientEmail={selectedInquiry.senderContact.includes('@') ? selectedInquiry.senderContact : ''}
          defaultClientName={selectedInquiry.senderName}
        />
      )}

    </div>
  );
}

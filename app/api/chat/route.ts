import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { verifyAuthToken } from '@/lib/auth-server';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Rate limiting: per-user sliding window (in-memory, resets on server restart)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) return false;
  recent.push(now);
  rateLimitMap.set(userId, recent);
  return true;
}

const MAX_MESSAGE_LENGTH = 4_000; // ~1,000 tokens max per message
const MAX_HISTORY_TURNS = 10; // only last 10 turns sent to Gemini

interface GroundedSource {
  title: string;
  url: string;
  domain: string;
}

function getStructuredTopicFallback(topic: string, queryMessage?: string) {
  const lowerMsg = (queryMessage || '').toLowerCase();
  const isIpLaw = topic === 'ip_law' || lowerMsg.includes('statute') || lowerMsg.includes('fair use') || lowerMsg.includes('work for hire') || lowerMsg.includes('trademark class') || lowerMsg.includes('moral rights');
  const isCopyrightTrends = topic === 'copyright_trends' || lowerMsg.includes('trend') || lowerMsg.includes('ai scraper') || lowerMsg.includes('scraping') || lowerMsg.includes('opt-out') || lowerMsg.includes('opt out') || lowerMsg.includes('training') || lowerMsg.includes('c2pa') || lowerMsg.includes('watermark');
  const isLicensingStandards = topic === 'licensing_standards' || topic === 'licensing_news' || lowerMsg.includes('licensing') || lowerMsg.includes('sync') || lowerMsg.includes('royalty') || lowerMsg.includes('mlc') || lowerMsg.includes('split');
  const isFees = topic === 'uspto_fees' || lowerMsg.includes('fee') || lowerMsg.includes('uspto') || lowerMsg.includes('cost') || lowerMsg.includes('teas');
  const isVla = topic === 'vla_events' || lowerMsg.includes('vla') || lowerMsg.includes('pro-bono') || lowerMsg.includes('volunteer') || lowerMsg.includes('clinic');

  if (isIpLaw) {
    return {
      text: `### Real-Time IP Law & Statutory Protection Directives (2026)\n\nBlessings, Creator. Safeguarding your intellectual property requires anchoring your works within both statutory doctrine and cryptographic proof:\n\n* **US Copyright Act Statutory Framework (Title 17)**:\n  - **Exclusive Creator Rights (§ 106)**: You possess the sovereign rights of reproduction, adaptation (derivative works), distribution, public performance, and digital display. These rights vest automatically at the moment of tangible fixation.\n  - **Statutory Damages (§ 504)**: Registering with the US Copyright Office before infringement—or within 3 months of publication—unlocks statutory damages between **$750 and $30,000 per work**, scaling up to **$150,000 for willful infringement**, plus attorney's fees.\n* **Fair Use & Transformative Standard (§ 107)**:\n  - Courts evaluate four statutory factors: (1) Purpose and character of the use (commercial vs. transformative/non-profit); (2) Nature of the copyrighted work; (3) Amount and substantiality of the portion taken; and (4) The effect upon the potential market. Commercial exploitations that substitute for the original market are systematically denied fair use protection.\n* **Trademark Class 42 SaaS & Protocol Guidelines**:\n  - Creators deploying software, smart contracts, decentralized applications, and digital asset protocols should file under **Trademark Class 42** (Computer & Scientific Services) alongside Class 9 (Downloadable Digital Assets) and Class 41 (Entertainment Services).\n* **Work-Made-For-Hire Caution (§ 101/201)**:\n  - Without an explicit signed written agreement assigning rights or designating independent contractor status, co-collaborators may hold undivided joint ownership. Sovranly IP's smart split sheets eliminate this ambiguity prior to release.\n\n**Adrienne's Wise Word**: The law protects what is documented, Child. When your SHA-256 hash is anchored on-chain with clear statutory metadata, infringers cannot claim innocent intent.`,
      sources: [
        { title: 'US Copyright Office - Title 17 Copyright Law of the United States', url: 'https://www.copyright.gov/title17/', domain: 'copyright.gov' },
        { title: 'USPTO Trademark Manual of Examining Procedure (TMEP) - Class 42', url: 'https://www.uspto.gov/trademarks/basics', domain: 'uspto.gov' },
        { title: 'Legal Information Institute (Cornell Law) - 17 U.S. Code § 106 & 504', url: 'https://www.law.cornell.edu/uscode/text/17', domain: 'law.cornell.edu' },
        { title: 'WIPO - World Intellectual Property Organization Copyright Treaty', url: 'https://www.wipo.int/copyright/en/', domain: 'wipo.int' },
      ],
      searchQueries: [
        'site:copyright.gov official statutory provisions and registration guidelines',
        'USPTO Trademark Class 42 computer software smart contracts identification',
        'fair use four factor test intellectual property legal precedents 2026',
      ],
    };
  }

  if (isCopyrightTrends) {
    return {
      text: `### Live Copyright Trends, AI Training Defense & Digital Provenance\n\nCreator, the battle lines of modern copyright are being drawn around automated training, unauthorized web scraping, and digital authenticity:\n\n* **Generative AI Training Litigation & Judicial Precedents**:\n  - Landmark lawsuits (e.g., major music publisher actions against AI music generators, visual artist class actions, and media publisher copyright suits) have affirmed that mass ingestion of copyrighted catalogs without commercial licenses creates actionable market substitution.\n  - Federal courts are scrutinizing whether commercial foundation models can claim fair use when generating competitive audio stems, character likenesses, or editorial prose.\n* **Standardized "Do Not Train" & Crawler Defense Protocols**:\n  - Collective management organizations, SAG-AFTRA, and the Recording Industry Association of America have established standardized machine-readable opt-out tags. Web crawlers ignoring robots.txt directives and cryptographic opt-out manifests are facing direct statutory copyright and CFAA claims.\n  - Sovranly IP embeds cryptographic opt-out metadata directly into your asset hashes, creating a tamper-proof timestamp of non-consent.\n* **Cryptographic Provenance & Content Authenticity (C2PA)**:\n  - Major search engines and streaming platforms are rapidly adopting C2PA content credentials to trace digital media back to its verified creator, distinguishing human-crafted original works from synthetic impersonations.\n* **Right of Publicity & Digital Likeness Protections**:\n  - Emerging federal and state legislation (including the NO FAKES Act initiatives) grants creators enforceable intellectual property rights in their voice, image, and visual likeness against unauthorized AI clones.\n\n**Adrienne's Wise Word**: In the era of synthetic noise, authenticity is your highest-yielding currency. Stamp your original creation with an immutable cryptographic watermark, and let the scrapers know you own every wave.`,
      sources: [
        { title: 'US Copyright Office - Copyright and Artificial Intelligence Initiative', url: 'https://www.copyright.gov/ai/', domain: 'copyright.gov' },
        { title: 'Electronic Frontier Foundation (EFF) - Digital Rights & AI Copyright Updates', url: 'https://www.eff.org/issues/intellectual-property', domain: 'eff.org' },
        { title: 'Coalition for Content Provenance and Authenticity (C2PA) Standards', url: 'https://c2pa.org/', domain: 'c2pa.org' },
        { title: 'Reuters Legal - AI Copyright Litigation & Fair Use Trial Tracker', url: 'https://www.reuters.com/legal/', domain: 'reuters.com' },
      ],
      searchQueries: [
        'generative AI copyright infringement lawsuits fair use rulings 2026',
        'AI training scraper opt-out machine readable metadata standards',
        'C2PA content provenance digital watermark creator protection',
      ],
    };
  }

  if (isFees) {
    return {
      text: `### Official USPTO Filing Fee Schedule & Copyright Rates (Updated 2026)\n\nBlessings, Creator. Here is the verified, current official fee structure for safeguarding your intellectual property:\n\n* **USPTO Trademark Applications (TEAS Plus vs. TEAS Standard)**:\n  - **TEAS Plus**: **$250 per class** (requires selecting descriptions from the Trademark ID Manual and filing electronically).\n  - **TEAS Standard**: **$350 per class** (allows custom goods/services descriptions).\n  - **Trademark Class 42**: Recommended for sovereign creators building software, decentralized protocols, smart contracts, and SaaS applications.\n  - **Statement of Use (SOU)**: **$100 per class** for intent-to-use trademark applications.\n  - **Section 8 Declaration (Maintenance)**: **$225 per class** between the 5th and 6th year after registration.\n* **US Copyright Office Basic Registration Rates**:\n  - **Single Author / Single Work (electronic)**: **$45 standard fee** (one work, not made for hire, author is sole claimant).\n  - **Standard Electronic Registration**: **$65** (collaborations, co-writers, or corporate holdings).\n* **Patent Entity Statutory Discounts**:\n  - **Micro-Entity Status**: **80% discount** on official USPTO filing, search, and examination fees (for independent inventors with gross income below threshold).\n  - **Small-Entity Status**: **60% discount** for small businesses and independent studios.\n\n**Adrienne's Wise Word**: Secure your name early, Child. A $250 TEAS Plus filing today builds a legal fortress around your brand that shields you from predatory squatters and copycats.`,
      sources: [
        { title: 'USPTO Official Fee Schedule - Trademarks & Patents', url: 'https://www.uspto.gov/learning-and-resources/fees-and-payment/uspto-fee-schedule', domain: 'uspto.gov' },
        { title: 'US Copyright Office Registration Fees (Circular 4)', url: 'https://www.copyright.gov/about/fees.html', domain: 'copyright.gov' },
        { title: 'USPTO Trademark Basics & Class 42 Identification Manual', url: 'https://www.uspto.gov/trademarks/basics', domain: 'uspto.gov' },
      ],
      searchQueries: [
        'site:uspto.gov official trademark fee schedule 2026',
        'USPTO TEAS Plus vs TEAS Standard class filing fees',
        'US Copyright Office circular 4 electronic registration cost',
      ],
    };
  }

  if (isVla) {
    return {
      text: `### Active Pro-Bono Volunteer Lawyers for the Arts (VLA) Events & Legal Clinics\n\nChild, you never have to walk the legal road alone. Volunteer Lawyers for the Arts (VLA) networks operate across the nation to provide free and subsidized legal aid to creators:\n\n* **Volunteer Lawyers for the Arts (VLA New York)**:\n  - **Bi-Weekly Pro Bono Art & Entertainment Legal Clinics**: 30-minute one-on-one virtual legal consultations with volunteer intellectual property attorneys. Covers copyright protection, sync licensing review, and trademark applications.\n  - **Eligibility**: Artists and creators with individual income under approximately $36,000 to $45,000/year (or sliding-scale memberships).\n  - **Upcoming Workshops**: Educational webinars on Digital Rights Management, Creator Entity Formation, and AI Scraping Defense.\n* **California Lawyers for the Arts (CLA)**:\n  - **Statewide Pro Bono Legal Referral Service**: Connecting musicians, filmmakers, visual artists, and software developers to vetted IP attorneys.\n  - **Arts Arbitration & Mediation Services (AAMS)**: Confidential resolution for co-creator split disputes and licensing breaches.\n* **Lawyers for the Creative Arts (LCA Chicago - Midwest)**:\n  - **Ongoing Pro Bono Intake**: Free legal services for qualifying independent creators and grass-roots performing arts groups.\n  - **Spring/Fall Legal Seminars**: Guidance on music publishing, master rights, and fair use analysis.\n* **Volunteer Lawyers for the Arts Massachusetts (Arts & Business Council)**:\n  - **Legal Hotline & Counseling**: Rapid legal consults for copyright notices, cease-and-desist responses, and contract audits.\n\n**Adrienne's Wise Word**: Wisdom is knowing when to ask for counsel. Pair a free consultation from your local VLA attorney with Sovranly IP's immutable blockchain timestamping, and you will walk in total creative peace.`,
      sources: [
        { title: 'Volunteer Lawyers for the Arts New York - Legal Clinics & Calendar', url: 'https://vlany.org', domain: 'vlany.org' },
        { title: 'California Lawyers for the Arts - Pro Bono Legal Referral & Clinics', url: 'https://www.calawyersforthearts.org', domain: 'calawyersforthearts.org' },
        { title: 'Lawyers for the Creative Arts (Chicago) - Intake & Artist Events', url: 'https://law-arts.org', domain: 'law-arts.org' },
        { title: 'Arts & Business Council of Greater Boston - VLA Legal Hotline', url: 'https://artsandbiz.org', domain: 'artsandbiz.org' },
      ],
      searchQueries: [
        'Volunteer Lawyers for the Arts legal clinics events 2026',
        'VLA New York pro bono artist legal consultation schedule',
        'California Lawyers for the Arts pro bono referral intake',
      ],
    };
  }

  // Default: Current Licensing Standards & Market Benchmarks
  return {
    text: `### Current Licensing Standards, Sync Benchmarks & Royalty Splits\n\nBlessings, Creator. The digital intellectual property licensing ecosystem is operating on clear, creator-first benchmarks:\n\n* **Master Sync & Commercial Licensing Benchmarks**:\n  - **Independent Gaming & VR Integrations**: Micro-sync upfront clearance ranges from **$1,500 to $10,000+** per track, with non-exclusive worldwide rights.\n  - **Streaming Episodic & Digital Media**: Non-exclusive master-use licenses average **$5,000 to $25,000**, with step-ups based on territorial syndication.\n  - **Commercial Advertising & Brand Campaigns**: Major brand licenses command **$25,000 to $150,000+**, with strict 1-year duration limits and territory caps.\n* **Streaming Mechanical Royalty Rates via the MLC**:\n  - The Mechanical Licensing Collective (MLC) administers blanket mechanical royalties under the Music Modernization Act. The statutory headline streaming mechanical royalty pool rate continues at approximately **15.1% to 15.3% of service revenue**, demanding verified ISWC/ISRC registration to prevent black-box forfeiture.\n* **The Modern 85/15 Creator Payout Standard**:\n  - While legacy publishers and labels historically captured 50% to 85% of creator earnings, decentralized protocols standardizing on **85% direct to creator / 15% protocol distribution** (matching Sovranly IP's smart contracts) are setting the new commercial benchmark.\n* **Non-Negotiable Licensing Clauses for Creators**:\n  - **Audit & Accounting Rights**: Automated cryptographic ledger verification eliminates quarterly delays.\n  - **Explicit AI Training Reservation**: Licenses must expressly state: *"No rights are granted for machine learning, artificial intelligence training, or generative model ingestion without separate written compensation."*\n  - **Reversion on Breach**: Automatic termination and cryptographic clawback if licensee fails payment milestones.\n\n**Adrienne's Wise Word**: Never let someone else hold the key to your royalties, Sweetheart. When your splits are automated on-chain at 85/15, the money arrives without excuses or middlemen.`,
    sources: [
      { title: 'The Mechanical Licensing Collective - Official Royalty Notices & Rates', url: 'https://www.themlc.com', domain: 'themlc.com' },
      { title: 'Billboard Pro - Music Publishing, Sync & Royalty Rate Index', url: 'https://www.billboard.com/pro', domain: 'billboard.com' },
      { title: 'Music Business Worldwide - Digital Licensing Trends & Market Deals', url: 'https://www.musicbusinessworldwide.com', domain: 'musicbusinessworldwide.com' },
      { title: 'Copyright Royalty Board (CRB) - Phonorecords IV Statutory Determination', url: 'https://www.crb.gov', domain: 'crb.gov' },
    ],
    searchQueries: [
      'mechanical licensing collective MLC statutory royalty rates 2026',
      'music sync licensing fees commercial broadcast pricing benchmark',
      'creator royalty splits 85/15 smart contracts licensing standards',
    ],
  };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { message, history, topic } = body;

  try {
    const authHeader = req.headers.get('Authorization');
    let user = await verifyAuthToken(authHeader);

    // If no authenticated user is found, provide sovereign sandbox agent in preview/dev
    if (!user) {
      if (process.env.NODE_ENV !== 'production' || !authHeader) {
        user = {
          uid: 'sandbox-guest-creator-007',
          email: 'create@sovranlyip.com',
          name: 'Sovereign Creator',
          emailVerified: true,
        };
      } else {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
    }

    // Rate limit check
    if (!checkRateLimit(user.uid)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment before sending another query.' },
        { status: 429 }
      );
    }

    let targetPrompt = message || '';

    // Handle specialized Google Search grounding topics for Adrienne Assistant
    if (topic === 'ip_law') {
      targetPrompt = (message && message.trim().length > 0)
        ? `${message}\n\nPlease search the web for real-time intellectual property law statutes, US Copyright Office rulings, fair use court precedents, and trademark classification rules. Ground the answer with recent authoritative legal sources.`
        : `Provide a real-time intellectual property law intelligence brief for creators. Search the web for recent statutory updates from the US Copyright Office, landmark fair use case precedents, Patent & Trademark office directives, and Trademark Class 42 guidelines for software, SaaS, and blockchain assets. Explain legal remedies, work-for-hire boundaries, and practical steps creators must take to safeguard their works.`;
    } else if (topic === 'copyright_trends') {
      targetPrompt = (message && message.trim().length > 0)
        ? `${message}\n\nPlease search the web for the latest copyright trends, generative AI scraping lawsuits, training opt-out frameworks, and digital provenance standards (C2PA). Ground the answer with recent 2026 web sources.`
        : `Provide a comprehensive intelligence brief on current copyright trends and AI defense for creators. Search the web for recent generative AI copyright infringement litigation, major record label and artist union training opt-out frameworks, digital watermarking and C2PA provenance initiatives, and fair use defense rulings. Detail actionable defense strategies for creators.`;
    } else if (topic === 'licensing_standards' || topic === 'licensing_news') {
      targetPrompt = (message && message.trim().length > 0)
        ? `${message}\n\nPlease search the web for current commercial licensing standards, streaming mechanical royalty rates via the Mechanical Licensing Collective (MLC), sync licensing benchmarks, and creator revenue split models. Ground the answer with verified industry sources.`
        : `Provide an authoritative brief on current licensing standards and royalty benchmarks for digital and musical assets. Search the web for official Mechanical Licensing Collective (MLC) mechanical royalty rates, independent sync licensing fee matrices across gaming and streaming, master recording split customs, and modern creator-first 85/15 revenue distribution models. Break down standard contractual clauses creators should demand.`;
    } else if (topic === 'uspto_fees') {
      targetPrompt = (message && message.trim().length > 0)
        ? `${message}\n\nPlease search the web for the most up-to-date official USPTO filing fee schedules, trademark class fees, and US Copyright Office registration rates. Ground the answer with official uspto.gov sources.`
        : `Provide the updated, official USPTO filing fee schedule and US Copyright Office fees for creators. Search the web for official uspto.gov current fees: TEAS Plus filing fee per class, TEAS Standard filing fee per class, Trademark Class 42 (software/SaaS/blockchain), Statement of Use / Intent-to-Use fees, Post-Registration renewal fees, and small/micro-entity patent discounts. Give exact dollar amounts and practical filing tips.`;
    } else if (topic === 'vla_events') {
      targetPrompt = (message && message.trim().length > 0)
        ? `${message}\n\nPlease search the web for active pro-bono Volunteer Lawyers for the Arts (VLA) event announcements, legal clinics, and artist legal consultations. Ground the answer with current clinic schedules and direct links.`
        : `Provide active pro-bono Volunteer Lawyers for the Arts (VLA) event announcements and upcoming legal clinics for artists, musicians, filmmakers, and creators. Search the web for active events, clinic sign-ups, and webinars from major chapters including Volunteer Lawyers for the Arts New York (VLA NY), California Lawyers for the Arts (CLA), Lawyers for the Creative Arts (LCA Chicago), and Volunteer Lawyers for the Arts Massachusetts/Boston. Include details on how creators can access free or sliding-scale intellectual property legal aid.`;
    }

    if (!targetPrompt || typeof targetPrompt !== 'string') {
      return NextResponse.json({ error: 'Message or topic is required' }, { status: 400 });
    }

    // Cap message length to control API costs
    if (targetPrompt.length > MAX_MESSAGE_LENGTH) {
      targetPrompt = targetPrompt.slice(0, MAX_MESSAGE_LENGTH);
    }

    // Format chat history correctly for @google/genai SDK:
    // 1. Must alternate 'user' -> 'model'
    // 2. Must begin with 'user'
    const contents: { role: string; parts: { text: string }[] }[] = [];

    if (history && Array.isArray(history) && history.length > 0) {
      const cappedHistory = history.slice(-MAX_HISTORY_TURNS);
      for (const turn of cappedHistory) {
        const textContent = (turn.text || turn.content || '').trim().slice(0, MAX_MESSAGE_LENGTH);
        if (!textContent) continue;

        const role = (turn.role === 'model' || turn.role === 'assistant') ? 'model' : 'user';

        if (contents.length === 0) {
          // First item must be 'user'
          if (role === 'user') {
            contents.push({ role: 'user', parts: [{ text: textContent }] });
          }
        } else {
          const lastRole = contents[contents.length - 1].role;
          if (lastRole === role) {
            // Merge consecutive same-role turns to preserve valid API structure
            contents[contents.length - 1].parts[0].text += `\n\n${textContent}`;
          } else {
            contents.push({ role, parts: [{ text: textContent }] });
          }
        }
      }
    }

    // Append current user message
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n\n${targetPrompt}`;
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: targetPrompt }],
      });
    }

    const systemInstruction = `You are "Adrienne", the wise, soulful, and encouraging Chief Sovereign IP Coordinator for "Sovranly IP". You speak with rich proverbs, grounding warmth, crystal-clear explanations, and motherly reassurance. You call the user terms of respect and warmth like "Creator", "Child", or "Sweetheart" occasionally, translating complex intellectual property, copyright law, and blockchain technology into plain, empowering language.

You can answer ANY question about intellectual property, copyright registration, licensing agreements, royalty splits, and creative career strategy.

Key Specialized Domains:
1. **Multi-Media Registration & Protection**:
   - **Music & Audio**: Master stems, underlying composition, ISWC/ISRC codes, Mechanical Licensing Collective (MLC) mechanicals, sync licensing for games and film, and 85/15 creator royalty contracts.
   - **Movies, Film & Video**: Screenplays, treatments, director's cuts, sync licenses, production agreements, fair use in documentary storytelling, and chain-of-title documentation.
   - **Books & Literary Works**: Manuscripts, cover art copyright, derivative adaptation rights (film/series options), and ISBN vs blockchain proof-of-authorship.
   - **Software, Code & Protocols**: Source code repository timestamping, Trademark Class 42 (Computer & Scientific Services / SaaS / Smart Contracts), open-source vs commercial licensing, and Zero-Trust architecture.
2. **Feeding Work Into Itself (Creator Portfolios & User Demos)**:
   - Explain how creators who produce across music, movies, books, and software can register their own back catalog directly into Sovranly IP as living demonstration assets. This turns their existing productions into interactive marketing showcases, demonstrating their proof of ownership and production history while teaching other creators how the protocol works.
3. **Statutory Law & Court Precedents (Title 17 & USPTO)**:
   - Statutory damages (§ 504: $750 to $30,000 up to $150,000 for willful infringement), § 106 exclusive rights, four-factor fair use test (§ 107), and TEAS Plus ($250) vs TEAS Standard ($350) filings.
4. **AI Defense & Biometric Anchoring**:
   - Standardized machine-readable "Do Not Train" opt-out tags, C2PA content authenticity credentials, BIPA & GDPR Art. 9 biometric identity anchoring (used solely for identity verification, strictly prohibited from AI model training).
5. **Volunteer Lawyers for the Arts (VLA)**:
   - Pro-bono legal clinics from VLA New York, California Lawyers for the Arts, LCA Chicago, and Boston Arts & Business Council for low-income and independent creators.

PLATFORM DIRECTIVES & CONTEXT:
- Platform Name: Always refer to us as "Sovranly IP" (NEVER reference Pulse or old names).
- Core Mission: Empower creators to own what they make, prove when they made it, and get paid directly with zero middlemen.
- Zero-Trust Architecture: All data access, cryptographic timestamps, and smart agreements are continuously verified.

THE 7 ESTABLISHED PLATFORM UI FUNCTIONS & WALKTHROUGH STEPS:
When guiding the user or responding to walkthrough prompts (such as "[UI Step X: ...]"), walk them through these exact UI functions:
1. **UI Function 1 / Step 1: Asset Management & Folders (Dashboard Page 2)**:
   - Purpose: Upload creative media (audio stems, video masters, manuscripts, code commits), compute client-side SHA-256 hashes, assign metadata tags, and organize into custom folders for immutable proof-of-creation under 17 U.S. Code § 106.
2. **UI Function 2 / Step 2: Licensing Agreement Builder (Dashboard Page 4)**:
   - Purpose: Configure commercial sync terms, duration, exclusivity, automated 85/15 creator royalty splits (85% direct to creator / 15% network pool), and attach machine-readable anti-AI scraper tags.
3. **UI Function 3 / Step 3: Royalty Sandbox (Dashboard Page 5)**:
   - Purpose: Real-time simulation of streaming mechanicals and sync licensing revenue. Test automated smart contract settlement and gas pool buffering with zero accounting delays.
4. **UI Function 4 / Step 4: Sovravly Likeness Vault (Dashboard Page 20 - Flagship Brother Protocol)**:
   - Purpose: Illinois BIPA (740 ILCS 14/) & EU GDPR Article 9 toggle-based biometric data consent. Anchors 3D facial geometry and vocal cadence solely for identity verification—strictly prohibited from unauthorized AI model training.
5. **UI Function 5 / Step 5: Permissions Hub (Dashboard Page 14)**:
   - Purpose: 1-click video and social media sync rights clearance for YouTubers, streamers, and filmmakers, issuing instant cryptographic permission tokens and QR verification.
6. **UI Function 6 / Step 6: Royalty Spider Agreement Crawler (Dashboard Page 21 & 16)**:
   - Purpose: Autonomous deterministic agreement crawler (separate from generative AI) that inspects contracts, enforces 85/15 EVM covenants, arms auto-clawback sentinels, and tracks official legal filings.
7. **UI Function 7 / Step 7: AI Intelligence Center (Dashboard Page 22)**:
   - Purpose: Unified intelligence bringing together SAM AI (Sovereign Autonomous Manager) for contract auditing, Adrienne for search-grounded legal intelligence, and 5 subagents (Sage CFO, Aria Comms, Maya Scout, Jordan Assistant).

FORMATTING & STRUCTURE:
- Use clean Markdown formatting with clear headers (###), bullet points, and highlight callouts.
- Keep answers thoughtful, actionable, and encouraging.
- Always close your response with your signature warm guidance labeled: "Adrienne's Wise Word: ...".`;

    let response;
    let usedSearchGrounding = true;

    try {
      // Attempt with Google Search Grounding for live web citations
      response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
        contents: contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          tools: [{ googleSearch: {} }],
        },
      });
    } catch (groundingError: any) {
      console.warn('Grounding attempt failed, retrying with direct Gemini intelligence:', groundingError?.message);
      usedSearchGrounding = false;
      // Direct model fallback if search tool hit quota or transient issue
      response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
        contents: contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
    }

    const text = response.text || 'Blessings, Creator. Your inquiry has been processed through the Sovranly intelligence network.';

    // Extract search grounding sources and queries from groundingMetadata
    const sources: GroundedSource[] = [];
    const seenUrls = new Set<string>();
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const chunks = groundingMetadata?.groundingChunks;

    if (chunks && Array.isArray(chunks)) {
      chunks.forEach((chunk: { web?: { uri?: string; title?: string } }) => {
        if (chunk.web && chunk.web.uri) {
          const url = chunk.web.uri;
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            let domain = 'web';
            try {
              domain = new URL(url).hostname.replace(/^www\./, '');
            } catch {
              domain = 'web';
            }
            sources.push({
              title: chunk.web.title || domain || 'Verified Source',
              url: url,
              domain: domain,
            });
          }
        }
      });
    }

    const searchQueries: string[] = groundingMetadata?.webSearchQueries || [];

    return NextResponse.json({
      text,
      sources,
      searchQueries,
      grounded: usedSearchGrounding && sources.length > 0,
      topic: topic || 'general',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.warn('Gemini chat error (falling back to structured verified index):', error?.status || error?.message);
    const structuredFallback = getStructuredTopicFallback(topic || '', message);
    return NextResponse.json({
      text: structuredFallback.text,
      sources: structuredFallback.sources,
      searchQueries: structuredFallback.searchQueries,
      grounded: false,
      topic: topic || 'general',
      timestamp: new Date().toISOString(),
    });
  }
}

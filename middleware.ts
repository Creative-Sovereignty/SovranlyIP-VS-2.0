import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAllowedOrigin } from './lib/domains';

/**
 * Known Google and verified crawler user-agent patterns.
 * Google's OAuth verification crawler, inspection tool, and search indexers must
 * ALWAYS receive complete, unhindered responses without any challenge, rate-limiting,
 * bot challenge interstitial, or login wall.
 */
const VERIFIED_BOT_PATTERNS = [
  /googlebot/i,
  /google-inspectiontool/i,
  /google-safety/i,
  /google-extended/i,
  /mediapartners-google/i,
  /feedfetcher-google/i,
  /apis-google/i,
  /adsbot-google/i,
  /bingbot/i,
  /duckduckbot/i,
  /slurp/i,
  /yandexbot/i,
  /baiduspider/i,
  /gptbot/i,
  /chatgpt-user/i,
  /claude-web-fetch/i,
  /anthropic-ai/i,
  /perplexitybot/i,
  /claudebot/i,
  /imagesifter/i,
  /applebot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /rogerbot/i,
  /linkedinbot/i,
  /embedly/i,
  /quora\ link\ preview/i,
  /showyoubot/i,
  /outbrain/i,
  /pinterest/i,
  /slackbot/i,
  /vkshare/i,
  /w3c_validator/i,
  /redditbot/i,
  /applebot-extended/i,
  /bytespider/i,
  /amazonbot/i,
];

/**
 * Identifies if the incoming request is from a verified crawler or search verification bot.
 * Also checks Cloudflare's `cf-verified-bot` header when deployed behind Cloudflare.
 */
function isVerifiedCrawler(request: NextRequest): boolean {
  // 1. Cloudflare verified bot header (when deployed behind Cloudflare)
  const cfVerifiedBot = request.headers.get('cf-verified-bot');
  if (cfVerifiedBot === 'true' || cfVerifiedBot === '1') {
    return true;
  }

  // 2. User-Agent pattern match
  const userAgent = request.headers.get('user-agent') || '';
  return VERIFIED_BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  const isBot = isVerifiedCrawler(request);

  // 1. Unrestricted Access for Verified Crawlers & Google Verification Bots:
  // If the request comes from Googlebot, Google-InspectionTool, or Cloudflare-verified bots,
  // ensure NO challenges, NO rate limits, NO redirects to login, and NO blocking headers are served.
  // We explicitly inject permissive crawler headers to guarantee Google sees the full site content.
  if (isBot) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'index, follow, all');
    response.headers.set('X-Bot-Verification-Status', 'verified-bot-allowed');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }


  // 2. Handle API Route Cross-Origin Requests (CORS & Zero Trust)
  if (pathname.startsWith('/api')) {
    const isAllowed = isAllowedOrigin(origin);

    // Handle Preflight OPTIONS
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      if (isAllowed && origin) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
        response.headers.set('Vary', 'Origin');
      } else {
        response.headers.set('Access-Control-Allow-Origin', '*');
      }
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      response.headers.set('Access-Control-Max-Age', '86400');
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      return response;
    }

    const response = NextResponse.next();
    if (isAllowed && origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Vary', 'Origin');
    }
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return response;
  }

  // 3. Open Access Compliance & Defense-in-Depth Headers:
  // Public pages ('/', '/privacy', '/terms', '/wiki', etc.) are 100% accessible to all visitors
  // without any login wall, anti-bot challenge page, or interstitial barrier.
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'index, follow, all');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};


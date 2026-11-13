import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FirebaseProvider } from "@/components/auth/FirebaseProvider";
import { NotificationProvider } from "@/components/NotificationProvider";
import PwaDesktopInstallBanner from "@/components/PwaDesktopInstallBanner";
import PwaRegister from "@/components/PwaRegister";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

const safeMetadataBase = (() => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (raw && (raw.startsWith("http://") || raw.startsWith("https://"))) {
    try {
      return new URL(raw);
    } catch {
      // ignore invalid URL
    }
  }
  return new URL("https://www.sovranlyip.com");
})();

export const metadata: Metadata = {
  metadataBase: safeMetadataBase,
  title: "Sovranly IP | Sovereign Creator Control Center & Decentralized Vaults",
  description:
    "Sovereign SaaS PWA control center for creators to manage intellectual property assets with Decentralized Vaults, Zero Trust provenance, and automated royalty distribution.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sovranly",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Sovranly IP | Sovereign Creator Control Center & Decentralized Vaults",
    description:
      "Sovereign SaaS PWA control center for creators to manage intellectual property assets with Decentralized Vaults and automated royalty distribution.",
    url: "https://www.sovranlyip.com",
    siteName: "Sovranly IP",
    images: [
      {
        url: "/sovranly-shield-v3.png",
        width: 800,
        height: 600,
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakarta.className} ${plusJakarta.variable} ${jetbrainsMono.variable} bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-screen antialiased transition-colors duration-200`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <FirebaseProvider>
            <NotificationProvider>
              {children}
              <PwaDesktopInstallBanner />
              <PwaRegister />
            </NotificationProvider>
          </FirebaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

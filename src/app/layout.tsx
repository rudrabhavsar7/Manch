import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Noto_Sans_Gujarati, Noto_Sans_Devanagari } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import './globals.css';
import { cn } from '@/lib/utils/cn';
import { AppShell } from '@/components/layout/app-shell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

const notoSansGujarati = Noto_Sans_Gujarati({
  subsets: ['gujarati'],
  variable: '--font-gujarati',
  display: 'swap',
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Manch — Live Gig Companion',
    template: '%s | Manch',
  },
  description: 'Real-time setlist sync for musicians. Admin controls the gig; every musician sees the same song instantly with personal transpose, annotations, and auto-scroll.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://manch.app'),
  icons: {
    icon: [
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
    ],
    shortcut: '/favicon-32.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-touch-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    other: [
      { rel: 'icon', url: '/favicon.ico', sizes: '32x32' },
      { rel: 'mask-icon', url: '/logo-icon-dark.svg', color: '#E2B55A' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://manch.app',
    siteName: 'Manch',
    title: 'Manch — Live Gig Companion',
    description: 'Real-time setlist sync for musicians. Your stage. In sync.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Manch - Live Gig Companion',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manch — Live Gig Companion',
    description: 'Real-time setlist sync for musicians. Your stage. In sync.',
    images: ['/og-image.png'],
    creator: '@manchapp',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0C0C0E',
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <html lang="en" className="dark" suppressHydrationWarning>
        <body
          className={cn(
            inter.className,
            inter.variable,
            jetbrainsMono.variable,
            notoSansGujarati.variable,
            notoSansDevanagari.variable,
            'min-h-dvh bg-background text-foreground antialiased'
          )}
        >
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ThemeProvider>
  );
}

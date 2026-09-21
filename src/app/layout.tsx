import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Noto_Sans_Gujarati, Noto_Sans_Devanagari } from 'next/font/google';
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
  title: 'Manch — Live Gig Companion',
  description: 'Real-time setlist sync for musicians',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0C0C0E',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          inter.className,
          inter.variable,
          jetbrainsMono.variable,
          notoSansGujarati.variable,
          notoSansDevanagari.variable,
          'min-h-screen bg-background text-foreground antialiased'
        )}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

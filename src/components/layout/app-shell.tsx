'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { AppSidebar } from './app-sidebar';
import { Header } from './header';

export function isShellHidden(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith('/auth')) return true;

  const match = pathname.match(/^\/gigs\/([^/]+)/);
  if (match) {
    const segment = match[1];
    if (segment !== 'new' && segment !== 'join') {
      return true;
    }
  }

  return false;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useUIStore((s) => s.theme);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  // Sync theme with HTML documentElement class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = useAuthStore.getState().initialize?.();
    return () => {
      unsubscribe?.();
    };
  }, []);

  const hideShell = isShellHidden(pathname);
  const isAuthenticated = !!user && !loading;

  if (hideShell || !isAuthenticated) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

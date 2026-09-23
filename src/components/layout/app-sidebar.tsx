'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import {
  LayoutDashboard,
  Music,
  ListMusic,
  Radio,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { ThemeToggle } from './theme-toggle';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/songs', label: 'Songs', icon: Music },
  { href: '/setlists', label: 'Setlists', icon: ListMusic },
  { href: '/gigs', label: 'Gigs', icon: Radio },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useAuthStore((s) => s.signOut);

  async function handleSignOut() {
    await signOut();
    router.push('/auth/login');
    router.refresh();
  }

  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-stageBorder bg-surface h-screen sticky top-0 shrink-0">
      <div className="p-4 border-b border-stageBorder">
        <Link
          href="/dashboard"
          className="text-xl font-bold tracking-tight text-textPrimary"
        >
          Manch
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-textSecondary hover:text-textPrimary hover:bg-elevated'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-2 border-t border-stageBorder space-y-1">
        <div className="flex items-center justify-between px-3 py-1">
          <span className="text-xs text-textSecondary font-medium">Theme</span>
          <ThemeToggle />
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

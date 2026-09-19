'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  LayoutDashboard,
  Music,
  ListMusic,
  Radio,
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/auth-store';
import { ThemeToggle } from './theme-toggle';
import { cn } from '@/lib/utils/cn';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/songs', label: 'Songs', icon: Music },
  { href: '/setlists', label: 'Setlists', icon: ListMusic },
  { href: '/gigs', label: 'Gigs', icon: Radio },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split('@')[0] ||
    user?.email ||
    'Musician';

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-stageBorder bg-surface px-4">
      <div className="flex items-center gap-3">
        {/* Mobile Navigation Sheet Trigger */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-textPrimary hover:bg-elevated"
              aria-label="Open mobile navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-surface border-stageBorder flex flex-col">
            <SheetHeader className="p-4 border-b border-stageBorder text-left">
              <SheetTitle>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="text-xl font-bold tracking-tight text-textPrimary"
                >
                  Manch
                </Link>
              </SheetTitle>
            </SheetHeader>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      active
                        ? 'bg-stageAccent text-white font-medium'
                        : 'text-textSecondary hover:text-textPrimary hover:bg-elevated'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-3 border-t border-stageBorder space-y-2">
              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-xs text-textSecondary font-medium">Theme</span>
                <ThemeToggle />
              </div>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-stageDestructive hover:bg-stageDestructive/10 w-full transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Brand Link on Mobile */}
        <Link
          href="/dashboard"
          className="text-lg font-bold tracking-tight text-textPrimary md:hidden"
        >
          Manch
        </Link>
      </div>

      {/* User Info & Controls */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <span
              className="text-sm text-textSecondary max-w-[180px] truncate hidden sm:inline-block"
              title={user.email ?? displayName}
            >
              {displayName}
            </span>
          </div>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}

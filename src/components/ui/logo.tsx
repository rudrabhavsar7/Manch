'use client';

import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils/cn';

interface LogoProps {
  variant?: 'icon' | 'wordmark' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  'aria-label'?: string;
}

const sizeClasses = {
  icon: {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-10 h-10',
  },
  wordmark: {
    sm: 'h-5 w-auto',
    md: 'h-6 w-auto',
    lg: 'h-8 w-auto',
    xl: 'h-10 w-auto',
  },
  full: {
    sm: 'h-5 w-auto',
    md: 'h-6 w-auto',
    lg: 'h-10 w-auto',
    xl: 'h-12 w-auto',
  },
};

export function Logo({ 
  variant = 'icon', 
  size = 'md', 
  className, 
  'aria-label': ariaLabel = 'Manch' 
}: LogoProps) {
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';

  const iconSrc = isDark ? '/logo-icon-dark.svg?v=2' : '/logo-icon-light.svg?v=2';
  const wordmarkSrc = isDark ? '/logo-wordmark-dark.svg?v=2' : '/logo-wordmark-light.svg?v=2';

  if (variant === 'icon') {
    return (
      <img
        src={iconSrc}
        alt={ariaLabel}
        className={cn(sizeClasses.icon[size], className)}
        aria-label={ariaLabel}
      />
    );
  }

  if (variant === 'wordmark') {
    return (
      <img
        src={wordmarkSrc}
        alt={ariaLabel}
        className={cn(sizeClasses.wordmark[size], className)}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <img
      src={wordmarkSrc}
      alt={ariaLabel}
      className={cn(sizeClasses.full[size], className)}
      aria-label={ariaLabel}
    />
  );
}

export function LogoIcon({ size = 'md', className, 'aria-label': ariaLabel = 'Manch' }: Omit<LogoProps, 'variant'>) {
  return <Logo variant="icon" size={size} className={className} aria-label={ariaLabel} />;
}

export function LogoWordmark({ size = 'md', className, 'aria-label': ariaLabel = 'Manch' }: Omit<LogoProps, 'variant'>) {
  return <Logo variant="wordmark" size={size} className={className} aria-label={ariaLabel} />;
}

export function LogoFull({ size = 'md', className, 'aria-label': ariaLabel = 'Manch' }: Omit<LogoProps, 'variant'>) {
  return <Logo variant="full" size={size} className={className} aria-label={ariaLabel} />;
}
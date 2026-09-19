import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useUIStore } from '@/stores/ui-store';

describe('ThemeToggle component', () => {
  beforeEach(() => {
    useUIStore.setState({ theme: 'dark' });
  });

  it('renders sun icon when initial theme is dark', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument();
  });

  it('toggles theme from dark to light on click and updates useUIStore', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });

    fireEvent.click(button);

    expect(useUIStore.getState().theme).toBe('light');
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument();
  });

  it('toggles theme from light back to dark on subsequent click', () => {
    useUIStore.setState({ theme: 'light' });
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument();

    fireEvent.click(button);

    expect(useUIStore.getState().theme).toBe('dark');
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
  });
});

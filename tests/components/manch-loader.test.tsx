import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManchLoader } from '@/components/ui/manch-loader';

describe('ManchLoader', () => {
  it('renders with default props', () => {
    render(<ManchLoader />);
    const loader = screen.getByTestId('manch-loader');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('role', 'status');
    expect(loader).toHaveAttribute('aria-label', 'Loading');
    // SVG wordmark exists
    expect(loader.querySelector('svg')).toBeInTheDocument();
  });

  it('renders custom text', () => {
    render(<ManchLoader text="Connecting to stage..." />);
    expect(screen.getByText('Connecting to stage...')).toBeInTheDocument();
    const loader = screen.getByTestId('manch-loader');
    expect(loader).toHaveAttribute('aria-label', 'Connecting to stage...');
  });

  it('renders fullscreen overlay mode when fullscreen is true', () => {
    const { container } = render(<ManchLoader fullscreen text="Loading dashboard..." />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).toHaveClass('fixed', 'inset-0');
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
  });

  it('supports different sizes without crashing', () => {
    const { rerender } = render(<ManchLoader size="sm" />);
    expect(screen.getByTestId('manch-loader')).toBeInTheDocument();

    rerender(<ManchLoader size="lg" />);
    expect(screen.getByTestId('manch-loader')).toBeInTheDocument();

    rerender(<ManchLoader size="xl" />);
    expect(screen.getByTestId('manch-loader')).toBeInTheDocument();
  });
});

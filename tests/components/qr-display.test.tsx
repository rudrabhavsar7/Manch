import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QRDisplay } from '@/components/gigs/qr-display';

describe('QRDisplay', () => {
  it('renders SVG QR code container and role', () => {
    render(<QRDisplay value="1234" size={200} />);

    const container = screen.getByTestId('qr-display');
    expect(container).toBeInTheDocument();

    const img = screen.getByRole('img', { name: /gig qr code/i });
    expect(img).toBeInTheDocument();
  });
});

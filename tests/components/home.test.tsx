import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

describe('Home page component', () => {
  it('renders heading and subtitle correctly', () => {
    render(<Home />);

    const heading = screen.getByRole('heading', { level: 1, name: /manch/i });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Manch');

    const subtitle = screen.getByText(/live gig companion for musicians/i);
    expect(subtitle).toBeInTheDocument();
  });
});

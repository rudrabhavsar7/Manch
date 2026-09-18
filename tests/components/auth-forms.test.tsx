import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/login-form';
import { SignupForm } from '@/components/auth/signup-form';
import LoginPage from '@/app/auth/login/page';
import SignupPage from '@/app/auth/signup/page';

const mockPush = vi.fn();
const mockSignIn = vi.fn();
const mockSignUp = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: vi.fn((selector) =>
    selector({
      signIn: mockSignIn,
      signUp: mockSignUp,
    }),
  ),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form elements, headings, and sign-up link', () => {
    render(<LoginForm />);

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
    expect(screen.getByText(/sign in to your manch account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    const submitButton = screen.getByRole('button', { name: /^sign in$/i });
    expect(submitButton).toBeInTheDocument();

    const signupLink = screen.getByRole('link', { name: /sign up/i });
    expect(signupLink).toBeInTheDocument();
    expect(signupLink).toHaveAttribute('href', '/auth/signup');
  });

  it('submits form with user credentials and redirects to /dashboard on success', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValueOnce({ error: null });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'guitarist@band.com');
    await user.type(screen.getByLabelText(/password/i), 'secretchord123');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(mockSignIn).toHaveBeenCalledWith('guitarist@band.com', 'secretchord123');
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message and does not redirect when signIn fails', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValueOnce({ error: 'Invalid email or password' });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'guitarist@band.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(mockSignIn).toHaveBeenCalledWith('guitarist@band.com', 'wrongpass');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('disables submit button and shows loading text during submission', async () => {
    const user = userEvent.setup();
    let resolveSignIn: (value: { error: string | null }) => void;
    mockSignIn.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSignIn = resolve;
      }),
    );

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'guitarist@band.com');
    await user.type(screen.getByLabelText(/password/i), 'secretchord123');

    const submitButton = screen.getByRole('button', { name: /^sign in$/i });
    await user.click(submitButton);

    expect(screen.getByRole('button', { name: /signing in\.\.\./i })).toBeDisabled();

    resolveSignIn!({ error: null });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});

describe('SignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields, headings, and sign-in link', () => {
    render(<SignupForm />);

    expect(screen.getByText(/create account/i)).toBeInTheDocument();
    expect(screen.getByText(/join manch to sync with your band/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    const submitButton = screen.getByRole('button', { name: /^sign up$/i });
    expect(submitButton).toBeInTheDocument();

    const signinLink = screen.getByRole('link', { name: /sign in/i });
    expect(signinLink).toBeInTheDocument();
    expect(signinLink).toHaveAttribute('href', '/auth/login');
  });

  it('submits form with display name, email, password and redirects to /dashboard', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValueOnce({ error: null });

    render(<SignupForm />);

    await user.type(screen.getByLabelText(/display name/i), 'Jimi Hendrix');
    await user.type(screen.getByLabelText(/email/i), 'jimi@experience.com');
    await user.type(screen.getByLabelText(/password/i), 'stratocaster6');
    await user.click(screen.getByRole('button', { name: /^sign up$/i }));

    expect(mockSignUp).toHaveBeenCalledWith('jimi@experience.com', 'stratocaster6', 'Jimi Hendrix');
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays error message and does not redirect when signUp fails', async () => {
    const user = userEvent.setup();
    mockSignUp.mockResolvedValueOnce({ error: 'User already registered' });

    render(<SignupForm />);

    await user.type(screen.getByLabelText(/display name/i), 'Jimi Hendrix');
    await user.type(screen.getByLabelText(/email/i), 'jimi@experience.com');
    await user.type(screen.getByLabelText(/password/i), 'stratocaster6');
    await user.click(screen.getByRole('button', { name: /^sign up$/i }));

    expect(mockSignUp).toHaveBeenCalledWith('jimi@experience.com', 'stratocaster6', 'Jimi Hendrix');
    expect(await screen.findByRole('alert')).toHaveTextContent('User already registered');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('disables submit button and shows loading text during registration', async () => {
    const user = userEvent.setup();
    let resolveSignUp: (value: { error: string | null }) => void;
    mockSignUp.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSignUp = resolve;
      }),
    );

    render(<SignupForm />);

    await user.type(screen.getByLabelText(/display name/i), 'Jimi Hendrix');
    await user.type(screen.getByLabelText(/email/i), 'jimi@experience.com');
    await user.type(screen.getByLabelText(/password/i), 'stratocaster6');

    const submitButton = screen.getByRole('button', { name: /^sign up$/i });
    await user.click(submitButton);

    expect(screen.getByRole('button', { name: /creating account\.\.\./i })).toBeDisabled();

    resolveSignUp!({ error: null });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });
});

describe('LoginPage', () => {
  it('renders login page with main wrapper and login form', () => {
    const { container } = render(<LoginPage />);
    expect(container.querySelector('main')).toBeInTheDocument();
    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });
});

describe('SignupPage', () => {
  it('renders signup page with main wrapper and signup form', () => {
    const { container } = render(<SignupPage />);
    expect(container.querySelector('main')).toBeInTheDocument();
    expect(screen.getByText(/create account/i)).toBeInTheDocument();
  });
});

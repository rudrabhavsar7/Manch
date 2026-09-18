'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        setError(error);
        setLoading(false);
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md bg-surface border-stageBorder shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">Create account</CardTitle>
        <CardDescription>Join Manch to sync with your band</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Stage name or real name"
              className="bg-elevated border-stageBorder focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-elevated border-stageBorder focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="bg-elevated border-stageBorder focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none"
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full bg-stageAccent hover:bg-stageAccent/90 text-white"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-stageAccent underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

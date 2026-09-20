'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSupabase } from '@/hooks/use-supabase';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfilePage() {
  const [displayName, setDisplayName] = useState('');
  const [instrument, setInstrument] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useSupabase();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return;
        if (data) {
          setDisplayName(data.display_name ?? '');
          setInstrument(data.instrument ?? '');
          setRole(data.role ?? '');
        } else if (fetchError) {
          // If profile doesn't exist yet, seed with user metadata if available
          setDisplayName(user.user_metadata?.display_name ?? '');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user, supabase]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        display_name: displayName,
        instrument,
        role,
      })
      .eq('id', user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
    }, 2000);
  }

  return (
    <div className="container mx-auto p-4 max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-textPrimary">Profile</h1>
        <p className="text-sm text-textSecondary mt-1">Manage your musician details and band identity</p>
      </div>

      <Card className="bg-surface border-stageBorder shadow-none rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-textPrimary">Musician Profile</CardTitle>
          <CardDescription className="text-textSecondary">
            This information is shown to other band members during live gigs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm rounded bg-destructive/10 text-destructive border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-textPrimary font-medium">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jimi Hendrix"
              className="bg-elevated border-stageBorder text-textPrimary placeholder:text-textSecondary/50 focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instrument" className="text-textPrimary font-medium">
              Instrument
            </Label>
            <Input
              id="instrument"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              placeholder="Guitar, Vocals, Drums..."
              className="bg-elevated border-stageBorder text-textPrimary placeholder:text-textSecondary/50 focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="text-textPrimary font-medium">
              Role
            </Label>
            <Input
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Lead Guitarist, Vocalist..."
              className="bg-elevated border-stageBorder text-textPrimary placeholder:text-textSecondary/50 focus-visible:ring-2 focus-visible:ring-stageAccent shadow-none"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto bg-stageAccent hover:bg-stageAccent/90 text-white font-medium"
          >
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

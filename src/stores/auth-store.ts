import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const supabase = createClient();

  return {
    user: null,
    loading: true,

    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (data?.user) {
        set({ user: data.user, loading: false });
      }
      return { error: null };
    },

    signUp: async (email, password, displayName) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      if (error) return { error: error.message };
      if (data?.user) {
        set({ user: data.user, loading: false });
      }
      return { error: null };
    },

    signOut: async () => {
      try {
        await supabase.auth.signOut();
      } finally {
        set({ user: null, loading: false });
      }
    },

    initialize: () => {
      supabase.auth.getUser().then(({ data }) => {
        set({ user: data?.user ?? null, loading: false });
      }).catch(() => {
        set({ user: null, loading: false });
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          set({ user: session?.user ?? null, loading: false });
        },
      );

      return () => subscription.unsubscribe();
    },
  };
});

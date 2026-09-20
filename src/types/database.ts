export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface SongSection {
  type: 'verse' | 'chorus' | 'bridge' | 'outro' | 'intro' | 'instrumental' | 'custom';
  label: string;
  startLine: number;
  endLine: number;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          instrument: string;
          role: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string;
          instrument?: string;
          role?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          instrument?: string;
          role?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      songs: {
        Row: {
          id: string;
          title: string;
          artist: string;
          key: string;
          bpm: number | null;
          content: string;
          structure: SongSection[];
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          artist?: string;
          key?: string;
          bpm?: number | null;
          content?: string;
          structure?: SongSection[];
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          artist?: string;
          key?: string;
          bpm?: number | null;
          content?: string;
          structure?: SongSection[];
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'songs_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      setlists: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          privacy: 'public' | 'private';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          privacy?: 'public' | 'private';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          privacy?: 'public' | 'private';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'setlists_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      setlist_songs: {
        Row: {
          id: string;
          setlist_id: string;
          song_id: string;
          position: number;
        };
        Insert: {
          id?: string;
          setlist_id: string;
          song_id: string;
          position: number;
        };
        Update: {
          id?: string;
          setlist_id?: string;
          song_id?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'setlist_songs_setlist_id_fkey';
            columns: ['setlist_id'];
            isOneToOne: false;
            referencedRelation: 'setlists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'setlist_songs_song_id_fkey';
            columns: ['song_id'];
            isOneToOne: false;
            referencedRelation: 'songs';
            referencedColumns: ['id'];
          },
        ];
      };
      gigs: {
        Row: {
          id: string;
          name: string;
          admin_id: string;
          setlist_id: string;
          pin: string;
          status: 'draft' | 'live' | 'ended';
          created_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          admin_id: string;
          setlist_id: string;
          pin: string;
          status?: 'draft' | 'live' | 'ended';
          created_at?: string;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          admin_id?: string;
          setlist_id?: string;
          pin?: string;
          status?: 'draft' | 'live' | 'ended';
          created_at?: string;
          ended_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'gigs_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gigs_setlist_id_fkey';
            columns: ['setlist_id'];
            isOneToOne: false;
            referencedRelation: 'setlists';
            referencedColumns: ['id'];
          },
        ];
      };
      gig_members: {
        Row: {
          id: string;
          gig_id: string;
          user_id: string;
          role: 'admin' | 'co-admin' | 'musician';
          joined_at: string;
        };
        Insert: {
          id?: string;
          gig_id: string;
          user_id: string;
          role?: 'admin' | 'co-admin' | 'musician';
          joined_at?: string;
        };
        Update: {
          id?: string;
          gig_id?: string;
          user_id?: string;
          role?: 'admin' | 'co-admin' | 'musician';
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'gig_members_gig_id_fkey';
            columns: ['gig_id'];
            isOneToOne: false;
            referencedRelation: 'gigs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'gig_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      annotations: {
        Row: {
          id: string;
          user_id: string;
          song_id: string;
          type: 'inline' | 'general';
          line_number: number | null;
          content: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          song_id: string;
          type?: 'inline' | 'general';
          line_number?: number | null;
          content?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          song_id?: string;
          type?: 'inline' | 'general';
          line_number?: number | null;
          content?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'annotations_song_id_fkey';
            columns: ['song_id'];
            isOneToOne: false;
            referencedRelation: 'songs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'annotations_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      setlist_shares: {
        Row: {
          id: string;
          setlist_id: string;
          user_id: string;
          permission: 'view' | 'edit';
          shared_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          setlist_id: string;
          user_id: string;
          permission?: 'view' | 'edit';
          shared_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          setlist_id?: string;
          user_id?: string;
          permission?: 'view' | 'edit';
          shared_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'setlist_shares_setlist_id_fkey';
            columns: ['setlist_id'];
            isOneToOne: false;
            referencedRelation: 'setlists';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'setlist_shares_shared_by_fkey';
            columns: ['shared_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'setlist_shares_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

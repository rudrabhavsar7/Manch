# Manch — Live Gig Companion

Real-time setlist sync for musicians. PWA that works on any device.

## Features

- **Song Library** — manage lyrics & chords with column-aligned chords above lyrics
- **Setlist Management** — drag-and-drop reorder with `@dnd-kit`, private/public visibility, and sharing
- **Live Gig Sync** — WebRTC Star topology (LAN) + Supabase Realtime (cloud fallback) sub-100ms sync
- **Scroll Sync** — host-driven throttled scroll position broadcasting to all musicians
- **Personal Annotations** — inline ribbons & general notes, private per musician with offline support
- **Transpose** — per-musician non-destructive chord transposition
- **Auto-Scroll** — configurable teleprompter mode for hands-free stage performance
- **Co-Admin Promotion** — dynamic host delegation and role management
- **Offline First** — Dexie.js IndexedDB cache, write queue with automatic reconnect sync
- **Stage-First Design** — dark mode optimized with high-contrast amber/gold chord accents and 48px+ touch targets

## Tech Stack

- **Framework:** Next.js 15+ (App Router) & React 19
- **Backend:** Supabase (PostgreSQL, Row Level Security, Auth, Realtime)
- **Local Network Sync:** WebRTC Data Channels (STAR topology with QR/PIN signaling)
- **Styling:** Tailwind CSS + Radix UI / shadcn/ui
- **State Management:** Zustand
- **Local DB:** Dexie.js (IndexedDB)
- **PWA:** Serwist Service Worker with offline fallback
- **Testing:** Vitest, React Testing Library, Playwright E2E

## Getting Started

1. **Clone and install:**
   ```bash
   git clone <repo-url>
   cd Manch
   pnpm install
   ```

2. **Set up Supabase:**
   - Create a project at [supabase.com](https://supabase.com)
   - Copy Project URL and Anon Key into `.env.local`:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```
   - Apply migrations:
     ```bash
     pnpm supabase db push
     ```

3. **Run dev server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Run tests:**
   ```bash
   # Unit and component tests (Vitest)
   pnpm test

   # End-to-end tests (Playwright)
   pnpm test:e2e
   ```

5. **Build for production:**
   ```bash
   pnpm build
   ```

## Documentation

- [Product Requirements Document (PRD)](docs/PRD.md)
- [Design Specification](docs/superpowers/specs/2026-09-18-manch-design.md)
- [Implementation Plan](docs/superpowers/plans/2026-09-18-manch-implementation.md)
- [Design Language Guidelines](docs/design-language.md)
- [Repository Instructions & Agent Directives](AGENTS.md)

# Manch — Design Specification

> Live gig companion app for musicians. Real-time sync over LAN or cloud.

**Date:** 2026-09-18
**Status:** Approved (brainstorming complete)
**Author:** Auto-generated from brainstorming session

---

## 1. Problem Statement

During live gigs, musicians struggle to:

1. **Stay in sync** — when the lead picks a song, others scramble to find it on phones, notes, or memory
2. **Find song data** — lyrics, chords, structure (where to start/end, which sections to play)
3. **Track personal notes** — where to add fills, instrumental breaks, dynamic changes

These problems worsen with non-stop setlists where there's no time to search between songs.

## 2. Product Concept

A **PWA** that lets a band leader (admin) control the live gig flow while all connected musicians see the same active song in real-time — with personal annotations, transpose, and auto-scroll overlaid on their own screens.

### Core Principles

- **LAN-first sync** — works on shared WiFi without internet (WebRTC)
- **Cloud fallback** — Supabase Realtime when LAN isn't available
- **Offline-capable** — all gig data cached on join, viewable without any connection
- **Admin controls, musicians follow** — unidirectional authority model
- **Personal space** — each musician's annotations and transpose settings are private

## 3. Decisions Log

| Decision | Choice |
|---|---|
| Platform | PWA (web, installable) |
| Frontend framework | Next.js (React, SSR + API routes) |
| Backend | Supabase (Postgres + Realtime + Auth) |
| Real-time sync | WebRTC Data Channels (primary) + Supabase Realtime (fallback) |
| Song data source | Manual entry by admin |
| Auth method | Email + password (Supabase Auth) |
| Admin model | Single admin + promotable co-admins per gig |
| Offline support | Yes — cache on join, IndexedDB via Dexie.js |
| Sync behavior | Active song syncs from admin; scroll independent per musician with opt-in lock to admin |
| Content format | Chords inline above lyrics (Ultimate Guitar style) |
| Annotations | Inline markers on specific lines + general notes area per song |
| Team | Solo developer |
| Monetization | Deferred — build product first |
| Gig scale | 20 musicians per gig, designed to scale beyond |
| Visual theme | Dark default (stage mode), light for rehearsals, user toggle |
| Transpose | Yes — per musician per song |
| Auto-scroll | Optional teleprompter mode, per musician toggle, adjustable speed |
| Hosting | Vercel |
| Styling | shadcn/ui + Tailwind CSS |
| Deployment | Vercel (frontend) + Supabase (backend) |

## 4. Architecture

### 4.1 High-Level

```
┌─────────────────────────────────────────────────┐
│                    MANCH PWA                     │
│                  (Next.js + PWA)                 │
├─────────────┬───────────────┬───────────────────┤
│  UI Layer   │  Sync Engine  │  Offline Store    │
│  shadcn/ui  │  (WebRTC +    │  (IndexedDB via   │
│  Tailwind   │   Supabase    │   Dexie.js)       │
│             │   fallback)   │                   │
├─────────────┴───────┬───────┴───────────────────┤
│              State Manager (Zustand)             │
├─────────────────────┴───────────────────────────┤
│              Service Worker (PWA cache)           │
└─────────────────────────────────────────────────┘
                        │
            ┌───────────┼───────────┐
            ▼           ▼           ▼
      ┌──────────┐ ┌────────┐ ┌──────────┐
      │ Supabase │ │ WebRTC │ │  Local   │
      │  Cloud   │ │  P2P   │ │  Cache   │
      │(DB/Auth/ │ │ (LAN)  │ │(IndexedDB)│
      │ Storage) │ │        │ │          │
      └──────────┘ └────────┘ └──────────┘
```

### 4.2 Six Core Modules

| Module | Responsibility |
|---|---|
| **UI Layer** | Pages, components, responsive layout (shadcn/ui + Tailwind) |
| **Sync Engine** | Manages WebRTC connections + Supabase Realtime fallback. Single API surface — consumers don't know which transport is active |
| **Offline Store** | IndexedDB via Dexie.js — cached songs, setlists, queued annotation writes |
| **State Manager** | Zustand — client state (current song, scroll position, UI state). Fed by Sync Engine |
| **Service Worker** | PWA asset caching, background sync for queued writes |
| **Supabase Cloud** | Postgres DB, Auth, Realtime (signaling + fallback sync), Storage |

### 4.3 Key Principle

Sync Engine abstracts transport. UI code calls `syncEngine.broadcastSongChange(songId)` — doesn't know or care whether it goes over WebRTC or Supabase.

## 5. Data Model

### 5.1 Tables

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | Supabase Auth ID |
| email | text | Unique |
| display_name | text | |
| instrument | text | Guitar, Vocals, Drums, etc. |
| role | text | General role description |
| avatar_url | text | Nullable |
| created_at | timestamptz | |

#### `songs`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| title | text | |
| artist | text | |
| key | text | Musical key (Am, C, G#m, etc.) |
| bpm | integer | Nullable |
| content | text | Chord-annotated lyrics: `[Am]Word [G]word` format, parsed for display + transpose |
| structure | jsonb | Array of sections: `[{type: "verse", label: "Verse 1", startLine: 1, endLine: 8}, ...]` |
| owner_id | uuid (FK → users) | Creator/owner |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `setlists`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | text | |
| owner_id | uuid (FK → users) | |
| privacy | text | `'public'` or `'private'` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `setlist_songs`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| setlist_id | uuid (FK → setlists) | |
| song_id | uuid (FK → songs) | |
| position | integer | Order within setlist |

#### `gigs`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| name | text | |
| admin_id | uuid (FK → users) | Creator |
| setlist_id | uuid (FK → setlists) | |
| pin | text | 4-digit, unique among active gigs |
| status | text | `'draft'`, `'live'`, `'ended'` |
| created_at | timestamptz | |
| ended_at | timestamptz | Nullable |

#### `gig_members`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| gig_id | uuid (FK → gigs) | |
| user_id | uuid (FK → users) | |
| role | text | `'admin'`, `'co-admin'`, `'musician'` |
| joined_at | timestamptz | |

#### `annotations`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → users) | Owner — only they can see/edit |
| song_id | uuid (FK → songs) | |
| type | text | `'inline'` (pinned to line) or `'general'` (free-text per song) |
| line_number | integer | Nullable — only for `'inline'` type |
| content | text | Annotation text |
| color | text | Hex color for visual differentiation |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `setlist_shares`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| setlist_id | uuid (FK → setlists) | |
| user_id | uuid (FK → users) | Shared with |
| permission | text | `'view'` or `'edit'` |
| shared_by | uuid (FK → users) | |
| created_at | timestamptz | |

### 5.2 Row Level Security (RLS)

| Table | Policy |
|---|---|
| `songs` | Owner: full CRUD. Gig members: SELECT on songs in their active gig's setlist |
| `annotations` | `user_id = auth.uid()` — full CRUD own only, invisible to others |
| `gigs` | Admin/co-admin: UPDATE. Members: SELECT |
| `setlists` | Owner: full CRUD. Private setlists: only visible to owner + `setlist_shares` users. Public setlists: visible to members of gigs using that setlist |
| `gig_members` | Admin: INSERT/UPDATE/DELETE. Members: SELECT |
| `setlist_shares` | Setlist owner: full CRUD. Shared user: SELECT |

### 5.3 Key Data Decisions

- `songs.content` stores chords inline as `[Am]Word [G]word` — parseable for transpose, renderable as chords-above-lyrics
- `songs.structure` is JSON array of sections — enables section navigation in UI
- `gigs.pin` is short-lived, unique only among active gigs, recycled after gig ends
- `annotations` are per-user-per-song (not per-gig) — persist across gigs for the same song
- `songs.owner_id` — each admin owns their song library, songs are not global/shared

## 6. Sync Engine

### 6.1 Architecture

```
┌─────────────────────────────────────────────────────┐
│                   SYNC ENGINE                        │
│                                                      │
│  ┌─────────────┐    ┌──────────────────────────┐    │
│  │ Connection   │    │    Message Protocol       │    │
│  │ Manager      │    │                          │    │
│  │              │    │  SONG_CHANGE  {songId}   │    │
│  │ Decides:     │    │  SCROLL_SYNC  {pos, %}   │    │
│  │ WebRTC or    │    │  SETLIST_UPDATE {order}   │    │
│  │ Supabase?    │    │  MEMBER_ROLE  {role}      │    │
│  │              │    │  GIG_STATUS   {status}    │    │
│  │ Handles:     │    │  PING/PONG   (heartbeat) │    │
│  │ Reconnect    │    │                          │    │
│  │ Fallback     │    └──────────────────────────┘    │
│  │ Health check │                                    │
│  └──────────────┘                                    │
│                                                      │
│    ┌─────────────────────────────┐                   │
│    │      Transport Layer        │                   │
│    ├─────────────┬───────────────┤                   │
│    │  WebRTC     │  Supabase     │                   │
│    │  Provider   │  Provider     │                   │
│    │  (primary)  │  (fallback)   │                   │
│    └─────────────┴───────────────┘                   │
└─────────────────────────────────────────────────────┘
```

### 6.2 Message Protocol

```typescript
type SyncMessage =
  | { type: 'SONG_CHANGE';    songId: string; timestamp: number }
  | { type: 'SCROLL_SYNC';    position: number; percentage: number }
  | { type: 'SETLIST_UPDATE'; songIds: string[] }
  | { type: 'MEMBER_ROLE';    userId: string; role: 'co-admin' | 'musician' }
  | { type: 'GIG_STATUS';     status: 'live' | 'paused' | 'ended' }
  | { type: 'PING';           from: string }
  | { type: 'PONG';           from: string }
```

### 6.3 Message Routing

| Message | Sender | Receivers |
|---|---|---|
| `SONG_CHANGE` | Admin / Co-admin | All musicians |
| `SCROLL_SYNC` | Admin | Musicians with scroll-lock ON |
| `SETLIST_UPDATE` | Admin / Co-admin | All |
| `MEMBER_ROLE` | Admin | Target musician + all |
| `GIG_STATUS` | Admin | All |
| `PING/PONG` | Both directions | Peer health check |

### 6.4 WebRTC Topology — Star

```
            Musician 1
              ▲
              │
Musician 2 ◄──Admin──► Musician 3
              │
              ▼
            Musician 4
            ...up to 20
```

Admin is the hub. All messages flow through admin's device:
- Admin is the authority (controls active song, setlist order)
- Star scales better than mesh (20 connections vs 190 for full mesh)
- Single source of truth avoids conflicts
- Co-admin sends control messages to admin first, admin rebroadcasts

### 6.5 Connection Lifecycle

```
1. Admin starts Live Mode
   │
2. Try WebRTC signaling via Supabase
   ├── Success → WebRTC active (primary)
   │   └── Supabase Realtime stays warm (fallback)
   │
   └── Fail (no internet) → Show QR signaling flow
       └── QR scanned → WebRTC active (only transport)
   
3. During gig, Connection Manager monitors health
   │
   ├── WebRTC healthy → use it
   ├── WebRTC drops + internet available → auto-fallback to Supabase
   ├── WebRTC drops + no internet → attempt WebRTC reconnect over LAN
   └── Both down → show "offline" badge, cached data still viewable

4. Musician joins mid-gig
   └── Fetches current gig state (active song, setlist order)
       from admin peer (WebRTC) or DB (Supabase)
```

### 6.6 Scroll Sync Throttling

- Admin sends scroll position at **max 10 updates/sec** (100ms throttle)
- Client-side interpolation smooths between updates
- Musicians with scroll-lock OFF ignore these messages entirely

### 6.7 Dual Signaling

**Scenario A — Internet available (primary):**
Supabase Realtime as signaling server. Musicians open gig → WebRTC handshake happens automatically → internet can drop after connection established.

**Scenario B — Zero internet (QR-based):**
1. Admin taps "Start Local Gig"
2. App generates compact payload: `{ localIPs: [...], sessionKey: "abc123", gigId: "..." }`
3. Encoded as QR code
4. Musician scans QR → extracts admin's local IP
5. SDP offer/answer exchange for WebRTC handshake

> **Practical note:** For 20 musicians with zero internet, the most practical approach is admin creates a phone hotspot (no data plan needed — just local WiFi), everyone connects, Supabase handles signaling in seconds, then data can be turned off. WebRTC continues over WiFi. Sequential QR handshake (offer → scan → answer → scan back) works but is slower (~30s per musician).

## 7. Page Structure & User Flows

### 7.1 Routes

```
/                    → Landing / Login
/auth/signup         → Register
/auth/login          → Login

/dashboard           → Home (post-login)
/songs               → Song Library
/songs/new           → Create Song
/songs/[id]          → View/Edit Song

/setlists            → Setlist Library
/setlists/new        → Create Setlist
/setlists/[id]       → View/Edit Setlist

/gigs                → Gig History
/gigs/new            → Create Gig
/gigs/join           → Join Gig (PIN/QR)
/gigs/[id]           → Live Gig View ★

/profile             → Musician Profile
/settings            → App Settings (font size, theme, auto-scroll speed)
```

### 7.2 Flow: Admin Creates & Hosts a Gig

```
Dashboard → Songs (create/manage library)
  → Setlists (build setlist from songs)
  → Gigs → New Gig
    → Select setlist
    → Set gig name
    → Generate PIN + QR code
    → Share screen / QR to musicians
    → Start Live Mode
```

**Live Gig View (Admin):**
- Setlist sidebar: list of songs with active indicator, add/remove/reorder controls
- Main area: active song with title, artist, key, BPM, structure, chords-above-lyrics
- Controls: Previous/Next song, End Gig, Member count indicator

### 7.3 Flow: Musician Joins a Gig

```
Dashboard → Join Gig
  → Enter 4-digit PIN  OR  Scan QR
  → Loading screen: caching setlist + songs to IndexedDB
  → Live Gig View (Musician)
```

**Live Gig View (Musician):**
- Setlist sidebar (read-only): list of songs with active indicator
- Main area: active song with transpose applied, personal annotations visible
- Controls: Scroll Lock toggle, My Notes, Font Size, Connection status indicator (LAN/Cloud/Offline)

### 7.4 Song Editor

- Fields: Title, Artist, Key (dropdown), BPM
- Structure builder: add sections (Verse, Chorus, Bridge, Outro, Custom)
- Content editor: chords-above-lyrics format with live preview
- Preview mode to see rendered output

### 7.5 UX Decisions

| Decision | Rationale |
|---|---|
| Setlist sidebar always visible in live view | Quick glance at upcoming songs without losing current song |
| Connection indicator (LAN / Cloud / Offline) | Musician knows sync status at a glance |
| Font size persists per user | Different musicians, different distances from stand |
| Transpose is per-musician-per-song, saved to annotations | Guitarist in standard tuning, vocalist needs +2 — both see their version |
| Annotation color picker | Differentiate types: red = "watch out", green = "add fill", blue = "dynamics" |
| Auto-scroll toggle visible but not intrusive | One-tap ON/OFF with speed slider |
| Setlist sidebar collapsible on mobile | Full screen for lyrics on smaller phones |

## 8. Offline & Caching Strategy

### 8.1 Cache Layers

| Layer | Technology | Contents | Purpose |
|---|---|---|---|
| Service Worker | SW Cache API | App shell, JS, CSS, fonts, static assets | "Can I open the app?" |
| IndexedDB | Dexie.js | Songs, setlists, annotations, gig state, user profile, write queue | "Do I have the data?" |
| Memory | Zustand | Active song, scroll position, peer state, UI state | "What's happening right now?" |

### 8.2 Cache Timing

| Event | What's Cached | Where |
|---|---|---|
| App first load | App shell, JS, CSS, fonts, icons | Service Worker |
| User logs in | User profile, settings, preferences | IndexedDB |
| User opens Song Library | All user's songs | IndexedDB |
| User opens Setlists | All user's setlists + song refs | IndexedDB |
| **Musician joins gig** | **Entire setlist + all songs in it + structure** | **IndexedDB** |
| During gig | Active song, scroll position, peer connections | Zustand (memory) |
| Annotation created offline | Queued in write-ahead log | IndexedDB |

### 8.3 Write-Ahead Queue

```typescript
interface PendingWrite {
  id: string;
  table: 'annotations' | 'user_settings';
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, any>;
  created_at: number;
  retries: number;
}
```

On reconnect → flush queue to Supabase. Order preserved, conflicts resolved by timestamp (last-write-wins).

Only **annotations** and **user settings** are writable offline. Songs, setlists, gig config require Supabase.

### 8.4 Cache Invalidation

| Data | Strategy |
|---|---|
| Songs | Stale-while-revalidate. Show cached, fetch fresh in background. Compare `updated_at` |
| Setlist during gig | Admin pushes `SETLIST_UPDATE` via Sync Engine. Overwrite local |
| Annotations | Local-first. Push to Supabase when online. Last-write-wins by timestamp |
| App shell | SW checks for new version on load. Prompt "Update available" banner |

### 8.5 Offline Capabilities

| Feature | Works Offline? |
|---|---|
| View cached songs | ✅ |
| View cached setlist | ✅ |
| Create/edit annotations | ✅ (queued) |
| Transpose chords | ✅ (client-side) |
| Auto-scroll | ✅ (client-side) |
| Font size change | ✅ |
| Live sync (song changes) | ❌ Needs WebRTC (LAN) or Supabase (internet) |
| Create new songs | ❌ Needs Supabase |
| Join new gig | ❌ Needs Supabase or QR signaling |

## 9. Error Handling & Edge Cases

### 9.1 Connection Failures

| Scenario | Detection | Response |
|---|---|---|
| WebRTC peer drops (musician) | PONG timeout (5s) | "Reconnecting..." badge. Auto-retry 3× over 15s. LAN available → re-establish. Else → Supabase fallback |
| WebRTC peer drops (admin hub) | All musicians lose PONG | "Admin disconnected". Cached data viewable. Auto-retry. Co-admin can take over |
| Supabase goes down | Fetch/subscription errors | On WebRTC → no impact. Not on WebRTC → "Cloud offline" badge, cached data viewable |
| Both transports down | No PONG + no Supabase | "Offline mode" — read-only cached view. Annotations still writable (queued) |
| Musician joins mid-gig | New peer connection | Sync Engine sends full current state: active song, setlist order, gig status |
| Admin's device dies | Hub gone | Co-admin detects via PONG timeout → auto-promotes to hub → re-establishes star topology |
| 20 musicians join simultaneously | Signaling flood | Queue signaling — process 5 peer connections at a time, show join progress |

### 9.2 Data Edge Cases

| Scenario | Handling |
|---|---|
| Two co-admins change song simultaneously | Admin hub is authority. Last message received by hub wins. Broadcast resolves to single state |
| Annotation conflict (offline + online edit) | Last-write-wins by `updated_at` timestamp |
| Gig PIN collision | Generate PIN, check uniqueness against active gigs. Retry on collision |
| Song edited while gig is live | `SONG_UPDATED` message via Sync Engine. Musicians re-cache. "Song updated" toast |
| Browser tab closed during gig | On reopen: SW has cached app, IndexedDB has data. Rejoin sync via auto-reconnect |
| Musician reconnects after 10 min | Fetch current gig state from admin (WebRTC) or DB (Supabase). Jump to active song. Flush annotation queue |

### 9.3 Security

| Concern | Mitigation |
|---|---|
| PIN brute force | Rate limit: 5 attempts per IP per minute. PIN only valid for active gigs |
| Unauthorized gig access | Supabase RLS — must be in `gig_members` to read gig data. WebRTC: only authenticated members accepted |
| WebRTC data interception | DTLS encryption built into WebRTC data channels |
| Annotation privacy | RLS: `annotations.user_id = auth.uid()` |
| Co-admin abuse | Admin can demote co-admin at any time |

## 10. Testing Strategy

| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | Sync Engine message handling, transpose logic, chord parser, cache manager |
| Component | Vitest + React Testing Library | UI components, song renderer, setlist sidebar |
| Integration | Vitest | Sync Engine with mock WebRTC + mock Supabase, offline queue flush |
| E2E | Playwright | Full flows: signup → create song → build setlist → host gig → join gig → sync |
| Manual | Playwright MCP | Visual verification, responsive layout, dark/light theme |

### Critical Test Scenarios

1. Admin switches song → all musicians see change within 500ms
2. Musician goes offline → annotations saved → reconnect → annotations synced
3. WebRTC drops → auto-fallback to Supabase → sync continues seamlessly
4. 20 musicians join → all see same active song
5. Transpose +3 on key of Am → all chords shift correctly (Am→Cm, G→A#, etc.)
6. Font size change persists across sessions
7. Gig ended → data still viewable in gig history

## 11. Tech Stack Summary

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| State | Zustand |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (email/password) |
| Realtime (fallback) | Supabase Realtime (Broadcast) |
| Realtime (primary) | WebRTC Data Channels |
| Offline storage | Dexie.js (IndexedDB) |
| PWA | next-pwa / Serwist (Service Worker) |
| Testing | Vitest + React Testing Library + Playwright |
| Hosting | Vercel (frontend) + Supabase (backend) |
| Package manager | pnpm |

## 12. MVP Feature Set

1. **Auth** — email/password signup + login
2. **Song Library** — CRUD songs with chords-above-lyrics format
3. **Setlist Management** — create setlists from songs, reorder, public/private privacy
4. **Setlist Templates** — reuse setlists across gigs
5. **Gig Hosting** — create gig, select setlist, generate PIN + QR
6. **Gig Joining** — join via PIN or QR scan
7. **Live Sync** — WebRTC (primary) + Supabase (fallback), active song broadcast
8. **Dual Signaling** — Supabase-mediated (internet) + QR-based (zero internet)
9. **Scroll Sync** — opt-in lock to admin's scroll position
10. **Personal Annotations** — inline markers + general notes, private per musician
11. **Transpose** — per-musician-per-song chord transposition
12. **Auto-Scroll** — optional teleprompter mode with adjustable speed
13. **Offline Mode** — full gig data cached on join, viewable without connection
14. **BPM/Tempo** — indicator per song
15. **Musician Profiles** — instrument, role, display name
16. **Font Size Control** — adjustable, persisted per user
17. **Dark/Light Theme** — dark default (stage mode), toggle
18. **Gig History** — past gigs with setlists played
19. **Co-Admin** — admin can promote musicians during gig
20. **Connection Status** — visual indicator (LAN / Cloud / Offline)

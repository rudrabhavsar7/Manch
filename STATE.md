# Manch — Project State

> Living document. Update this file when milestones land, blockers appear, or priorities shift.

**Last updated:** 2026-10-02
**Last commit:** `4c02aee` — Revert "chore: log auth redirect cause at middleware, join and gig pages" (2026-09-30)

---

## What This Is

**Manch** — a PWA for live gig musicians. Band leader controls the setlist; every musician sees the same active song in real-time with personal transpose, annotations, and auto-scroll. LAN-first (WebRTC), cloud fallback (Supabase), offline-capable.

- PRD: `docs/PRD.md`
- Design spec: `docs/superpowers/specs/2026-09-18-manch-design.md`
- Design language: `docs/design-language.md`
- Implementation plan: `docs/superpowers/plans/2026-09-18-manch-implementation.md`

---

## Feature Status

### MVP (from PRD section 12) — Core done

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | Auth (email/password) | ✅ Done | Supabase Auth, login/signup pages |
| 2 | Song Library (chords-above-lyrics) | ✅ Done | `[Am]word` format, parser, editor |
| 3 | Setlist management (CRUD, reorder, privacy) | ✅ Done | dnd-kit, public/private |
| 4 | Setlist templates / reuse | ✅ Done | Multi-setlist queue (commit `16ec37e`) |
| 5 | Gig hosting (PIN + QR) | ✅ Done | QR display + scanner |
| 6 | Gig joining (PIN/QR) | ✅ Done | 4-digit PIN rate-limited |
| 7 | Live sync (WebRTC + Supabase fallback) | ✅ Done | Star topology, sync engine abstracts transport |
| 8 | Dual signaling (Supabase + QR) | ✅ Done | |
| 9 | Scroll sync (admin → musicians) | ✅ Done | Throttled 10/s, opt-in lock |
| 10 | Personal annotations (inline + general) | ✅ Done | Private per user, offline-queued |
| 11 | Transpose (per-musician per-song) | ✅ Done | Non-destructive |
| 12 | Auto-scroll (teleprompter) | ✅ Done | Configurable speed |
| 13 | Offline mode | ✅ Done | Dexie/IndexedDB, write-ahead queue |
| 14 | BPM/Key indicators | ✅ Done | |
| 15 | Musician profiles | ✅ Done | Instrument, role, display name |
| 16 | Font size control | ✅ Done | Persisted per user |
| 17 | Dark/Light theme | ✅ Done | Dark = Stage Mode (default), Light = Rehearsal |
| 18 | Gig history | ✅ Done | |
| 19 | Co-admin promotion | ✅ Done | Dynamic role management |
| 20 | Connection status indicator | ✅ Done | LAN / Cloud / Offline badge |

### Beyond MVP (shipped)

| Feature | Status | Commit / Notes |
|---------|--------|----------------|
| Mid-gig setlist swap (queue) | ✅ Done | `16ec37e` |
| Immersive photo viewer (phone) | ✅ Done | `c484bf2`, swipe nav `1fd8d5f` |
| Photo upload per song | ✅ Done | `photo-uploader.tsx`, `use-song-photos` |
| Admin setlist search in live gig | ✅ Done | `97140dd` |
| Mobile/tablet polish | ✅ Done | `841cf99`, 390px fixes `3ea73bb` |
| Load test (20 browsers) | ✅ Done | `docs/superpowers/specs/2026-09-24-load-testing-results.md` |
| Seed scripts (Desi/Dakla/Timli/Sanedo/3-Tali song books) | ✅ Done | `scripts/seed-*.mjs` |
| Brand identity (logo, PWA icons, favicons, OG) | 🟡 In progress | Uncommitted — see below |

---

## In-Progress / Uncommitted Work

**Brand identity integration** (started 2026-10-02, not committed):

- ✅ Wordmark SVGs updated to transparent versions `manch-05-wordmark-transparent-for-{dark,light}.svg` (clean transparent background, no black box)
- ✅ Glyph SVGs copied to `public/logo-icon-{dark,light}.svg` (from `manch-logos/` manch-01)
- ✅ PNG backups copied to `public/logo-*-{dark,badge}.png`
- ✅ PWA icon matrix generated: `scripts/generate-pwa-icons.ts` → 16 icons (8 sizes × standard + maskable), favicons, apple-touch, `og-image.png`
- ✅ `src/components/ui/logo.tsx` — theme-aware Logo component (Icon / Wordmark / Full) with `?v=2` cache-busting
- ✅ Applied across entire app: landing hero, login/signup forms, mobile header & drawer, and desktop sidebar (`app-sidebar.tsx`)
- ✅ `layout.tsx` metadata: icons, OG/Twitter cards, `metadataBase`
- ✅ `manifest.json`: full icon matrix + shortcuts
- ✅ Build passes, 418/418 tests pass
- ⬜ **Not committed yet** — awaiting final user visual confirmation
- ⬜ User validating logo visually on localhost:3000

**Manual QA checklist:**
- [x] Landing page logo correct (transparent wordmark `manch.`)
- [x] Auth pages logo correct (transparent wordmark `manch.`)
- [x] Header logo correct (icon + text)
- [x] Desktop sidebar logo correct (icon + text)
- [ ] Favicon renders in browser tab
- [ ] PWA install prompt shows correct icon
- [ ] Light mode logo variant correct

---

## Known Issues

| Issue | Severity | Notes |
|-------|----------|-------|
| `see_image` tool fails (vision model unreachable) | Low | `opencode-see-image` plugin: fallback `opencode/mimo-v2.5-free` has no vision. Fix: configure vision provider in `opencode.jsonc` |
| ESLint: Next.js plugin not detected | Low | Pre-existing; migrate `next lint` → ESLint CLI |
| ESLint warnings: `<img>` in photos + logo | Low | Pre-existing in photo components; logo uses `<img>` intentionally (SVG public files) |
| Unused vars: `initialPhotoIds`, `GigStatus` | Low | Pre-existing, cosmetic |
| README.md has encoding issues (mojibake) | Low | `—` chars corrupted; `// force deploy` appended |

---

## Test Status

- **Unit/component:** 418/418 passing (`pnpm test`)
- **E2E:** Playwright suite present (`pnpm test:e2e`) — last run: mid-gig setlist swap coverage (`9a6380a`)
- **Build:** `pnpm build` passes
- **Lint:** passes (pre-existing warnings only)

---

## Recent Commits (last 10)

```
4c02aee Revert "chore: log auth redirect cause at middleware, join and gig pages"
ac05218 chore: log auth redirect cause at middleware, join and gig pages
9a6380a test: e2e coverage for mid-gig setlist swap, keep-active-song, queue remove/re-add
16ec37e feat: swap setlists mid-gig with multi-setlist queue
1fd8d5f feat: swipe to change songs in phone photo viewer, stay in photo mode
c484bf2 feat: immersive photo-first viewer for phones, replaces broken fullscreen
b2ca7dd feat: seed script for Desi (2 Tali) book, 70 songs append-only with photo upload
2acf39a test: remove stale prod debug specs, harden e2e login against hydration race
841cf99 fix: app-wide mobile polish for phone and tablet
32deb3e fix: annotation and photo controls reachable on touch devices
```

---

## Next Steps (proposed priority)

1. **Finish brand identity** — user confirms logo → commit branding work
2. **Brand guidelines doc** — `docs/brand-guidelines.md` (logo usage, colors, type)
3. **Release/Polish pass** — fix low-severity README encoding, clean unused vars
4. **PWA install QA** — verify install prompt + maskable icons on Android/iOS
5. **Monetization / deployment decisions** — deferred per PRD (solo dev, ship first)

---

## Key Commands

```bash
pnpm dev              # dev server
pnpm build            # production build
pnpm test             # unit + component (Vitest)
pnpm test:e2e         # Playwright E2E
pnpm lint             # ESLint
npx tsx scripts/generate-pwa-icons.ts   # regenerate PWA icons from SVGs
```

---

## Conventions

- Commits: conventional (`feat:`, `fix:`, `test:`, `chore:`)
- Package manager: pnpm
- State: Zustand; Offline: Dexie; Backend: Supabase
- Design language: `docs/design-language.md` (amber chords = signature color)

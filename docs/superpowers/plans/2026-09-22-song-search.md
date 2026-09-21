# Song Search Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a responsive, musician-focused search and filtering system for the Songs library (`/songs`) supporting title, artist, key, and lyrics search with key filters, sorting, keyboard shortcuts, and URL query synchronization.

**Architecture:** 
1. Build a high-performance client component `SongList` in `src/components/songs/song-list.tsx` that manages search query, key filter, sort option, and renders filtered `SongCard` components.
2. Update `src/app/songs/page.tsx` to pass server-fetched repertoire into `SongList`, supporting `searchParams` (`?q=`) for direct navigation.
3. Add search input and filter controls adhering to Manch's dark stage aesthetic per `frontend-design` skill.
4. Comprehensive unit tests for search, filter, sort, and empty states in `tests/components/song-list.test.tsx` and existing `tests/components/songs-pages.test.tsx`.

**Tech Stack:** Next.js 15, React 19, Lucide React, Tailwind CSS, Vitest, React Testing Library.

---

### Task 1: Create SongList Component with Search, Key Filter, and Sorting

**Files:**
- Create: `src/components/songs/song-list.tsx`
- Test: `tests/components/song-list.test.tsx`

**Features:**
- Real-time search across `title`, `artist`, `key`, and `content` (lyrics/chords).
- Clear button (`X`) when query is present.
- Filter by musical Key (All, Am, C, Dm, G, Em, etc.).
- Sort options: Recently Updated, Title (A-Z), Title (Z-A), Key, BPM.
- Results count badge ("Showing X of Y songs").
- Keyboard shortcut (`/`) to focus search input.
- Empty search state with "Clear search" CTA when no songs match.

### Task 2: Integrate SongList into `/songs` Page

**Files:**
- Modify: `src/app/songs/page.tsx`
- Test: `tests/components/songs-pages.test.tsx`

**Features:**
- Support initial query from `searchParams` (e.g. `/songs?q=garba`).
- Pass fetched user songs to `SongList`.
- Preserve server-side authentication and empty-library state.

### Task 3: Verification & Visual Proof

**Files:**
- Run Vitest tests (`npx vitest run tests/components/song-list.test.tsx`, `npx vitest run tests/components/songs-pages.test.tsx`).
- Run full Next.js build (`npm run build`).
- Verify live in browser using Playwright MCP: navigate to `https://manch-live.vercel.app/songs` or local test, test searching across the 207 Garba songs, capture screenshot.

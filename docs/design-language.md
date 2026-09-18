# Manch — Design Language

> Stage-first. Musician's tool. Quiet chrome, loud content.

**Status:** Approved
**Date:** 2026-09-18

---

## Principles

1. **Stage-first readability** — #1 job is being read from a music stand at arm's length. Large, high-contrast text. No decorative noise competing with lyrics.
2. **Musician's tool, not a consumer app** — Purposeful, utilitarian with refined details. Think Ableton Live, not Spotify.
3. **Quiet chrome, loud content** — Navigation and controls recede. Song content fills the screen. During a live gig, the UI should almost disappear.
4. **Ink on paper, digitized** — Inspired by printed chord charts and lead sheets musicians already use.
5. **Spend boldness in one place** — Amber/gold chords are the one distinctive visual element. Everything else stays disciplined and quiet.

---

## Color Tokens

### Dark Theme (Stage Mode — Default)

| Token | Hex | CSS Variable | Role |
|---|---|---|---|
| Background | `#0C0C0E` | `--bg-stage` | Primary background |
| Surface | `#161619` | `--bg-surface` | Cards, sidebar, elevated surfaces |
| Elevated | `#1E1E22` | `--bg-elevated` | Inputs, interactive areas |
| Text Primary | `#E8E6E3` | `--text-primary` | Lyrics, headings, primary text |
| Text Secondary | `#8A8A8F` | `--text-secondary` | Metadata, labels, muted text |
| Chords | `#E2B55A` | `--color-chord` | Chord notation above lyrics |
| Accent | `#4A9EE5` | `--color-accent` | Interactive elements, links, active states |
| Active Song | `#2D6A4F` | `--color-active` | Active song highlight in setlist |
| Destructive | `#D64545` | `--color-destructive` | End gig, delete actions |
| Border | `#1E1E22` | `--color-border` | Subtle borders on cards |

### Light Theme (Rehearsal Mode)

| Token | Hex | CSS Variable | Role |
|---|---|---|---|
| Background | `#F5F3EF` | `--bg-stage` | Warm paper tone |
| Surface | `#EDEAE4` | `--bg-surface` | Cards, sidebar |
| Elevated | `#E2DFD9` | `--bg-elevated` | Inputs |
| Text Primary | `#1A1A1E` | `--text-primary` | Dark text on light bg |
| Text Secondary | `#6B6B70` | `--text-secondary` | Muted text |
| Chords | `#B8862D` | `--color-chord` | Darker amber for light bg contrast |
| Accent | `#3A7EBB` | `--color-accent` | Deeper blue for light bg |
| Active Song | `#C5E5D5` | `--color-active` | Soft green highlight |
| Destructive | `#D64545` | `--color-destructive` | Same red |
| Border | `#D5D2CC` | `--color-border` | Subtle borders |

---

## Typography

### Fonts

- **JetBrains Mono** — Chords and technical metadata (BPM, key). Monospace ensures chord alignment above lyrics regardless of chord name length. Mimics printed chord charts.
- **Inter** — Everything else (lyrics, headings, navigation, labels). Clean, readable at any size, excellent screen rendering.

### Type Scale

| Role | Font | Weight | Size | Notes |
|---|---|---|---|---|
| Chords | JetBrains Mono | 600 (SemiBold) | Scales with user font-size preference | Colored `--color-chord` |
| Lyrics | Inter | 400 (Regular) | Scales with user font-size preference | Colored `--text-primary` |
| Song title | Inter | 700 (Bold) | 24px mobile / 28px desktop | |
| Song artist | Inter | 400 (Regular) | 16px | Colored `--text-secondary` |
| Section markers | Inter | 600 (SemiBold) | 13px, uppercase, `0.05em` letter-spacing | e.g., `── Chorus ──` |
| Navigation labels | Inter | 500 (Medium) | 14px | |
| Metadata (BPM, key) | JetBrains Mono | 400 (Regular) | 13px | |
| Badge text | Inter | 500 (Medium) | 12px | |

### Line Height

- Lyrics: `1.8` — generous spacing for stage readability
- Body text (non-gig pages): `1.6`
- Headings: `1.3`

---

## Layout

### Live Gig View (Main Screen)

```
┌─────────────────────────────────────────┐
│ [≡]  Gig Name              PIN:1234 [⚡]│  ← thin top bar (48px)
├────────┬────────────────────────────────┤
│SETLIST │                                │
│        │  Song Title                    │
│ 1. ●── │  Artist Name                  │
│ 2. ○   │  Am · 120 BPM                 │
│ 3. ○   │                               │
│ 4. ○   │  Am        G                  │
│ 5. ○   │  Lyrics flow here             │
│ 6. ○   │  C         F                  │
│        │  words on a page              │
│        │                               │
│        │  ── Chorus ──────────────      │
│        │                               │
│        │  G         Am                 │
│        │  Chorus lyrics here           │
├────────┴────────────────────────────────┤
│  [◄ Prev]     3 / 12     [Next ►] [End]│  ← controls (56px)
└─────────────────────────────────────────┘
```

- **Setlist sidebar:** 56px mobile, 240px desktop. Just numbers + dots. Active song = filled `●`. Collapsible on mobile via hamburger.
- **Song content:** Left-aligned. No card wrapping. Text directly on background. Full canvas.
- **Controls:** Bottom bar, thumb-reachable zone.
- **No shadows anywhere in the live view.**

### Section Markers in Songs

```
  Am        G
  Last line of verse

  ── Chorus ──────────────────────────

  G         Am
  First line of chorus
```

Hairline rule with section name. Centered. Not a colored banner — just structural information.

### Annotations

```
  Am        G
  ┃ add extra fill here         ← 3px left border in annotation color
  Lyrics continue here              small text, reduced opacity
```

Thin left border + small text. Minimally intrusive. Color-coded (amber, red, green, blue, purple, orange).

### Non-Gig Pages (Dashboard, Song Library, Setlists)

- Card-based grid layout
- Cards: `1px` border `--color-border`, `8px` border-radius, no shadows
- Content: left-aligned, max-width `640px` for text content
- Spacing: `16px` gap between cards, `24px` section spacing

### Mobile Navigation

- Bottom tab bar (Dashboard, Songs, Setlists, Gigs, Profile)
- 5 icons, active tab highlighted with `--color-accent`
- NOT shown during live gig view (full screen for performance)

### Desktop Navigation

- Left sidebar, 224px wide, fixed
- Vertical nav links with icons
- NOT shown during live gig view

---

## Component Styling

### Buttons

- **Primary:** `--color-accent` background, white text, `8px` radius
- **Outline:** transparent bg, `1px` border `--color-border`, `8px` radius
- **Ghost:** no border, no bg, hover shows subtle `--bg-elevated`
- **Destructive:** `--color-destructive` background, white text

### Cards

- `--bg-surface` background
- `1px` border `--color-border`
- `8px` border-radius
- No shadows
- Hover: slight bg shift to `--bg-elevated`

### Badges

- Small, rounded-full (`9999px` radius)
- Outlined or filled depending on context
- Key/BPM badges: `--bg-elevated` bg, `--text-secondary` text
- Status badges: green for live, gray for ended, amber for draft

### Inputs

- `--bg-elevated` background
- `1px` border `--color-border`
- `8px` border-radius
- Focus ring: `2px` `--color-accent`

---

## Motion

- **Allowed:** Page transitions (subtle fade, 150ms). Scroll behavior (smooth). Toast notifications (slide up, 200ms). Sheet/dialog open-close.
- **Not allowed:** Staggered card animations. Hover scale effects. Parallax. Background animations. Anything that draws attention during a live performance.
- **Reduced motion:** Respect `prefers-reduced-motion`. Disable all transitions.

---

## Accessibility

- WCAG AA contrast ratios on all text (verified: `#E8E6E3` on `#0C0C0E` = 15.2:1, `#E2B55A` on `#0C0C0E` = 8.9:1)
- Keyboard focus visible on all interactive elements (`2px` outline `--color-accent`)
- Touch targets minimum `44px` for all buttons in live gig view
- Font size user-adjustable 12px–32px

---

## Writing Style

- **Sentence case** everywhere (no ALL CAPS labels except section markers in songs)
- **Active voice** for buttons: "Save song", "Join gig", "End gig"
- **No filler:** Empty states give direction, not apology ("No songs yet. Create your first song.")
- **Errors are specific:** "No active gig found with this PIN" not "Something went wrong"

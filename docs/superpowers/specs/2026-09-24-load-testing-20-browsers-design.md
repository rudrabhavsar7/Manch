# 20-Browser Real-Time Load Testing Design Specification

- **Date:** 2026-09-24
- **Author:** Antigravity / Pair Programming
- **Target Environment:** Localhost (`http://localhost:3000`)
- **Status:** Approved / Ready for Implementation Planning

---

## 1. Problem Statement & Goals

The Manch platform coordinates real-time gig sessions between a host and multiple band members. Band members join via a 4-digit PIN, observe live song selections, view real-time transpositions, and maintain persistent presence.

This load testing harness validates:
1. **Concurrency Stability:** Manch running smoothly with 20 distinct, headless Chrome browser instances active simultaneously.
2. **Authentication Under Load:** Concurrent authentication for 20 distinct users without session collision, cookie race conditions, or Supabase Auth rate-limiting failures.
3. **Real-Time Broadcast & Subscription Scaling:** 1 Host and 19 Band Members subscribed to Supabase Realtime Postgres change / broadcast channels for a live gig.
4. **Latency Benchmarks:** Quantitative measurement of song switch and chord transposition propagation latency across all 19 connected musician clients.

---

## 2. Architecture & Components

### 2.1 Orchestrator Script (`scripts/load-test-20-clients.mjs`)
A standalone Node.js script using ESM and Playwright (`@playwright/test` / `chromium`).
- **Database Provisioner (`pg.Client`)**: Connects to Postgres database to seed test users and configure a dedicated test gig.
- **Process Orchestrator**: Launches 20 headless Chromium instances with staggered intervals (150ms) to prevent operating system process/thread exhaustion.
- **Barrier Coordinator**: Coordinates synchronous phase transitions (All Logged In -> All Joined -> Live Sync Executed -> Teardown).
- **Metrics Collector**: Collects high-resolution timestamps (`performance.now()`) for each client action and calculates p50, p95, and max latencies.

### 2.2 Test User Provisioning
Pre-seeds 20 accounts in `auth.users` and `public.users`:
- **Host Account:**
  - Email: `loadtest_host@manch.app`
  - Role: `admin`
  - Password: `Password123!` (bcrypt `$2a$10$buUGKz.eBCjj9BaCKFo.buKZhM/GqW9REgA691fNVhOxcfysSBO6q`)
  - Auto-confirmed email
- **Musician Accounts (19 total):**
  - Emails: `loadtest_01@manch.app` through `loadtest_19@manch.app`
  - Display Names: `Load Musician 01` .. `Load Musician 19`
  - Role: `musician`
  - Password: `Password123!`
  - Auto-confirmed email

### 2.3 Test Gig & Setlist Provisioning
- Dedicated Gig ID: `30000000-0000-0000-0000-000000000099`
- Title: `Load Test Live Gig (20 Clients)`
- Status: `live`
- PIN: `7788`
- Setlist: At least 2 songs with chords and lyrics (e.g., *Kabira* and *Channa Mereya*)
- Pre-run cleanup: Deletes existing rows in `public.gig_members` for this gig ID to ensure deterministic join behavior.

---

## 3. Detailed Execution Flow

```
[Start Test]
      │
      ▼
[Reset & Seed DB] ─── Seed 20 accounts & Gig PIN 7788
      │
      ▼
[Phase 1: Host Launch]
      │
      ├─► Launch Host Chromium browser
      ├─► Login as loadtest_host@manch.app
      ├─► Navigate to /gigs/30000000-0000-0000-0000-000000000099
      └─► Open Band Members drawer
      │
      ▼
[Phase 2: Concurrent Musician Launch & Join (19 Clients)]
      │
      ├─► Staggered launch 19 Chromium headless instances (150ms delay)
      ├─► Concurrent Login: POST /auth/login for all 19 clients
      ├─► Concurrent Join: Navigate to /gigs/join, enter PIN 7788, click Join
      ├─► Barrier: All 19 clients reach /gigs/30000000-0000-0000-0000-000000000099
      └─► Host UI Verification: Band Members count reflects 19 active musicians
      │
      ▼
[Phase 3: Real-Time Sync Under 20-Client Load]
      │
      ├─► Action A: Host selects next song in setlist
      │     └─► Barrier: Measure latency until all 19 musicians display new song title
      │
      ├─► Action B: Host transposes chord key (+1 semitone)
      │     └─► Barrier: Measure latency until all 19 musicians display transposed chord
      │
      ▼
[Phase 4: Teardown & Reporting]
      │
      ├─► Close all 20 browser instances cleanly (in finally block)
      ├─► Calculate & print latency summary table (p50, p95, max)
      └─► Output pass/fail SLA verdict (< 2000ms sync propagation target)
```

---

## 4. Resilience & Error Handling

1. **Per-Operation Timeouts**:
   - Navigation & Login: 20 seconds timeout per client.
   - Gig Join via PIN: 20 seconds timeout per client.
   - Real-Time Sync Propagation: 10 seconds timeout per client.
2. **Failure Isolation**:
   - Individual client promises use `.catch()` wrappers so one slow or stalled browser does not prevent others from completing metrics collection.
   - Failed client IDs and error stacks are recorded in the test summary report.
3. **Guaranteed Cleanup**:
   - Master `try ... finally` block guarantees `await Promise.allSettled(browsers.map(b => b.close()))` is executed regardless of uncaught exceptions.
   - DB connection is closed cleanly.

---

## 5. Metrics & SLA Targets

| Metric | Target SLA | Description |
|---|---|---|
| Launch & Ramp-Up | < 10s | Time to initialize all 20 headless Chromium instances |
| Parallel Login Latency (p95) | < 3000ms | Supabase Auth roundtrip under 20 concurrent requests |
| Parallel Gig Join Latency (p95) | < 3000ms | Gig join + initial setlist fetch under 19 concurrent joins |
| Realtime Song Sync (p95) | < 1500ms | Host song change propagation to 19 musicians |
| Realtime Transpose Sync (p95) | < 1500ms | Host transpose change propagation to 19 musicians |
| Success Rate | 100% (20/20) | All clients complete scenario without unhandled crashes |

---

## 6. Implementation Plan Next Steps

Upon approval of this design specification:
1. Commit spec to git repository.
2. Invoke `writing-plans` skill to generate the implementation steps:
   - SQL seed script for 20 accounts & test gig.
   - Standalone runner script with staggered launch & synchronization barriers.
   - Execution against local dev server and verification of metrics output.

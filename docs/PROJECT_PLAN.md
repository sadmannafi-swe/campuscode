# CampusCode — analysis, architecture and checklist

## 1. Supplied design (PPTX, 16 slides) → implemented screens

Design language taken from the deck: Ink `#101820`, Paper `#F5F4EF`, Lime `#B7F36B`, Slate `#708090`, Border `#E5E4DC`, plus the deck's dark surfaces `#17222B` / `#202D37` / `#2B3944`. Mono-forward metadata (JetBrains Mono), lime as the single accent, flat bordered cards, no gradients.

| Slide | Screen in the deck | Route / component |
|---|---|---|
| 1 | Hero: "CampusCode, ready to run." + live `main.c` card | `/` (guest) — `HomePage › Landing` |
| 2 | Desktop IDE: C/Python pills, "● Saved", Run, editor + Custom input + Output | `/ide` (≥1024px) |
| 3 | Mobile full-screen IDE, persistent Run, input on demand | `/ide` (<1024px): Editor / Input / Output tabs + Run bar |
| 4 | Problem list with topic / difficulty / status filters | `/problems` |
| 5 | Problem statement + dark "Solve in IDE" card | `/problems/:slug` |
| 6 | Dark "Turn an idea into a challenge" form | `/problems/new`, `/problems/:slug/edit` (`ProblemForm`) |
| 7 | Run output / compile error / Accepted verdict cards | `components/ide/OutputPanel` (`VerdictCard`) |
| 8 | "33 videos. One visible path." chapter-range roadmap | `/learn/c-programming` (`CRoadmap`) |
| 9 | Bangla explanation + code card + output card | `/learn/:course/:lesson` (English/বাংলা toggle) |
| 10 | Topic practice cards with progress | `/practice`, `/practice/:topic` |
| 11 | "Python, kept secondary by design." | `/learn/python-programming` (`PythonCourse`) |
| 12 | Recent code / Continue learning / Daily problem | `/` (signed in) — `Dashboard` |
| 13 | Searchable saved snippets | `/snippets` (Saved + History tabs) |
| 14 | Identity card + preferences (language, theme, font size, auto-save) | `/profile`, `/profile/settings` |
| 15 | Five-destination bottom nav, IDE raised in the centre | `components/layout/AppShell › BottomNav` |
| 16 | Separate admin: sidebar + problem management | `/admin/*` (`AdminApp`) |

Deviations, deliberately: slide 8 says "33 videos" but the supplied curriculum lists 32 items — the roadmap follows the 32-item list and the heading uses the real lesson count. The deck uses Montserrat/Inter; headings use Manrope per the written brief.

## 2. Architecture

```
Browser (React SPA on Vercel)
  ├─ supabase-js (anon key + user JWT) ──► PostgREST ──► Postgres with RLS
  │                                         └─ RPCs: progress, daily problem, admin_* (re-check is_admin())
  ├─ Supabase Auth (email/password, reset, confirmation)
  ├─ Supabase Storage (avatars/<uid>/…)
  └─ fetch /functions/v1/execute | submit ──► Edge Functions (Deno, service role)
                                               ├─ validate, size-limit, rate-limit (code_execution_logs)
                                               ├─ Judge0 batch submit + poll (secrets server-side)
                                               └─ insert submissions/logs ─► triggers update stats, streaks,
                                                  solved counts, problem counters, achievements, notifications
```

## 3. Feature checklist

| Area | Status |
|---|---|
| Brand system, logo variants, fonts, responsive shell, bottom nav | Done |
| Auth: register (name, email, password + confirm, terms), login, show/hide password, forgot/reset, logout, session persistence | Done |
| Developer credit `<Developed By Sadman Nahial Nafi />` on Sign in, Sign up, Profile | Done |
| IDE: C/Python, highlighting, line numbers, bracket matching, auto-indent, format, copy, reset, full screen, stdin, run, errors, time/memory | Done |
| IDE: save / save as / open / recent / examples, per-language drafts, auto-save, Ctrl+Enter / Ctrl+S | Done |
| Problems: search, topic/difficulty/status/source filters, sort, acceptance, solved state | Done |
| Problem detail, hints, bookmarks, reports, own submissions | Done |
| Run samples vs Submit (all tests incl. hidden, server-side verdicts, 7 verdict types) | Done |
| Community problems: create/edit/delete, private/public, moderation flow, notifications | Done |
| C course (32 lessons, EN + BN), Python course (12 lessons, EN + BN), progress, resume, mark complete | Done |
| Topic practice with per-topic progress and related lessons | Done |
| Snippets page (search, filter, open, rename, delete) + execution history | Done |
| Profile: stats, streaks, heatmap, achievements, solved list, learning progress, preferences, avatar, password | Done |
| Admin: dashboard, users (search, suspend, roles), problems (hidden tests, approve/reject/remove/feature), lessons (bilingual + examples), roadmap (courses/chapters), reports, announcements, platform switches | Done |
| RLS + guard triggers + tests | Done (`npm run test:db`) |
| README, env example, deployment + production checklist | Done |

## 4. Verification performed

- `tsc -b` and `vite build` clean.
- 5 migrations + seed applied to a real Postgres 16 with a Supabase-compatible stub; security tests cover hidden-test secrecy, self-promotion, forged verdicts/stats/achievements, self-publishing, suspended users, streak math, achievement awarding, admin RPCs and the community-problems switch.
- Every lesson example and every problem reference solution compiled/run during seed generation; C and Python references agree on all 178 tests.
- Edge Functions pass `deno check`; the Judge0 client passes integration tests against a local Judge0-compatible fake (stdin, UTF-8, compile errors, runtime errors, TLE, >20-item batch ordering).
- UI exercised in Chromium at 1440px and 390px against a mock of the Supabase API serving the real seeded rows (with real local code execution): no console errors, no horizontal overflow, English and Bangla.

## 5. Not verified / open items

- No live Supabase project or Judge0 credentials were available, so the app has not run end-to-end against the hosted services. Follow the README checklist after creating them.
- Problem *input/output format*, *constraints* and *explanation* fields are English-only in the seed (titles and statements are bilingual).
- The admin dashboard UI is English-only (internal tool); all student-facing UI is bilingual.
- Lessons are text + runnable examples. `lessons.video_url` exists, but the playlist's video URLs were not supplied.

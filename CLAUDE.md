# CLAUDE.md — Smart Order Builder (permanent rules)

You are helping **Md. Shahidur Rahman** (CSE student, Dhaka) build the DevsStream
"Smart Order Builder" take-home. Deadline: **26 Nov 2026, end of day (Bangladesh)**. One submission only.

## 0. Start of every session
1. Read this file.
2. Open `docs/PLAN.md`, find the **first unchecked step**, and read only that step.
3. Read the sections of `docs/ARCHITECTURE.md` that step points to.
4. `docs/SPEC.md` is the original brief and the **source of truth**. If SPEC and any other doc disagree, SPEC wins: tell the user about the conflict.
5. Say in Bangla, in 3–5 lines, what you are about to do in this step. Then do it.

## 1. How to talk to the user
- Always explain in **proper Bangla (Bengali script)**, never Banglish. Code, file names and identifiers stay in English.
- Explain with **simple real-life stories** (e.g. "ফ্রিজে ১০টা ডিম", "দোকানে জিনিস সরিয়ে রাখা"). No heavy jargon. Short and to the point, but skip nothing.
- He must **explain, debug and change every line live in an interview**. So:
  - Prefer simple, boring, readable code over clever code. Small functions, clear names.
  - Comments only where the *why* is not obvious (rounding, atomicity, clock offset).
  - After each step, list the 3–5 most important lines/functions he must understand, with one Bangla sentence each.

## 2. Hard rules (never break these)
1. **Data-driven.** No option ids, option names, group ids, ingredient ids, limits, prices, promo codes or times
   in `src/engine`, `src/server`, `src/components`, `src/hooks`, `src/assistant`. They live only in
   `src/fixtures/*.json` and in tests. The app must work with a different menu fixture without code changes.
2. **Money = integer poisha** (1 BDT = 100 poisha). Never use floats for money. Every percentage uses
   `percentOf()` / `roundHalfUp()` from `src/engine/money.ts`. Convert to "BDT 1,585.00" only in `formatBdt()` for display.
3. **Engines are pure.** Nothing in `src/engine` may call `Date.now()`, `new Date()` without an argument, `fetch`,
   `Math.random`, `localStorage` or anything React. Time is always passed in as `serverTime` (ms).
4. **Server clock.** The mock server's time is `Date.now() + 90_000` and comes only from `src/server/clock.ts`.
   The browser computes `offset = serverTime - Date.now()` from every response (`src/api/serverClock.ts`).
   Every countdown and expiry check in the browser uses `serverNow()`, never `Date.now()` directly.
5. **Atomic mutations.** Every server mutation: load state → work on a copy → validate everything →
   commit (save) once at the end. Any error or injected failure before the commit leaves state unchanged (no phantom reservations).
6. **Derived stock.** Never store "available" or "reserved" counters. Always compute:
   `available = fixtureStock − sold(live orders) − reserved(active, non-expired cart items)`.
   Seed orders are history and do **not** reduce current stock.
7. **Shared state across tabs.** The mock server reads state from `localStorage` (`sob:v1`) at the **start of every
   request** and writes it at the end. Never keep server state cached in a module variable.
8. **TypeScript strict.** No `any`, no `@ts-ignore`, no `as unknown as`. Non-null `!` only with a comment saying why.
9. **Tests first for engines and server logic.** Write the acceptance test (TC-xx) first, watch it fail, then implement.
10. **No new dependencies** without asking. Allowed: react, react-dom, vite, typescript, tailwindcss, @tailwindcss/vite,
    msw, vitest, jsdom, @testing-library/*. Gemini is called with plain `fetch` (no SDK). IDs use `crypto.randomUUID()`.
11. **DECISIONS.md belongs to the user.** Never write or rewrite its answers in his voice. You may ask him guiding
    questions, list options with trade-offs, and later check that the code matches what he wrote.
12. **Git.** Never commit unless the user says "commit". At the end of each step, propose one small commit message
    (Conventional Commits, e.g. `feat(engine): validate group limits (TC-01)`). Small steps may need 2–3 commits; propose them separately.
13. **Secrets.** `.env.local` is never committed. `.env.example` contains only `VITE_GEMINI_API_KEY=`.
14. **Scope.** Do not start Part G (bonus) until Step 12 in PLAN.md is checked.
15. **UI.** Tailwind utility classes only, plain, clean, **responsive** (works at 375px width). Every disabled button
    shows why (title/inline text). Use real `<label>`, `<button>`; keep it accessible.

## 3. End of every step (checklist)
1. `npm test` → all green.
2. `npm run typecheck` → no errors.
3. `npm run lint` → no errors.
4. `npm run check:hardcode` (from Step 5 onwards) → nothing found.
5. Tick the step's checkboxes in `docs/PLAN.md` and add one line to the **Session log** at the bottom.
6. Tell the user in Bangla: what was built, which TCs now pass, the key lines to understand, which DECISIONS.md
   item he should write now (if any), and the proposed commit message.

## 4. Commands
| Command | What it does |
|---|---|
| `npm run dev` | start the app (MSW runs in the browser) |
| `npm test` | run all tests once (Section 9 acceptance tests included) |
| `npm run test:watch` | tests in watch mode |
| `npm run answers` | run `src/answers/*.test.ts` and print every ANSWERS.md value |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | eslint |
| `npm run check:hardcode` | grep for fixture ids/names leaking into logic folders |
| `npm run build` | production build |

## 5. Where things are
- `docs/SPEC.md` — original brief (verbatim)
- `docs/ARCHITECTURE.md` — folders, data shapes, types, API, clock, chaos, testing
- `docs/PLAN.md` — step-by-step roadmap with checkboxes + TC matrix + SPEC coverage checklist
- `docs/START-HERE.md` — the user's own Bangla guide (setup + prompts)
- `DECISIONS.md` — user's own words (C1, C2, D1–D6, extra decisions)

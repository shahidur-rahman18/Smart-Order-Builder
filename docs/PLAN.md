# PLAN — step-by-step roadmap

> Claude: do the **first unchecked step only**. Follow CLAUDE.md §3 at the end of each step.
> Each step: Goal → Do → Tests → Done when → DECISIONS → Commit.

## Timeline (Bangladesh time)
| When | Steps | Aim |
|---|---|---|
| 25 Nov, 15:00 – 01:00 | 0 → 5 | setup + all pure engines (TC-01…11 green) |
| 26 Nov, 09:00 – 14:00 | 6 → 8 | mock server, checkout, MSW, api client |
| 26 Nov, 14:00 – 20:00 | 9 → 11 | UI + assistant |
| 26 Nov, 20:00 – 22:30 | 12 | docs, ANSWERS, final checks |
| 26 Nov, by 23:00 | — | **submit** (deadline 27 Nov 00:00) |
| only if time is left | 13 | Part G bonus |

If behind schedule: never skip tests or DECISIONS. Cut UI polish first, then the bonus.

---

## ✅ Step 0 — Bootstrap (≈30 min)
**Goal:** a running Vite + React + TS app with Tailwind, Vitest, MSW and git.
- [x] Project was created by the user with `npm create vite@latest smart-order-builder -- --template react-ts` and these docs were copied in (see START-HERE.md).
- [x] `npm install`
- [x] Tailwind: `npm i -D tailwindcss @tailwindcss/vite`; add `tailwindcss()` to `vite.config.ts` plugins; `src/index.css` = `@import "tailwindcss";`
- [x] Tests: `npm i -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom`
- [x] `vite.config.ts`: `/// <reference types="vitest/config" />`, `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] }`
- [x] `src/test/setup.ts`: `import '@testing-library/jest-dom/vitest'`; `afterEach(() => localStorage.clear())`
- [x] MSW: `npm i -D msw` then `npx msw init public/ --save`
- [x] Confirm `"strict": true` in `tsconfig.app.json` (template default)
- [x] `package.json` scripts: `test` = `vitest run`, `test:watch` = `vitest`, `typecheck` = `tsc -b`, `answers` = `vitest run src/answers`, `check:hardcode` = `node scripts/check-hardcode.mjs`
- [x] `.gitignore` includes `.env.local`, `.env*.local`, `node_modules`, `dist`
- [x] `.env.example` with `VITE_GEMINI_API_KEY=`
- [x] Remove Vite demo content; `App.tsx` shows "Smart Order Builder" in a Tailwind-styled header
- [x] One smoke test `src/App.test.tsx` renders the title
- [x] `git init`, first commit (ec0557f) + pushed to origin/main

**Done when:** `npm run dev` shows the header, `npm test` passes 1 test, `npm run typecheck` is clean.
**Commit:** `chore: bootstrap vite react-ts with tailwind, vitest, msw`

## ✅ Step 1 — Fixture, types, seed inspection (≈1 h)
**Goal:** the menu as data + shared types.
- [x] User saves the downloaded `orders.seed.json` to `src/fixtures/orders.seed.json` (unchanged)
- [x] **Read the seed file first.** Write down (in the step summary) the exact option ids, coupon field name, payment values, createdAt format, line/quantity shape
- [x] `src/fixtures/menu.json` per ARCHITECTURE §3, **ids matching the seed file**, money in poisha
- [x] `src/types/*.ts` per ARCHITECTURE §4
- [x] `src/engine/menuIndex.ts` (lookups + duplicate-id check)
- [x] `src/test/builders.ts`: `configByNames({ Toast: 1, Scrambled: 2, ... })` → Config; `configA/B/C()`
- [x] Tests: fixture loads; ids unique; every rule/promo references existing ids; builders produce A/B/C

**Done when:** tests green, the user can say in Bangla what each fixture field means.
**Commit:** `feat(fixtures): add menu fixture in poisha and core types`

## ✅ Step 2 — Money helpers + Checkpoint C1 (≈30 min)
- [x] **User writes C1 in DECISIONS.md first** (float risk with 679.50, VAT 75.48 by hand). Claude may only ask questions.
- [x] `src/engine/money.ts`: `roundHalfUp`, `percentOf`, `toWholeBdtPoisha`, `formatBdt`
- [x] Tests: `percentOf(150950, 5) === 7548`; `toWholeBdtPoisha(158498) === 158500`; `toWholeBdtPoisha(163748) === 163700`; x.5 cases; `0.1+0.2` float demo test (documents why)
**Commit:** `feat(engine): integer poisha money helpers with half-up rounding`

## ✅ Step 3 — Rules engine, Part A (≈1.5 h) — TC-01…04
- [x] Write `src/test/acceptance/tc01-04.rules.test.ts` first (fails)
- [x] `src/engine/validate.ts` per ARCHITECTURE §5
- [x] Extra unit tests: Scrambled x1 + Fried x1 valid; maxDistinct; maxPerOption; min; unknown option; override with no selection = base max
- [x] TC-04: Tofu + Bacon + Chili + Hollandaise → **both** excludes violations listed
**Commit:** `feat(engine): generic validate() with group limits and cross-group rules (TC-01..04)`

## Step 4 — Pricing engine, Part C (≈1.5 h) — TC-05…07 + D2
- [ ] `src/engine/time.ts` (`isStrictlyBefore`, `localDate`) + tests at 10:59:59 / 11:00:00 Dhaka
- [ ] Write `tc05-07.pricing.test.ts` first
- [ ] `src/engine/pricing.ts`: `priceUnit`, `priceCart` with full breakdown + coupon status
- [ ] Unit tests: P2 with 3/4/6 extras; P1 boundary (eggs 3 vs 4 units, Omelette counts 1); tie → C1; coupon wrong code; coupon lowercase
- [ ] Hand-check tests from ANSWERS: Q2 = 360.00, Q3 = 1040 / 1197
- [ ] **User writes D2 in DECISIONS.md** (suggested: lock at checkout)
**Commit:** `feat(engine): priceCart with promotions, cart discount and VAT (TC-05..07)`

## Step 5 — Stock engine, Part B (≈1.5 h) — TC-08…11
- [ ] Write `tc08-11.stock.test.ts` first (pure engine level; server-level versions come in Step 6)
- [ ] `src/engine/stock.ts` per ARCHITECTURE §5 (usage, available, shortages, headroom, edit net difference)
- [ ] TC-08 includes: a new item needing eggs → shortage reason "Short: 2 egg"
- [ ] TC-10 also checks B's new unit price 643.50
- [ ] `src/fixtures/menu.alt.json` + `engine/alt-fixture.test.ts`: validate/price/stock work on the other menu
- [ ] `scripts/check-hardcode.mjs`: reads ids + names from `menu.json`, greps `src/engine src/server src/components src/hooks src/assistant` (skip `*.test.*`), exits 1 if found
**Done when:** TC-01…11 all green, hardcode check clean. **End of day 1.**
**Commit:** `feat(engine): ingredient stock, shortages and edit net difference (TC-08..11)`

## Step 6 — Mock server: cart & reservations, Part D (≈2 h) — TC-13…15 (server level) + D1, D3
- [ ] `server/clock.ts`, `chaos.ts`, `storage.ts`, `state.ts (withState)`, `idempotency.ts`, `stockView.ts`, `cart.ts`
- [ ] Tests (server functions directly):
  - [ ] same idempotency key ×3 → 1 item (TC-13)
  - [ ] chaos mid-way failure → state unchanged, no stock held; retry same key → success (TC-14)
  - [ ] item expires at server `createdAt + 300 s` with 90 s skew; stock released; edit → 410 (TC-15)
  - [ ] TC-08…11 again through `cart.ts` (409 with shortages)
  - [ ] two "tabs" = two calls on the same localStorage: tab B takes eggs, tab A's edit → 409 with fresh `available` (D1)
- [ ] **User writes D1 and D3 in DECISIONS.md**
**Commit(s):** `feat(server): atomic state, clock skew and idempotency` · `feat(server): cart reservations with TTL and atomic edit (TC-13..15)`

## Step 7 — Checkout, orders, seed, export, Part E (≈1.5 h) — TC-16, 17 + D4, D6
- [ ] `server/orders.ts` (`buildStoredOrder`), `checkout.ts`, `seed.ts`
- [ ] Tests:
  - [ ] Pay twice with same key → 1 order, cart empty, sold counted once, expiry sweep does not release sold (TC-16)
  - [ ] save → new load (refresh) → orders still there; export parses as JSON and matches the D6 shape (TC-17)
  - [ ] seed loads once, priced at each createdAt; not loaded twice
  - [ ] seed does not reduce current stock
- [ ] **User writes D4 and D6 in DECISIONS.md** (D6 must match `StoredOrder` type exactly)
**Commit:** `feat(server): atomic checkout, persisted orders and priced seed (TC-16..17)`

## Step 8 — MSW handlers + API client (≈1 h)
- [ ] `mock/handlers.ts` (all endpoints from ARCHITECTURE §6, latency + chaos), `mock/browser.ts`, `mock/node.ts`
- [ ] `main.tsx`: `await worker.start({ onUnhandledRequest: 'bypass' })` then render (bypass = Gemini calls go to the real internet)
- [ ] `test/setup.ts`: start node server, latency 0, chaos off
- [ ] `api/client.ts` (typed, `ApiError { status, code, body }`), `api/serverClock.ts`
- [ ] Tests: client parses each endpoint; offset ≈ +90 s
**Commit:** `feat(api): msw handlers, typed client and server clock offset`

## Step 9 — Builder UI + price preview (≈2 h) — TC-12, TC-13, TC-14 (UI)
- [ ] hooks: `useMenu`, `useStock`, `useDebouncedValue`, `usePricePreview`
- [ ] components/builder/*: groups from menu, qty steppers, `+N left`, disabled reasons, violations list, price preview with Retry, quantity 1–3, Add to cart
- [ ] RTL tests:
  - [ ] TC-12: two configs, first response slower → only the second price shows
  - [ ] TC-13: triple click → one POST effect / one cart item
  - [ ] TC-14: reserve 503 → selection still on screen, Retry → item added
  - [ ] Add disabled while violations exist (TC-01 via UI)
**Commit:** `feat(ui): data-driven builder with debounced price preview (TC-12..14)`

## Step 10 — Cart UI, edit, checkout, orders page (≈2 h) — TC-15…17 (UI)
- [ ] `useCart`, `useCountdown` (server time), `useOrders`
- [ ] Cart panel: countdown, expired read-only, Remove, Edit → builder edit mode (net headroom), D1/D3 behaviour exactly as written in DECISIONS
- [ ] Coupon input, totals breakdown (subtotal, each discount + why not, VAT, payable), payment select, Pay (idempotent, disabled while pending)
- [ ] Orders tab + Download orders.json
- [ ] Dev tools footer: "Fail next reserve", "Reset demo data"
- [ ] Responsive check at 375px
- [ ] RTL tests: countdown shows server-based time (TC-15), double click Pay (TC-16)
**Commit(s):** `feat(ui): cart with server-time countdown and atomic edit` · `feat(ui): checkout, orders list and JSON export`

## Step 11 — Assistant, Part F (≈2 h) — TC-18…20 + C2, D5
- [ ] **User writes C2 in DECISIONS.md first** (question → function table)
- [ ] `assistant/stats.ts` + `stats.test.ts` against priced seed
- [ ] `tools.ts`, `systemPrompt.ts`, `gemini.ts`, `errors.ts`, `config.ts`
- [ ] `ChatPanel` with example-question buttons and the 4 error messages
- [ ] Tests (fetch mocked): TC-18 (+1 after checkout, no reload), TC-19 (bot = stats; change data → answer changes), TC-20 (no invented name), raw orders never sent, each error message
- [ ] User creates a **new** Gemini key, puts it in `.env.local`, tries it live
- [ ] **User writes D5 in DECISIONS.md**
**Commit:** `feat(assistant): gemini function-calling sales assistant (TC-18..20)`

## Step 12 — Answers, docs, final check (≈2 h)
- [ ] `src/answers/answers.test.ts` prints Q1–Q8 (each with `console.log` + assertions)
- [ ] `ANSWERS.md`: every answer + the command (`npm run answers`) + test name; step-by-step working for Q3 and Q8
- [ ] `README.md`: setup, architecture, engines, assistant tools, trade-offs, unfinished, **actual hours**
- [ ] Re-read DECISIONS.md against the code with the user (prompt 5 in START-HERE). Each answer 3–6 sentences.
- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run check:hardcode`, `npm run build` all clean
- [ ] Fresh clone test: clone → `npm install` → `.env.local` → `npm run dev` works
- [ ] `git log --oneline` looks like small meaningful commits; no `.env.local` in history
- [ ] SPEC coverage checklist below fully ticked
**Commit:** `docs: answers, readme and decisions`

## Step 13 — Bonus, Part G (only if Step 12 is done)
- [ ] Refresh keeps only still-valid reservations (cart reloaded from server; expired shown as expired)
- [ ] Cart `version`: every mutation sends `cartVersion`; stale → 409 `VERSION_CONFLICT` → tab reloads cart and shows a message
- [ ] Unfinished builder config saved to `localStorage` (`sob:draft`) and restored
- [ ] Tests for each
**Commit:** `feat(bonus): cart versioning and draft persistence`

---

## TC matrix
| TC | Engine test (step) | Server test (step) | UI test (step) |
|---|---|---|---|
| 01–04 | 3 | 6 (422) | 9 |
| 05–07 | 4 | 7 | 10 (totals) |
| 08–11 | 5 | 6 | 10 |
| 12 | – | – | 9 |
| 13 | – | 6 | 9 |
| 14 | – | 6 | 9 |
| 15 | – | 6 | 10 |
| 16 | – | 7 | 10 |
| 17 | – | 7 | 10 |
| 18–20 | – | – | 11 |

## SPEC coverage checklist (tick in Step 12)
- [ ] Every fixture value comes from `/api/menu`; alt fixture test passes; hardcode check clean (option **names** included)
- [ ] validate returns **all** violations with id + message; Add disabled while any exist
- [ ] Each option shows remaining units, disabled at 0
- [ ] Quantity 1–3 multiplies usage
- [ ] Edit uses net difference; never releases more than the item holds
- [ ] All shortages listed with exact amounts
- [ ] `priceCart` is the **same function** used by the server and the tests
- [ ] **Full price breakdown visible in UI** (subtotal, each discount, VAT, payable)
- [ ] Preview: debounce 300 ms, latency 200–1500 ms, 15 % failure, stale ignored, Retry keeps config
- [ ] Idempotent Add; atomic reserve; 5 min TTL; server clock +90 s from `serverTime`
- [ ] Expired item: stock released, read-only, **removable**
- [ ] Edit = one atomic server call
- [ ] TC-08: new egg item blocked **with reason**
- [ ] Checkout: one order, atomic, reserved → sold, cart empties; payment label only
- [ ] Orders survive refresh, include totals; seed priced at createdAt; Download orders.json
- [ ] Bot: 7 questions via function calling; numbers from code; no raw orders sent; fresh data every call; "don't know" path; 4 error messages; stats tested on seed; Gemini mocked
- [ ] `.env.example` only; real key never committed; new key ready for the form
- [ ] DECISIONS: C1, C2, D1–D6, **3–6 sentences each, own words**, matches code
- [ ] ANSWERS: Q1–Q8 with the **command/test that prints each**; Q3 & Q8 step-by-step
- [ ] README: setup, architecture, engines, tools, trade-offs, unfinished, actual hours
- [ ] UI plain, clean, **responsive**
- [ ] One command runs all tests

---

## Session log
<!-- Claude: one line per session, e.g. "25 Nov 16:10 — Step 1 done, TC none yet, seed ids: sausage, bacon …" -->
25 Nov 15:45 — Step 0 done (except first commit). Smoke test green. Windows fix: `npm test` runs Vitest via scripts/vitest.mjs (upper-case drive letter, else Vitest loads twice). Root orders.seed.json still to move to src/fixtures in Step 1.
25 Nov — Step 0 committed (ec0557f) and pushed to https://github.com/shahidur-rahman18/Smart-Order-Builder (main). Next: Step 1, only after user says go.
25 Nov 16:45 — Step 1 done. Seed ids match ARCHITECTURE (sausage, bacon, hashbrown, beans); coupon field `couponCode` (string|null); paymentMethod card/bkash/cash; createdAt ISO with +06:00; line = { qty, options }. ORD-1001 = A, ORD-1002 = B, ORD-1003 line 1 = C. 12 tests green.
25 Nov 17:15 — Step 2 done. money.ts (roundHalfUp integer-only, percentOf, toWholeBdtPoisha, formatBdt) + 17 tests; 29 tests green. C1 text drafted by Claude from the user's own four answers at the user's explicit request.
25 Nov 18:30 — Step 3 done in 3 parts. validate.ts (group limits, overrideLimit smallest-wins, requires, excludes, unknown option kind 'unknown' added to Violation). TC-01…04 green; 48 tests green. User to write the 'unknown' decision in DECISIONS extras later.

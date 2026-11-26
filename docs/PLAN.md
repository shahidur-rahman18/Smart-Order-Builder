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

## ✅ Step 4 — Pricing engine, Part C (≈1.5 h) — TC-05…07 + D2
- [x] `src/engine/time.ts` (`isStrictlyBefore`, `localDate`) + tests at 10:59:59 / 11:00:00 Dhaka
- [x] Write `tc05-07.pricing.test.ts` first
- [x] `src/engine/pricing.ts`: `priceUnit`, `priceCart` with full breakdown + coupon status
- [x] Unit tests: P2 with 3/4/6 extras; P1 boundary (eggs 3 vs 4 units, Omelette counts 1); tie → C1; coupon wrong code; coupon lowercase
- [x] Hand-check tests from ANSWERS: Q2 = 360.00, Q3 = 1040 / 1197
- [x] **User writes D2 in DECISIONS.md** (suggested: lock at checkout)
**Commit:** `feat(engine): priceCart with promotions, cart discount and VAT (TC-05..07)`

## ✅ Step 5 — Stock engine, Part B (≈1.5 h) — TC-08…11
- [x] Write `tc08-11.stock.test.ts` first (pure engine level; server-level versions come in Step 6)
- [x] `src/engine/stock.ts` per ARCHITECTURE §5 (usage, available, shortages, headroom, edit net difference)
- [x] TC-08 includes: a new item needing eggs → shortage reason "Short: 2 egg"
- [x] TC-10 also checks B's new unit price 643.50
- [x] `src/fixtures/menu.alt.json` + `engine/alt-fixture.test.ts`: validate/price/stock work on the other menu
- [x] `scripts/check-hardcode.mjs`: reads ids + names from `menu.json`, greps `src/engine src/server src/components src/hooks src/assistant` (skip `*.test.*`), exits 1 if found
**Done when:** TC-01…11 all green, hardcode check clean. **End of day 1.**
**Commit:** `feat(engine): ingredient stock, shortages and edit net difference (TC-08..11)`

## ✅ Step 6 — Mock server: cart & reservations, Part D (≈2 h) — TC-13…15 (server level) + D1, D3
- [x] `server/clock.ts`, `chaos.ts`, `storage.ts`, `state.ts (withState)`, `idempotency.ts`, `stockView.ts`, `cart.ts`
- [x] Tests (server functions directly):
  - [x] same idempotency key ×3 → 1 item (TC-13)
  - [x] chaos mid-way failure → state unchanged, no stock held; retry same key → success (TC-14)
  - [x] item expires at server `createdAt + 300 s` with 90 s skew; stock released; edit → 410 (TC-15)
  - [x] TC-08…11 again through `cart.ts` (409 with shortages)
  - [x] two "tabs" = two calls on the same localStorage: tab B takes eggs, tab A's edit → 409 with fresh `available` (D1)
- [x] **User writes D1 and D3 in DECISIONS.md** (both written 25 Nov)
**Commit(s):** `feat(server): atomic state, clock skew and idempotency` · `feat(server): cart reservations with TTL and atomic edit (TC-13..15)`

## ✅ Step 7 — Checkout, orders, seed, export, Part E (≈1.5 h) — TC-16, 17 + D4, D6
- [x] `server/orders.ts` (`buildStoredOrder`), `checkout.ts`, `seed.ts`
- [x] Tests:
  - [x] Pay twice with same key → 1 order, cart empty, sold counted once, expiry sweep does not release sold (TC-16)
  - [x] save → new load (refresh) → orders still there; export parses as JSON and matches the D6 shape (TC-17)
  - [x] seed loads once, priced at each createdAt; not loaded twice
  - [x] seed does not reduce current stock
- [x] **User writes D4 and D6 in DECISIONS.md** (D6 must match `StoredOrder` type exactly)
**Commit:** `feat(server): atomic checkout, persisted orders and priced seed (TC-16..17)`

## ✅ Step 8 — MSW handlers + API client (≈1 h)
- [x] `mock/handlers.ts` (all endpoints from ARCHITECTURE §6, latency + chaos), `mock/browser.ts`, `mock/node.ts`
- [x] `main.tsx`: `await worker.start({ onUnhandledRequest: 'bypass' })` then render (bypass = Gemini calls go to the real internet)
- [x] `test/setup.ts`: start node server, latency 0, chaos off
- [x] `api/client.ts` (typed, `ApiError { status, code, body }`), `api/serverClock.ts`
- [x] Tests: client parses each endpoint; offset ≈ +90 s
**Commit:** `feat(api): msw handlers, typed client and server clock offset`

## ✅ Step 9 — Builder UI + price preview (≈2 h) — TC-12, TC-13, TC-14 (UI)
- [x] hooks: `useMenu`, `useStock`, `useDebouncedValue`, `usePricePreview`
- [x] components/builder/*: groups from menu, qty steppers, `+N left`, disabled reasons, violations list, price preview with Retry, quantity 1–3, Add to cart
- [x] RTL tests:
  - [x] TC-12: two configs, first response slower → only the second price shows
  - [x] TC-13: triple click → one POST effect / one cart item
  - [x] TC-14: reserve 503 → selection still on screen, Retry → item added
  - [x] Add disabled while violations exist (TC-01 via UI)
**Commit:** `feat(ui): data-driven builder with debounced price preview (TC-12..14)`

## ✅ Step 10 — Cart UI, edit, checkout, orders page (≈2 h) — TC-15…17 (UI)
- [x] `useCart`, `useCountdown` (server time), `useOrders`
- [x] Cart panel: countdown, expired read-only, Remove, Edit → builder edit mode (net headroom), D1/D3 behaviour exactly as written in DECISIONS
  - [x] D3: on expiry (serverNow countdown hits 0, or PUT → 410 `EXPIRED`) the edited config stays in the builder, Save disabled with an expiry message, cart item marked "Expired" (Remove only), "Add as new item" button = POST with a new idempotency key (409 → show shortages, config kept)
  - [x] D1: edit Save → 409 `OUT_OF_STOCK` → builder shows every shortage with amounts (and fresh `available` as `+N left`), edited config kept, user changes selection and Saves again
  - [x] RTL test for D1: other "tab" takes the eggs → Save → shortage message, config still on screen, reduce eggs → Save succeeds
  - [x] RTL test for D3: edit open → time passes past expiry → Save disabled + message, config still on screen, "Add as new item" adds a new item
- [x] Coupon input, totals breakdown (subtotal, each discount + why not, VAT, payable), payment select, Pay (idempotent, disabled while pending)
- [x] Orders tab + Download orders.json
- [x] Dev tools footer: "Fail next reserve", "Reset demo data"
- [x] Responsive check at 375px — classes reviewed (grid stacks under md, flex-wrap rows, orders table scrolls sideways); user confirmed (UI changed by the user)
- [x] RTL tests: countdown shows server-based time (TC-15), double click Pay (TC-16)
**Commit(s):** `feat(ui): cart with server-time countdown and atomic edit` · `feat(ui): checkout, orders list and JSON export`

## ✅ Step 11 — Assistant, Part F (≈2 h) — TC-18…20 + C2, D5
- [x] **User writes C2 in DECISIONS.md first** (question → function table)
- [x] `assistant/stats.ts` + `stats.test.ts` against priced seed
- [x] `tools.ts`, `systemPrompt.ts`, `gemini.ts`, `errors.ts`, `config.ts`
- [x] `ChatPanel` with example-question buttons and the 4 error messages
- [x] Tests (fetch mocked): TC-18 (+1 after checkout, no reload), TC-19 (bot = stats; change data → answer changes), TC-20 (no invented name), raw orders never sent, each error message
- [x] User creates a **new** Gemini key, puts it in `.env.local`, tries it live
- [x] **User writes D5 in DECISIONS.md**
**Commit:** `feat(assistant): gemini function-calling sales assistant (TC-18..20)`

## Step 12 — Answers, docs, final check (≈2 h)
- [x] `src/answers/answers.test.ts` prints Q1–Q8 (each with `console.log` + assertions)
- [x] `ANSWERS.md`: every answer + the command (`npm run answers`) + test name; step-by-step working for Q3 and Q8
- [x] `README.md`: setup, architecture, engines, assistant tools, trade-offs, unfinished, **actual hours**
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
25 Nov 18:40 — Step 4 code done (D2 still open, user writes it). time.ts + pricing.ts; UnitBreakdown fields named `cheapestFree`/`combo` (not p2/p1, so no promo ids in engine code); priceCart takes optional 5th arg couponCode (SPEC lists 4). TC-05…07 + Q2/Q3 hand checks green; 75 tests green.
25 Nov 19:20 — Step 5 done. stock.ts (usageOf, sum/subtractUsage, availableStock(menu, soldLines, reservedLines) clamped at 0, availableForEdit, shortagesFor, formatShortages, optionHeadroom). availableStock takes lines, not usage (small change from ARCHITECTURE). menu.alt.json (burger, London time) passes validate/price/stock. check-hardcode.mjs: string literals + .id / id: keys, comments ignored; clean. TC-01…11 green; 103 tests green. D2 still open (user).
25 Nov 19:45 — Step 6 code done (D1, D3 open — user writes them; D2 also still open). server/: clock, chaos, storage (loadState → null on broken/old data), state (withState = load→work→save), idempotency (key namespaced by op, failures not remembered, replay refreshes serverTime), http (ServerError + respond), stockView, cart. Edit keeps original expiresAt; 409 on edit returns availableForEdit. types/api.ts, cart.ts, order.ts (minimal StoredOrder, Step 7 extends). 125 tests green.
25 Nov 20:10 — D2 written by the user (lock at Pay; cart re-priced at server time; coupon-ends-at-11 message in cart UI, Step 10). Step 4 fully ticked.
25 Nov — D3 written by the user in DECISIONS (option খ): unsaved edit is kept on screen; on expiry (serverNow countdown or 410 EXPIRED) Save is disabled with reason "Reservation expired. Stock was released."; old cart item shows Expired, Remove only; "Add as new item" = normal POST with new idempotency key and fresh stock check (409 shortages keep the config). UI work in Step 10.
25 Nov — D1 written by the user (409 OUT_OF_STOCK with shortages + amounts, edited config kept, fix and Save again, atomic recheck). Step 6 fully ticked. D1/D3 UI tasks added to Step 10. Next: Step 7.
25 Nov 21:50 — Step 7 code done (D4, D6 open — user writes them). types/order.ts full StoredOrder (lineId/unit/lineTotal per line, coupon = CouponResult, totals, pricedAt, moneyUnit, currency from fixture, pricingWarnings); PAYMENT_METHODS in types. server/orders.ts (buildStoredOrder, ordersToJson = plain array), checkout.ts (checkout + getOrders; empties cart incl. expired items and coupon; 409 CART_EMPTY, 422 INVALID_PAYMENT_METHOD), seed.ts (normalizeSeedOrder drops unknown options with a warning; priced at createdAt; seed ids kept). readState() adds seed in memory; a GET never writes, first successful mutation saves seeded=true. recall() typed per op. TC-16, TC-17 green; 138 tests green.
25 Nov 22:10 — D4 and D6 written by the user (D6 example = stored ORD-1006, generated from code). Step 7 fully ticked. Next: Step 8.
25 Nov 22:25 — Step 8 done. server/menu.ts (getMenu), server/price.ts (pricePreview: chaos 503 PRICE_UNAVAILABLE, shared checkQuantity, unfinished config still priced + violations, unknown option → breakdown null). types/api.ts: PriceRequest, PriceBody, MenuBody, BAD_REQUEST, PRICE_UNAVAILABLE. mock/parse.ts (shape checks → 400), handlers.ts (all 10 endpoints, latency flag), browser.ts, node.ts. MSW 3: option is `onUnhandledFrame` (not onUnhandledRequest); handlers use plain Response.json. api/client.ts (ApiError status/code/body, NETWORK_ERROR = status 0, full URL for Node fetch), serverClock.ts. 153 tests green.
25 Nov 22:50 — Step 9 done. hooks: useMenu, useStock (5 s + focus + after add), useDebouncedValue, usePricePreview (abort + requestId check; status derived, no setState in effect), extra useAddToCart (key per draft in useRef, pendingRef blocks triple click, 503/network → Retry with same key). components/builder: Builder, GroupSection (hint from group limits), OptionRow (+N left / ∞ / Out of stock, aria-label "<name> quantity"), ViolationList, PricePreview (stale greyed, Retry price), QuantityPicker. App loads menu. After success the draft resets. TC-12, 13, 14 + TC-01 UI green; 158 tests green. 375px not yet checked by eye.
25 Nov 23:25 — Step 10 part (a) done: hooks useCountdown (serverNow, 1 s tick, formatCountdown rounds up) + useCart (5 s + focus, remove → refresh; 404 on remove ignored). components/cart: CartPanel, CartItemRow (expired = server status OR countdown 0 → refetch; grey, "Reservation expired — remove or add again", Remove only), Countdown (amber last minute). Builder gets optional `cartVersion` → stock refresh after Remove. App shows cart next to builder. New tc15-17.cart-ui.test.tsx: Remove + TC-15 UI (5:00 not 6:30, counts down, Expired). useOrders, Edit (b), totals/Pay (c), orders/dev tools (d) still open. 160 tests green.
25 Nov 23:55 — Step 10 part (b) done: Edit → App keeps a snapshot of the item (itemVersion for VERSION_CONFLICT), Builder remounts with key = item id in edit mode (Save changes / Cancel edit, countdown banner, net headroom via availableForEdit while saveable). useEditItem (PUT, 410 → expired flag), shared useDraftKey + toFailure (add and edit use the same key-per-draft rule). D3: countdown 0 or 410 → Save disabled "Reservation expired. Stock was released.", config kept, "Add as new item" = normal add (new key). D1: 409 → server shortages shown once, stock refreshed, config kept. Item removed elsewhere → edit mode ends. New d1-d3.edit-ui.test.tsx; 162 tests green.
26 Nov 00:20 — Step 10 part (c) done: useCart.setCoupon (PUT returns cart + totals), useCheckout (key per cart version + payment method, pendingRef, reset after success). components/cart: CouponInput (Apply/Clear, D2 note built from couponPercent promo data: code + validBefore + timeZone), CartTotals (subtotal, every candidate applied/not + reason, coupon 'lost_to_better_discount' line, VAT %, rounding line, payable; aria-labels Subtotal/VAT/Payable), PaymentSelect (PAYMENT_LABELS in types/order.ts), CartItemRow shows per-item deals. Pay disabled with reason: loading / nothing active / edit open / coupon saving / paying. New tc16.checkout-ui.test.tsx (breakdown + lowercase coupon, TC-16 double click, Pay disabled reason). Full-App UI tests get a 15 s timeout (D1 ~5 s under parallel load). 165 tests green.
26 Nov 00:50 — Step 10 part (d) done: ordersToJson moved to engine/ordersJson.ts (UI Download and TC-17 test use the same pure function). useOrders (fresh on every Orders tab open), components/orders: OrdersPanel (newest first, shop time zone from menu, table scrolls on phones), DownloadOrdersButton (fetches latest orders at click → Blob). server/dev.ts + POST /api/dev/fail-next-reserve and /api/dev/reset (removes sob:v1 → seed loads again; also clears a pending reserve failure); components/DevTools footer. App: tabs Build/Orders, Build tab hidden not unmounted (draft survives), Shop keyed by resetCount (reset restarts every hook). test/setup.ts: RTL asyncUtilTimeout 3 s (full App under parallel load). New tc17.orders-ui.test.tsx. 167 tests green, build ok. Only the 375px eye check is left in Step 10.
26 Nov 00:35 — UI polish (Step 10, user asked before Step 11): brand colour set once in index.css (@theme brand-50…950 = amber), shared class sets in components/ui.ts (btnPrimary/Secondary/SecondarySm/Danger, card, input). App = h-dvh shell (header + footer fixed, main scrolls; lg: builder and cart columns scroll on their own), segmented Build/Orders tabs, mobile sticky "View cart · N items · BDT" bar (lg:hidden). GroupSection: sr-only legend + visible header + status badge (Required / Check rules / Optional / ✓ N chosen, from validate() violations with id = group id); OptionRow = tile, 2 columns from sm, selected ring, stock pill. Cart in a card, full-width Pay, red countdown pill in last minute. No logic/text/aria changes; 167 tests green, typecheck/lint/hardcode/build clean. 375px eye check still with the user.
26 Nov 12:00 — UI redesign to match the mockup (user request): one shared `common/Card` (+ Badge, Stepper) used by group cards and the cart; Header (logo, Build/Orders, ServerClock from serverNow(), "Sales assistant" button disabled until Part G, cart icon with count below lg). Builder: groups side by side (xl auto-fit columns from data), badge "1/3" · "1 / need 2" · "3/2" from groupStatus() (uses exported engine effectiveMax), yellow outline on problem groups, phone chips (GroupTabs, ✓ / !), violation banner with chips, dark sticky PriceBar (breakdown, unit price, quantity stepper, Add/Save, line total + reason). Cart: item card with countdown badge + "expires soon" yellow, Remove as red text, Cash/Card/bKash radio buttons, big Pay. PricePreview + QuantityPicker removed. Same aria labels; 167 tests green, typecheck/lint/hardcode clean. Eye check at 375px / desktop with the user.
26 Nov 12:30 — UI fit pass (user feedback vs mockup): desktop fits one screen with no page/card scroll (groups natural height in one auto-cols row, price bar pushed down with mt-auto, compact option rows + 22px steppers, one-line price bar, price error inline in the bar). Cart: no inner scroll, Pay at the bottom. Mobile: grid-cols-1 fixes horizontal overflow. Checked by screenshot at 1342×636 and 390×800. 167 tests green.
26 Nov 12:50 — UI pass 3 (user compared with mockup): free space between groups and price bar is now the message area (flex-1, problems never push the page), duplicate problem sentences shown once, shorter group hints, grid row capped (no page scroll). Cart: compact item cards (×1 hidden, small Edit/Remove, short deal line), compact totals (one line per discount, struck-out amount when not used, no 'After discount'), only the middle scrolls and Pay stays visible. Screenshots at 1342×636 (4 items in cart) and 390×800. 167 tests green.
26 Nov — C2 written by the user (his Bangla answer; English text pasted into DECISIONS by Claude at his explicit request). Functions: countOrders, totalRevenue, bestSellingOptions, revenueByPaymentMethod, averageOrderValue, couponUsage, ordersOnDate, describeData. Next: Step 11 stats.test.ts.
26 Nov 13:35 — Step 11 part (a): assistant/stats.ts (8 pure functions from C2; Money = { poisha, text } with the order's currency; bestSellingOptions keeps menu order on ties and keeps everyone tied with the last place; ordersOnDate validates YYYY-MM-DD + real day, uses the passed time zone) + stats.test.ts against priced seed (6 orders, 499500, Fried 10, card 214500, avg 83250, coupon 4 entered / 3 applied, ORD-1006 expired_time, 20 Nov = 1001+1002). 192 tests green.
26 Nov 13:55 — Step 11 part (b): tools.ts (8 declarations = C2 names, runTool loads fresh /api/orders + /api/menu every call, args type-checked, unknown tool → error object, no customer tool), systemPrompt.ts (today + shop time zone; only tool numbers, copy money text, describeData + no invented names), gemini.ts (plain fetch, key in x-goog-api-key header, parts kept as sent, max 3 tool rounds; fetchFn/runTool injectable for tests), errors.ts (missing_key / invalid_key 401·403·400 API_KEY_INVALID / quota 429 / network / other), config.ts (GEMINI_MODEL = gemini-2.5-flash, user to verify in AI Studio), vite-env.d.ts types the key. tools.test.ts (TC-18 tool level) + gemini.test.ts (loop, raw orders never sent, 4 errors). 212 tests green.
26 Nov 14:20 — Step 11 part (c): Assistant tab (third Tab; Header 'Sales assistant' button now opens it, aria-pressed, disabled only while menu loads; panel hidden not unmounted so the chat survives). hooks/useAssistant (pendingRef, last 10 text turns as history, today = localDate(serverNow(), shop tz), error → messageFor). components/assistant/ChatPanel (8 example buttons incl. D5, role=log 'Conversation', 'via <tool>' line, missing-key alert, Send disabled with reason). New tc18-20.assistant-ui.test.tsx with a fake Gemini on MSW that phrases only the tool result: TC-18 (6 → 7), TC-19 (= bestSellingOptions, changes after 3×A), TC-20 (no customer tool, prompt forbids names), raw orders never sent, 4 error messages. 220 tests green, build ok. Left in Step 11: user tries a real key + verifies model name, D5.
26 Nov 14:50 — Gemini live setup: user's key in .env.local (git-ignored). Models list + real calls: gemini-2.5-flash 404 for new keys, gemini-3.5-flash free tier = 20 requests/day (used up in testing), gemini-3.5-flash-lite works (~1 s/tool call) → GEMINI_MODEL = gemini-3.5-flash-lite. gemini.ts: echoes functionCall id, 30 s timeout (AbortController), one retry on 503, new 'busy' message; 429 text mentions the daily limit. Live run through real tools.ts + mock server: 6 orders, BDT 4,995.00, Fried 10, card/bkash/cash split, 3 coupons, best customer → describeData (no name), Bangla question answered in Bangla. User still to try it in the browser (npm run dev).
26 Nov — User tried the assistant in the browser with the real key (all 9 example answers match stats). D5 written by the user (his Bangla answer; English text pasted into DECISIONS by Claude at his explicit request). Step 11 done except the commit.
26 Nov — Step 10 and Step 11 marked done (user confirmed the 375px check / UI is his own). Next: Step 12, after the user says go.
26 Nov 15:35 — Step 12 part (a): src/answers/answers.test.ts (Q1 C max 2 by cheese; Q2 brute force over all 535,680 valid configs → Toast, Fried x2, Tofu = 360.00, ties with +Ketchup, 60 s timeout ~11 s; Q3 A x3 + MORNING15: 10:30 → 1,040, 11:30 → 1,197; Q4 1,600; Q5 total 4,995; Q6 Fried 10; Q7 card 2,145; Q8 3 of 4, ORD-1006 after 11:00). npm run answers uses --silent=false (Vitest 5 hides logs of passing tests). ANSWERS.md written. 232 tests green, typecheck/lint/hardcode clean.
26 Nov — Step 12 part (b): README.md written (setup, architecture, engines, assistant, tests, trade-offs, unfinished = Part G, hours 32–35 given by the user).

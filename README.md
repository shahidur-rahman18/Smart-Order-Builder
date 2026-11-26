# Smart Order Builder

A "Build Your Breakfast" ordering app with a rules engine, live stock reservations, a pricing engine
with promotions, checkout and orders, and a Gemini sales assistant.
React + TypeScript (strict) + Vite + Tailwind. The backend is a mock server that runs in the browser
through MSW (Mock Service Worker) and keeps its state in `localStorage`.

- Decisions (C1, C2, D1–D6): [DECISIONS.md](DECISIONS.md)
- Answers to Q1–Q8 with the commands that print them: [ANSWERS.md](ANSWERS.md)
- The original brief: [docs/SPEC.md](docs/SPEC.md)

---

## 1. Setup

You need Node 20.19+ or 22 LTS (built with Node 22.17).

```bash
git clone https://github.com/shahidur-rahman18/Smart-Order-Builder.git
cd Smart-Order-Builder
npm install
cp .env.example .env.local     # then put your Gemini key in .env.local
npm run dev                    # http://localhost:5173
```

`.env.local`:

```
VITE_GEMINI_API_KEY=your-key-from-google-ai-studio
```

Only the sales assistant needs the key. Without it, the rest of the app works and the assistant shows
"Gemini key missing". Restart `npm run dev` after you change `.env.local`.

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | start the app (the MSW mock server runs in the browser) |
| `npm test` | **run all tests once**, including every SPEC §9 acceptance test and the Q1–Q8 answers |
| `npm run answers` | run `src/answers/answers.test.ts` and print every ANSWERS.md value |
| `npm run test:watch` | tests in watch mode |
| `npm run typecheck` | `tsc -b` |
| `npm run lint` | ESLint |
| `npm run check:hardcode` | fails if a fixture id or name appears in the logic folders (see §3) |
| `npm run build` | production build |

### Demo helpers (footer "Dev tools")
- **Fail next reserve**: the next Add to cart fails halfway through (for TC-14).
- **Reset demo data**: clears the mock server's state, so the cart is empty and only the 6 seed orders are left.

---

## 2. Architecture

```
src/
├─ fixtures/    menu.json (Appendix A, money in poisha), menu.alt.json (a different menu), orders.seed.json
├─ types/       shared types: menu, pricing, cart, order, api, seed
├─ engine/      PURE logic: validate (rules), stock, pricing, money, time
├─ server/      mock server logic: cart, checkout, orders, seed, clock, chaos, storage, idempotency
├─ mock/        MSW handlers: turn /api/* requests into server/ calls (+ latency, + input checks)
├─ api/         typed fetch client + server clock offset
├─ hooks/       React hooks: useMenu, useStock, usePricePreview, useAddToCart, useCart, useEditItem,
│               useCheckout, useOrders, useCountdown, useAssistant …
├─ components/  builder/, cart/, orders/, assistant/, common/
├─ assistant/   stats (pure), tools, Gemini loop, system prompt, error messages
├─ test/        acceptance tests (one file per TC group), builders, setup
└─ answers/     answers.test.ts (prints Q1–Q8)
```

Dependency direction: `engine` imports nothing from the other folders. `server` uses `engine`.
`mock` uses `server`. The UI talks to the server only through `api/` (HTTP to `/api/*`) and uses
`engine` only for instant local hints. The server always checks again.

### How a request flows

```
Component → hook → api/client.ts → fetch('/api/…')
          → MSW handler (mock/handlers.ts)  → server/*.ts → engine/*.ts
          ← JSON response (always contains serverTime)
```

### The mock server

- **State lives in `localStorage["sob:v1"]`.** Every request loads it first and saves it at the end,
  so two browser tabs share one cart and one stock. Nothing is cached in module variables.
- **Atomic mutations.** `withState(fn)` loads the state, lets `fn` work on a copy, and saves once at
  the end. If anything throws first (a validation error, out of stock, or an injected failure), nothing
  is saved, so no half-done reservation is left behind.
- **Server clock.** The server's time is `Date.now() + 90 s` (`server/clock.ts`). Every response
  carries `serverTime`. The browser stores `offset = serverTime − Date.now()` (`api/serverClock.ts`),
  and every countdown or expiry check uses `serverNow()`, never the browser clock.
- **Idempotency.** Add to cart, edit and checkout carry an idempotency key. The same key returns the
  saved response and does not run the work twice (TC-13, TC-16). Failed attempts are not remembered,
  so Retry with the same key works (TC-14).
- **Chaos and latency.** `/api/price` takes 200–1500 ms and fails 15 % of the time. Add to cart can be
  made to fail halfway through. In tests latency and random failures are off unless a test turns them on.

### Endpoints

| Method & path | What it does |
|---|---|
| `GET /api/menu` | the menu fixture |
| `GET /api/stock` | stock, sold, reserved, available per ingredient |
| `POST /api/price` | unit price breakdown + violations for a config (preview) |
| `GET /api/cart` | cart items (active / expired) + totals re-priced at server time |
| `POST /api/cart/items` | add an item = reserve its stock for 5 minutes |
| `PUT /api/cart/items/:id` | edit an item in one atomic call (net difference) |
| `DELETE /api/cart/items/:id` | remove an item and release its stock |
| `PUT /api/cart/coupon` | set or clear the coupon code |
| `POST /api/checkout` | turn active items into one order, empty the cart |
| `GET /api/orders` | all orders (seed + checkout) |
| `POST /api/dev/fail-next-reserve`, `POST /api/dev/reset` | demo helpers |

---

## 3. The engines (`src/engine`, all pure)

"Pure" means no `Date.now()`, `fetch`, `Math.random`, `localStorage` or React. Time is passed in as
`serverTime` (ms). So the same input always gives the same output, and tests need no mocks.

### Data-driven
Every option, group, limit, rule, price, promotion, coupon code and time comes from `menu.json`.
No id or name appears in `engine`, `server`, `components`, `hooks` or `assistant`. Two things check this:
- `npm run check:hardcode` searches those folders for every id and option name in the fixture.
- `engine/alt-fixture.test.ts` runs validate, pricing and stock on `menu.alt.json`, a completely
  different menu (a burger shop in another time zone).

### Money
All money is an **integer number of poisha** (1 BDT = 100 poisha). Floats are never used for money.
`engine/money.ts`:
- `roundHalfUp(n, d)`: integer division rounded half up, with no decimal number ever created.
- `percentOf(amount, percent)`: used for every percentage (combo, coupon, VAT).
- `toWholeBdtPoisha(p)`: only the final payable is rounded to a whole BDT.
- `formatBdt(p)`: display only.

### Rules engine (Part A): `validate(config, groups, rules) → Violation[]`
- Checks every group's `min`, `max`, `step`, `maxDistinct` and `maxPerOption`, then every cross-group
  rule (`requires`, `excludes`). `overrideLimit` changes a group's max; if several apply, the smallest wins.
- Returns **all** violations, each with an `id`, a `kind` and a readable message built from menu names.
  The UI lists them all and disables Add while there is any.
- An option id that is not on the menu becomes an `unknown` violation, not a crash.

### Stock engine (Part B): `engine/stock.ts`
- Stock is **derived, never stored**: `available = fixture stock − sold (checkout orders) − reserved
  (active, non-expired cart items)`. Seed orders are history and do not reduce stock.
- `usageOf(config, menu, quantity)`: ingredient use of a line (option use × option qty × line quantity).
- `shortagesFor(need, available, menu)`: **every** missing ingredient with the exact amount, formatted
  by `formatShortages()` as `"Short: 2 egg, 2 cheese"`.
- `availableForEdit(available, oldItem, menu)`: for an edit, only the item's own reservation is added
  back (net difference), so an edit can never release more than the item holds.
- `optionHeadroom(...)`: how many more of each option still fit (the `+N left` label; 0 disables it).

### Pricing engine (Part C): `engine/pricing.ts`
- `priceUnit(config, menu)`: base + options → extras deal (every 3rd extra unit, the cheapest, is free)
  → combo percent (if every condition's group-unit total is reached) → unit price. Each step is
  returned, so the UI can show the full breakdown.
- `priceCart(cart, menu, promos, serverTime, couponCode?)`: line totals → subtotal → lists **every** cart
  discount candidate with eligible / not and the reason → only the largest one applies (tie broken by
  `shop.cartDiscountTieBreak`) → VAT on the discounted subtotal → payable rounded to whole BDT.
  The coupon time window is checked in the shop's time zone (`engine/time.ts`).
- **One function everywhere:** the mock server (cart totals, checkout, seed pricing), the UI preview and
  the tests all call the same `priceCart`.

---

## 4. The sales assistant (`src/assistant`)

The bot never sees raw orders and never does arithmetic. Gemini only decides **which function to call**.
Our code computes the number and Gemini puts it into a sentence.

| File | Role |
|---|---|
| `stats.ts` | 8 pure functions over `StoredOrder[]` (C2 in DECISIONS.md). Money comes back as poisha plus ready-made text. |
| `tools.ts` | Gemini function declarations with the same names, plus `runTool()`, which fetches **fresh** `/api/orders` and `/api/menu` on every call. So a new checkout shows up at once (TC-18) and changed data changes the answer (TC-19). |
| `gemini.ts` | plain `fetch` to the Gemini REST API (no SDK). Function-calling loop of at most 3 tool rounds, 30 s timeout, one retry on 503. |
| `systemPrompt.ts` | today's date and shop time zone; use only tool results; copy money text as given; never invent names. |
| `errors.ts` | friendly messages for: missing key, invalid key, quota reached (429), network error, model busy. |
| `config.ts` | model name (`gemini-3.5-flash-lite`). |

Tools: `countOrders`, `totalRevenue`, `bestSellingOptions`, `revenueByPaymentMethod`,
`averageOrderValue`, `couponUsage`, `ordersOnDate`, `describeData`.
There is deliberately **no customer tool**, because orders store no customer. For "Who is our best
customer?" the bot calls `describeData` and explains that the data has no customers (D5, TC-20).

Tests mock Gemini (`gemini.test.ts` and a fake Gemini on MSW in `tc18-20.assistant-ui.test.tsx`), so
`npm test` needs no key or network. They check that raw orders are never in the request body.

---

## 5. Tests

`npm test` runs everything (28 files, 232 tests).

| Where | What |
|---|---|
| `src/engine/*.test.ts` | unit tests for each engine (rounding edge cases, every rule type, shortages, headroom, alt menu) |
| `src/server/*.test.ts` | atomicity, idempotency, seed pricing, storage |
| `src/test/acceptance/` | SPEC §9, one file per TC group; each test name starts with its TC id (TC-01 … TC-20), plus the D1 and D3 UI flows |
| `src/assistant/*.test.ts` | stats on the priced seed, the tool runner, the Gemini loop and its errors |
| `src/answers/answers.test.ts` | Q1–Q8 (see ANSWERS.md) |

Test items A, B and C are built from option **names** (`src/test/builders.ts`), so tests read like the brief.

---

## 6. Trade-offs

- **The server runs in the browser.** MSW + `localStorage` was a fast way to get a real HTTP boundary,
  shared state across tabs and tests that run without a backend. The downside: `localStorage` has no
  locking. Two tabs that write in the same instant are not truly serialised as they would be on a real
  database, although every request re-reads the state and re-checks stock before it saves.
- **The Gemini key is in the browser bundle** (`VITE_` variables are public). That is fine for a local
  demo, but in production the call should go through a small backend that holds the key.
- **Cart totals are re-priced at server time on every read.** The price is locked only at Pay (D2), so
  a coupon that ends at 11:00 disappears from an open cart, and the cart says why.
- **An edit keeps the item's original `expiresAt`.** Editing does not give a fresh 5 minutes, so an item
  cannot be held for ever by editing it.
- **Expired items stay in the cart, read-only, until removed.** They hold no stock, and the user can see
  what happened.
- **Plain code over clever code.** For example, Q2 checks every valid configuration (535,680) instead
  of a smart search. It is slow (~11 s) but obviously correct.
- **Unit tests talk to the server functions directly; UI tests go through MSW.** Engines and server
  logic run fast in plain tests, and the UI tests cover the real HTTP path.

---

## 7. What is unfinished

- **Part G (bonus) is not done:**
  - Refresh does reload the cart from the server, so expired items show as expired, but there is no
    dedicated bonus test for it.
  - There is no cart-level `version` on every mutation. Only an edit carries the item's version
    (`VERSION_CONFLICT`).
  - The unfinished builder config is not saved to `localStorage`, so it is lost on refresh.
- No live demo URL.
- No real backend or database (see Trade-offs).

---

## 8. Actual hours spent

About **32–35 hours** in total.

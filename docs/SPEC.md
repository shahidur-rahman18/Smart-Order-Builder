# SPEC — Smart Order Builder (original brief, verbatim)

> This is the assessment brief copied word for word. It is the source of truth.
> If any other doc disagrees with this file, this file wins.

**Frontend technical assessment — Smart Order Builder**
Rules, shared stock, pricing, orders & a sales assistant

| | |
|---|---|
| Role | Mid-Level Frontend Developer |
| Stack | React 18+, TypeScript (strict), Vite, MSW (mock API), Vitest + React Testing Library, Gemini API (free tier) |
| Deadline | 27 November 2026 at 12:00 am (Bangladesh time) |
| AI tools | Allowed. You must be able to explain, debug and change every line live. |
| Backend | No real backend. Use MSW (or a tiny in-memory mock) as the server. Do not build Django/Node APIs. Calling Gemini from the browser is fine for this task. |

## How to read this brief
This brief is not a prompt to paste into an AI tool. Some things are left open on purpose:

- ◆ **Decision points** have no single right answer. Choose, implement your choice, and explain it in DECISIONS.md in your own words (3-6 sentences each).
- ✋ **Checkpoints** are questions you answer in DECISIONS.md before building that part.

We read DECISIONS.md first. A solution whose code contradicts its own decisions, or whose decisions read like generic AI text, will be questioned.

## 01 What this task measures
This is a logic assessment, not a design assessment. A plain, clean, responsive UI is enough. We grade whether your engine produces exactly the numbers in Section 9, whether it stays correct under race conditions, stock pressure and edits, and whether you can explain your own decisions.

**Data-driven rule:** everything in Appendix A (groups, options, rules, ingredients, stock, promotions) must come from the mock API. No hardcoded option IDs, names or limits in components or engine code. We may run your app against a different menu fixture; it must keep working without code changes.

## 02 Part A - Rules engine (mandatory)
Build a pure, generic function `validate(config, groups, rules)` that returns all violations (not just the first), each with the group/rule id and a human-readable message. Add to Cart stays disabled while any violation exists. It must support:

- Group limits: min, max, step (total must be a multiple), maxDistinct, maxPerOption.
- requires: option X needs at least one of options [Y, Z].
- excludes: option X cannot be combined with any of [Y, Z].
- overrideLimit: if option X is selected, group G gets a different max (the override must win over the base limit).

Example: Scrambled x1 + Fried x1 is valid; Scrambled x3 breaks step 2; Croissant + 3 extras breaks the override (max 2).

## 03 Part B - Ingredient-based shared stock (mandatory)
- Options consume ingredients (e.g. Omelette uses 2 eggs, Fried uses 1). Stock is per ingredient and shared across every item in the cart and the configuration being built.
- For each option, show how many more units can be added right now, and disable it at 0.
- Cart item quantity (1-3) multiplies ingredient usage.
- Editing a cart item must work on the net difference: the item's own current allocation counts as available to itself. Never double-count, never release more than it holds.
- When blocked, list every short ingredient with the exact missing amount (e.g. "Short: 2 egg, 2 cheese").

◆ **Decision point D1.** Two browser tabs share one server. Tab A is editing an item when tab B takes the last eggs. What does tab A see when it saves, and does the user lose anything they typed?

## 04 Part C - Pricing engine (mandatory)
✋ **Checkpoint C1.** Before writing priceCart: explain why storing 679.50 as a JavaScript float is risky for TC-06, and show by hand how the VAT of 75.48 in TC-06 is rounded.

Implement `priceCart(cart, menu, promos, serverTime)` as a pure function shared by the mock server and your tests. All money is in integer poisha (1 BDT = 100 poisha). Apply in this exact order:

| Step | Rule |
|---|---|
| 1 | Unit subtotal = base price + sum(option price x option qty). |
| 2 | P2 Extras deal (per unit): for every 3 extra units, the cheapest extra unit is free (floor(extraUnits / 3) cheapest units). |
| 3 | P1 Combo (per unit): if eggs >= 4 AND protein >= 2, take 10% off the step-2 amount. |
| 4 | Line total = unit price x item quantity. Cart subtotal = sum of line totals. |
| 5 | Cart discount, only one applies (pick the larger; on a tie pick C1): C1 = 100 BDT off if subtotal >= 1,200 BDT. C2 = coupon MORNING15: 15% of subtotal, capped at 150 BDT, valid only if server time (Asia/Dhaka) is strictly before 11:00. |
| 6 | VAT 5% on the discounted subtotal. Payable = discounted subtotal + VAT, rounded to whole BDT. |

Rounding: every percentage step rounds half-up to the nearest poisha; only the final payable is rounded half-up to whole BDT. Show the full breakdown (subtotal, each discount, VAT, payable) in the UI.

**Async preview:** the price shown while configuring comes from the mock /price endpoint. Debounce 300 ms; simulated latency 200-1500 ms; 15% random failure. An older response must never replace a newer configuration's price (cancel stale requests and/or check request ids). On failure keep the configuration and offer Retry.

◆ **Decision point D2.** Promotions change while an item sits in the cart (the coupon stops at 11:00). Decide when a price is locked: at Add to cart, at checkout, or never. Your choice must stay consistent with TC-06/TC-07.

## 05 Part D - Cart and reservations (mandatory)
- Add to Cart sends an idempotency key; double/triple clicks must create exactly one item.
- The mock server reserves all ingredients of an item atomically (all or nothing). A failed request must leave no partial ("phantom") reservation.
- Each reservation lives 5 minutes. The mock server's clock runs 90 seconds ahead of the browser: every countdown and expiry must use server time (compute the offset from a serverTime field), not Date.now().
- When a reservation expires its stock is released and the item becomes read-only (it can be removed, not edited).
- Edit = one server call that swaps the old allocation for the new one atomically (Part B net-difference rule).

◆ **Decision point D3.** A reservation expires while the user is in the middle of editing that item. Decide what happens to their unsaved changes and what the screen tells them.

## 06 Part E - Checkout and orders as JSON (mandatory)
- Pay turns all active cart items into one order, atomically: the reserved stock becomes sold stock and the cart empties. No payment data is collected; the payment method is only a label (card, bkash, cash).
- The mock server stores orders as JSON that survives a refresh. Each stored order includes its computed totals.
- On first start, load orders.seed.json into the store. Seed orders have no prices: price them with your own engine at each order's createdAt.
- A Download orders.json button exports every order (seed + new) as one JSON file.

◆ **Decision point D4.** Who creates the order id and timestamp, the browser or the server, and how do you stop a double-click on Pay from creating two orders?

◆ **Decision point D6.** Design the JSON shape of a stored order yourself. Which fields, which money unit, and how do you record a coupon that was entered but not applied? Document the shape in DECISIONS.md.

## 07 Part F - Sales assistant chatbot (mandatory)
Add a chat panel where shop staff ask questions about sales in plain English (Bangla optional). Use the Gemini API free tier (create a key in Google AI Studio) with a Flash model.

- It must answer at least: how many orders; total revenue; the best-selling option (by units); revenue by payment method; average order value; how many orders actually got the coupon; orders on a given date.
- Numbers come from your code, never from the model. Use Gemini function calling: the model picks one of your tools (pure functions over the orders JSON) and only phrases the result. Do not send the raw orders to the model and ask it to add them up.
- Answers reflect new checkouts immediately, without a reload.
- If a question cannot be answered from the data, the bot says so instead of guessing.
- Read the key from VITE_GEMINI_API_KEY in .env.local. Never commit a real key; ship a .env.example with the variable name only. Create a new free key used only for this task and paste it into the submission form: we put it in our own .env.local to run your app.
- Show a clear message for a missing key, an invalid key, quota errors (429) and network errors.
- Unit-test your stats functions against the seed data and mock the Gemini call in tests.

✋ **Checkpoint C2.** Before wiring Gemini: list every question your bot supports and the exact function (name, inputs, output) that answers it.

◆ **Decision point D5.** Someone asks "Who is our best customer?" but orders store no customer. Decide what the bot replies and how you stop it from inventing a name.

## 08 Part G - Bonus (only after A-F are done)
- Refresh keeps only still-valid reservations (server stays the source of truth).
- Two browser tabs: cart changes carry a version number; a stale tab must get a conflict and reload, never silently overwrite.
- Unfinished configuration survives a refresh.

Do not start Part G before A-F are correct and tested.

## 09 Acceptance tests
Expected values are exact - use the Appendix A data.

- **A** = Toast, Scrambled x2, Chicken Sausage x1, Ketchup.
- **B** = Croissant, Omelette x2, Fried x2, Chicken Sausage x1, Beef Bacon x1, Hash Brown x1, Mushroom x1, Hollandaise.
- **C** = Paratha, Fried x2, Tofu x1, Cheese x2, Baked Beans x1, Mushroom x1, Chili.

| ID | Scenario | Expected result |
|---|---|---|
| TC-01 | Scrambled x3 (plus valid bread/protein) | Blocked: eggs total must be 2-6 in steps of 2 |
| TC-02 | Croissant + 3 extras | Blocked: extras max is 2 when Croissant is selected (override wins) |
| TC-03 | Hollandaise with only Fried eggs | Blocked: Hollandaise requires Scrambled or Omelette |
| TC-04 | Tofu + Beef Bacon / Chili + Hollandaise | Blocked (excludes), both violations listed when both exist |
| TC-05 | Unit price of A, B, C | A = 380.00, B = 679.50, C = 490.00 BDT |
| TC-06 | Cart B x1 + C x2, server time 10:59:59 | Subtotal 1,659.50; C2 = 150.00 wins over C1; VAT 75.48; payable 1,585 |
| TC-07 | Same cart, server time 11:00:00 (coupon entered) | Coupon rejected; C1 = 100.00; VAT 77.98; payable 1,637 |
| TC-08 | Cart B x1 + C x2: remaining stock | egg 0, cheese 0, croissant 1; any new item needing eggs is blocked with reason |
| TC-09 | In that cart, edit B to Omelette x3 + Fried x1 | Blocked: "Short: 1 egg" (B's own 6 eggs counted as available) |
| TC-10 | In that cart, edit B to Omelette x1 + Fried x3 | Allowed; B becomes 643.50; egg remaining becomes 1 |
| TC-11 | In that cart, change C quantity 2 -> 3 | Blocked: "Short: 2 egg, 2 cheese" (all shortages listed) |
| TC-12 | Pricing responses return out of order | Only the latest configuration's price is ever displayed |
| TC-13 | Add to Cart clicked 3 times quickly | Exactly one cart item and one reservation |
| TC-14 | Reserve call fails mid-way | No stock is held; configuration is kept; Retry works |
| TC-15 | Reservation passes 5:00 (server time) | Stock released; item read-only; countdown matched server, not browser |
| TC-16 | Pay clicked twice quickly | Exactly one order; cart empty; sold stock is not released again |
| TC-17 | Refresh after a checkout, then Download orders.json | Orders are still there; the file is valid JSON in the shape you documented (D6) |
| TC-18 | Ask the bot "How many orders?" after loading the seed, then again after one checkout | The two answers differ by exactly one, with no reload |
| TC-19 | Ask the bot for the best-selling option | Same answer as your stats function. We will change the data during review |
| TC-20 | Ask the bot "Who is our best customer?" | It explains it cannot know from this data; it does not invent a name |

## 10 ANSWERS.md (required)
Answer these by running your own code (include the command or test that prints each answer). Show the step-by-step working for Q3 and Q8.

- Q1. Starting from an empty cart, what is the maximum number of item C you can add? Which ingredient limits it?
- Q2. What is the cheapest valid configuration and its unit price?
- Q3. Cart = A x3, server time 10:30. Give subtotal, chosen discount, VAT and payable. Then the same at 11:30.
- Q4. After TC-10, what is the payable at 11:30?
- Q5. The payable of each seed order, and the total revenue of all six.
- Q6. The best-selling option across the seed orders, counted in units (line quantity x option quantity).
- Q7. Which payment method brought in the most revenue in the seed orders?
- Q8. How many seed orders actually received the MORNING15 discount? Explain every order that has the code but did not get the discount.

## 11 Deliverables
- Git repository link with meaningful, small commits (we read the history).
- README: setup, architecture, how the rules/stock/pricing engines and the assistant tools are structured, trade-offs, what is unfinished, and actual hours spent.
- DECISIONS.md: your answers to every ◆ decision point (D1-D6) and ✋ checkpoint (C1-C2), in your own words.
- Automated tests covering Section 9 (Vitest/RTL), with one command to run them.
- ANSWERS.md and .env.example (no real key). Your Gemini key goes in the submission form. Live demo URL is optional.

Submit through the submission form before 27 November 2026 at 12:00 am (Bangladesh time). You can submit only once.

## Appendix A - Fixture (serve this from the mock API)
Product: Build Your Breakfast, base price 250 BDT. Prices in BDT.

| Group | Limits | Options (price, ingredient use) |
|---|---|---|
| Bread | min 1, max 1 | Toast 0 (toast 1); Paratha 20 (paratha 1); Croissant 60 (croissant 1) |
| Eggs | min 2, max 6, step 2 | Fried 30 (egg 1); Scrambled 35 (egg 1); Omelette 70 (egg 2) |
| Protein | min 1, max 3 | Chicken Sausage 60 (sausage 1); Beef Bacon 90 (bacon 1); Tofu 50 (tofu 1) |
| Extras | min 0, max 4 | Hash Brown 40; Mushroom 30; Baked Beans 25; Cheese 35 (each uses 1 of itself) |
| Sauce | min 0, maxDistinct 2, maxPerOption 1 | Ketchup 0 (no stock); Hollandaise 25 (hollandaise 1); Chili 10 (no stock) |

| Cross-group rule | Definition |
|---|---|
| R1 requires | Hollandaise requires at least one of [Scrambled, Omelette] |
| R2 excludes | Tofu excludes [Chicken Sausage, Beef Bacon] |
| R3 overrideLimit | If Croissant is selected, Extras max = 2 |
| R4 excludes | Chili excludes [Hollandaise] |

Ingredient stock: egg 10, sausage 4, bacon 3, tofu 5, croissant 2, paratha 10, toast 20, hash brown 6, mushroom 6, baked beans 8, cheese 4, hollandaise 5. Ketchup and Chili are unlimited. Option ids are the lowercase names used in the seed file (e.g. scrambled, hashbrown, beans).

## Appendix B - Seed orders
Six past orders for Parts E and F. They have no prices: price them with your own engine at each order's createdAt. The shape of the orders you store is your decision (D6).

File: `orders.seed.json` (6 orders) — downloaded from the assessment page, saved at `src/fixtures/orders.seed.json`.

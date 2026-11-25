# DECISIONS

<!--
এই ফাইলটা পুরোটা তোমার নিজের ভাষায় লিখবে। প্রতিটা উত্তর ৩–৬ বাক্যে। ইংরেজিতে লেখো, কারণ reviewer ইংরেজি পড়বে।
কী লিখবে: কী ঠিক করলে, কেন করলে, আর কোডের কোন জায়গায় সেটা আছে (ফাইল বা function-এর নাম)।
নিচের "Think about" প্রশ্নগুলো শুধু ভাবার সুবিধার জন্য। লেখা শেষ হলে প্রশ্নগুলো মুছে দিয়ো।
-->

## ✋ C1 — Why not floats, and how VAT 75.48 is rounded
Decimal numbers in JS are not exact, for example `0.1 + 0.2` gives `0.30000000000000004`. These small errors add up over line totals, discounts and VAT, and can make the payable amount wrong and cause payment problems. So I keep all money as whole numbers in poisha (1 BDT = 100 poisha), for example BDT 679.50 is stored as `67950`.

VAT in TC-06: the discounted subtotal is 150950 poisha. 150950 × 5 = 754750, and 754750 / 100 = 7547.50 poisha. I round half up (.5 or more goes up), so it becomes 7548 poisha = BDT 75.48. This is done by `percentOf()`, which calls `roundHalfUp()` in `src/engine/money.ts`. It uses only integer math, `Math.floor((2 × 754750 + 100) / 200) = 7548`, so no decimal number is created on the way.

Payable = 150950 + 7548 = 158498 poisha = BDT 1584.98. `toWholeBdtPoisha(158498)` rounds it to the nearest whole taka: 158500 poisha = BDT 1585.

## ✋ C2 — Bot questions → functions
<!-- A table: question | function name | inputs | output. Must match src/assistant/tools.ts exactly. -->

| Question | Function | Inputs | Output |
|---|---|---|---|
| | | | |

## ◆ D1 — Two tabs, last eggs taken while editing
When Tab B takes the last available eggs, Tab A's save must fail with a `409 OUT_OF_STOCK` because the stock has changed. The screen shows which ingredients are short and by how much, but all the user's unsaved changes remain intact. The user can update their selection and try saving again. The server rechecks stock atomically to prevent overselling.

## ◆ D2 — When is a price locked?
<!-- Think about: Add to cart vs checkout vs never. How does TC-06 (10:59:59) vs TC-07 (11:00:00) behave with your choice? What does the cart show before Pay? -->
I lock the price when the user clicks Pay, not when the item goes into the cart. It is like a shop counter: you get the offer that is running when you pay. So if someone adds an item at 10:58 and pays at 11:02, they don't get MORNING15, because the coupon only works before 11:00 (TC-06, TC-07). This means the cart price can change, so I show a small message in the cart that the coupon ends at 11. I always use the server clock, because browser time can be different on every device.

## ◆ D3 — Reservation expires during an edit
If a reservation expires while the user is editing, their changes stay on screen, but Save is disabled and an expiry message appears. The countdown uses server time, and the server returns `410 EXPIRED` to prevent further edits.

In the cart, the item is marked "Expired" and can only be removed. The user can choose "Add as new item" to check stock again; if stock is available, the item is added, otherwise the shortage is shown.

## ◆ D4 — Order id/timestamp and double-click on Pay
<!-- Think about: Why should the server (not the browser) create the id and createdAt? How does the idempotency key work? What else stops the second click? -->

## ◆ D5 — "Who is our best customer?"
<!-- Think about: What exactly does the bot reply? Which two things stop it inventing a name (no tool + system prompt)? How is it tested (TC-20)? -->

## ◆ D6 — Stored order JSON shape
<!-- Paste the real shape from src/types/order.ts. Explain: money unit, why totals are stored, how a coupon entered but not applied is recorded (status + reason). -->

```json
```

## Extra decisions (short, 1–3 sentences each)
<!-- Small choices the brief leaves open. Keep only the ones you really made. -->
- **Seed orders and stock:**
- **Rounding of the P1 discount (round the discount, then subtract):**
- **Does an edit renew the 5-minute reservation?**
- **"How many more can be added" = stock-based headroom (group limits shown separately as violations):**
- **Coupon code matching (trim + case-insensitive?):**

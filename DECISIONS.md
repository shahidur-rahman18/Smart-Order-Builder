# DECISIONS

<!--
এই ফাইলটা পুরোটা তোমার নিজের ভাষায় লিখবে। প্রতিটা উত্তর ৩–৬ বাক্যে। ইংরেজিতে লেখো, কারণ reviewer ইংরেজি পড়বে।
কী লিখবে: কী ঠিক করলে, কেন করলে, আর কোডের কোন জায়গায় সেটা আছে (ফাইল বা function-এর নাম)।
নিচের "Think about" প্রশ্নগুলো শুধু ভাবার সুবিধার জন্য। লেখা শেষ হলে প্রশ্নগুলো মুছে দিয়ো।
-->

## ✋ C1 — Why not floats, and how VAT 75.48 is rounded
<!-- Think about: What is 0.1 + 0.2 in JS? Where in TC-06 do many small additions/percentages happen?
     Write the VAT step by hand in poisha: discounted subtotal → × 5% → which half-up rule → 7548. Then payable → 1585. -->

## ✋ C2 — Bot questions → functions
<!-- A table: question | function name | inputs | output. Must match src/assistant/tools.ts exactly. -->

| Question | Function | Inputs | Output |
|---|---|---|---|
| | | | |

## ◆ D1 — Two tabs, last eggs taken while editing
<!-- Think about: What does the server answer (status + shortages)? What does tab A show? Is the typed config kept? Can the user fix it and save again? -->

## ◆ D2 — When is a price locked?
<!-- Think about: Add to cart vs checkout vs never. How does TC-06 (10:59:59) vs TC-07 (11:00:00) behave with your choice? What does the cart show before Pay? -->

## ◆ D3 — Reservation expires during an edit
<!-- Think about: Are unsaved changes kept? What message appears? What can the user do next (e.g. add as a new item)? Why is the old item read-only? -->

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

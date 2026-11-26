# ANSWERS.md

Every value below is computed by the project's own code (the same `validate`, `priceUnit`,
`priceCart`, stock and stats functions that the app and the mock server use) and checked with
`expect()`.

**Command that prints all answers:**

```bash
npm run answers
```

This runs [`src/answers/answers.test.ts`](src/answers/answers.test.ts). Each question has its own
test, named `Q1: …` to `Q8: …`. The same tests also run inside `npm test`.

Money is stored as integer poisha (1 BDT = 100 poisha). Percentages are rounded half up to a whole
poisha. Only the final payable is rounded half up to a whole BDT.

Test items (SPEC §9):
- **A** = Toast, Scrambled x2, Chicken Sausage x1, Ketchup (unit BDT 380.00)
- **B** = Croissant, Omelette x2, Fried x2, Chicken Sausage x1, Beef Bacon x1, Hash Brown x1, Mushroom x1, Hollandaise (unit BDT 679.50)
- **C** = Paratha, Fried x2, Tofu x1, Cheese x2, Baked Beans x1, Mushroom x1, Chili (unit BDT 490.00)

---

## Q1. Maximum number of item C from an empty cart

**Answer: 2. Cheese limits it.**

Test: `Q1: max item C from an empty cart is 2, limited by cheese`

One C uses these ingredients (stock ÷ use per item = how many fit):

| Ingredient | Per item | Stock | Fits |
|---|---|---|---|
| paratha | 1 | 10 | 10 |
| egg | 2 | 10 | 5 |
| tofu | 1 | 5 | 5 |
| **cheese** | **2** | **4** | **2** |
| baked beans | 1 | 8 | 8 |
| mushroom | 1 | 6 | 6 |

The smallest number is cheese, so 2 is the maximum. The test also tries a third C through the
stock engine (`shortagesFor`), which blocks it with `Short: 2 cheese`.

## Q2. Cheapest valid configuration and its unit price

**Answer: Toast, Fried x2, Tofu. Unit price BDT 360.00.**
Adding Ketchup (price 0) gives the same price, so *Toast, Fried x2, Tofu, Ketchup* ties at BDT 360.00.

Test: `Q2: cheapest valid configuration is Toast, Fried x2, Tofu at BDT 360.00`

How it is found: the test builds **every** configuration that passes `validate()` (535,680 of them)
and prices each one with `priceUnit()`, promotions included. It does not guess.

Why this one is the cheapest: base 250.00 + Toast 0 + Fried x2 60.00 (the minimum of 2 eggs at the
cheapest egg) + Tofu 50.00 (the cheapest protein) = 360.00. The extras deal needs 3 extras (only the
cheapest one is free), and the combo needs 4 eggs and 2 proteins. Both cost more to reach than they save.

## Q3. Cart = A x3 at 10:30, then at 11:30

The question only makes sense if the MORNING15 coupon is entered, because time affects only the
coupon. So both runs use cart A x3 **with MORNING15 entered**.

Test: `Q3: A x3 with MORNING15 at 10:30 vs 11:30`

**Step 1: unit price of A**
- base 250.00
- options: Toast 0 + Scrambled 2 × 35.00 = 70.00 + Chicken Sausage 60.00 + Ketchup 0 = 130.00
- extras deal: none (no extras). Combo: no (only 2 eggs and 1 protein).
- unit A = 250.00 + 130.00 = **380.00**

**Step 2: subtotal** = 380.00 × 3 = **1,140.00**

**At 10:30**
| Step | Working | Amount |
|---|---|---|
| C1 (100 off at 1,200+) | 1,140.00 < 1,200.00 → not eligible | — |
| C2 (MORNING15, 15 %, cap 150) | 10:30 is before 11:00 → eligible. 15 % of 1,140.00 = 171.00, capped at 150.00 | 150.00 |
| Chosen discount | only C2 is eligible | **C2 150.00** |
| After discount | 1,140.00 − 150.00 | 990.00 |
| VAT 5 % | 5 % of 990.00 | **49.50** |
| Exact payable | 990.00 + 49.50 | 1,039.50 |
| **Payable** | rounded half up to whole BDT | **BDT 1,040.00** |

**At 11:30**
| Step | Working | Amount |
|---|---|---|
| C1 | 1,140.00 < 1,200.00 → not eligible | — |
| C2 | 11:30 is not before 11:00 → coupon rejected | — |
| Chosen discount | none | **none** |
| VAT 5 % | 5 % of 1,140.00 | **57.00** |
| **Payable** | 1,140.00 + 57.00 | **BDT 1,197.00** |

## Q4. Payable at 11:30 after TC-10

**Answer: BDT 1,600.00.**

Test: `Q4: after TC-10 (B = Omelette x1 + Fried x3, C x2) payable at 11:30 is 1,600`

After TC-10 the cart is B (edited to Omelette x1 + Fried x3, unit 643.50) x1 + C x2.
The test first runs the TC-10 stock check again to confirm the edit is allowed.

| Step | Working | Amount |
|---|---|---|
| Subtotal | 643.50 + 2 × 490.00 | 1,623.50 |
| C2 | 11:30 is not before 11:00 → not eligible (with or without the code) | — |
| C1 | 1,623.50 ≥ 1,200.00 → eligible | **C1 100.00** |
| After discount | 1,623.50 − 100.00 | 1,523.50 |
| VAT 5 % | 5 % of 1,523.50 = 76.175 → rounded half up | 76.18 |
| Exact payable | 1,523.50 + 76.18 | 1,599.68 |
| **Payable** | rounded half up to whole BDT | **BDT 1,600.00** |

## Q5. Payable of each seed order, and total revenue

Each seed order is priced with `priceCart()` at **its own `createdAt` time** (Asia/Dhaka), so the
coupon window is checked against the time of that order, not today's time.

Test: `Q5: payable of each seed order and total revenue 4,995.00`

| Order | Time (Dhaka) | Subtotal | Discount | VAT | Payable |
|---|---|---|---|---|---|
| ORD-1001 | 20 Nov 09:15 | 380.00 | C2 57.00 | 16.15 | **339.00** |
| ORD-1002 | 20 Nov 12:40 | 679.50 | none | 33.98 | **713.00** |
| ORD-1003 | 21 Nov 10:05 | 1,360.00 | C2 150.00 | 60.50 | **1,271.00** |
| ORD-1004 | 21 Nov 19:30 | 550.00 | none | 27.50 | **578.00** |
| ORD-1005 | 22 Nov 08:50 | 970.00 | C2 145.50 | 41.23 | **866.00** |
| ORD-1006 | 22 Nov 13:10 | 1,169.50 | none | 58.48 | **1,228.00** |

**Total revenue of all six: BDT 4,995.00**

## Q6. Best-selling option (units = line quantity × option quantity)

**Answer: Fried, 10 units.** No tie.

Test: `Q6: best-selling option is Fried with 10 units`

Fried units: ORD-1002 1 × 2 = 2, ORD-1003 2 × 2 = 4, ORD-1006 (1 × 2) + (1 × 2) = 4 → **10**.
Next are Scrambled 8, Chicken Sausage 8, Omelette 6, Cheese 6.

This is the same `bestSellingOptions()` function the sales assistant calls (TC-19).

## Q7. Payment method with the most revenue

**Answer: card, BDT 2,145.00** (3 orders).

Test: `Q7: card brought in the most revenue (2,145.00)`

| Method | Orders | Revenue |
|---|---|---|
| **card** | ORD-1001, ORD-1004, ORD-1006 = 339 + 578 + 1,228 | **2,145.00** |
| bkash | ORD-1002, ORD-1005 = 713 + 866 | 1,579.00 |
| cash | ORD-1003 | 1,271.00 |

## Q8. How many seed orders actually received the MORNING15 discount?

**Answer: 3 (ORD-1001, ORD-1003, ORD-1005).** Four orders have the code. ORD-1006 has it but did
not get the discount.

Test: `Q8: 3 seed orders got MORNING15; ORD-1006 had the code but was after 11:00`

"Received the discount" means MORNING15 was the one discount applied to the order (`coupon.applied`),
not just that the code was typed in. Rules: MORNING15 is valid only **before 11:00** shop time.
It gives 15 % of the subtotal, capped at 150.00. Only one cart discount applies, so it must also be
larger than C1 (100.00 off at a subtotal of 1,200.00 or more).

Step by step, for each order that has the code:

1. **ORD-1001, 20 Nov 09:15.** Before 11:00 → the coupon is valid. Subtotal 380.00 → 15 % = 57.00.
   C1 needs 1,200.00 → not eligible. **C2 57.00 applied.**
2. **ORD-1003, 21 Nov 10:05.** Before 11:00 → valid. Subtotal 1,360.00 → 15 % = 204.00, capped at
   150.00. C1 is also eligible (1,360.00 ≥ 1,200.00) but gives only 100.00. 150.00 > 100.00 →
   **C2 150.00 applied.**
3. **ORD-1005, 22 Nov 08:50.** Before 11:00 → valid. Subtotal 970.00 → 15 % = 145.50 (under the cap).
   C1 not eligible. **C2 145.50 applied.**
4. **ORD-1006, 22 Nov 13:10.** 13:10 is **not before 11:00**, so the coupon is rejected
   (`expired_time`: "MORNING15 is valid only before 11:00"). C1 does not apply either, because the
   subtotal 1,169.50 is below 1,200.00. **No discount.** The order pays 1,169.50 + VAT 58.48 → 1,228.00.

Orders without the code (ORD-1002, ORD-1004) are not counted.
So **3 of the 4** orders that have MORNING15 actually received it.

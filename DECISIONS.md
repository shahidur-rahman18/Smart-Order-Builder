# DECISIONS

## ✋ C1 — Why not floats, and how VAT 75.48 is rounded
JavaScript decimals are not exact (`0.1 + 0.2` gives `0.30000000000000004`, and in TC-06 `1509.50 × 0.05` gives `75.47500000000001`), so these tiny errors add up across line totals, discounts and VAT, and the half-up rounding of the payable becomes a matter of luck. To avoid this I keep all money as whole numbers in poisha (1 BDT = 100 poisha), so BDT 679.50 is stored as `67950`. In TC-06 the discounted subtotal is 150950 poisha, and 5% VAT is 150950 × 5 / 100 = 7547.5 poisha, which rounds half up to 7548 poisha = BDT 75.48. This is done by `percentOf()` → `roundHalfUp()` in `src/engine/money.ts` using only integer math (`Math.floor((2 × 754750 + 100) / 200) = 7548`), so no decimal is ever created along the way. The payable is 150950 + 7548 = 158498 poisha (BDT 1,584.98), and `toWholeBdtPoisha()` rounds it to 158500 poisha = BDT 1,585.

## ✋ C2 — Bot questions → functions

The bot never does any maths itself. Every supported question has one pure function in
`src/assistant/stats.ts`. These functions never fetch data; they only work on the order list they are given.

`src/assistant/tools.ts` sits in the middle. Each time Gemini asks for a tool, `tools.ts` fetches a fresh
order list from `/api/orders`, passes it to the matching function, and sends the result back to Gemini.
Gemini only picks which function to call and turns the result into one sentence.

| # | Example question | Function | Inputs | Output |
|---|---|---|---|---|
| 1 | "How many orders?" | `countOrders` | orders | total number of orders |
| 2 | "What is the total revenue?" | `totalRevenue` | orders | total amount (poisha + formatted BDT text) |
| 3 | "What is the best-selling option?" | `bestSellingOptions` | orders, menu (for option names), how many to show (default 1) | option name, units sold, and whether there is a tie |
| 4 | "Revenue by payment method?" | `revenueByPaymentMethod` | orders | for every payment method found in the data: revenue and order count |
| 5 | "What is the average order value?" | `averageOrderValue` | orders | average amount and how many orders it is based on |
| 6 | "How many orders actually got the coupon?" | `couponUsage` | orders | how many entered a code, how many really got the discount, and the id + reason for each that did not |
| 7 | "How many orders on 20 November?" | `ordersOnDate` | orders, date (`YYYY-MM-DD`), time zone | order count, order ids and revenue for that day. A badly formatted date returns an error and the bot asks for a valid date |
| 8 | "What can you tell me?" or anything not in the data (customer, phone number) | `describeData` | nothing | what the bot can answer, what the data contains, and what it does not |

### Calculation rules

- **Revenue** = sum of each order's `payable`.
- **Units** = line quantity × option qty, summed over all orders.
- **"Got the coupon"** means `coupon.applied === true`. An entered code that was not applied is not counted.
- **Payment methods** do not come from a fixed list. Orders are grouped by whatever method each order records.
- **Dates** use the time zone from the menu fixture (currently Asia/Dhaka), applied to each order's `createdAt`.
  A menu for a shop in another time zone works with the same code.
- Money is returned in poisha together with ready-made BDT text, so the model never has to do arithmetic.
- `tools.ts` fetches fresh orders on every tool call, so a new checkout shows up in the very next answer
  without a reload (TC-18).
- If a question does not match any function, the bot says it cannot answer that from the data and lists
  what it can answer.

## ◆ D1 — Two tabs, last eggs taken while editing
When Tab B takes the last available eggs, Tab A's save must fail with a `409 OUT_OF_STOCK` because the stock has changed. The screen shows which ingredients are short and by how much, but all the user's unsaved changes remain intact. The user can update their selection and try saving again. The server rechecks stock atomically to prevent overselling.

## ◆ D2 — When is a price locked?
I lock the price when the user clicks Pay, not when the item goes into the cart. It is like a shop counter: you get the offer that is running when you pay. So if someone adds an item at 10:58 and pays at 11:02, they don't get MORNING15, because the coupon only works before 11:00 (TC-06, TC-07). This means the cart price can change, so I show a small message in the cart that the coupon ends at 11. I always use the server clock, because browser time can be different on every device.

## ◆ D3 — Reservation expires during an edit
If a reservation expires while the user is editing, their changes stay on screen, but Save is disabled and an expiry message appears. The countdown uses server time, and the server returns `410 EXPIRED` to prevent further edits.

In the cart, the item is marked "Expired" and can only be removed. The user can choose "Add as new item" to check stock again; if stock is available, the item is added, otherwise the shortage is shown.

## ◆ D4 — Order id/timestamp and double-click on Pay
The server generates the order ID using `crypto.randomUUID()` and creates the timestamp using its own clock, so the browser's clock difference cannot affect the order time. Reusing the same idempotency key returns the previous result instead of creating another order. After a successful checkout, the cart is cleared, so a later request with a new key returns `409 CART_EMPTY` because no active items remain. The Pay button stays disabled while the request is pending.

## ◆ D5 — "Who is our best customer?"
Orders do not store any customer identity, so the bot says plainly that the order data has no customer names or contact details and it cannot tell who the best customer is, and lists what it can answer instead. It cannot invent a name because there is no source for one: `StoredOrder` has no customer field, and no tool returns customers. The "not available" answer comes from code, not from the model's guess, because the `describeData` tool returns a `notInData` list (customer names or identity, phone numbers, emails, addresses and so on). The system prompt also tells Gemini to answer only from tool results and never invent a name or a number; if no tool fits, it calls `describeData` and says the data does not contain that. TC-20 (Gemini mocked) checks that the answer says the order data has no customer information, that no customer tool is in the tool list sent to Gemini, and that the system prompt contains the "never invent" rule. I also tried it in the browser with a real Gemini key: the bot called `describeData`, explained what is missing, and did not invent a name.

## ◆ D6 — Stored order JSON shape
All order amounts are stored as integer poisha to avoid decimal calculation errors. Order totals are saved at checkout so that future price or promotion changes do not affect past orders or receipts. The coupon record keeps the entered code, whether it was applied, its status, and the reason if it was not applied.

Example (seed order ORD-1006, as stored):

```json
{
  "id": "ORD-1006",
  "source": "seed",
  "createdAt": "2026-11-22T07:10:00.000Z",
  "pricedAt": "2026-11-22T07:10:00.000Z",
  "paymentMethod": "card",
  "moneyUnit": "poisha",
  "currency": "BDT",
  "lines": [
    {
      "lineId": "ORD-1006-1",
      "quantity": 1,
      "config": { "croissant": 1, "omelette": 2, "fried": 2, "sausage": 1, "bacon": 1, "hashbrown": 1, "mushroom": 1, "hollandaise": 1 },
      "unit": { "base": 25000, "optionsTotal": 50500, "step1": 75500,
                "cheapestFree": { "freeUnits": 0, "discount": 0 }, "step2": 75500,
                "combo": { "applied": true, "discount": 7550 }, "unitPrice": 67950 },
      "lineTotal": 67950
    },
    {
      "lineId": "ORD-1006-2",
      "quantity": 1,
      "config": { "croissant": 1, "fried": 2, "tofu": 1, "cheese": 2 },
      "unit": { "base": 25000, "optionsTotal": 24000, "step1": 49000,
                "cheapestFree": { "freeUnits": 0, "discount": 0 }, "step2": 49000,
                "combo": { "applied": false, "discount": 0 }, "unitPrice": 49000 },
      "lineTotal": 49000
    }
  ],
  "coupon": { "entered": "MORNING15", "applied": false, "status": "expired_time", "reason": "MORNING15 is valid only before 11:00" },
  "totals": { "subtotal": 116950, "discount": null, "discountedSubtotal": 116950,
              "vat": 5848, "payableExact": 122798, "payable": 122800 },
  "pricingWarnings": []
}
```

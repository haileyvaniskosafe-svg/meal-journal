/* ============================================================
   FOOD SEED — the starter library.

   FOOD_SEED_REV is the revision. Bump it after changing anything
   below and the update reaches installs that already hold the old
   numbers — but only for foods the user hasn't edited. Anything
   edited in the app is theirs and is never overwritten.

   `verified: true` means the numbers came off an actual label.
   `verified: false` means they're an estimate and the app flags them.

   Macros are per the stated serving:
     cal, protein, carbs, fat, fiber, sugar (g), sodium (mg)
   `waterOz` counts a drink toward the day's water. The rule: count it if
   you drink it to quench thirst (water, Gatorade Zero), leave it at 0 if
   you drink it for taste, caffeine or nutrition (soda, milk, coffee).
   Strictly, those hydrate too — the line is about keeping the daily number
   meaningful, not about physiology.
   ============================================================ */
window.FOOD_SEED_REV = 9;

window.FOOD_SEED = [
  {
    // Label read: 1 bag (33 g) unpopped, makes about 5.5 cups popped.
    name: "SmartPop Butter Popcorn", brand: "Orville Redenbacher's",
    serving: "1 bag (33 g) — ~5.5 cups popped",
    macros: { cal: 100, protein: 3, carbs: 22, fat: 2, fiber: 4, sugar: 0, sodium: 310 },
    verified: true,
  },
  {
    // Label read: 1 bottle (207 ml / 7 fl oz).
    name: "Oikos Pro Peach drink", brand: "Oikos",
    serving: "1 bottle (7 fl oz / 207 ml)",
    macros: { cal: 120, protein: 23, carbs: 5, fat: 1.5, fiber: 0, sugar: 4, sodium: 120 },
    verified: true,
  },
  {
    // Label read: 25 biscuits (60 g), cereal alone.
    name: "Frosted Mini-Wheats, bite size", brand: "Kellogg's",
    serving: "25 biscuits (60 g)",
    macros: { cal: 210, protein: 6, carbs: 51, fat: 1.5, fiber: 6, sugar: 12, sodium: 10 },
    verified: true,
    note: "From the label. Protein was the one row I couldn't read cleanly — 5 or 6 g.",
  },
  {
    name: "2% lactose-free milk", brand: "fairlife",
    serving: "1 cup (240 ml)",
    macros: { cal: 120, protein: 13, carbs: 6, fat: 4.5, fiber: 0, sugar: 6, sodium: 120 },
    verified: true,
  },
  {
    // Label read: 1 package (34 g). Sugars shown as "<1 g".
    name: "Beef & Cheese snack stick", brand: "Jack Link's",
    serving: "1 package (1.2 oz / 34 g)",
    macros: { cal: 140, protein: 8, carbs: 2, fat: 11, fiber: 0, sugar: 1, sodium: 510 },
    verified: true,
  },
  {
    name: "Mountain Water", brand: "Liquid Death",
    serving: "1 can (12 fl oz)",
    macros: { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
    waterOz: 12,
    verified: true,
  },
  {
    // Label read: 1 bottle. Sodium 85 mg.
    name: "Dr Pepper Zero Sugar", brand: "Dr Pepper",
    serving: "1 bottle (16.9 fl oz)",
    macros: { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 85 },
    verified: true,
  },
  {
    // Label read: 1 bottle. Sodium 60 mg.
    name: "Coca-Cola Zero Sugar Cherry", brand: "Coca-Cola",
    serving: "1 bottle (16.9 fl oz)",
    macros: { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 60 },
    verified: true,
  },
  {
    // Published: 210 cal, 13 g fat, 10 g carbs, 14 g protein.
    // Taco Casa doesn't publish fiber, sugar or sodium, so those stay estimates.
    name: "Regular crunchy taco", brand: "Taco Casa",
    serving: "1 taco",
    macros: { cal: 210, protein: 14, carbs: 10, fat: 13, fiber: 2, sugar: 1, sodium: 330 },
    verified: true,
    note: "Calories, fat, carbs and protein from Taco Casa. Fiber, sugar and sodium are estimates — they don't publish them.",
  },
  {
    // Label read: 1 package (269 g).
    name: "Salisbury Steak with Macaroni & Cheese", brand: "Lean Cuisine",
    serving: "1 package (9.5 oz / 269 g)",
    macros: { cal: 260, protein: 21, carbs: 27, fat: 7, fiber: 2, sugar: 3, sodium: 700 },
    verified: true,
  },
  {
    // Label read: 1 sandwich (127 g), 4 per box.
    name: "Honey Wheat English Muffin sandwich", brand: "Jimmy Dean Delights",
    serving: "1 sandwich (127 g)",
    macros: { cal: 230, protein: 14, carbs: 32, fat: 5, fiber: 2, sugar: 4, sodium: 690 },
    verified: true,
    note: "Canadian bacon, egg white & cheese.",
  },
  {
    // Label read: 1 bottle (591 ml). Counts as water: it's a thirst
    // quencher that's almost entirely water, and its sodium is tracked
    // separately, so nothing is hidden by counting it.
    name: "Gatorade Zero, Glacier Freeze", brand: "Gatorade",
    serving: "1 bottle (20 fl oz / 591 ml)",
    macros: { cal: 5, protein: 0, carbs: 2, fat: 0, fiber: 0, sugar: 0, sodium: 270 },
    waterOz: 20,
    verified: true,
  },
  {
    // Label read: 1 stick (28 g). Carbs and sugars both shown as "<1 g",
    // recorded as 1 so they're never under-counted.
    name: "String cheese", brand: "Great Value",
    serving: "1 stick (28 g)",
    macros: { cal: 80, protein: 7, carbs: 1, fat: 6, fiber: 0, sugar: 1, sodium: 190 },
    verified: true,
  },
  {
    // Label read: 1 oz (28 g / about 3 pieces), about 3 servings per bag.
    // The bag's curve hid the carbohydrate and sugar numbers, but both rows
    // read 0% DV, added sugars are 0 g and the whole serving is 0 calories,
    // so there is nothing there to record.
    name: "Dilly Bites dill pickle chips", brand: "Oh Snap!",
    serving: "1 oz (28 g) — ~3 pieces",
    macros: { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 190 },
    verified: true,
    note: "Whole bag is ~3 servings: 0 cal, 570 mg sodium.",
  },
  {
    // Label read off the pack: 3 oz serving — 130 cal, 6 g fat (2 g sat),
    // 70 mg cholesterol, 430 mg sodium, 1 g carb, 0 fiber, 0 sugar, 19 g
    // protein. Doubled here for a 6 oz portion. Net wt 48 oz (3.00 lb)
    // gross, so servings per container is printed as "varied".
    name: "Rotisserie chicken, 6 oz", brand: "Sam's Club (Member's Mark)",
    serving: "6 oz (170 g)",
    macros: { cal: 260, protein: 38, carbs: 2, fat: 12, fiber: 0, sugar: 0, sodium: 860 },
    verified: true,
    note: "Seasoned Rotisserie Chicken, fully cooked. Per the 3 oz panel, doubled. Also 4 g saturated fat and 140 mg cholesterol at this portion.",
  },
];

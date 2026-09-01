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
   `waterOz` counts a drink toward the day's water.
   ============================================================ */
window.FOOD_SEED_REV = 2;

window.FOOD_SEED = [
  {
    name: "SmartPop Butter Popcorn", brand: "Orville Redenbacher's",
    serving: "1 mini bag, popped",
    macros: { cal: 100, protein: 3, carbs: 20, fat: 2, fiber: 4, sugar: 0, sodium: 200 },
    verified: false,
  },
  {
    name: "Oikos Pro Peach drink", brand: "Oikos",
    serving: "1 bottle (7 fl oz)",
    macros: { cal: 150, protein: 23, carbs: 9, fat: 3, fiber: 0, sugar: 6, sodium: 85 },
    verified: false,
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
];

/* ============================================================
   FOOD SEED — the starter library.

   Loaded once into the food database on first run, then owned by
   the user: edit, delete, add. Editing here later won't overwrite
   anything already saved.

   `verified: false` means the numbers are a best estimate, not read
   off the actual label. Check one against the packet, correct it if
   needed, and tick Verified — the badge disappears and it stops
   being flagged.

   Macros are per the stated serving:
     cal, protein, carbs, fat, fiber, sugar (g), sodium (mg)
   ============================================================ */
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
    name: "Frosted Mini-Wheats, bite size", brand: "Kellogg's",
    serving: "25 biscuits (~60 g)",
    macros: { cal: 200, protein: 6, carbs: 47, fat: 1, fiber: 6, sugar: 12, sodium: 5 },
    verified: false,
  },
  {
    name: "2% lactose-free milk", brand: "fairlife",
    serving: "1 cup (240 ml)",
    macros: { cal: 120, protein: 13, carbs: 6, fat: 4.5, fiber: 0, sugar: 6, sodium: 120 },
    verified: false,
  },
  {
    name: "Beef & Cheese snack stick", brand: "Jack Link's",
    serving: "1 stick (1.2 oz)",
    macros: { cal: 140, protein: 8, carbs: 2, fat: 11, fiber: 0, sugar: 1, sodium: 480 },
    verified: false,
  },
  {
    name: "Mountain Water", brand: "Liquid Death",
    serving: "1 can (12 fl oz)",
    macros: { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
    verified: true,   // it's water
  },
  {
    name: "Dr Pepper Zero Sugar", brand: "Dr Pepper",
    serving: "1 bottle (16.9 fl oz)",
    macros: { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 70 },
    verified: false,
  },
  {
    name: "Coca-Cola Zero Sugar Cherry", brand: "Coca-Cola",
    serving: "1 bottle (16.9 fl oz)",
    macros: { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 60 },
    verified: false,
  },
  {
    // A regional chain that publishes little nutrition data, so this is the
    // roughest entry here. Worth correcting if you ever see their numbers.
    name: "Hard taco", brand: "Taco Casa",
    serving: "1 taco",
    macros: { cal: 190, protein: 9, carbs: 12, fat: 11, fiber: 2, sugar: 1, sodium: 330 },
    verified: false,
  },
];

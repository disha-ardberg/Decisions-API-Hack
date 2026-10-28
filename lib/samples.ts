export type Sample = { id: "strong" | "weak" | "ambiguous"; label: string; copy: string };

export const SAMPLES: Sample[] = [
  {
    id: "strong",
    label: "Strong",
    copy:
      "PantryPilot plans your weeknight dinners around the food you already have, so families of one to six stop throwing away groceries and stop asking \"what's for dinner?\" every night. " +
      "Snap your pantry or scan a receipt and get a 5-night plan in under a minute, with dietary filters for vegetarian, gluten-free and nut-free households. " +
      "Receipt photos are processed on your phone and never uploaded. " +
      "$6.99 per month after a 14-day free trial with no card required, cancel anytime in two taps, and a 30-day money-back guarantee if it doesn't fit your family.",
  },
  {
    id: "weak",
    label: "Weak",
    copy:
      "PantryPilot is the revolutionary, game-changing, next-generation AI lifestyle solution that will transform your life. " +
      "Unlock your full potential with cutting-edge technology and experience the ultimate in amazing innovation. " +
      "Don't miss out. Join the future today!",
  },
  {
    id: "ambiguous",
    label: "Ambiguous",
    copy:
      "PantryPilot helps you plan dinners around what you already have at home, and many users find they waste less food. " +
      "It works with most grocery stores and a range of dietary needs. " +
      "Download the app and see what's possible. Premium features available.",
  },
];

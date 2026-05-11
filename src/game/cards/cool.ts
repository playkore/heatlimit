import { makeSimpleCardDefinition } from "./api";

export const coolCard = makeSimpleCardDefinition({
  name: "ОХЛАД.",
  icon: "❄️",
  tags: ["cooling", "utility"],
  effects: [{ icon: "🔥", text: "-3" }],
  effect: { heat: -3 },
  text: "Мультитул остывает.",
  upgrade: {
    effects: [
      { icon: "🔥", text: "-4" },
      { icon: "🃏", text: "+1" },
    ],
    effect: { heat: -4, draw: 1 },
    text: "Глубокое охлаждение и добор карты.",
  },
});

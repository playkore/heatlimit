import { makeSimpleCardDefinition } from "./api";

export const scanCard = makeSimpleCardDefinition({
  name: "СКАН",
  icon: "📡",
  tags: ["repair", "draw"],
  effects: [
    { icon: "🔧", text: "+1" },
    { icon: "⬆️", text: "+2" },
  ],
  effect: { damage: 1, bonus: 2 },
  text: "Слабое место найдено.",
  upgrade: {
    effects: [
      { icon: "🔧", text: "+1" },
      { icon: "⬆️", text: "+3" },
      { icon: "🃏", text: "+1" },
    ],
    effect: { bonus: 3, draw: 1 },
    text: "Скан даёт больший бонус и добирает карту.",
  },
});

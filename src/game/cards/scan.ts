import { makeSimpleCardDefinition } from "./api";

export const scanCard = makeSimpleCardDefinition({
  name: "СКАН",
  description: "Быстрый анализ",
  tags: ["repair", "draw"],
  effects: [
    { icon: "🔧", text: "+1" },
    { icon: "⬆️", text: "+2" },
  ],
  effect: { damage: 1, bonus: 2 },
  text: "Слабое место найдено.",
});

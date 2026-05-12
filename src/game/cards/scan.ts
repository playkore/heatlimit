import { makeSimpleCardDefinition } from "./api";

export const scanCard = makeSimpleCardDefinition({
  name: "СКАН",
  description: "Наносит 1 урон и даёт +2 к следующему ремонту.",
  tags: ["repair", "draw"],
  effects: [
    { icon: "🔧", text: "+1" },
    { icon: "⬆️", text: "+2" },
  ],
  effect: { damage: 1, bonus: 2 },
  text: "Слабое место найдено.",
});

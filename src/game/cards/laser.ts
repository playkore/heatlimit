import { makeSimpleCardDefinition } from "./api";

export const laserCard = makeSimpleCardDefinition({
  name: "ЛАЗЕР",
  description: "Наносит 10 урона и даёт +5 жара.",
  tags: ["repair", "heat", "burst"],
  effects: [
    { icon: "🔧", text: "+10" },
    { icon: "🔥", text: "+5" },
  ],
  effect: { damage: 10, heat: 5 },
  text: "Мощный прожиг. Сильный перегрев.",
});

import { makeSimpleCardDefinition } from "./api";

export const laserCard = makeSimpleCardDefinition({
  name: "ЛАЗЕР",
  icon: "🔆",
  tags: ["repair", "heat", "burst"],
  effects: [
    { icon: "🔧", text: "+10" },
    { icon: "🔥", text: "+5" },
  ],
  effect: { damage: 10, heat: 5, meltsIce: true },
  text: "Мощный прожиг. Сильный перегрев.",
});

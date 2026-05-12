import { makeSimpleCardDefinition } from "./api";

export const impulseCard = makeSimpleCardDefinition({
  name: "ИМПУЛЬС",
  description: "Наносит 1 урон за каждый жар и даёт +2 жара.",
  tags: ["repair", "heat", "burst"],
  effects: [
    { icon: "🔧", text: "×🔥" },
    { icon: "🔥", text: "+2" },
  ],
  effect: { damagePerHeat: 1, heat: 2 },
  text: "Импульс бьёт от накопленного жара.",
});

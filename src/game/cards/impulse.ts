import { makeSimpleCardDefinition } from "./api";

export const impulseCard = makeSimpleCardDefinition({
  name: "ИМПУЛЬС",
  description: "Сильный толчок",
  tags: ["repair", "heat", "burst"],
  effects: [
    { icon: "🔧", text: "×🔥" },
    { icon: "🔥", text: "+2" },
  ],
  effect: { damagePerHeat: 1, heat: 2 },
  text: "Импульс бьёт от накопленного жара.",
});

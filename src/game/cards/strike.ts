import { makeSimpleCardDefinition } from "./api";

export const strikeCard = makeSimpleCardDefinition({
  name: "УДАР",
  description: "Ремонтирует на 5 и даёт +1 жара.",
  tags: ["repair", "heat", "burst"],
  effects: [
    { icon: "🔧", text: "+5" },
    { icon: "🔥", text: "+1" },
  ],
  effect: { damage: 5, heat: 1 },
  text: "Деталь вбита на место.",
});

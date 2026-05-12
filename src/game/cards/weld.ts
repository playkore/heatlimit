import { makeSimpleCardDefinition } from "./api";

export const weldCard = makeSimpleCardDefinition({
  name: "СВАРКА",
  description: "Ремонтирует на 7 и даёт +3 жара.",
  tags: ["repair", "heat", "burst"],
  effects: [
    { icon: "🔧", text: "+7" },
    { icon: "🔥", text: "+3" },
  ],
  effect: { damage: 7, heat: 3, meltsIce: true },
  text: "Шов наложен. Жар растёт.",
});

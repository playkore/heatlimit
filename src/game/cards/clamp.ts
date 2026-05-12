import { makeSimpleCardDefinition } from "./api";

export const clampCard = makeSimpleCardDefinition({
  name: "ЗАЖИМ",
  description: "Ремонтирует на 3 ед.",
  tags: ["repair"],
  effects: [{ icon: "🔧", text: "+3" }],
  effect: { damage: 3 },
  text: "Пробоина зажата.",
});

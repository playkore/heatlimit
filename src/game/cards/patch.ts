import { makeSimpleCardDefinition } from "./api";

export const patchCard = makeSimpleCardDefinition({
  name: "ЗАПЛАТКА",
  description: "Ремонтирует на 4 ед.",
  tags: ["repair"],
  effects: [{ icon: "🔧", text: "+4" }],
  effect: { damage: 4 },
  text: "Пробоина герметизирована.",
});

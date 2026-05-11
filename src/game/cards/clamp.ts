import { makeSimpleCardDefinition } from "./api";

export const clampCard = makeSimpleCardDefinition({
  name: "ЗАЖИМ",
  icon: "🗜️",
  tags: ["repair"],
  effects: [{ icon: "🔧", text: "+3" }],
  effect: { damage: 3 },
  text: "Пробоина зажата.",
});

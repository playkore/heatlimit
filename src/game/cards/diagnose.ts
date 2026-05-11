import { makeSimpleCardDefinition } from "./api";

export const diagnoseCard = makeSimpleCardDefinition({
  name: "ДИАГН.",
  icon: "🛰️",
  tags: ["draw", "utility"],
  effects: [{ icon: "🃏", text: "+2" }],
  effect: { draw: 2 },
  text: "Найдены новые варианты.",
});

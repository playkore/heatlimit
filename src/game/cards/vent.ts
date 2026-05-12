import { makeSimpleCardDefinition } from "./api";

export const ventCard = makeSimpleCardDefinition({
  name: "ПРОДУВКА",
  description: "Стравить жар",
  tags: ["cooling", "utility"],
  effects: [{ icon: "🔥", text: "=0" }],
  effect: { heatSet: 0 },
  text: "Жар сброшен.",
});

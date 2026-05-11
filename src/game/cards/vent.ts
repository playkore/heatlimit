import { makeSimpleCardDefinition } from "./api";

export const ventCard = makeSimpleCardDefinition({
  name: "ПРОДУВКА",
  icon: "💨",
  tags: ["cooling", "utility"],
  effects: [{ icon: "🔥", text: "=0" }],
  effect: { heatSet: 0 },
  text: "Жар сброшен.",
});

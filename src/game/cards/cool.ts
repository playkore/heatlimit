import { makeSimpleCardDefinition } from "./api";

export const coolCard = makeSimpleCardDefinition({
  name: "ОХЛАД.",
  description: "Охлаждает мультитул на 3 ед.",
  tags: ["cooling", "utility"],
  effects: [{ icon: "🔥", text: "-3" }],
  effect: { heat: -3 },
  text: "Мультитул остывает.",
});

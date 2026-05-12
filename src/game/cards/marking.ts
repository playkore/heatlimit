import { VulnerabilityEffect } from "../effects/standard";
import { makeSimpleCardDefinition } from "./api";

export const markingCard = makeSimpleCardDefinition({
  name: "РАЗМЕТКА",
  description: "Следующие 2 ремонта +1",
  tags: ["repair", "utility"],
  effects: [{ icon: "💥", text: "+1×2" }],
  effect: { addEffect: () => new VulnerabilityEffect(1, 2) },
  text: "Слабое место помечено.",
});

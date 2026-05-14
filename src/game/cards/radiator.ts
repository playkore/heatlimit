import { makeSimpleCardDefinition } from "./api";
import { RadiatorEffect } from "../effects/standard";

export const radiatorCard = makeSimpleCardDefinition({
  name: "РАДИАТОР",
  description: "В конце следующих 2 циклов снижает жар на 1.",
  tags: ["cooling", "utility"],
  effects: [{ icon: "⏱", text: "×2, -1" }],
  effect: { addEffect: () => new RadiatorEffect() },
  text: "Тепло уходит медленно, но стабильно.",
});

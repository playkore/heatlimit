import { CondenserEffect } from "../effects/standard";
import { makeSimpleCardDefinition } from "./api";

export const condenserCard = makeSimpleCardDefinition({
  name: "КОНДЕНСАТОР",
  description: "При охлаждении ремонт +1",
  tags: ["cooling", "utility"],
  effects: [{ icon: "🔋", text: "+1" }],
  effect: { addEffect: () => new CondenserEffect(1, 2) },
  text: "Охлаждение питает ремонт.",
});

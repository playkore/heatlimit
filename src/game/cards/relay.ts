import { RelayEffect } from "../effects/standard";
import { makeSimpleCardDefinition } from "./api";

export const relayCard = makeSimpleCardDefinition({
  name: "РЕЛЕ",
  description: "Следующая карта повторяется",
  tags: ["utility", "draw"],
  effects: [{ icon: "↻", text: "x2" }],
  effect: { addEffect: () => new RelayEffect() },
  text: "Следующее действие повторяется.",
});

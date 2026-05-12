import { HeatReductionEffect } from "../effects/standard";
import { makeSimpleCardDefinition } from "./api";

export const cryoPrepCard = makeSimpleCardDefinition({
  name: "КРИО-ПОДГОТОВКА",
  description: "Следующая горячая карта: -2 жара",
  tags: ["cooling", "utility"],
  effects: [{ icon: "🔥", text: "-2" }],
  effect: { addEffect: () => new HeatReductionEffect(2, "Следующая горячая карта: -2 жара", true) },
  text: "Следующая горячая карта охлаждена.",
});

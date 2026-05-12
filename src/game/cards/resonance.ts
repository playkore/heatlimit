import { BrittleEffect } from "../effects/standard";
import { makeSimpleCardDefinition } from "./api";

export const resonanceCard = makeSimpleCardDefinition({
  name: "РЕЗОНАНС",
  description: "Следующий ремонт x2",
  tags: ["repair", "burst"],
  effects: [{ icon: "×2", text: "ремонт" }],
  effect: { addEffect: () => new BrittleEffect() },
  text: "Конструкция вошла в резонанс.",
});

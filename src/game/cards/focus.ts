import { BonusEffect } from "../effects/bonus";
import { makeSimpleCardDefinition } from "./api";

export const focusCard = makeSimpleCardDefinition({
  name: "ФОКУС",
  description: "Следующий ремонт +4",
  tags: ["utility", "repair"],
  effects: [{ icon: "⬆️", text: "+4" }],
  effect: { addEffect: () => new BonusEffect(4) },
  text: "Следующая ремонтная карта сильнее.",
});

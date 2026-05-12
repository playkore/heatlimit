import { RedZoneEffect } from "../effects/standard";
import { makeSimpleCardDefinition } from "./api";

export const redZoneCard = makeSimpleCardDefinition({
  name: "КРАСНАЯ ЗОНА",
  description: "Пока жара 7+, ремонт +2",
  tags: ["heat", "repair"],
  effects: [{ icon: "🔥", text: ">=7" }],
  effect: { addEffect: () => new RedZoneEffect(7, 2) },
  text: "Мультитул работает на пределе.",
});

import { HeatReductionEffect } from "../effects/standard";
import { makeSimpleCardDefinition } from "./api";

export const magneticGrabCard = makeSimpleCardDefinition({
  name: "МАГНИТНЫЙ ЗАХВАТ",
  description: "Добирает 1 и снижает жар следующей карты",
  tags: ["draw", "utility"],
  effects: [
    { icon: "🃏", text: "+1" },
    { icon: "🔥", text: "-1" },
  ],
  effect: { draw: 1, addEffect: () => new HeatReductionEffect(1, "Следующая карта: -1 жара") },
  text: "Охлаждение усиливает следующий ход.",
});

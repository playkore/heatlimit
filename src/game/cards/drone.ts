import { DroneEffect } from "../effects/standard";
import { makeSimpleCardDefinition } from "./api";

export const droneCard = makeSimpleCardDefinition({
  name: "ДРОН",
  description: "В конце цикла ремонт +2",
  tags: ["repair", "utility"],
  effects: [{ icon: "⌛", text: "🔧+2" }],
  effect: { addEffect: () => new DroneEffect(2) },
  text: "Ремонтный дрон продолжает работу сам.",
});

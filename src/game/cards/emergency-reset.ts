import { makeSimpleCardDefinition } from "./api";

export const emergencyResetCard = makeSimpleCardDefinition({
  name: "АВАРИЙНЫЙ СБРОС",
  description: "Сбрасывает жар до 0",
  tags: ["cooling", "utility", "exhaust"],
  effects: [
    { icon: "🔥", text: "=0" },
    { icon: "🗑️", text: "бой" },
  ],
  effect: { heatSet: 0, exhaust: true },
  text: "Полный сброс жара. Карта уничтожается.",
});

import { makeSimpleCardDefinition } from "./api";

export const cryoCard = makeSimpleCardDefinition({
  name: "КРИО",
  description: "Сбрасывает жар до 0 и сгорает.",
  tags: ["cooling", "utility", "exhaust"],
  effects: [
    { icon: "🔥", text: "=0" },
    { icon: "🗑️", text: "бой" },
  ],
  effect: { heatSet: 0, exhaust: true },
  text: "Жар сброшен. Карта сгорает.",
});

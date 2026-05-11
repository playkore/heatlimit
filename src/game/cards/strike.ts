import { makeSimpleCardDefinition } from "./api";

export const strikeCard = makeSimpleCardDefinition({
  name: "УДАР",
  icon: "🔨",
  tags: ["repair", "heat", "burst"],
  effects: [
    { icon: "🔧", text: "+5" },
    { icon: "🔥", text: "+1" },
  ],
  effect: { damage: 5, heat: 1 },
  text: "Деталь вбита на место.",
});

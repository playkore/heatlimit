import { makeSimpleCardDefinition } from "./api";

export const weldCard = makeSimpleCardDefinition({
  name: "СВАРКА",
  icon: "⚡",
  tags: ["repair", "heat", "burst"],
  effects: [
    { icon: "🔧", text: "+7" },
    { icon: "🔥", text: "+3" },
  ],
  effect: { damage: 7, heat: 3, meltsIce: true },
  text: "Шов наложен. Жар растёт.",
});

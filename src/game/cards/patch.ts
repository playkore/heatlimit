import { makeSimpleCardDefinition } from "./api";

export const patchCard = makeSimpleCardDefinition({
  name: "ЗАПЛАТКА",
  icon: "🩹",
  tags: ["repair"],
  effects: [{ icon: "🔧", text: "+4" }],
  effect: { damage: 4 },
  text: "Пробоина герметизирована.",
  upgrade: {
    effects: [{ icon: "🔧", text: "+6" }],
    effect: { damage: 6 },
    text: "Прочная заплатка держит лучше.",
  },
});

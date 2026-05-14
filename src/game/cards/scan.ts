import { makeSimpleCardDefinition } from "./api";
import { BrittleEffect } from "../effects/standard";

export const scanCard = makeSimpleCardDefinition({
  name: "СКАН",
  description: "Даёт ×2 к ближайшей ремонтной карте.",
  tags: ["repair", "draw"],
  effects: [{ icon: "×2", text: "след. ремонт" }],
  effect: { addEffect: () => new BrittleEffect() },
  text: "Слабое место найдено.",
});

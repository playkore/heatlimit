import { makeSimpleCardDefinition } from "./api";
import { NextHandBrittleEffect } from "../effects/standard";

export const scanCard = makeSimpleCardDefinition({
  name: "СКАН",
  description: "Даёт ×2 к первой ремонтной карте следующей руки.",
  tags: ["repair", "draw"],
  effects: [{ icon: "×2", text: "след. рука" }],
  effect: { addEffect: () => new NextHandBrittleEffect() },
  text: "Слабое место найдено.",
});

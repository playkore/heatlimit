import { makeSimpleCardDefinition } from "./api";

export const pasteCard = makeSimpleCardDefinition({
  name: "ТЕРМОП.",
  description: "Снижает жар на 1 и даёт 2 щита.",
  tags: ["cooling", "utility"],
  effects: [
    { icon: "🔥", text: "-1" },
    { icon: "🛡️", text: "-2" },
  ],
  effect: { heat: -1, cycleShield: 2 },
  text: "Нагрев аварии снижен.",
});

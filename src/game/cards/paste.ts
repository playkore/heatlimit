import { makeSimpleCardDefinition } from "./api";

export const pasteCard = makeSimpleCardDefinition({
  name: "ТЕРМОП.",
  icon: "🧴",
  tags: ["cooling", "utility"],
  effects: [
    { icon: "🔥", text: "-1" },
    { icon: "🛡️", text: "-2" },
  ],
  effect: { heat: -1, cycleShield: 2 },
  text: "Нагрев аварии снижен.",
});

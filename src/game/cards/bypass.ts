import { makeSimpleCardDefinition } from "./api";

export const bypassCard = makeSimpleCardDefinition({
  name: "БАЙПАС",
  description: "Снижает жар на 2 и добирает 1 карту.",
  tags: ["cooling", "draw", "utility"],
  effects: [
    { icon: "🔥", text: "-2" },
    { icon: "🃏", text: "+1" },
  ],
  effect: { heat: -2, draw: 1 },
  text: "Жар стравливается, а в руку приходит ещё один инструмент.",
});

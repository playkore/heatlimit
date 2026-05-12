import { BypassEffect } from "../effects/standard";
import { makeSimpleCardDefinition } from "./api";

export const bypassCard = makeSimpleCardDefinition({
  name: "БАЙПАС",
  description: "Следующая карта игнорирует броню и лёд",
  tags: ["repair", "utility", "burst"],
  effects: [{ icon: "🔀", text: "обход" }],
  effect: { addEffect: () => new BypassEffect() },
  text: "Временный обход поврежденного узла.",
});

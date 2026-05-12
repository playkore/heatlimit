import { makeSimpleCardDefinition } from "./api";

export const isolentaCard = makeSimpleCardDefinition({
  name: "ИЗОЛЕНТА",
  description: "Снимает искрение",
  tags: ["cooling", "utility"],
  effects: [{ icon: "❌", text: "искрение" }],
  effect: { removeEffectKinds: ["spark"] },
  text: "Снимает эффект искрения.",
});

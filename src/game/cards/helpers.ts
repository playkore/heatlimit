import type { EffectDef, ResolvedCard } from "./api";
import { cardDb, type CardId } from "./registry";

export interface DeckCard {
  id: CardId;
  upgraded?: boolean;
}

export function cloneCard(card: DeckCard): DeckCard {
  return { id: card.id, upgraded: !!card.upgraded };
}

export function effectText(effects: readonly EffectDef[]): string {
  return effects.map((effect) => `${effect.icon}${effect.text}`).join(" ");
}

export function getCardProps(card: DeckCard): ResolvedCard {
  const base = cardDb[card.id];
  const resolved = card.upgraded && base.upgrade ? { ...base, ...base.upgrade } : base;

  return {
    ...resolved,
    id: card.id,
    upgraded: !!card.upgraded,
    name: `${base.name}${card.upgraded ? "+" : ""}`,
    icon: base.icon,
  };
}

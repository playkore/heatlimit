import type { EffectDef, ResolvedCard } from "./api";
import { cardDb, type CardId } from "./registry";

export interface DeckCard {
  id: CardId;
}

export function cloneCard(card: DeckCard): DeckCard {
  return { id: card.id };
}

export function effectText(effects: readonly EffectDef[]): string {
  return effects.map((effect) => `${effect.icon}${effect.text}`).join(" ");
}

export function getCardProps(card: DeckCard): ResolvedCard {
  const base = cardDb[card.id];

  return {
    ...base,
    id: card.id,
    name: base.name,
    icon: base.icon,
  };
}

import { bossDefectEntry, regularDefects } from "./defects/registry";
import { cloneCard, effectText, getCardProps, type DeckCard } from "./cards/helpers";
import { cardDb, cardRewardPool, initialDeck, type CardId } from "./cards/registry";

export interface DefectDefinition {
  id: string;
  title: string;
  emoji: string;
  baseHp: number;
  heatPerCycle: number;
  text: string;
  subtitle: string;
  boss?: boolean;
}

export interface DefectInstance extends DefectDefinition {
  hp: number;
}

export const MAX_HEAT = 10;
export const MAX_ACTIONS = 2;
export const HAND_SIZE = 3;
export const FINAL_STAGE = 5;

export function makeDefectForStage(stage: number): DefectInstance {
  if (stage === FINAL_STAGE) {
    return { ...bossDefectEntry, hp: bossDefectEntry.baseHp };
  }

  const base = regularDefects[(stage - 1) % regularDefects.length];
  return {
    ...base,
    hp: base.baseHp + (stage - 1) * 5,
    heatPerCycle: base.heatPerCycle + (stage >= 4 ? 1 : 0),
  };
}

export { cardDb, cardRewardPool, cloneCard, effectText, getCardProps, initialDeck };
export type { CardId, DeckCard };

import type { ActiveEffect, EffectView } from "../effects/api";
import { BonusEffect } from "../effects/bonus";

export interface EffectDef {
  icon: string;
  text: string;
}

export type CardTag = "repair" | "cooling" | "draw" | "heat" | "burst" | "utility" | "exhaust";

export interface DefectView {
  id: string;
  boss?: boolean;
}

export interface DeckCardView {
  id: string;
}

export interface GameStateView {
  phase: string;
  stage: number;
  hp: number;
  maxHp: number;
  heat: number;
  actions: number;
  cycleShield: number;
  effects: readonly EffectView[];
  hand: readonly DeckCardView[];
  drawPileCount: number;
  discardCount: number;
  defect: DefectView | null;
}

export interface GameEvent {
  type: "banner" | "float" | "enemy-hit" | "enemy-pulse" | "shake";
  text?: string;
  tone?: "heat" | "info";
  amount?: number;
}

export interface ResolvedCard {
  id: string;
  name: string;
  description: string;
  tags: readonly CardTag[];
  effects: readonly EffectDef[];
  text: string;
  logic: CardLogic;
}

export interface CardPlayContext {
  readonly card: ResolvedCard;
  readonly state: Readonly<GameStateView>;
  getState(): Readonly<GameStateView>;
  readonly rng: {
    next(): number;
    int(maxExclusive: number): number;
    pick<T>(items: readonly T[]): T;
    shuffle<T>(items: readonly T[]): T[];
  };

  dealDamage(amount: number): void;
  addHeat(amount: number): void;
  setHeat(value: number): void;
  drawCards(count: number): void;
  discardHand(): void;
  exhaustSelf(): void;
  addBonus(amount: number): void;
  addEffect(effect: ActiveEffect): void;
  removeEffects(kind: string): void;
  addCycleShield(amount: number): void;
  emit(event: GameEvent): void;
  setMessage(html: string): void;
}

export interface CardLogic {
  play(ctx: CardPlayContext): void;
}

export interface SimpleCardEffect {
  damage?: number;
  heat?: number;
  bonus?: number;
  draw?: number;
  heatSet?: number;
  cycleShield?: number;
  exhaust?: boolean;
  damagePerHeat?: number;
  addEffect?: ActiveEffect | (() => ActiveEffect) | readonly (ActiveEffect | (() => ActiveEffect))[];
  removeEffectKinds?: readonly string[];
}

export interface SimpleCardDefinitionOptions {
  name: string;
  description: string;
  tags?: readonly CardTag[];
  effects: readonly EffectDef[];
  text: string;
  effect: SimpleCardEffect;
}

export interface CardDefinition {
  name: string;
  description: string;
  tags: readonly CardTag[];
  effects: readonly EffectDef[];
  text: string;
  logic: CardLogic;
}

function createLogic(effect: SimpleCardEffect): CardLogic {
  return {
    play(ctx) {
      const damage =
        (effect.damage ?? 0) +
        (effect.damagePerHeat ? Math.max(1, ctx.state.heat) * effect.damagePerHeat : 0);

      if (damage > 0) {
        ctx.dealDamage(damage);
      }

      if (effect.heatSet !== undefined) {
        ctx.setHeat(effect.heatSet);
      } else if (effect.heat !== undefined && effect.heat !== 0) {
        ctx.addHeat(effect.heat);
      }

      if (effect.bonus) {
        ctx.addEffect(new BonusEffect(effect.bonus));
      }

      if (effect.addEffect) {
        const effects = Array.isArray(effect.addEffect) ? effect.addEffect : [effect.addEffect];
        effects.forEach((activeEffect) => {
          ctx.addEffect(typeof activeEffect === "function" ? activeEffect() : activeEffect);
        });
      }

      if (effect.removeEffectKinds) {
        effect.removeEffectKinds.forEach((kind) => ctx.removeEffects(kind));
      }

      if (effect.cycleShield) {
        ctx.addCycleShield(effect.cycleShield);
      }

      if (effect.draw) {
        ctx.drawCards(effect.draw);
      }

      if (effect.exhaust) {
        ctx.exhaustSelf();
      }
    },
  };
}

export function makeSimpleCardDefinition(options: SimpleCardDefinitionOptions): CardDefinition {
  const baseLogic = createLogic(options.effect);

  return {
    name: options.name,
    description: options.description,
    tags: options.tags ?? [],
    effects: options.effects,
    text: options.text,
    logic: {
      play(ctx) {
        baseLogic.play(ctx);
        ctx.setMessage(`<b>${ctx.card.name}</b>: ${ctx.card.text}`);
      },
    },
  };
}

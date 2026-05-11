import type { GameRule } from "../rules/api";

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
  upgraded?: boolean;
}

export interface GameStateView {
  phase: string;
  stage: number;
  hp: number;
  maxHp: number;
  heat: number;
  actions: number;
  bonus: number;
  cycleShield: number;
  hand: readonly DeckCardView[];
  drawPileCount: number;
  discardCount: number;
  modules: readonly string[];
  defect: DefectView | null;
  flags: Readonly<Record<string, boolean>>;
}

export interface GameEvent {
  type: "banner" | "float" | "enemy-hit" | "enemy-pulse" | "shake";
  text?: string;
  tone?: "heat" | "info";
  amount?: number;
}

export interface ResolvedCard {
  id: string;
  upgraded: boolean;
  name: string;
  icon: string;
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
  addCycleShield(amount: number): void;
  addRule(rule: GameRule): void;
  emit(event: GameEvent): void;
  setMessage(html: string): void;
  meltIce(): void;
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
  meltsIce?: boolean;
}

export interface SimpleCardDefinitionOptions {
  name: string;
  icon: string;
  tags?: readonly CardTag[];
  effects: readonly EffectDef[];
  text: string;
  effect: SimpleCardEffect;
  upgrade?: {
    effects: readonly EffectDef[];
    text: string;
    effect: SimpleCardEffect;
  };
}

export interface CardUpgradeDefinition {
  effects: readonly EffectDef[];
  text: string;
  logic: CardLogic;
}

export interface CardDefinition {
  name: string;
  icon: string;
  tags: readonly CardTag[];
  effects: readonly EffectDef[];
  text: string;
  logic: CardLogic;
  upgrade?: CardUpgradeDefinition;
}

function createLogic(effect: SimpleCardEffect): CardLogic {
  return {
    play(ctx) {
      if (effect.meltsIce) {
        ctx.meltIce();
      }

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
        ctx.addBonus(effect.bonus);
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
    icon: options.icon,
    tags: options.tags ?? [],
    effects: options.effects,
    text: options.text,
    logic: {
      play(ctx) {
        baseLogic.play(ctx);
        ctx.setMessage(`<b>${ctx.card.name}</b>: ${ctx.card.text}`);
      },
    },
    upgrade: options.upgrade
      ? {
          effects: options.upgrade.effects,
          text: options.upgrade.text,
          logic: {
            play(ctx) {
              createLogic({ ...options.effect, ...options.upgrade?.effect }).play(ctx);
              ctx.setMessage(`<b>${ctx.card.name}</b>: ${ctx.card.text}`);
            },
          },
        }
      : undefined,
  };
}

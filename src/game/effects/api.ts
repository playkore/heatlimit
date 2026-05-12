export interface EffectView {
  kind: string;
  description: string;
}

export interface EffectCardContext {
  id: string;
  name: string;
  tags: readonly string[];
}

export interface EffectBattleState {
  heat: number;
  phase: string;
}

export interface EffectPlayModifiers {
  repeatCard: number;
  ignoreArmor: boolean;
  ignoreIce: boolean;
}

export interface EffectPlayContext {
  card: EffectCardContext;
  state: Readonly<EffectBattleState>;
  modifiers: EffectPlayModifiers;
}

export interface EffectHeatContext {
  card: EffectCardContext | null;
  state: Readonly<EffectBattleState>;
  previousHeat: number;
  nextHeat: number;
  delta: number;
  source: "card" | "enemy" | "effect";
}

export interface EffectHost {
  state: Readonly<EffectBattleState>;
  dealRepair(amount: number): void;
  addHeat(amount: number): void;
  removeEffects(kind: string): void;
  addEffect(effect: ActiveEffect): void;
}

export abstract class ActiveEffect {
  abstract readonly kind: string;

  abstract getDescription(): string;

  toView(): EffectView {
    return {
      kind: this.kind,
      description: this.getDescription(),
    };
  }

  beforeCardPlay(_ctx: EffectPlayContext, _host: EffectHost): void {}

  afterCardPlay(_ctx: EffectPlayContext, _host: EffectHost): void {}

  modifyDamage(amount: number, _ctx: EffectPlayContext): number {
    return amount;
  }

  modifyHeat(amount: number, _ctx: EffectPlayContext): number {
    return amount;
  }

  onHeatChanged(_ctx: EffectHeatContext, _host: EffectHost): void {}

  onCycleEnd(_host: EffectHost): void {}

  isExpired(_state: Readonly<EffectBattleState>): boolean {
    return false;
  }
}

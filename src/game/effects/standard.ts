import { ActiveEffect, type EffectHeatContext, type EffectHost, type EffectPlayContext } from "./api";

abstract class SingleUseEffect extends ActiveEffect {
  protected consumed = false;

  override isExpired(): boolean {
    return this.consumed;
  }

  protected consume(): void {
    this.consumed = true;
  }
}

export class HeatReductionEffect extends SingleUseEffect {
  readonly kind = "heat-reduction";

  constructor(private readonly amount: number, private readonly label: string, private readonly onlyHeatCards = false) {
    super();
  }

  getDescription(): string {
    return this.label;
  }

  override modifyHeat(amount: number, ctx: EffectPlayContext): number {
    if (this.consumed || amount <= 0) {
      return amount;
    }

    if (this.onlyHeatCards && !ctx.card.tags.includes("heat")) {
      return amount;
    }

    this.consume();
    return Math.max(0, amount - this.amount);
  }
}

export class VulnerabilityEffect extends ActiveEffect {
  readonly kind = "vulnerability";

  private remainingHits: number;

  constructor(private readonly amount: number, hits = 2) {
    super();
    this.remainingHits = hits;
  }

  getDescription(): string {
    return `Следующие ${this.remainingHits} ремонта +${this.amount}`;
  }

  override modifyDamage(amount: number, ctx: EffectPlayContext): number {
    if (this.remainingHits <= 0 || !ctx.card.tags.includes("repair")) {
      return amount;
    }

    this.remainingHits -= 1;
    return amount + this.amount;
  }

  override isExpired(): boolean {
    return this.remainingHits <= 0;
  }
}

export class SparkEffect extends ActiveEffect {
  readonly kind = "spark";

  constructor(private remainingCycles = 2) {
    super();
  }

  getDescription(): string {
    return "Каждая ремонтная карта даёт +1 жара";
  }

  override modifyHeat(amount: number, ctx: EffectPlayContext): number {
    return amount;
  }

  override afterCardPlay(ctx: EffectPlayContext, host: EffectHost): void {
    if (!ctx.card.tags.includes("repair")) {
      return;
    }

    host.addHeat(1);
  }

  override onCycleEnd(): void {
    this.remainingCycles -= 1;
  }

  override isExpired(): boolean {
    return this.remainingCycles <= 0;
  }
}

export class BrittleEffect extends SingleUseEffect {
  readonly kind = "brittle";

  getDescription(): string {
    return "Следующий ремонт удваивается";
  }

  override modifyDamage(amount: number, ctx: EffectPlayContext): number {
    if (this.consumed || !ctx.card.tags.includes("repair")) {
      return amount;
    }

    this.consume();
    return amount * 2;
  }
}

export class NextHandBrittleEffect extends ActiveEffect {
  readonly kind = "next-hand-brittle";

  private armed = false;
  private consumed = false;

  getDescription(): string {
    return this.armed ? "Следующая ремонтная карта ×2" : "Следующая ремонтная карта следующей руки ×2";
  }

  override modifyDamage(amount: number, ctx: EffectPlayContext): number {
    if (this.consumed || !this.armed || !ctx.card.tags.includes("repair")) {
      return amount;
    }

    this.consumed = true;
    return amount * 2;
  }

  override onCycleEnd(): void {
    this.armed = true;
  }

  override isExpired(): boolean {
    return this.consumed;
  }
}

export class RedZoneEffect extends ActiveEffect {
  readonly kind = "red-zone";

  constructor(private readonly threshold = 7, private readonly bonus = 2, private remainingCycles = 2) {
    super();
    this.remainingCycles = remainingCycles;
  }

  getDescription(): string {
    return `Пока жара ${this.threshold}+, ремонт +${this.bonus}`;
  }

  override modifyDamage(amount: number, ctx: EffectPlayContext): number {
    if (!ctx.card.tags.includes("repair") || ctx.state.heat < this.threshold || this.remainingCycles <= 0) {
      return amount;
    }

    return amount + this.bonus;
  }

  override onCycleEnd(): void {
    this.remainingCycles -= 1;
  }

  override isExpired(): boolean {
    return this.remainingCycles <= 0;
  }
}

export class DroneEffect extends SingleUseEffect {
  readonly kind = "drone";

  constructor(private readonly repair = 2) {
    super();
  }

  getDescription(): string {
    return `В конце цикла ремонт +${this.repair}`;
  }

  override onCycleEnd(host: EffectHost): void {
    if (this.consumed) {
      return;
    }

    this.consume();
    host.dealRepair(this.repair);
  }
}

export class RelayEffect extends SingleUseEffect {
  readonly kind = "relay";

  getDescription(): string {
    return "Следующая карта повторяется";
  }

  override beforeCardPlay(ctx: EffectPlayContext): void {
    if (this.consumed) {
      return;
    }

    this.consume();
    ctx.modifiers.repeatCard += 1;
  }
}

export class CondenserEffect extends ActiveEffect {
  readonly kind = "condenser";

  constructor(private readonly repair = 1, private remainingCycles = 2) {
    super();
  }

  getDescription(): string {
    return `При охлаждении ремонт +${this.repair}`;
  }

  override onHeatChanged(ctx: EffectHeatContext, host: EffectHost): void {
    if (this.remainingCycles <= 0 || ctx.delta >= 0) {
      return;
    }

    host.dealRepair(this.repair);
  }

  override onCycleEnd(): void {
    this.remainingCycles -= 1;
  }

  override isExpired(): boolean {
    return this.remainingCycles <= 0;
  }
}

export class BypassEffect extends SingleUseEffect {
  readonly kind = "bypass";

  getDescription(): string {
    return "Следующая карта игнорирует броню";
  }

  override beforeCardPlay(ctx: EffectPlayContext): void {
    if (this.consumed) {
      return;
    }

    this.consume();
    ctx.modifiers.ignoreArmor = true;
  }
}

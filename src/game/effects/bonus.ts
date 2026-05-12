import { ActiveEffect, type EffectPlayContext } from "./api";

export class BonusEffect extends ActiveEffect {
  readonly kind = "bonus";

  private consumed = false;

  constructor(private readonly amount: number, private readonly charges = 1) {
    super();
  }

  getDescription(): string {
    return this.charges === 1
      ? `Следующий ремонт +${this.amount}`
      : `Следующие ${this.charges} ремонта +${this.amount}`;
  }

  override modifyDamage(amount: number, ctx: EffectPlayContext): number {
    if (this.consumed || this.amount <= 0 || !ctx.card.tags.includes("repair")) {
      return amount;
    }

    this.consumed = true;
    return amount + this.amount;
  }

  override isExpired(): boolean {
    return this.consumed || this.amount <= 0;
  }
}

import { ActiveEffect } from "./api";

export class BonusEffect extends ActiveEffect {
  readonly kind = "bonus";

  private consumed = false;

  constructor(private readonly amount: number) {
    super();
  }

  getDescription(): string {
    return `Следующий урон +${this.amount}`;
  }

  override applyDamage(amount: number): number {
    if (this.consumed || this.amount <= 0) {
      return amount;
    }

    this.consumed = true;
    return amount + this.amount;
  }

  override onTurnEnd(): void {
    this.consumed = true;
  }

  override isExpired(): boolean {
    return this.consumed || this.amount <= 0;
  }
}

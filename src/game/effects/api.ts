export interface EffectView {
  kind: string;
  description: string;
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

  applyDamage(amount: number): number {
    return amount;
  }

  onTurnEnd(): void {}

  isExpired(): boolean {
    return false;
  }
}

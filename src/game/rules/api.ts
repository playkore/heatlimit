export interface GameRuleExpiration {
  type: "uses" | "turns" | "combat" | "run";
  remaining?: number;
}

export interface GameRuleBaseContext {
  phase: string;
  stage: number;
}

export interface GameRuleCardContext extends GameRuleBaseContext {
  source: "card";
  cardId: string;
  tags: readonly string[];
}

export interface GameRuleEnemyContext extends GameRuleBaseContext {
  source: "enemy";
}

export interface GameRuleDamageContext extends GameRuleCardContext {
  amount: number;
}

export interface GameRuleHeatContext extends GameRuleBaseContext {
  source: "card" | "enemy";
  amount: number;
  cardId?: string;
  tags?: readonly string[];
}

export interface GameRuleDrawContext extends GameRuleCardContext {
  count: number;
}

export interface GameRuleAfterCardContext extends GameRuleCardContext {}

export interface GameRule {
  id: string;
  expires: GameRuleExpiration;
  priority?: number;
  modifyDamage?(ctx: GameRuleDamageContext): number;
  modifyHeat?(ctx: GameRuleHeatContext): number;
  modifyDrawCount?(ctx: GameRuleDrawContext): number;
  afterCardPlayed?(ctx: GameRuleAfterCardContext): void;
}

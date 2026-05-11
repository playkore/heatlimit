export interface GameRuleExpiration {
  type: "uses" | "turns" | "combat" | "run";
  remaining?: number;
}

export interface GameRule {
  id: string;
  expires: GameRuleExpiration;
  priority?: number;
}

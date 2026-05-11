import type { GameRule } from "./rules/api";

export type GamePhase = "combat" | "reward" | "ended";

export interface RewardPreview {
  kind: "card" | "upgrade" | "module";
  icon: string;
  name: string;
  desc: string;
}

export interface GameState<Reward extends RewardPreview = RewardPreview> {
  phase: GamePhase;
  stage: number;
  deck: { id: string; upgraded?: boolean }[];
  modules: string[];
  rewardsSeen: number;
  defect: { id: string; boss?: boolean; heatPerCycle: number; text: string; title?: string } | null;
  hp: number;
  maxHp: number;
  heat: number;
  actions: number;
  bonus: number;
  cycleShield: number;
  drawPile: { id: string; upgraded?: boolean }[];
  discard: { id: string; upgraded?: boolean }[];
  hand: { id: string; upgraded?: boolean }[];
  iceMelted: boolean;
  bossShieldUsed: boolean;
  firstCardHeatReduced: boolean;
  radiatorUsed: boolean;
  repairCardsPlayed: number;
  pendingRewards: Reward[];
  messageHtml: string;
  bannerText: string;
  overlayTitle: string;
  overlayText: string;
  rules: GameRule[];
}

export function createEmptyState<Reward extends RewardPreview = RewardPreview>(stage: number): GameState<Reward> {
  return {
    phase: "combat",
    stage,
    deck: [],
    modules: [],
    rewardsSeen: 0,
    defect: null,
    hp: 0,
    maxHp: 0,
    heat: 0,
    actions: 0,
    bonus: 0,
    cycleShield: 0,
    drawPile: [],
    discard: [],
    hand: [],
    iceMelted: false,
    bossShieldUsed: false,
    firstCardHeatReduced: false,
    radiatorUsed: false,
    repairCardsPlayed: 0,
    pendingRewards: [],
    messageHtml: "",
    bannerText: "",
    overlayTitle: "",
    overlayText: "",
    rules: [],
  };
}

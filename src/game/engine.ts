import {
  MAX_ACTIONS,
  MAX_HEAT,
  FINAL_STAGE,
  cardDb,
  cardRewardPool,
  cloneCard,
  effectText,
  getCardProps,
  initialDeck,
  makeDefectForStage,
  modulesDb,
  upgradeableIds,
  type CardId,
  type DeckCard,
  type DefectInstance,
  type ModuleId,
} from "./data";
import { createSeededRng, type Rng } from "./rng";

export type GamePhase = "combat" | "reward" | "ended";

export type GameEvent =
  | { type: "banner"; text: string }
  | { type: "float"; text: string; tone?: "heat" | "info" }
  | { type: "enemy-hit"; amount: number }
  | { type: "enemy-pulse" }
  | { type: "shake" };

export interface RewardOptionBase {
  kind: "card" | "upgrade" | "module";
  icon: string;
  name: string;
  desc: string;
}

export interface CardRewardOption extends RewardOptionBase {
  kind: "card";
  cardId: CardId;
}

export interface UpgradeRewardOption extends RewardOptionBase {
  kind: "upgrade";
  cardIndex: number;
  cardId: CardId;
}

export interface ModuleRewardOption extends RewardOptionBase {
  kind: "module";
  moduleId: ModuleId;
}

export type RewardOption = CardRewardOption | UpgradeRewardOption | ModuleRewardOption;

export interface GameOptions {
  seed: number;
  deck?: DeckCard[];
  modules?: ModuleId[];
  stage?: number;
  rng?: Rng;
}

export interface GameState {
  phase: GamePhase;
  stage: number;
  deck: DeckCard[];
  modules: ModuleId[];
  rewardsSeen: number;
  defect: DefectInstance | null;
  hp: number;
  maxHp: number;
  heat: number;
  actions: number;
  bonus: number;
  cycleShield: number;
  drawPile: DeckCard[];
  discard: DeckCard[];
  hand: DeckCard[];
  iceMelted: boolean;
  bossShieldUsed: boolean;
  firstCardHeatReduced: boolean;
  radiatorUsed: boolean;
  repairCardsPlayed: number;
  pendingRewards: RewardOption[];
  messageHtml: string;
  bannerText: string;
  overlayTitle: string;
  overlayText: string;
}

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class GameEngine {
  readonly state: GameState;

  private readonly rng: Rng;
  private readonly initialDeck: DeckCard[];
  private readonly initialModules: ModuleId[];
  private readonly initialStage: number;

  constructor(options: GameOptions) {
    this.rng = options.rng ?? createSeededRng(options.seed);
    this.initialDeck = (options.deck ?? initialDeck).map(cloneCard);
    this.initialModules = [...(options.modules ?? [])];
    this.initialStage = options.stage ?? 1;
    this.state = this.createEmptyState();
    this.startRun();
  }

  startRun(): void {
    this.state.stage = this.initialStage;
    this.state.deck = this.initialDeck.map(cloneCard);
    this.state.modules = [...this.initialModules];
    this.state.rewardsSeen = 0;
    this.startCombat();
  }

  playCard(index: number): GameEvent[] {
    if (this.state.phase !== "combat") {
      return [];
    }

    if (this.state.actions >= MAX_ACTIONS) {
      return [];
    }

    const cardObj = this.state.hand[index];
    if (!cardObj) {
      return [];
    }

    const card = getCardProps(cardObj);
    const events: GameEvent[] = [];

    this.state.hand.splice(index, 1);
    if (!card.exhaust) {
      this.state.discard.push(cardObj);
    }

    this.state.actions += 1;

    const damage = this.computeDamage(card, events);
    const heatDelta = this.computeHeatDelta(card, damage);

    if (card.meltsIce && this.state.defect?.id === "ice" && !this.state.iceMelted) {
      this.state.iceMelted = true;
      this.state.bannerText = "ЛЁД РАСПЛАВЛЕН";
      events.push({ type: "banner", text: "ЛЁД РАСПЛАВЛЕН" });
    }

    if (damage > 0) {
      this.state.hp = Math.max(0, this.state.hp - damage);
      events.push({ type: "enemy-hit", amount: damage });
    } else {
      events.push({ type: "enemy-pulse" });
    }

    this.applyHeat(heatDelta, events);

    if (card.bonus) {
      this.state.bonus += card.bonus;
      events.push({ type: "float", text: `⬆️+${card.bonus}`, tone: "info" });
    }

    if (card.cycleShield) {
      this.state.cycleShield += card.cycleShield;
      events.push({ type: "float", text: `🛡️-${card.cycleShield}`, tone: "heat" });
    }

    if (card.draw) {
      this.drawCards(card.draw);
      events.push({ type: "float", text: `🃏+${card.draw}`, tone: "info" });
    }

    this.state.messageHtml = `<b>${card.name}</b>: ${card.text}`;

    if (this.state.hp <= 0) {
      this.completeVictory();
    }

    return events;
  }

  resolveEnemyTurn(): GameEvent[] {
    if (this.state.phase !== "combat") {
      return [];
    }

    const events: GameEvent[] = [];
    events.push({ type: "banner", text: "МУЛЬТИТУЛ ПЕРЕГРЕВАЕТСЯ" });
    this.state.bannerText = "МУЛЬТИТУЛ ПЕРЕГРЕВАЕТСЯ";

    let heat = this.state.defect?.heatPerCycle ?? 0;
    if (this.hasModule("badbattery")) {
      heat += 1;
    }

    if (this.state.cycleShield > 0) {
      heat = Math.max(0, heat - this.state.cycleShield);
      this.state.cycleShield = 0;
    }

    this.state.heat = Math.min(MAX_HEAT, this.state.heat + heat);
    events.push({ type: "float", text: `🔥+${heat}`, tone: "heat" });
    events.push({ type: "shake" });
    this.state.messageHtml = `Мультитул не рассчитан на такую нагрузку. Получает <b>🔥+${heat}</b>.`;

    this.maybeRadiatorSave(events);

    this.discardHand();
    this.state.actions = 0;
    this.state.bonus = this.hasModule("autoscan") ? 1 : 0;
    this.state.bossShieldUsed = false;
    this.drawHand();

    if (this.state.heat >= MAX_HEAT) {
      this.state.phase = "ended";
      this.state.overlayTitle = "ПЕРЕГРЕВ";
      this.state.overlayText = "Мультитул сгорел. Миссия сорвана.";
    }

    return events;
  }

  chooseReward(index: number): GameEvent[] {
    if (this.state.phase !== "reward") {
      return [];
    }

    const reward = this.state.pendingRewards[index];
    if (!reward) {
      return [];
    }

    if (reward.kind === "card") {
      this.state.deck.push({ id: reward.cardId });
    } else if (reward.kind === "upgrade") {
      const target = this.state.deck[reward.cardIndex];
      if (target) {
        target.upgraded = true;
      }
    } else {
      this.state.modules.push(reward.moduleId);
    }

    this.state.rewardsSeen += 1;
    this.state.stage += 1;
    this.startCombat();
    return [];
  }

  getRewardOptions(): readonly RewardOption[] {
    return this.state.pendingRewards;
  }

  private createEmptyState(): GameState {
    return {
      phase: "combat",
      stage: this.initialStage,
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
    };
  }

  private startCombat(): void {
    const defect = makeDefectForStage(this.state.stage);

    this.state.phase = "combat";
    this.state.defect = defect;
    this.state.maxHp = defect.hp;
    this.state.hp = this.state.maxHp;
    this.state.heat = 0;
    this.state.actions = 0;
    this.state.bonus = this.hasModule("autoscan") ? 1 : 0;
    this.state.cycleShield = 0;
    this.state.drawPile = this.rng.shuffle(this.state.deck.map(cloneCard));
    this.state.discard = [];
    this.state.hand = [];
    this.state.iceMelted = false;
    this.state.bossShieldUsed = false;
    this.state.firstCardHeatReduced = false;
    this.state.radiatorUsed = false;
    this.state.repairCardsPlayed = 0;
    this.state.pendingRewards = [];
    this.state.overlayTitle = "";
    this.state.overlayText = "";
    this.state.bannerText = "";
    this.state.messageHtml = defect.text;

    this.drawHand();
  }

  private drawHand(): void {
    this.state.hand = [];
    for (let index = 0; index < 3; index += 1) {
      this.drawOne();
    }
  }

  private drawCards(count: number): void {
    for (let index = 0; index < count; index += 1) {
      this.drawOne();
    }
  }

  private drawOne(): void {
    if (this.state.drawPile.length === 0) {
      if (this.state.discard.length === 0) {
        return;
      }

      this.state.drawPile = this.rng.shuffle(this.state.discard);
      this.state.discard = [];
    }

    const card = this.state.drawPile.pop();
    if (card) {
      this.state.hand.push(card);
    }
  }

  private discardHand(): void {
    this.state.discard.push(...this.state.hand);
    this.state.hand = [];
  }

  private hasModule(id: ModuleId): boolean {
    return this.state.modules.includes(id);
  }

  private computeDamage(card: ReturnType<typeof getCardProps>, events: GameEvent[]): number {
    let damage = card.damage ?? 0;

    if (card.damagePerHeat) {
      damage += Math.max(1, this.state.heat) * card.damagePerHeat;
    }

    if (damage <= 0) {
      return 0;
    }

    if (this.state.bonus > 0) {
      damage += this.state.bonus;
      this.state.bonus = 0;
    }

    if (this.hasModule("magnet") && card.id === "clamp") {
      damage += 1;
    }

    if (this.hasModule("badbattery")) {
      damage += 2;
    }

    if (this.hasModule("arc")) {
      this.state.repairCardsPlayed += 1;
      if (this.state.repairCardsPlayed % 3 === 0) {
        damage += 2;
        this.state.bannerText = "СТАБИЛИЗАТОР +2";
        events.push({ type: "banner", text: "СТАБИЛИЗАТОР +2" });
      }
    }

    if (this.state.defect?.id === "ice" && !this.state.iceMelted && !card.meltsIce) {
      damage = Math.max(1, damage - 1);
    }

    if (this.state.defect?.id === "boss" && !this.state.bossShieldUsed) {
      damage = Math.max(1, damage - 2);
      this.state.bossShieldUsed = true;
      this.state.bannerText = "БРОНЯ КОНТУРА -2";
      events.push({ type: "banner", text: "БРОНЯ КОНТУРА -2" });
    }

    return damage;
  }

  private computeHeatDelta(card: ReturnType<typeof getCardProps>, damage: number): { set?: number; delta?: number } {
    if (card.heatSet !== undefined) {
      return { set: card.heatSet };
    }

    let delta = card.heat ?? 0;

    if (this.state.defect?.id === "spark" && damage > 0) {
      delta += 1;
    }

    if (delta > 0 && this.hasModule("ceramic") && !this.state.firstCardHeatReduced) {
      delta = Math.max(0, delta - 1);
      this.state.firstCardHeatReduced = true;
    }

    return { delta };
  }

  private applyHeat(heatInfo: { set?: number; delta?: number }, events: GameEvent[]): void {
    if (heatInfo.set !== undefined) {
      this.state.heat = heatInfo.set;
      events.push({ type: "float", text: `🔥=${heatInfo.set}`, tone: "heat" });
      this.maybeRadiatorSave(events);
      return;
    }

    const delta = heatInfo.delta ?? 0;
    if (delta === 0) {
      return;
    }

    this.state.heat = clamp(0, this.state.heat + delta, MAX_HEAT);
    events.push({ type: "float", text: `🔥${delta > 0 ? "+" : ""}${delta}`, tone: "heat" });
    this.maybeRadiatorSave(events);
  }

  private maybeRadiatorSave(events: GameEvent[]): void {
    if (!this.hasModule("radiator")) {
      return;
    }

    if (this.state.radiatorUsed) {
      return;
    }

    if (this.state.heat < MAX_HEAT) {
      return;
    }

    this.state.radiatorUsed = true;
    this.state.heat = 6;
    this.state.bannerText = "РАДИАТОР СПАС";
    events.push({ type: "banner", text: "РАДИАТОР СПАС" });
    events.push({ type: "float", text: "🔥→6", tone: "heat" });
  }

  private completeVictory(): void {
    if (this.state.stage >= FINAL_STAGE) {
      this.state.phase = "ended";
      this.state.overlayTitle = "СПУТНИК СПАСЁН";
      this.state.overlayText = "Главный контур восстановлен. Миссия завершена.";
      this.state.pendingRewards = [];
      return;
    }

    this.state.phase = "reward";
    this.state.overlayTitle = "ПОЛОМКА УСТРАНЕНА";
    this.state.overlayText = "Выберите одну награду перед следующей аварией.";
    this.state.pendingRewards = this.makeRewards();
  }

  private makeRewards(): RewardOption[] {
    const rewards: RewardOption[] = [this.makeCardReward()];

    const upgradeReward = this.makeUpgradeReward();
    if (upgradeReward) {
      rewards.push(upgradeReward);
    }

    const moduleReward = this.makeModuleReward();
    if (moduleReward) {
      rewards.push(moduleReward);
    }

    while (rewards.length < 3) {
      rewards.push(this.makeCardReward());
    }

    return this.rng.shuffle(rewards).slice(0, 3);
  }

  private makeCardReward(): CardRewardOption {
    const cardId = this.rng.pick(cardRewardPool);
    const card = cardDb[cardId];
    return {
      kind: "card",
      icon: card.icon,
      name: `НОВАЯ КАРТА: ${card.name}`,
      desc: `${effectText(card.effects)}. ${card.text}`,
      cardId,
    };
  }

  private makeUpgradeReward(): UpgradeRewardOption | null {
    const candidates = this.state.deck
      .map((card, index) => ({ card, index }))
      .filter((item) => upgradeableIds.includes(item.card.id) && !item.card.upgraded);

    if (candidates.length === 0) {
      return null;
    }

    const picked = this.rng.pick(candidates);
    const base = cardDb[picked.card.id];
    const upgraded = getCardProps({ id: picked.card.id, upgraded: true });

    return {
      kind: "upgrade",
      icon: "✨",
      name: `АПГРЕЙД: ${base.name}+`,
      desc: `${effectText(upgraded.effects)}. ${upgraded.text}`,
      cardId: picked.card.id,
      cardIndex: picked.index,
    };
  }

  private makeModuleReward(): ModuleRewardOption | null {
    const candidates = (Object.keys(modulesDb) as ModuleId[]).filter((id) => !this.state.modules.includes(id));

    if (candidates.length === 0) {
      return null;
    }

    const moduleId = this.rng.pick(candidates);
    const module = modulesDb[moduleId];

    return {
      kind: "module",
      icon: module.icon,
      name: `МОДУЛЬ: ${module.name}`,
      desc: module.text,
      moduleId,
    };
  }
}

export function createGame(options: GameOptions): GameEngine {
  return new GameEngine(options);
}

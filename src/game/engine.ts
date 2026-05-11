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
import {
  type CardPlayContext,
  type GameEvent,
  type GameRule,
  type GameStateView,
  type ResolvedCard,
} from "./api";
import { createSeededRng, type Rng } from "./rng";

export type GamePhase = "combat" | "reward" | "ended";
export type { GameEvent } from "./api";

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
  rules: GameRule[];
}

interface CurrentPlay {
  card: ResolvedCard;
  cardObj: DeckCard;
  events: GameEvent[];
  dealtDamage: number;
  exhausted: boolean;
  messageSet: boolean;
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
  private currentPlay: CurrentPlay | null = null;

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
    this.state.actions += 1;
    this.currentPlay = {
      card,
      cardObj,
      events,
      dealtDamage: 0,
      exhausted: false,
      messageSet: false,
    };

    card.logic.play(this.createCardPlayContext(card, events));

    if (!this.currentPlay.messageSet) {
      this.state.messageHtml = `<b>${card.name}</b>: ${card.text}`;
    }

    if (this.currentPlay.dealtDamage === 0) {
      events.push({ type: "enemy-pulse" });
    }

    if (!this.currentPlay.exhausted) {
      this.state.discard.push(cardObj);
    }

    this.currentPlay = null;

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
      rules: [],
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
    this.state.rules = [];

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

  private createStateView(): GameStateView {
    return {
      phase: this.state.phase,
      stage: this.state.stage,
      hp: this.state.hp,
      maxHp: this.state.maxHp,
      heat: this.state.heat,
      actions: this.state.actions,
      bonus: this.state.bonus,
      cycleShield: this.state.cycleShield,
      hand: this.state.hand.map(cloneCard),
      drawPileCount: this.state.drawPile.length,
      discardCount: this.state.discard.length,
      modules: [...this.state.modules],
      defect: this.state.defect ? { id: this.state.defect.id, boss: this.state.defect.boss } : null,
      flags: {
        iceMelted: this.state.iceMelted,
        bossShieldUsed: this.state.bossShieldUsed,
        firstCardHeatReduced: this.state.firstCardHeatReduced,
        radiatorUsed: this.state.radiatorUsed,
      },
    };
  }

  private createCardPlayContext(card: ResolvedCard, events: GameEvent[]): CardPlayContext {
    const stateView = this.createStateView();
    const engine = this;

    return {
      card,
      state: stateView,
      rng: this.rng,
      dealDamage(amount: number) {
        engine.dealDamage(amount, card, events);
      },
      addHeat(amount: number) {
        engine.addHeat(amount, card, events);
      },
      setHeat(value: number) {
        engine.setHeat(value, events);
      },
      drawCards(count: number) {
        engine.drawCards(count);
        if (count > 0) {
          events.push({ type: "float", text: `🃏+${count}`, tone: "info" });
        }
      },
      discardHand() {
        engine.discardHand();
      },
      exhaustSelf() {
        engine.exhaustSelf();
      },
      addBonus(amount: number) {
        engine.addBonus(amount, events);
      },
      addCycleShield(amount: number) {
        engine.addCycleShield(amount, events);
      },
      addRule(rule: GameRule) {
        engine.state.rules.push(rule);
      },
      emit(event: GameEvent) {
        events.push(event);
      },
      setMessage(html: string) {
        engine.state.messageHtml = html;
        if (engine.currentPlay) {
          engine.currentPlay.messageSet = true;
        }
      },
      meltIce() {
        engine.meltIce(events);
      },
    };
  }

  private dealDamage(amount: number, card: ResolvedCard, events: GameEvent[]): void {
    if (amount <= 0) {
      return;
    }

    let damage = amount;

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

    if (damage > 0 && card.tags.includes("repair")) {
      this.state.repairCardsPlayed += 1;
      if (this.state.repairCardsPlayed % 3 === 0 && this.hasModule("arc")) {
        damage += 2;
        this.state.bannerText = "СТАБИЛИЗАТОР +2";
        events.push({ type: "banner", text: "СТАБИЛИЗАТОР +2" });
      }
    }

    if (this.state.defect?.id === "ice" && !this.state.iceMelted) {
      damage = Math.max(1, damage - 1);
    }

    if (this.state.defect?.id === "boss" && !this.state.bossShieldUsed) {
      damage = Math.max(1, damage - 2);
      this.state.bossShieldUsed = true;
      this.state.bannerText = "БРОНЯ КОНТУРА -2";
      events.push({ type: "banner", text: "БРОНЯ КОНТУРА -2" });
    }

    this.state.hp = Math.max(0, this.state.hp - damage);
    events.push({ type: "enemy-hit", amount: damage });

    if (this.currentPlay) {
      this.currentPlay.dealtDamage += damage;
    }
  }

  private addHeat(amount: number, card: ResolvedCard, events: GameEvent[]): void {
    if (amount === 0) {
      return;
    }

    let delta = amount;

    if (delta > 0 && this.state.defect?.id === "spark" && this.currentPlay?.dealtDamage) {
      delta += 1;
    }

    if (delta > 0 && this.hasModule("ceramic") && !this.state.firstCardHeatReduced) {
      delta = Math.max(0, delta - 1);
      this.state.firstCardHeatReduced = true;
    }

    this.state.heat = clamp(0, this.state.heat + delta, MAX_HEAT);
    events.push({ type: "float", text: `🔥${delta > 0 ? "+" : ""}${delta}`, tone: "heat" });
    this.maybeRadiatorSave(events);
  }

  private setHeat(value: number, events: GameEvent[]): void {
    this.state.heat = clamp(0, value, MAX_HEAT);
    events.push({ type: "float", text: `🔥=${this.state.heat}`, tone: "heat" });
    this.maybeRadiatorSave(events);
  }

  private addBonus(amount: number, events: GameEvent[]): void {
    this.state.bonus += amount;
    events.push({ type: "float", text: `⬆️+${amount}`, tone: "info" });
  }

  private addCycleShield(amount: number, events: GameEvent[]): void {
    this.state.cycleShield += amount;
    events.push({ type: "float", text: `🛡️-${amount}`, tone: "heat" });
  }

  private exhaustSelf(): void {
    if (this.currentPlay) {
      this.currentPlay.exhausted = true;
    }
  }

  private meltIce(events: GameEvent[]): void {
    if (this.state.defect?.id !== "ice" || this.state.iceMelted) {
      return;
    }

    this.state.iceMelted = true;
    this.state.bannerText = "ЛЁД РАСПЛАВЛЕН";
    events.push({ type: "banner", text: "ЛЁД РАСПЛАВЛЕН" });
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

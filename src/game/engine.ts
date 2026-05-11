import {
  MAX_ACTIONS,
  HAND_SIZE,
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
import { applyRules } from "./rules/applyRules";

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
  acquiredCards: DeckCard[];
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
  endReason: "death" | "victory" | null;
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
    this.state.acquiredCards = [];
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

    if (this.state.phase === "combat" && this.state.defect?.id === "spark" && card.tags.includes("repair")) {
      this.addHeat(1, card, events, "card");
    }

    this.afterCardPlayed(card);

    if (!this.currentPlay.messageSet) {
      this.state.messageHtml = `<b>${card.name}</b>: ${card.text}`;
    }

    if (this.state.phase === "combat" && this.currentPlay.dealtDamage === 0) {
      events.push({ type: "enemy-pulse" });
    }

    if (!this.currentPlay.exhausted) {
      this.state.discard.push(cardObj);
    }

    this.currentPlay = null;

    if (this.state.phase === "combat" && this.state.hp <= 0) {
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

    this.addHeat(heat, null, events, "enemy");
    if (this.state.endReason === "death") {
      return events;
    }

    events.push({ type: "shake" });
    this.state.messageHtml = `Мультитул не рассчитан на такую нагрузку. Получает <b>🔥+${heat}</b>.`;

    this.discardHand();
    this.state.actions = 0;
    this.state.bonus = this.hasModule("autoscan") ? 1 : 0;
    this.state.bossShieldUsed = false;
    this.drawHand();

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
      const addedCard = { id: reward.cardId };
      this.state.deck.push(addedCard);
      this.state.acquiredCards.push(addedCard);
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
      acquiredCards: [],
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
      endReason: null,
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
    this.state.endReason = null;
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
    for (let index = 0; index < HAND_SIZE; index += 1) {
      this.drawOne();
    }
  }

  private drawCards(count: number, card: ResolvedCard): number {
    const requested = Math.max(0, Math.floor(this.modifyDrawCount(count, card)));
    let drawn = 0;
    for (let index = 0; index < requested; index += 1) {
      if (this.drawOne()) {
        drawn += 1;
      }
    }

    return drawn;
  }

  private drawOne(): boolean {
    if (this.state.hand.length >= HAND_SIZE) {
      return false;
    }

    if (this.state.drawPile.length === 0) {
      if (this.state.discard.length === 0) {
        return false;
      }

      this.state.drawPile = this.rng.shuffle(this.state.discard);
      this.state.discard = [];
    }

    const card = this.state.drawPile.pop();
    if (card) {
      this.state.hand.push(card);
      return true;
    }

    return false;
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
    const engine = this;

    return {
      card,
      state: this.createStateView(),
      getState() {
        return engine.createStateView();
      },
      rng: this.rng,
      dealDamage(amount: number) {
        engine.dealDamage(amount, card, events);
      },
      addHeat(amount: number) {
        engine.addHeat(amount, card, events, "card");
      },
      setHeat(value: number) {
        engine.setHeat(value, events, "card");
      },
      drawCards(count: number) {
        const drawn = engine.drawCards(count, card);
        if (drawn > 0) {
          events.push({ type: "float", text: `🃏+${drawn}`, tone: "info" });
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

    if (this.hasModule("badbattery") && card.tags.includes("repair")) {
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

    if (this.state.defect?.id === "boss" && !this.state.bossShieldUsed && card.tags.includes("repair")) {
      damage = Math.max(1, damage - 2);
      this.state.bossShieldUsed = true;
      this.state.bannerText = "БРОНЯ КОНТУРА -2";
      events.push({ type: "banner", text: "БРОНЯ КОНТУРА -2" });
    }

    damage = Math.max(0, this.modifyDamage(damage, card));
    this.state.hp = Math.max(0, this.state.hp - damage);
    events.push({ type: "enemy-hit", amount: damage });

    if (this.currentPlay) {
      this.currentPlay.dealtDamage += damage;
    }
  }

  private addHeat(amount: number, card: ResolvedCard | null, events: GameEvent[], source: "card" | "enemy" = "card"): void {
    if (amount === 0) {
      return;
    }

    let delta = amount;

    if (delta > 0 && source === "card" && this.hasModule("ceramic") && !this.state.firstCardHeatReduced) {
      delta = Math.max(0, delta - 1);
      this.state.firstCardHeatReduced = true;
    }

    delta = this.modifyHeat(delta, card, source);
    this.state.heat = clamp(0, this.state.heat + delta, MAX_HEAT);
    events.push({ type: "float", text: `🔥${delta > 0 ? "+" : ""}${delta}`, tone: "heat" });
    this.maybeRadiatorSave(events);
    this.checkOverheat();
  }

  private setHeat(value: number, events: GameEvent[], source: "card" | "enemy" = "card"): void {
    this.state.heat = clamp(0, value, MAX_HEAT);
    events.push({ type: "float", text: `🔥=${this.state.heat}`, tone: "heat" });
    this.maybeRadiatorSave(events);
    this.checkOverheat();
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

  private checkOverheat(): void {
    if (this.state.phase !== "combat") {
      return;
    }

    if (this.state.heat < MAX_HEAT) {
      return;
    }

    this.state.phase = "ended";
    this.state.endReason = "death";
    this.state.overlayTitle = "ПЕРЕГРЕВ";
    this.state.overlayText = "Мультитул сгорел. Миссия сорвана.";
  }

  private modifyDamage(amount: number, card: ResolvedCard): number {
    let next = amount;

    applyRules(this.state.rules, (rule) => {
      if (!rule.modifyDamage) {
        return;
      }

      next = rule.modifyDamage({
        phase: this.state.phase,
        stage: this.state.stage,
        source: "card",
        cardId: card.id,
        tags: card.tags,
        amount: next,
      });
    });

    return next;
  }

  private modifyHeat(amount: number, card: ResolvedCard | null, source: "card" | "enemy"): number {
    let next = amount;

    applyRules(this.state.rules, (rule) => {
      if (!rule.modifyHeat) {
        return;
      }

      next = rule.modifyHeat({
        phase: this.state.phase,
        stage: this.state.stage,
        source,
        amount: next,
        cardId: card?.id,
        tags: card?.tags,
      });
    });

    return next;
  }

  private modifyDrawCount(count: number, card: ResolvedCard): number {
    let next = count;

    applyRules(this.state.rules, (rule) => {
      if (!rule.modifyDrawCount) {
        return;
      }

      next = rule.modifyDrawCount({
        phase: this.state.phase,
        stage: this.state.stage,
        source: "card",
        cardId: card.id,
        tags: card.tags,
        count: next,
      });
    });

    return next;
  }

  private afterCardPlayed(card: ResolvedCard): void {
    applyRules(this.state.rules, (rule) => {
      if (!rule.afterCardPlayed) {
        return;
      }

      rule.afterCardPlayed({
        phase: this.state.phase,
        stage: this.state.stage,
        source: "card",
        cardId: card.id,
        tags: card.tags,
      });
    });
  }

  private completeVictory(): void {
    if (this.state.stage >= FINAL_STAGE) {
      this.state.phase = "ended";
      this.state.endReason = "victory";
      this.state.overlayTitle = "СПУТНИК СПАСЁН";
      this.state.overlayText = "Главный контур восстановлен. Миссия завершена.";
      this.state.pendingRewards = [];
      return;
    }

    this.state.phase = "reward";
    this.state.endReason = null;
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

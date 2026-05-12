import {
  FINAL_STAGE,
  HAND_SIZE,
  MAX_ACTIONS,
  MAX_HEAT,
  cardDb,
  cardRewardPool,
  cloneCard,
  effectText,
  getCardProps,
  initialDeck,
  makeDefectForStage,
  type CardId,
  type DeckCard,
  type DefectInstance,
} from "./data";
import {
  type CardPlayContext,
  type GameEvent,
  type GameStateView,
  type ResolvedCard,
} from "./api";
import { BonusEffect } from "./effects/bonus";
import {
  BypassEffect,
  CondenserEffect,
  DroneEffect,
  HeatReductionEffect,
  RelayEffect,
  RedZoneEffect,
  SparkEffect,
  BrittleEffect,
  VulnerabilityEffect,
} from "./effects/standard";
import type {
  ActiveEffect,
  EffectBattleState,
  EffectCardContext,
  EffectHeatContext,
  EffectHost,
  EffectPlayContext,
  EffectPlayModifiers,
} from "./effects/api";
import { createSeededRng, type Rng } from "./rng";

export type GamePhase = "combat" | "reward" | "ended";
export type { GameEvent } from "./api";

export interface RewardOption {
  kind: "card";
  description: string;
  name: string;
  desc: string;
  cardId: CardId;
}

export interface GameOptions {
  seed: number;
  deck?: DeckCard[];
  stage?: number;
  rng?: Rng;
}

export interface GameState {
  phase: GamePhase;
  stage: number;
  deck: DeckCard[];
  acquiredCards: DeckCard[];
  rewardsSeen: number;
  defect: DefectInstance | null;
  hp: number;
  maxHp: number;
  heat: number;
  actions: number;
  cycleShield: number;
  effects: ActiveEffect[];
  drawPile: DeckCard[];
  discard: DeckCard[];
  hand: DeckCard[];
  iceMelted: boolean;
  bossShieldUsed: boolean;
  pendingRewards: RewardOption[];
  endReason: "death" | "victory" | null;
  messageHtml: string;
  bannerText: string;
  overlayTitle: string;
  overlayText: string;
}

interface CurrentPlay {
  card: ResolvedCard;
  cardObj: DeckCard;
  events: GameEvent[];
  dealtDamage: number;
  exhausted: boolean;
  messageSet: boolean;
  modifiers: EffectPlayModifiers;
}

function clamp(min: number, value: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toEffectCard(card: ResolvedCard): EffectCardContext {
  return {
    id: card.id,
    name: card.name,
    tags: card.tags,
  };
}

const REPAIR_EFFECT_CARD: ResolvedCard = {
  id: "effect-repair",
  name: "ЭФФЕКТ РЕМОНТА",
  description: "Служебный ремонт",
  tags: ["repair"],
  effects: [],
  text: "",
  logic: { play() {} },
};

export class GameEngine {
  readonly state: GameState;

  private readonly rng: Rng;
  private readonly initialDeck: DeckCard[];
  private readonly initialStage: number;
  private currentPlay: CurrentPlay | null = null;

  constructor(options: GameOptions) {
    this.rng = options.rng ?? createSeededRng(options.seed);
    this.initialDeck = (options.deck ?? initialDeck).map(cloneCard);
    this.initialStage = options.stage ?? 1;
    this.state = this.createEmptyState();
    this.startRun();
  }

  startRun(): void {
    this.state.stage = this.initialStage;
    this.state.deck = this.initialDeck.map(cloneCard);
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
      modifiers: {
        repeatCard: 0,
        ignoreArmor: false,
        ignoreIce: false,
      },
    };

    this.applyCardStartEffects(card);
    card.logic.play(this.createCardPlayContext(card, events));
    this.runAfterCardEffects(card, events);

    while (this.currentPlay.modifiers.repeatCard > 0 && this.state.phase === "combat") {
      this.currentPlay.modifiers.repeatCard -= 1;
      card.logic.play(this.createCardPlayContext(card, events));
      this.runAfterCardEffects(card, events);
    }

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
    this.state.bossShieldUsed = false;
    this.endTurnEffects(events);
    if (this.state.phase === "combat" && this.state.hp <= 0) {
      this.completeVictory();
    }
    if (this.state.phase !== "combat") {
      return events;
    }
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

    const addedCard = { id: reward.cardId };
    this.state.deck.push(addedCard);
    this.state.acquiredCards.push(addedCard);

    this.state.rewardsSeen += 1;
    this.state.stage += 1;
    this.startCombat();
    return [];
  }

  debugAddCard(cardId: CardId): boolean {
    if (!(cardId in cardDb)) {
      return false;
    }

    const addedCard = { id: cardId };
    this.state.deck.push(cloneCard(addedCard));

    if (this.state.phase === "combat") {
      this.state.drawPile.push(cloneCard(addedCard));
    }

    return true;
  }

  debugRemoveCard(deckIndex: number): boolean {
    if (!Number.isInteger(deckIndex) || deckIndex < 0 || deckIndex >= this.state.deck.length) {
      return false;
    }

    const [removedCard] = this.state.deck.splice(deckIndex, 1);
    if (!removedCard || this.state.phase !== "combat") {
      return true;
    }

    this.removeOneCardById(this.state.drawPile, removedCard.id) ||
      this.removeOneCardById(this.state.discard, removedCard.id) ||
      this.removeOneCardById(this.state.hand, removedCard.id);

    if (this.state.hand.length < HAND_SIZE) {
      this.drawOne();
    }

    return true;
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
      rewardsSeen: 0,
      defect: null,
      hp: 0,
      maxHp: 0,
      heat: 0,
      actions: 0,
      cycleShield: 0,
      effects: [],
      drawPile: [],
      discard: [],
      hand: [],
      iceMelted: false,
      bossShieldUsed: false,
      pendingRewards: [],
      endReason: null,
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
    this.state.cycleShield = 0;
    this.state.effects = [];
    this.state.drawPile = this.rng.shuffle(this.state.deck.map(cloneCard));
    this.state.discard = [];
    this.state.hand = [];
    this.state.endReason = null;
    this.state.iceMelted = false;
    this.state.bossShieldUsed = false;
    this.state.pendingRewards = [];
    this.state.overlayTitle = "";
    this.state.overlayText = "";
    this.state.bannerText = "";
    this.state.messageHtml = defect.text;

    if (defect.id === "spark") {
      this.state.effects.push(new SparkEffect());
    }

    this.drawHand();
  }

  private drawHand(): void {
    this.state.hand = [];
    for (let index = 0; index < HAND_SIZE; index += 1) {
      this.drawOne();
    }
  }

  private drawCards(count: number, card: ResolvedCard): number {
    const requested = Math.max(0, Math.floor(count));
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

  private removeOneCardById(cards: DeckCard[], cardId: CardId): boolean {
    const index = cards.findIndex((card) => card.id === cardId);
    if (index < 0) {
      return false;
    }

    cards.splice(index, 1);
    return true;
  }

  private discardHand(): void {
    this.state.discard.push(...this.state.hand);
    this.state.hand = [];
  }

  private createStateView(): GameStateView {
    return {
      phase: this.state.phase,
      stage: this.state.stage,
      hp: this.state.hp,
      maxHp: this.state.maxHp,
      heat: this.state.heat,
      actions: this.state.actions,
      cycleShield: this.state.cycleShield,
      effects: this.state.effects.map((effect) => effect.toView()),
      hand: this.state.hand.map(cloneCard),
      drawPileCount: this.state.drawPile.length,
      discardCount: this.state.discard.length,
      defect: this.state.defect ? { id: this.state.defect.id, boss: this.state.defect.boss } : null,
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
        engine.setHeat(value, events);
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
      addEffect(effect: ActiveEffect) {
        engine.addEffect(effect, events);
      },
      removeEffects(kind: string) {
        engine.removeEffects(kind);
      },
      addCycleShield(amount: number) {
        engine.addCycleShield(amount, events);
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

    const playContext = this.createEffectPlayContext(card);
    for (const effect of [...this.state.effects]) {
      damage = effect.modifyDamage(damage, playContext);
    }
    this.pruneEffects();

    if (!this.currentPlay?.modifiers.ignoreIce && this.state.defect?.id === "ice" && !this.state.iceMelted) {
      damage = Math.max(1, damage - 1);
    }

    if (!this.currentPlay?.modifiers.ignoreArmor && this.state.defect?.id === "boss" && !this.state.bossShieldUsed && card.tags.includes("repair")) {
      damage = Math.max(1, damage - 2);
      this.state.bossShieldUsed = true;
      this.state.bannerText = "БРОНЯ КОНТУРА -2";
      events.push({ type: "banner", text: "БРОНЯ КОНТУРА -2" });
    }

    damage = Math.max(0, damage);
    this.state.hp = Math.max(0, this.state.hp - damage);
    events.push({ type: "enemy-hit", amount: damage });

    if (this.currentPlay) {
      this.currentPlay.dealtDamage += damage;
    }
  }

  private addHeat(
    amount: number,
    card: ResolvedCard | null,
    events: GameEvent[],
    source: "card" | "enemy" | "effect" = "card",
  ): void {
    if (amount === 0) {
      return;
    }

    let delta = amount;
    delta = Math.floor(delta);

    const playContext = card ? this.createEffectPlayContext(card) : null;
    if (playContext) {
      for (const effect of [...this.state.effects]) {
        delta = effect.modifyHeat(delta, playContext);
      }
      this.pruneEffects();
    }

    const previousHeat = this.state.heat;
    this.state.heat = clamp(0, this.state.heat + delta, MAX_HEAT);
    events.push({ type: "float", text: `🔥${delta > 0 ? "+" : ""}${delta}`, tone: "heat" });
    this.notifyHeatChanged({ card, previousHeat, nextHeat: this.state.heat, delta, source, events });
    this.checkOverheat();
  }

  private setHeat(value: number, events: GameEvent[]): void {
    const previousHeat = this.state.heat;
    this.state.heat = clamp(0, value, MAX_HEAT);
    events.push({ type: "float", text: `🔥=${this.state.heat}`, tone: "heat" });
    this.notifyHeatChanged({ card: null, previousHeat, nextHeat: this.state.heat, delta: this.state.heat - previousHeat, source: "effect", events });
    this.checkOverheat();
  }

  private addBonus(amount: number, events: GameEvent[]): void {
    this.addEffect(new BonusEffect(amount), events);
    events.push({ type: "float", text: `⬆️+${amount}`, tone: "info" });
  }

  private addEffect(effect: ActiveEffect, _events: GameEvent[]): void {
    this.state.effects.push(effect);
  }

  private removeEffects(kind: string): void {
    this.state.effects = this.state.effects.filter((effect) => effect.kind !== kind);
  }

  private applyCardStartEffects(card: ResolvedCard): void {
    if (!this.currentPlay) {
      return;
    }

    const playContext = this.createEffectPlayContext(card);
    for (const effect of [...this.state.effects]) {
      effect.beforeCardPlay(playContext, this.createEffectHost());
    }
    this.pruneEffects();
  }

  private runAfterCardEffects(card: ResolvedCard, events: GameEvent[]): void {
    if (!this.currentPlay) {
      return;
    }

    const playContext = this.createEffectPlayContext(card);
    for (const effect of [...this.state.effects]) {
      effect.afterCardPlay(playContext, this.createEffectHost(events));
    }
    this.pruneEffects();
  }

  private createEffectPlayContext(card: ResolvedCard): EffectPlayContext {
    return {
      card: toEffectCard(card),
      state: this.createEffectBattleState(),
      modifiers: this.currentPlay?.modifiers ?? {
        repeatCard: 0,
        ignoreArmor: false,
        ignoreIce: false,
      },
    };
  }

  private createEffectBattleState(): EffectBattleState {
    return {
      heat: this.state.heat,
      phase: this.state.phase,
    };
  }

  private createEffectHost(events: GameEvent[] = []): EffectHost {
    const engine = this;

    return {
      state: engine.createEffectBattleState(),
      dealRepair(amount: number) {
        engine.dealDamage(amount, REPAIR_EFFECT_CARD, events);
      },
      addHeat(amount: number) {
        engine.addHeat(amount, null, events, "effect");
      },
      removeEffects(kind: string) {
        engine.removeEffects(kind);
      },
      addEffect(effect: ActiveEffect) {
        engine.addEffect(effect, []);
      },
    };
  }

  private notifyHeatChanged(input: {
    card: ResolvedCard | null;
    previousHeat: number;
    nextHeat: number;
    delta: number;
    source: "card" | "enemy" | "effect";
    events: GameEvent[];
  }): void {
    const ctx = {
      card: input.card ? toEffectCard(input.card) : null,
      state: this.createEffectBattleState(),
      previousHeat: input.previousHeat,
      nextHeat: input.nextHeat,
      delta: input.delta,
      source: input.source,
    };

    for (const effect of [...this.state.effects]) {
      effect.onHeatChanged(ctx, this.createEffectHost(input.events));
    }

    this.pruneEffects();
  }

  private endTurnEffects(events: GameEvent[]): void {
    for (const effect of [...this.state.effects]) {
      effect.onCycleEnd(this.createEffectHost(events));
    }

    this.pruneEffects();
  }

  private pruneEffects(): void {
    const state = this.createEffectBattleState();
    this.state.effects = this.state.effects.filter((effect) => !effect.isExpired(state));
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

    while (rewards.length < 3) {
      rewards.push(this.makeCardReward());
    }

    return this.rng.shuffle(rewards).slice(0, 3);
  }

  private makeCardReward(): RewardOption {
    const cardId = this.rng.pick(cardRewardPool);
    const card = cardDb[cardId];
    return {
      kind: "card",
      description: card.description,
      name: `НОВАЯ КАРТА: ${card.name}`,
      desc: `${effectText(card.effects)}. ${card.text}`,
      cardId,
    };
  }
}

export function createGame(options: GameOptions): GameEngine {
  return new GameEngine(options);
}

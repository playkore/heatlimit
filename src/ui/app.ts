import { FINAL_STAGE, HAND_SIZE, MAX_ACTIONS, MAX_HEAT, cardDb, getCardProps, type CardId } from "../game/data";
import { createGame, type GameEngine, type GameEvent, type RewardOption } from "../game/engine";
import type { GameStateView, ResolvedCard } from "../game/api";
import { appendSavedCard, buildStartingDeck, clearProfile, createDefaultProfile, loadProfile, saveProfile, type StorageLike } from "./profile";
import type { DeckCard } from "../game/cards/helpers";

const sessionSeed = () => (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;

const HAND_CARD_SELECTOR = ".card";
const CARD_FLY_DURATION = 360;
const DRAW_FLY_DURATION = 420;
const SOURCE_CARD_RATIO = 0.42;
const TARGET_DISCARD_RATIO = 0.36;
const PILE_MARGIN = 6;
const DEBUG_CARD_IDS = Object.keys(cardDb) as CardId[];

type CardTheme = {
  accent: string;
  accentSoft: string;
  accentDeep: string;
  glow: string;
  label: string;
  symbol: string;
  surface: string;
};

type DefectTheme = {
  accent: string;
  accentSoft: string;
  accentDeep: string;
  glow: string;
  label: string;
  symbol: string;
  surface: string;
};

const CARD_THEMES: Record<CardId, CardTheme> = {
  clamp: {
    accent: "#d0c18a",
    accentSoft: "#efe7c8",
    accentDeep: "#7a6435",
    glow: "rgba(208, 193, 138, 0.42)",
    label: "МЕХАНИКА",
    symbol: "⟐",
    surface: "linear-gradient(180deg, rgba(246,238,210,0.92), rgba(192,170,112,0.82))",
  },
  scan: {
    accent: "#6ecfe2",
    accentSoft: "#cff6ff",
    accentDeep: "#1f6e7b",
    glow: "rgba(110, 207, 226, 0.45)",
    label: "СКАН",
    symbol: "◉",
    surface: "linear-gradient(180deg, rgba(229,251,255,0.96), rgba(85,174,193,0.82))",
  },
  cool: {
    accent: "#f39a49",
    accentSoft: "#ffd7aa",
    accentDeep: "#994a16",
    glow: "rgba(243, 154, 73, 0.45)",
    label: "ТЕРМ.",
    symbol: "❄",
    surface: "linear-gradient(180deg, rgba(255,232,208,0.96), rgba(201,109,46,0.84))",
  },
  patch: {
    accent: "#9fbd74",
    accentSoft: "#dcedbe",
    accentDeep: "#596d2f",
    glow: "rgba(159, 189, 116, 0.42)",
    label: "РЕМОНТ",
    symbol: "▣",
    surface: "linear-gradient(180deg, rgba(241,246,218,0.96), rgba(121,144,82,0.84))",
  },
  diagnose: {
    accent: "#92b7ff",
    accentSoft: "#d8e5ff",
    accentDeep: "#34518c",
    glow: "rgba(146, 183, 255, 0.4)",
    label: "ДИАГН.",
    symbol: "⌘",
    surface: "linear-gradient(180deg, rgba(232,240,255,0.96), rgba(100,128,186,0.84))",
  },
  impulse: {
    accent: "#f37e51",
    accentSoft: "#ffd0bb",
    accentDeep: "#8f361b",
    glow: "rgba(243, 126, 81, 0.42)",
    label: "УДАР",
    symbol: "✦",
    surface: "linear-gradient(180deg, rgba(255,232,223,0.96), rgba(196,99,56,0.84))",
  },
  laser: {
    accent: "#d8c06f",
    accentSoft: "#f2e4af",
    accentDeep: "#8a6f24",
    glow: "rgba(216, 192, 111, 0.4)",
    label: "ЛАЗЕР",
    symbol: "▰",
    surface: "linear-gradient(180deg, rgba(249,243,214,0.96), rgba(175,144,57,0.84))",
  },
  marking: {
    accent: "#72d1c6",
    accentSoft: "#d6f4ef",
    accentDeep: "#22796e",
    glow: "rgba(114, 209, 198, 0.42)",
    label: "МЕТКА",
    symbol: "◎",
    surface: "linear-gradient(180deg, rgba(229,250,246,0.96), rgba(93,170,160,0.84))",
  },
  drone: {
    accent: "#9b8adf",
    accentSoft: "#e2dcff",
    accentDeep: "#52438f",
    glow: "rgba(155, 138, 223, 0.42)",
    label: "ДРОН",
    symbol: "◍",
    surface: "linear-gradient(180deg, rgba(240,235,255,0.96), rgba(124,103,191,0.84))",
  },
  radiator: {
    accent: "#8ead63",
    accentSoft: "#ddebbf",
    accentDeep: "#4e6a24",
    glow: "rgba(142, 173, 99, 0.4)",
    label: "РАД.",
    symbol: "▭",
    surface: "linear-gradient(180deg, rgba(237,243,216,0.96), rgba(104,131,70,0.84))",
  },
  bypass: {
    accent: "#b79458",
    accentSoft: "#efe0b8",
    accentDeep: "#715225",
    glow: "rgba(183, 148, 88, 0.38)",
    label: "ОБХОД",
    symbol: "↺",
    surface: "linear-gradient(180deg, rgba(249,238,208,0.96), rgba(168,130,71,0.84))",
  },
  "red-zone": {
    accent: "#ea5d2e",
    accentSoft: "#ffd5bf",
    accentDeep: "#9f3010",
    glow: "rgba(234, 93, 46, 0.42)",
    label: "СИГНАЛ",
    symbol: "⛔",
    surface: "linear-gradient(180deg, rgba(255,233,223,0.96), rgba(201,87,45,0.84))",
  },
  relay: {
    accent: "#7ed2a8",
    accentSoft: "#d9f5e5",
    accentDeep: "#296442",
    glow: "rgba(126, 210, 168, 0.42)",
    label: "РЕЛЕ",
    symbol: "⇄",
    surface: "linear-gradient(180deg, rgba(228,247,238,0.96), rgba(97,168,126,0.84))",
  },
  weld: {
    accent: "#c37f5d",
    accentSoft: "#f2d1bf",
    accentDeep: "#7a3f25",
    glow: "rgba(195, 127, 93, 0.42)",
    label: "СВАРКА",
    symbol: "⌁",
    surface: "linear-gradient(180deg, rgba(250,236,226,0.96), rgba(180,102,67,0.84))",
  },
  vent: {
    accent: "#8fb4c0",
    accentSoft: "#d8ebf0",
    accentDeep: "#426270",
    glow: "rgba(143, 180, 192, 0.38)",
    label: "ВЕНТ.",
    symbol: "≋",
    surface: "linear-gradient(180deg, rgba(232,243,246,0.96), rgba(106,140,150,0.84))",
  },
};

const DEFECT_THEMES: Record<string, DefectTheme> = {
  leak: {
    accent: "#c9b98e",
    accentSoft: "#efe0b8",
    accentDeep: "#6d5d34",
    glow: "rgba(201, 185, 142, 0.38)",
    label: "АВАРИЯ",
    symbol: "◐",
    surface: "linear-gradient(180deg, rgba(247,239,217,0.95), rgba(191,171,117,0.8))",
  },
  ice: {
    accent: "#7db8e8",
    accentSoft: "#d8eeff",
    accentDeep: "#2d5f95",
    glow: "rgba(125, 184, 232, 0.38)",
    label: "ОБЛЕД.",
    symbol: "❄",
    surface: "linear-gradient(180deg, rgba(234,244,255,0.95), rgba(109,153,198,0.8))",
  },
  spark: {
    accent: "#f2a15a",
    accentSoft: "#ffd9b8",
    accentDeep: "#8d4b19",
    glow: "rgba(242, 161, 90, 0.38)",
    label: "ПЕРЕГРУЗКА",
    symbol: "⚡",
    surface: "linear-gradient(180deg, rgba(255,241,222,0.95), rgba(197,120,52,0.8))",
  },
  boss: {
    accent: "#96b074",
    accentSoft: "#dce9bd",
    accentDeep: "#4f6231",
    glow: "rgba(150, 176, 116, 0.38)",
    label: "БИРКА",
    symbol: "☢",
    surface: "linear-gradient(180deg, rgba(240,246,218,0.95), rgba(118,146,82,0.8))",
  },
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getPersistentStorage(): StorageLike {
  const memory = new Map<string, string>();

  try {
    const storage = window.localStorage;
    const probeKey = "__heat_limit_probe__";
    storage.setItem(probeKey, "1");
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return {
      getItem(key: string): string | null {
        return memory.get(key) ?? null;
      },
      setItem(key: string, value: string): void {
        memory.set(key, value);
      },
      removeItem(key: string): void {
        memory.delete(key);
      },
    };
  }
}

export function bootstrapApp(): void {
  const ui = createUi();
  const storage = getPersistentStorage();
  let profile = loadProfile(storage);
  let game = createGame({ seed: sessionSeed(), deck: buildStartingDeck(profile) });
  let busy = false;
  let previousSnapshot: Snapshot | null = null;
  let deckOpen = false;
  let menuOpen = false;
  let debugDeckOpen = false;
  let selectedSaveCardIndex: number | null = null;

  function render(reason: RenderReason = "refresh") {
    const currentSnapshot = snapshotState(game.state);
    const visibleCards = game.state.hand.slice(0, HAND_SIZE).map((cardObj) => getCardProps(cardObj));
    const showDeck = game.state.phase === "combat" && deckOpen;

    if (game.state.phase !== "combat" && deckOpen) {
      deckOpen = false;
    }

    renderGame(ui, game, busy, profile.runNumber, playCard);
    renderOverlay(
      ui,
      game,
      busy,
      showDeck,
      debugDeckOpen,
      selectedSaveCardIndex,
      chooseReward,
      skipReward,
      chooseSaveCard,
      addDebugCard,
      removeDebugCard,
    );
    renderMenu(ui, menuOpen, startNewGame, openDebugDeck, closeMenu);
    scheduleHandAnimations(ui, previousSnapshot, currentSnapshot, reason, visibleCards);
    previousSnapshot = currentSnapshot;
  }

  function canStartNewRun(): boolean {
    return !(game.state.phase === "ended" && game.state.endReason === "death" && game.state.acquiredCards.length > 0 && selectedSaveCardIndex === null);
  }

  function startNewRun() {
    if (!canStartNewRun()) {
      return;
    }

    profile = {
      ...profile,
      runNumber: profile.runNumber + 1,
    };
    saveProfile(storage, profile);
    game = createGame({ seed: sessionSeed(), deck: buildStartingDeck(profile) });
    busy = false;
    deckOpen = false;
    debugDeckOpen = false;
    selectedSaveCardIndex = null;
    render("draw");
  }

  function startNewGame() {
    clearProfile(storage);
    profile = createDefaultProfile();
    game = createGame({ seed: sessionSeed(), deck: buildStartingDeck(profile) });
    busy = false;
    deckOpen = false;
    menuOpen = false;
    debugDeckOpen = false;
    selectedSaveCardIndex = null;
    render("draw");
  }

  function applyEvents(events: GameEvent[]) {
    for (const event of events) {
      if (event.type === "banner") {
        showBanner(ui, event.text ?? "");
      } else if (event.type === "float") {
        floatText(ui, event.text ?? "", event.tone ?? "");
      } else if (event.type === "enemy-hit") {
        shake(ui);
        enemyHit(ui, event.amount ?? 0);
      } else if (event.type === "enemy-pulse") {
        enemyPulse(ui);
      } else if (event.type === "shake") {
        shake(ui);
      }
    }
  }

  async function playCard(index: number) {
    if (busy || game.state.phase !== "combat") {
      return;
    }

    busy = true;
    applyEvents(game.playCard(index));
    render("play");

    await wait(500);

    if (game.state.phase !== "combat") {
      busy = false;
      render("refresh");
      return;
    }

    if (game.state.actions >= MAX_ACTIONS) {
      applyEvents(game.resolveEnemyTurn());
      render("draw");
      await wait(390);
    }

    busy = false;
    render("refresh");
  }

  function chooseReward(index: number) {
    if (busy || game.state.phase !== "reward") {
      return;
    }

    game.chooseReward(index);
    deckOpen = false;
    render("draw");
  }

  function skipReward() {
    if (busy || game.state.phase !== "reward") {
      return;
    }

    game.skipReward();
    deckOpen = false;
    render("draw");
  }

  function chooseSaveCard(index: number) {
    if (busy || game.state.phase !== "ended" || game.state.endReason !== "death" || selectedSaveCardIndex !== null) {
      return;
    }

    const card = game.state.acquiredCards[index];
    if (!card) {
      return;
    }

    selectedSaveCardIndex = index;
    profile = appendSavedCard(profile, card);
    saveProfile(storage, profile);
    render("refresh");
  }

  function openDeck() {
    if (busy || game.state.phase !== "combat") {
      return;
    }

    deckOpen = true;
    debugDeckOpen = false;
    render("refresh");
  }

  function closeDeck() {
    if (!deckOpen) {
      return;
    }

    deckOpen = false;
    render("refresh");
  }

  function openDebugDeck() {
    if (busy) {
      return;
    }

    debugDeckOpen = true;
    deckOpen = false;
    menuOpen = false;
    render("refresh");
  }

  function closeDebugDeck() {
    if (!debugDeckOpen) {
      return;
    }

    debugDeckOpen = false;
    render("refresh");
  }

  function addDebugCard(cardId: CardId) {
    if (busy || !debugDeckOpen) {
      return;
    }

    game.debugAddCard(cardId);
    render("refresh");
  }

  function removeDebugCard(index: number) {
    if (busy || !debugDeckOpen) {
      return;
    }

    game.debugRemoveCard(index);
    render("refresh");
  }

  function openMenu() {
    if (busy) {
      return;
    }

    menuOpen = true;
    deckOpen = false;
    debugDeckOpen = false;
    render("refresh");
  }

  function closeMenu() {
    if (!menuOpen) {
      return;
    }

    menuOpen = false;
    render("refresh");
  }

  ui.menuButton.addEventListener("click", openMenu);
  ui.restartButton.addEventListener("click", startNewRun);
  ui.deckButton.addEventListener("click", openDeck);
  ui.overlayCloseButton.addEventListener("click", () => {
    if (debugDeckOpen) {
      closeDebugDeck();
    } else {
      closeDeck();
    }
  });
  ui.menuOverlay.addEventListener("click", (event) => {
    if (event.target === ui.menuOverlay) {
      closeMenu();
    }
  });
  ui.overlay.addEventListener("click", (event) => {
    if (event.target === ui.overlay && debugDeckOpen) {
      closeDebugDeck();
    } else if (event.target === ui.overlay && deckOpen && game.state.phase === "combat") {
      closeDeck();
    }
  });
  render("draw");
}

function createUi() {
  const get = (id: string) => {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing element #${id}`);
    }
    return element;
  };

  return {
    phone: get("phone"),
    stageText: get("stageText"),
    actionsText: get("actionsText"),
    heatText: get("heatText"),
    heatFill: get("heatFill"),
    enemyTitle: get("enemyTitle"),
    enemySubtitle: get("enemySubtitle"),
    hpText: get("hpText"),
    hpFill: get("hpFill"),
    message: get("message"),
    activeEffects: get("activeEffects"),
    cardArea: get("cardArea"),
    animationLayer: get("animationLayer"),
    drawPilePanel: get("drawPilePanel"),
    drawPileCount: get("drawPileCount"),
    discardPanel: get("discardPanel"),
    discardCount: get("discardCount"),
    deckButton: get("deckButton") as HTMLButtonElement,
    overlayCloseButton: get("overlayCloseButton") as HTMLButtonElement,
    overlay: get("overlay"),
    overlayTitle: get("overlayTitle"),
    overlayText: get("overlayText"),
    rewardList: get("rewardList"),
    restartButton: get("restartButton") as HTMLButtonElement,
    menuButton: get("menuButton") as HTMLButtonElement,
    menuOverlay: get("menuOverlay"),
    menuRestartButton: get("menuRestartButton") as HTMLButtonElement,
    menuDebugButton: get("menuDebugButton") as HTMLButtonElement,
    menuCloseButton: get("menuCloseButton") as HTMLButtonElement,
    cycleBanner: get("cycleBanner"),
  };
}

type Ui = ReturnType<typeof createUi>;

type RenderReason = "refresh" | "play" | "draw";

interface Snapshot {
  phase: GameStateView["phase"];
  stage: number;
  actions: number;
  handLength: number;
  drawPileCount: number;
  discardCount: number;
}

interface RectBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

function toLayerRect(layer: HTMLElement, rect: Pick<DOMRect, "left" | "top" | "width" | "height">): RectBox {
  const layerRect = layer.getBoundingClientRect();
  return {
    left: rect.left - layerRect.left,
    top: rect.top - layerRect.top,
    width: rect.width,
    height: rect.height,
  };
}

function renderGame(
  ui: Ui,
  game: GameEngine,
  busy: boolean,
  runNumber: number,
  onPlay: (index: number, source: HTMLButtonElement, card: ResolvedCard) => void,
): void {
  const state = game.state;
  const defect = state.defect;

  if (!defect) {
    return;
  }

  applyDefectTheme(ui, defect);
  ui.stageText.textContent = `ЗАБЕГ ${runNumber} · ${defect.boss ? `БОСС ${state.stage}/${FINAL_STAGE}` : `СПУТНИК ${state.stage}/${FINAL_STAGE}`}`;
  ui.enemyTitle.textContent = defect.title;
  ui.enemySubtitle.textContent = `${defect.subtitle} · цикл: 🔥+${defect.heatPerCycle}`;
  ui.actionsText.textContent = `${state.actions}/${MAX_ACTIONS}`;
  ui.deckButton.disabled = busy || state.phase !== "combat";
  ui.heatText.textContent = `${state.heat}/${MAX_HEAT}`;
  const repairProgress = Math.max(0, Math.min(state.maxHp, state.maxHp - state.hp));
  ui.hpText.textContent = `${repairProgress}/${state.maxHp}`;
  ui.heatFill.style.width = `${(100 * state.heat) / MAX_HEAT}%`;
  ui.hpFill.style.width = `${(100 * repairProgress) / state.maxHp}%`;
  ui.heatFill.classList.toggle("danger", state.heat >= MAX_HEAT - 2);
  ui.message.innerHTML = state.messageHtml;
  renderActiveEffects(ui, state.effects.map((effect) => effect.toView()));
  ui.drawPileCount.textContent = String(state.drawPile.length);
  ui.discardCount.textContent = String(state.discard.length);

  renderHand(ui, game, busy, onPlay);
}

function renderHand(
  ui: Ui,
  game: GameEngine,
  busy: boolean,
  onPlay: (index: number, source: HTMLButtonElement, card: ResolvedCard) => void,
): void {
  ui.cardArea.innerHTML = "";
  game.state.hand.slice(0, HAND_SIZE).forEach((cardObj, index) => {
    const card = getCardProps(cardObj);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.disabled = busy || game.state.phase !== "combat" || game.state.actions >= MAX_ACTIONS;
    button.dataset.cardIndex = String(index);
    button.innerHTML = cardMarkup(card);
    applyCardTheme(button, card);
    button.addEventListener("click", () => {
      playDiscardAnimation(ui, button, card);
      onPlay(index, button, card);
    });
    ui.cardArea.appendChild(button);
  });
}

function renderOverlay(
  ui: Ui,
  game: GameEngine,
  busy: boolean,
  showDeck: boolean,
  debugDeckOpen: boolean,
  selectedSaveCardIndex: number | null,
  onChooseReward: (index: number) => void,
  onSkipReward: () => void,
  onChooseSaveCard: (index: number) => void,
  onAddDebugCard: (cardId: CardId) => void,
  onRemoveDebugCard: (index: number) => void,
): void {
  const state = game.state;
  const visible = debugDeckOpen || state.phase !== "combat" || showDeck;
  ui.overlay.classList.toggle("show", visible);
  ui.overlay.classList.toggle("deck-mode", showDeck || debugDeckOpen);

  if (!visible) {
    ui.rewardList.innerHTML = "";
    ui.rewardList.classList.remove("deck-view", "debug-deck-view");
    ui.restartButton.style.display = "none";
    ui.overlayCloseButton.style.display = "none";
    return;
  }

  if (debugDeckOpen) {
    ui.overlayTitle.textContent = "ОТЛАДКА КОЛОДЫ";
    ui.overlayText.textContent = `${state.deck.length} карт в текущей колоде. Добавляй любые карты игры или удаляй лишние.`;
    ui.restartButton.style.display = "none";
    ui.overlayCloseButton.style.display = "block";
    ui.rewardList.classList.remove("deck-view");
    ui.rewardList.classList.add("debug-deck-view");
    renderDebugDeckManager(ui, state.deck, busy, onAddDebugCard, onRemoveDebugCard);
    return;
  }

  if (showDeck) {
    ui.overlayTitle.textContent = "МУЛЬТИТУЛ";
    ui.overlayText.textContent = `${state.deck.length} инструментов.`;
    ui.restartButton.style.display = "none";
    ui.overlayCloseButton.style.display = "block";
    ui.rewardList.classList.remove("debug-deck-view");
    ui.rewardList.classList.add("deck-view");
    renderDeckList(ui, state.deck);
    return;
  }

  ui.overlayTitle.textContent = state.overlayTitle;
  ui.overlayCloseButton.style.display = "none";
  ui.rewardList.classList.remove("deck-view", "debug-deck-view");
  ui.rewardList.innerHTML = "";

  if (state.phase === "ended" && state.endReason === "death") {
    ui.overlayText.textContent =
      state.acquiredCards.length === 0
        ? "В этом забеге не было карт для сохранения. Начни следующий забег."
        : selectedSaveCardIndex === null
          ? "Выбери одну карту из этого забега и сохрани её для следующего."
          : `Сохранено: ${getCardProps(state.acquiredCards[selectedSaveCardIndex]).name}. Можно начинать следующий забег.`;
    const canStartNewRun = state.acquiredCards.length === 0 || selectedSaveCardIndex !== null;
    ui.restartButton.style.display = canStartNewRun ? "block" : "none";
    if (state.acquiredCards.length > 0) {
      renderSaveCardList(ui, state.acquiredCards, selectedSaveCardIndex, onChooseSaveCard);
    }
    return;
  }

  ui.overlayText.textContent = state.overlayText;
  ui.restartButton.style.display = state.phase === "ended" ? "block" : "none";

  if (state.phase !== "reward") {
    return;
  }

    state.pendingRewards.forEach((reward, index) => {
    const button = document.createElement("button");
    button.type = "button";
      button.className = "reward-button";
      button.dataset.rewardIndex = String(index);
      button.innerHTML = rewardMarkup(reward);
      button.addEventListener("click", () => {
        onChooseReward(index);
    });
    ui.rewardList.appendChild(button);
  });

  const skipButton = document.createElement("button");
  skipButton.type = "button";
  skipButton.className = "reward-button reward-skip-button";
  skipButton.innerHTML = `
    <div class="reward-icon">⏭</div>
    <div>
      <div class="reward-name">ПРОПУСТИТЬ</div>
      <div class="reward-desc">Не брать новую карту в колоду.</div>
    </div>
  `;
  skipButton.addEventListener("click", onSkipReward);
  ui.rewardList.appendChild(skipButton);
}

function renderActiveEffects(
  ui: Ui,
  effects: readonly { kind: string; description: string }[],
): void {
  if (effects.length === 0) {
    ui.activeEffects.hidden = true;
    ui.activeEffects.innerHTML = "";
    return;
  }

  ui.activeEffects.hidden = false;
  ui.activeEffects.innerHTML = effects
    .map(
      (effect) => `
        <div class="active-effect" data-effect-kind="${effect.kind}">${effect.description}</div>
      `,
    )
    .join("");
}

function renderMenu(
  ui: Ui,
  open: boolean,
  onStartNewRun: () => void,
  onOpenDebugDeck: () => void,
  onClose: () => void,
): void {
  ui.menuOverlay.classList.toggle("show", open);
  ui.menuRestartButton.disabled = false;
  ui.menuRestartButton.textContent = "НОВАЯ ИГРА";
  ui.menuRestartButton.onclick = () => {
    onStartNewRun();
    onClose();
  };
  ui.menuDebugButton.onclick = onOpenDebugDeck;
  ui.menuCloseButton.onclick = onClose;
}

function renderDeckList(ui: Ui, deck: readonly DeckCard[]): void {
  ui.rewardList.innerHTML = "";

  deck.forEach((cardObj, index) => {
    const card = getCardProps(cardObj);
    const row = document.createElement("div");
    row.className = "deck-entry";
    row.innerHTML = deckEntryMarkup(card, { showCount: true, showDescription: true, count: index + 1 });
    applyCardTheme(row, card);
    ui.rewardList.appendChild(row);
  });
}

function renderDebugDeckManager(
  ui: Ui,
  deck: readonly DeckCard[],
  busy: boolean,
  onAddCard: (cardId: CardId) => void,
  onRemoveCard: (index: number) => void,
): void {
  ui.rewardList.innerHTML = "";

  const addPanel = document.createElement("section");
  addPanel.className = "debug-panel";
  addPanel.innerHTML = `<div class="debug-panel-title">ДОБАВИТЬ КАРТУ</div>`;

  const addGrid = document.createElement("div");
  addGrid.className = "debug-add-grid";
  DEBUG_CARD_IDS.forEach((cardId) => {
    const card = getCardProps({ id: cardId });
    const button = document.createElement("button");
    button.type = "button";
    button.className = "debug-add-card";
    button.disabled = busy;
    button.innerHTML = `
      <div class="debug-add-name">${card.name}</div>
      <div class="debug-add-desc">${card.description}</div>
    `;
    button.addEventListener("click", () => {
      onAddCard(cardId);
    });
    addGrid.appendChild(button);
  });
  addPanel.appendChild(addGrid);
  ui.rewardList.appendChild(addPanel);

  const deckPanel = document.createElement("section");
  deckPanel.className = "debug-panel";
  deckPanel.innerHTML = `<div class="debug-panel-title">ТЕКУЩАЯ КОЛОДА</div>`;

  if (deck.length === 0) {
    const empty = document.createElement("div");
    empty.className = "debug-empty";
    empty.textContent = "Колода пуста. Добавь карту выше.";
    deckPanel.appendChild(empty);
  }

  deck.forEach((cardObj, index) => {
    const card = getCardProps(cardObj);
    const row = document.createElement("div");
    row.className = "deck-entry debug-deck-entry";
    row.innerHTML = deckEntryMarkup(card, { showCount: false, showDescription: true });
    applyCardTheme(row, card);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "debug-remove-card";
    removeButton.disabled = busy;
    removeButton.textContent = "УДАЛИТЬ";
    removeButton.addEventListener("click", () => {
      onRemoveCard(index);
    });
    row.appendChild(removeButton);
    deckPanel.appendChild(row);
  });

  ui.rewardList.appendChild(deckPanel);
}

function deckEntryMarkup(
  card: ResolvedCard,
  options: { showCount: boolean; showDescription: boolean; count?: number },
): string {
  const effects = card.effects.map((effect) => `${effect.icon} ${effect.text}`).join(" · ");

  return `
    <div class="deck-entry-main">
      <div class="deck-entry-head">
        <div class="deck-entry-name">${card.name}</div>
        <div class="deck-entry-effects">${effects}</div>
      </div>
      ${options.showDescription ? `<div class="deck-entry-desc">${card.description}</div>` : ""}
    </div>
    ${options.showCount ? `<div class="deck-entry-count">#${options.count ?? ""}</div>` : ""}
  `;
}

function renderSaveCardList(
  ui: Ui,
  cards: readonly DeckCard[],
  selectedSaveCardIndex: number | null,
  onChooseSaveCard: (index: number) => void,
): void {
  cards.forEach((cardObj, index) => {
    const card = getCardProps(cardObj);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `reward-button save-button ${selectedSaveCardIndex === index ? "selected" : ""}`;
    button.disabled = selectedSaveCardIndex !== null;
    button.innerHTML = saveCardMarkup(card);
    applyCardTheme(button, card);
    button.addEventListener("click", () => {
      onChooseSaveCard(index);
    });
    ui.rewardList.appendChild(button);
  });
}

function saveCardMarkup(card: ResolvedCard): string {
  const theme = getCardTheme(card);

  return `
    <div class="reward-icon" style="--card-accent:${theme.accent};--card-accent-soft:${theme.accentSoft};--card-accent-deep:${theme.accentDeep};--card-glow:${theme.glow};">${theme.symbol}</div>
    <div>
      <div class="reward-name">${card.name}</div>
      <div class="reward-desc">${card.effects
        .map((effect) => `${effect.icon} ${effect.text}`)
        .join(" · ")}</div>
    </div>
  `;
}

function rewardMarkup(reward: RewardOption): string {
  return `
    <div class="reward-icon">⟡</div>
    <div>
      <div class="reward-name">${reward.name}</div>
      <div class="reward-desc">${reward.desc}</div>
    </div>
  `;
}

function showBanner(ui: Ui, text: string): void {
  ui.cycleBanner.textContent = text;
  ui.cycleBanner.classList.remove("show");
  void ui.cycleBanner.offsetWidth;
  ui.cycleBanner.classList.add("show");
}

function applyCardTheme(node: HTMLElement, card: ResolvedCard): void {
  const theme = getCardTheme(card);
  node.style.setProperty("--card-accent", theme.accent);
  node.style.setProperty("--card-accent-soft", theme.accentSoft);
  node.style.setProperty("--card-accent-deep", theme.accentDeep);
  node.style.setProperty("--card-glow", theme.glow);
  node.style.setProperty("--card-surface", theme.surface);
  node.dataset.cardTheme = card.id;
}

function applyDefectTheme(ui: Ui, defect: { id: string; boss?: boolean }): void {
  const theme = getDefectTheme(defect);
  ui.phone.style.setProperty("--scene-accent", theme.accent);
  ui.phone.style.setProperty("--scene-accent-soft", theme.accentSoft);
  ui.phone.style.setProperty("--scene-accent-deep", theme.accentDeep);
  ui.phone.style.setProperty("--scene-glow", theme.glow);
  ui.phone.style.setProperty("--scene-surface", theme.surface);
  ui.phone.style.setProperty("--scene-symbol", theme.symbol);
  ui.phone.style.setProperty("--scene-label", theme.label);
  ui.phone.dataset.defect = defect.id;
}

function getCardTheme(card: ResolvedCard): CardTheme {
  return CARD_THEMES[card.id as CardId] ?? CARD_THEMES.clamp;
}

function getDefectTheme(defect: { id: string; boss?: boolean }): DefectTheme {
  if (defect.boss) {
    return DEFECT_THEMES.boss;
  }

  return DEFECT_THEMES[defect.id] ?? DEFECT_THEMES.leak;
}

function floatText(ui: Ui, text: string, tone: string): void {
  const node = document.createElement("div");
  node.className = `float-text ${tone}`;
  node.textContent = text;
  ui.phone.appendChild(node);
  window.setTimeout(() => node.remove(), 720);
}

function enemyHit(ui: Ui, amount: number): void {
  floatText(ui, `🔧-${amount}`, "");
}

function enemyPulse(ui: Ui): void {
  floatText(ui, "⚑", "heat");
}

function shake(ui: Ui): void {
  ui.phone.classList.remove("shake");
  void ui.phone.offsetWidth;
  ui.phone.classList.add("shake");
}

function snapshotState(state: {
  phase: GameStateView["phase"];
  stage: number;
  actions: number;
  hand: readonly unknown[];
  drawPile: readonly unknown[];
  discard: readonly unknown[];
}): Snapshot {
  return {
    phase: state.phase,
    stage: state.stage,
    actions: state.actions,
    handLength: state.hand.length,
    drawPileCount: state.drawPile.length,
    discardCount: state.discard.length,
  };
}

function scheduleHandAnimations(
  ui: Ui,
  previous: Snapshot | null,
  current: Snapshot,
  reason: RenderReason,
  visibleCards: readonly ResolvedCard[],
): void {
  window.requestAnimationFrame(() => {
    const buttons = Array.from(ui.cardArea.querySelectorAll<HTMLButtonElement>(HAND_CARD_SELECTOR));
    if (buttons.length === 0) {
      return;
    }

    if (reason === "play") {
      animateDrawAfterPlay(ui, previous, buttons, visibleCards);
      return;
    }

    if (reason === "draw") {
      animateFreshHand(ui, buttons, visibleCards);
    }
  });
}

function animateFreshHand(ui: Ui, buttons: HTMLButtonElement[], visibleCards: readonly ResolvedCard[]): void {
  const sourceRect = toLayerRect(ui.animationLayer, makePileSourceRect(ui.drawPilePanel, buttons[0].getBoundingClientRect(), "left"));

  buttons.forEach((button, index) => {
    const cardRect = toLayerRect(ui.animationLayer, button.getBoundingClientRect());
    animateCardFlight(ui, {
      card: visibleCards[index],
      from: sourceRect,
      to: cardRect,
      duration: DRAW_FLY_DURATION + index * 40,
      delay: index * 55,
      opacity: 0.96,
      rotate: index === 1 ? -2 : index === 2 ? 2 : 0,
    });
  });
}

function animateDrawAfterPlay(
  ui: Ui,
  previous: Snapshot | null,
  buttons: HTMLButtonElement[],
  visibleCards: readonly ResolvedCard[],
): void {
  if (!previous) {
    animateFreshHand(ui, buttons, visibleCards);
    return;
  }

  const remainingVisibleCards = Math.max(0, Math.min(HAND_SIZE, previous.handLength) - 1);
  if (buttons.length <= remainingVisibleCards) {
    return;
  }

  const drawnButtons = buttons.slice(remainingVisibleCards);
  const drawnCards = visibleCards.slice(remainingVisibleCards);
  const sourceRect = toLayerRect(ui.animationLayer, makePileSourceRect(ui.drawPilePanel, drawnButtons[0].getBoundingClientRect(), "left"));

  drawnButtons.forEach((button, index) => {
    const cardRect = toLayerRect(ui.animationLayer, button.getBoundingClientRect());
    animateCardFlight(ui, {
      card: drawnCards[index],
      from: sourceRect,
      to: cardRect,
      duration: DRAW_FLY_DURATION + index * 35,
      delay: index * 45,
      opacity: 0.96,
      rotate: index === 0 ? -2 : 2,
    });
  });
}

function animateCardFlight(
  ui: Ui,
  options: {
    card: ResolvedCard;
    from: RectBox;
    to: RectBox;
    duration: number;
    delay?: number;
    opacity?: number;
    rotate?: number;
  },
): void {
  const clone = document.createElement("button");
  clone.type = "button";
  clone.className = "card fly";
  clone.innerHTML = cardMarkup(options.card);
  clone.setAttribute("aria-hidden", "true");
  clone.tabIndex = -1;
  clone.style.left = `${options.from.left}px`;
  clone.style.top = `${options.from.top}px`;
  clone.style.width = `${options.from.width}px`;
  clone.style.height = `${options.from.height}px`;
  clone.style.opacity = "0.98";
  clone.style.zIndex = "30";
  ui.animationLayer.appendChild(clone);

  const animation = clone.animate(
    [
      {
        left: `${options.from.left}px`,
        top: `${options.from.top}px`,
        width: `${options.from.width}px`,
        height: `${options.from.height}px`,
        opacity: 0.98,
        transform: "rotate(0deg)",
      },
      {
        left: `${options.to.left}px`,
        top: `${options.to.top}px`,
        width: `${options.to.width}px`,
        height: `${options.to.height}px`,
        opacity: options.opacity ?? 1,
        transform: `rotate(${options.rotate ?? 0}deg)`,
      },
    ],
    {
      duration: options.duration,
      delay: options.delay ?? 0,
      easing: "cubic-bezier(.18, .88, .2, 1)",
      fill: "forwards",
    },
  );

  animation.addEventListener(
    "finish",
    () => {
      clone.remove();
    },
    { once: true },
  );
}

function makePileSourceRect(panel: HTMLElement, cardRect: DOMRect, side: "left" | "right"): RectBox {
  const dockRect = panel.getBoundingClientRect();
  const width = Math.min(cardRect.width * SOURCE_CARD_RATIO, dockRect.width - PILE_MARGIN * 2);
  const height = Math.min(cardRect.height * SOURCE_CARD_RATIO, dockRect.height - PILE_MARGIN * 2);
  const left = side === "left" ? dockRect.left + PILE_MARGIN : dockRect.right - width - PILE_MARGIN;
  const top = dockRect.bottom - height - PILE_MARGIN;

  return { left, top, width, height };
}

function makePileTargetRect(panel: HTMLElement, cardRect: DOMRect): RectBox {
  const dockRect = panel.getBoundingClientRect();
  const width = Math.min(cardRect.width * TARGET_DISCARD_RATIO, dockRect.width - PILE_MARGIN * 2);
  const height = Math.min(cardRect.height * TARGET_DISCARD_RATIO, dockRect.height - PILE_MARGIN * 2);
  const left = dockRect.right - width - PILE_MARGIN;
  const top = dockRect.bottom - height - PILE_MARGIN;

  return { left, top, width, height };
}

function playDiscardAnimation(ui: Ui, source: HTMLButtonElement, card: ResolvedCard): void {
  const sourceRect = toLayerRect(ui.animationLayer, source.getBoundingClientRect());
  const targetRect = toLayerRect(ui.animationLayer, makePileTargetRect(ui.discardPanel, source.getBoundingClientRect()));
  animateCardFlight(ui, {
    card,
    from: sourceRect,
    to: targetRect,
    duration: CARD_FLY_DURATION,
    opacity: 0.92,
    rotate: 11,
  });
}

function cardMarkup(card: ResolvedCard): string {
  const theme = getCardTheme(card);

  return `
    <div class="card-frame" style="--card-accent:${theme.accent};--card-accent-soft:${theme.accentSoft};--card-accent-deep:${theme.accentDeep};--card-glow:${theme.glow};--card-surface:${theme.surface}">
      <div class="card-topline">
        <span class="card-chip">${theme.label}</span>
      </div>
      <div class="card-name" style="--card-name-length:${card.name.length}">${card.name}</div>
      <div class="card-icon">${card.description}</div>
      <div class="card-effects">
        ${card.effects
          .map(
            (effect) => `
              <div class="effect-line"><span class="emoji">${effect.icon}</span><span>${effect.text}</span></div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

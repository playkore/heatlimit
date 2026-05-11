import { MAX_ACTIONS, MAX_HEAT, FINAL_STAGE, getCardProps, modulesDb } from "../game/data";
import { createGame, type GameEngine, type GameEvent, type RewardOption } from "../game/engine";

const sessionSeed = () => (Date.now() ^ Math.floor(performance.now() * 1000)) >>> 0;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function bootstrapApp(): void {
  const ui = createUi();
  let game = createGame({ seed: sessionSeed() });
  let busy = false;

  function render() {
    renderGame(ui, game, busy, playCard);
    renderOverlay(ui, game, chooseReward);
  }

  function resetGame() {
    game = createGame({ seed: sessionSeed() });
    busy = false;
    render();
  }

  function applyEvents(events: GameEvent[]) {
    for (const event of events) {
      if (event.type === "banner") {
        showBanner(ui, event.text);
      } else if (event.type === "float") {
        floatText(ui, event.text, event.tone ?? "");
      } else if (event.type === "enemy-hit") {
        shake(ui);
        enemyHit(ui, event.amount);
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
    render();

    await wait(500);

    if (game.state.phase !== "combat") {
      busy = false;
      render();
      return;
    }

    if (game.state.actions >= MAX_ACTIONS) {
      applyEvents(game.resolveEnemyTurn());
      render();
      await wait(390);
    }

    busy = false;
    render();
  }

  function chooseReward(index: number) {
    if (busy || game.state.phase !== "reward") {
      return;
    }

    game.chooseReward(index);
    render();
  }

  ui.restartButton.addEventListener("click", resetGame);
  render();
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
    modules: get("modules"),
    enemyTitle: get("enemyTitle"),
    enemySubtitle: get("enemySubtitle"),
    enemyEmoji: get("enemyEmoji"),
    enemy: get("enemy"),
    enemyZone: get("enemyZone"),
    sparks: get("sparks"),
    hpText: get("hpText"),
    hpFill: get("hpFill"),
    message: get("message"),
    cardArea: get("cardArea"),
    overlay: get("overlay"),
    overlayTitle: get("overlayTitle"),
    overlayText: get("overlayText"),
    rewardList: get("rewardList"),
    restartButton: get("restartButton") as HTMLButtonElement,
    cycleBanner: get("cycleBanner"),
  };
}

function renderGame(
  ui: ReturnType<typeof createUi>,
  game: GameEngine,
  busy: boolean,
  onPlay: (index: number) => void,
): void {
  const state = game.state;
  const defect = state.defect;

  if (!defect) {
    return;
  }

  ui.stageText.textContent = defect.boss ? `БОСС ${state.stage}/${FINAL_STAGE}` : `СПУТНИК ${state.stage}/${FINAL_STAGE}`;
  ui.enemyTitle.textContent = defect.title;
  const extra = defect.id === "ice" && state.iceMelted ? "лёд расплавлен" : defect.subtitle;
  ui.enemySubtitle.textContent = `${extra} · цикл: 🔥+${defect.heatPerCycle}${state.modules.includes("badbattery") ? "+1" : ""}`;
  ui.enemyEmoji.textContent = defect.emoji;
  ui.enemy.classList.toggle("boss", !!defect.boss);
  ui.actionsText.textContent = `${state.actions}/${MAX_ACTIONS}`;
  ui.heatText.textContent = `${state.heat}/${MAX_HEAT}`;
  ui.hpText.textContent = `${state.hp}/${state.maxHp}`;
  ui.heatFill.style.width = `${(100 * state.heat) / MAX_HEAT}%`;
  ui.hpFill.style.width = `${(100 * state.hp) / state.maxHp}%`;
  ui.heatFill.classList.toggle("danger", state.heat >= MAX_HEAT - 2);
  ui.message.innerHTML = state.messageHtml;

  renderModules(ui, state.modules);
  renderHand(ui, game, busy, onPlay);
}

function renderModules(
  ui: ReturnType<typeof createUi>,
  modules: readonly (keyof typeof modulesDb)[],
): void {
  ui.modules.innerHTML = "";
  if (modules.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-modules";
    empty.textContent = "МОДУЛЕЙ НЕТ · НАГРАДЫ ПОСЛЕ РЕМОНТА";
    ui.modules.appendChild(empty);
    return;
  }

  for (const id of modules) {
    const module = modulesDb[id];
    const chip = document.createElement("div");
    chip.className = "module-chip emoji";
    chip.title = `${module.name}: ${module.text}`;
    chip.textContent = module.icon;
    ui.modules.appendChild(chip);
  }
}

function renderHand(
  ui: ReturnType<typeof createUi>,
  game: GameEngine,
  busy: boolean,
  onPlay: (index: number) => void,
): void {
  ui.cardArea.innerHTML = "";
  game.state.hand.slice(0, 3).forEach((cardObj, index) => {
    const card = getCardProps(cardObj);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `card ${cardObj.upgraded ? "upgraded" : ""}`;
    button.disabled = busy || game.state.phase !== "combat" || game.state.actions >= MAX_ACTIONS;
    button.dataset.cardIndex = String(index);
    button.innerHTML = `
      <div class="card-name">${card.name}</div>
      <div class="card-icon emoji">${card.icon}</div>
      <div class="card-effects">
        ${card.effects
          .map(
            (effect) => `
              <div class="effect-line"><span class="emoji">${effect.icon}</span><span>${effect.text}</span></div>
            `,
          )
          .join("")}
      </div>
    `;
    button.addEventListener("click", () => {
      onPlay(index);
    });
    ui.cardArea.appendChild(button);
  });
}

function renderOverlay(
  ui: ReturnType<typeof createUi>,
  game: GameEngine,
  onChooseReward: (index: number) => void,
): void {
  const state = game.state;
  const visible = state.phase !== "combat";
  ui.overlay.classList.toggle("show", visible);

  if (!visible) {
    ui.rewardList.innerHTML = "";
    ui.restartButton.style.display = "none";
    return;
  }

  ui.overlayTitle.textContent = state.overlayTitle;
  ui.overlayText.textContent = state.overlayText;
  ui.restartButton.style.display = state.phase === "ended" ? "block" : "none";
  ui.rewardList.innerHTML = "";

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
}

function rewardMarkup(reward: RewardOption): string {
  return `
    <div class="reward-icon emoji">${reward.icon}</div>
    <div>
      <div class="reward-name">${reward.name}</div>
      <div class="reward-desc">${reward.desc}</div>
    </div>
  `;
}

function showBanner(ui: ReturnType<typeof createUi>, text: string): void {
  ui.cycleBanner.textContent = text;
  ui.cycleBanner.classList.remove("show");
  void ui.cycleBanner.offsetWidth;
  ui.cycleBanner.classList.add("show");
}

function floatText(ui: ReturnType<typeof createUi>, text: string, tone: string): void {
  const node = document.createElement("div");
  node.className = `float-text ${tone}`;
  node.textContent = text;
  ui.enemyZone.appendChild(node);
  window.setTimeout(() => node.remove(), 720);
}

function enemyHit(ui: ReturnType<typeof createUi>, amount: number): void {
  animateEnemyHit(ui);
  floatText(ui, `🔧-${amount}`, "");
  spawnSparks(ui, 12);
}

function enemyPulse(ui: ReturnType<typeof createUi>): void {
  animateEnemyPulse(ui);
  spawnSparks(ui, 5);
}

function animateEnemyHit(ui: ReturnType<typeof createUi>): void {
  ui.enemy.classList.remove("hit");
  void ui.enemy.offsetWidth;
  ui.enemy.classList.add("hit");
}

function animateEnemyPulse(ui: ReturnType<typeof createUi>): void {
  ui.enemy.classList.remove("pulse");
  void ui.enemy.offsetWidth;
  ui.enemy.classList.add("pulse");
}

function shake(ui: ReturnType<typeof createUi>): void {
  ui.phone.classList.remove("shake");
  void ui.phone.offsetWidth;
  ui.phone.classList.add("shake");
}

function spawnSparks(ui: ReturnType<typeof createUi>, count: number): void {
  ui.sparks.innerHTML = "";
  for (let index = 0; index < count; index += 1) {
    const spark = document.createElement("div");
    spark.className = "spark";
    const angle = Math.random() * Math.PI * 2;
    const dist = 45 + Math.random() * 82;
    spark.style.setProperty("--x", `${Math.cos(angle) * dist}px`);
    spark.style.setProperty("--y", `${Math.sin(angle) * dist}px`);
    ui.sparks.appendChild(spark);
  }
  window.setTimeout(() => {
    ui.sparks.innerHTML = "";
  }, 500);
}

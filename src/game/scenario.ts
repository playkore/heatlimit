import { MAX_ACTIONS, type CardId } from "./data";
import { createGame, type GameEngine, type GameOptions } from "./engine";

export interface ScenarioOptions extends GameOptions {
  steps: readonly CardId[];
  rewardIndex?: number;
}

export function runScenario(options: ScenarioOptions): GameEngine {
  const game = createGame(options);

  for (const cardId of options.steps) {
    playCardById(game, cardId);

    if (game.state.phase === "reward") {
      game.chooseReward(options.rewardIndex ?? 0);
    }

    if (game.state.phase === "ended") {
      break;
    }
  }

  return game;
}

export function playCardById(game: GameEngine, cardId: CardId): void {
  const index = game.state.hand.findIndex((card) => card.id === cardId);
  if (index < 0) {
    throw new Error(`Card ${cardId} is not present in hand`);
  }

  game.playCard(index);

  if (game.state.phase === "combat" && game.state.actions >= MAX_ACTIONS) {
    game.resolveEnemyTurn();
  }
}

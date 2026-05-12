import { describe, expect, it } from "vitest";
import type { CardId, DeckCard } from "./data";
import { createGame } from "./engine";
import { playCardById } from "./scenario";
import { createSeededRng } from "./rng";

function makeDeck(cards: readonly CardId[]): DeckCard[] {
  return cards.map((id) => ({ id }));
}

function runBalanceScript(options: {
  seed: number;
  deck: readonly CardId[];
  turns: readonly CardId[];
}) {
  const game = createGame({
    seed: options.seed,
    rng: createSeededRng(options.seed),
    deck: makeDeck(options.deck),
  });

  for (const turn of options.turns) {
    playCardById(game, turn);

    if (game.state.phase !== "combat") {
      break;
    }
  }

  return game;
}

describe("balance scenarios", () => {
  it("wins with a fixed deck and scripted turns", () => {
    const game = runBalanceScript({
      seed: 17,
      deck: ["clamp", "clamp", "clamp", "clamp", "clamp", "clamp", "clamp", "clamp"],
      turns: ["clamp", "clamp", "clamp", "clamp", "clamp", "clamp", "clamp", "clamp"],
    });

    expect(game.state.phase).toBe("reward");
    expect(game.state.hp).toBe(0);
    expect(game.state.stage).toBe(1);
    expect(game.state.pendingRewards.length).toBeGreaterThan(0);
  });

  it("loses when laser cards overheat the tool", () => {
    const game = runBalanceScript({
      seed: 17,
      deck: ["laser", "laser", "laser", "laser"],
      turns: ["laser", "laser", "laser"],
    });

    expect(game.state.phase).toBe("ended");
    expect(game.state.overlayTitle).toBe("ПЕРЕГРЕВ");
    expect(game.state.heat).toBe(15);
  });
});

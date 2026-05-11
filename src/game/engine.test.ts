import { describe, expect, it } from "vitest";
import { createGame } from "./engine";
import { playCardById, runScenario } from "./scenario";
import { HAND_SIZE } from "./data";
import { cardDb } from "./cards/registry";

describe("game engine", () => {
  it("plays a seeded run and advances to the next stage deterministically", () => {
    const game = runScenario({
      seed: 1,
      deck: [
        { id: "clamp" },
        { id: "clamp" },
        { id: "clamp" },
        { id: "clamp" },
        { id: "clamp" },
        { id: "clamp" },
        { id: "clamp" },
        { id: "clamp" },
      ],
      steps: ["clamp", "clamp", "clamp", "clamp", "clamp", "clamp", "clamp", "clamp"],
      rewardIndex: 0,
    });

    expect(game.state.stage).toBe(2);
    expect(game.state.phase).toBe("combat");
    expect(game.state.hp).toBeGreaterThan(0);
    expect(game.state.heat).toBeLessThan(10);
    expect(game.state.defect?.id).toBe("ice");
  });

  it("applies reward upgrades back into the run deck", () => {
    const game = createGame({
      seed: 7,
      deck: [
        { id: "clamp" },
        { id: "clamp" },
        { id: "clamp" },
        { id: "clamp" },
        { id: "clamp" },
        { id: "clamp" },
        { id: "clamp" },
        { id: "clamp" },
      ],
      stage: 1,
    });

    for (let index = 0; index < 8; index += 1) {
      playCardById(game, "clamp");
    }

    expect(game.state.phase).toBe("reward");
    const upgradeIndex = game.state.pendingRewards.findIndex((reward) => reward.kind === "upgrade");
    expect(upgradeIndex).toBeGreaterThanOrEqual(0);

    game.chooseReward(upgradeIndex);

    expect(game.state.phase).toBe("combat");
    expect(game.state.stage).toBe(2);
    expect(game.state.deck.some((card) => card.id === "clamp" && card.upgraded)).toBe(true);
  });

  it("tracks reward cards so they can be saved after death", () => {
    const game = createGame({
      seed: 11,
      deck: [{ id: "laser" }, { id: "laser" }, { id: "laser" }, { id: "laser" }],
      modules: [],
      stage: 1,
    });

    game.state.phase = "reward";
    game.state.pendingRewards = [
      { kind: "card", icon: "🧪", name: "TEST CARD", desc: "test", cardId: "laser" },
    ];

    game.chooseReward(0);

    expect(game.state.acquiredCards).toHaveLength(1);
    expect(game.state.acquiredCards[0].id).toBe("laser");
    expect(game.state.deck.some((card) => card.id === "laser")).toBe(true);
  });

  it("reshuffles the discard pile when the draw pile is empty", () => {
    const game = createGame({
      seed: 12,
      deck: [{ id: "clamp" }, { id: "scan" }, { id: "cool" }],
      modules: [],
      stage: 1,
    });

    game.state.drawPile = [];
    game.state.discard = [{ id: "clamp" }, { id: "scan" }, { id: "cool" }];
    game.state.hand = [];

    game.resolveEnemyTurn();

    expect(game.state.hand.length).toBeGreaterThan(0);
    expect(game.state.discard.length).toBe(0);
  });

  it("applies heat handling and radiator save deterministically", () => {
    const game = createGame({
      seed: 3,
      deck: [{ id: "laser" }, { id: "laser" }, { id: "laser" }],
      modules: ["radiator"],
      stage: 1,
    });

    playCardById(game, "laser");
    playCardById(game, "laser");
    playCardById(game, "laser");

    expect(game.state.heat).toBeLessThanOrEqual(10);
    expect(game.state.radiatorUsed).toBe(true);
  });

  it("ends the run immediately when a card overheats the tool", () => {
    const game = createGame({
      seed: 19,
      deck: [{ id: "laser" }, { id: "laser" }, { id: "laser" }],
      modules: [],
      stage: 1,
    });

    game.state.hand = [{ id: "laser" }];
    game.state.drawPile = [];
    game.state.discard = [];
    game.state.heat = 5;

    game.playCard(0);

    expect(game.state.phase).toBe("ended");
    expect(game.state.endReason).toBe("death");
    expect(game.state.overlayTitle).toBe("ПЕРЕГРЕВ");
    expect(game.state.heat).toBe(10);
  });

  it("applies spark heat to repair cards even when they have no heat effect", () => {
    const game = createGame({
      seed: 21,
      deck: [{ id: "clamp" }],
      modules: [],
      stage: 3,
    });

    game.state.hand = [{ id: "clamp" }];
    game.state.drawPile = [];
    game.state.discard = [];

    game.playCard(0);

    expect(game.state.heat).toBe(1);
  });

  it("does not let draw effects create hidden cards past the hand limit", () => {
    const game = createGame({
      seed: 31,
      deck: [{ id: "diagnose" }, { id: "clamp" }, { id: "clamp" }, { id: "clamp" }],
      modules: [],
      stage: 1,
    });

    game.state.hand = [{ id: "diagnose" }, { id: "clamp" }, { id: "clamp" }];
    game.state.drawPile = [{ id: "clamp" }, { id: "clamp" }];
    game.state.discard = [];

    game.playCard(0);

    expect(game.state.hand.length).toBe(HAND_SIZE);
  });

  it("applies the boss shield only to the first repair hit in the cycle", () => {
    const game = createGame({
      seed: 41,
      deck: [{ id: "clamp" }, { id: "clamp" }],
      modules: [],
      stage: 5,
    });

    game.state.hand = [{ id: "clamp" }, { id: "clamp" }];
    game.state.drawPile = [];
    game.state.discard = [];

    game.playCard(0);
    expect(game.state.hp).toBe(game.state.maxHp - 1);
    expect(game.state.bossShieldUsed).toBe(true);

    game.playCard(0);
    expect(game.state.hp).toBe(game.state.maxHp - 4);
  });

  it("keeps bad battery scoped to repair cards", () => {
    const original = cardDb.clamp;
    try {
      (cardDb as any).clamp = {
        ...original,
        tags: ["utility"],
        logic: original.logic,
      };

      const game = createGame({
        seed: 51,
        deck: [{ id: "clamp" }],
        modules: ["badbattery"],
        stage: 1,
      });

      game.state.hand = [{ id: "clamp" }];
      game.state.drawPile = [];
      game.state.discard = [];

      game.playCard(0);

      expect(game.state.hp).toBe(game.state.maxHp - 3);
    } finally {
      (cardDb as any).clamp = original;
    }
  });
});

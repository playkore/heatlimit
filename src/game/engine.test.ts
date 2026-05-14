import { describe, expect, it } from "vitest";
import { createGame } from "./engine";
import { playCardById, runScenario } from "./scenario";
import { HAND_SIZE } from "./data";
import { createSequenceRng } from "./rng";

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

  it("adds a rewarded card back into the run deck", () => {
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
    expect(game.state.pendingRewards[0]?.kind).toBe("card");

    game.chooseReward(0);

    expect(game.state.phase).toBe("combat");
    expect(game.state.stage).toBe(2);
    expect(game.state.deck.length).toBe(9);
    expect(game.state.acquiredCards).toHaveLength(1);
  });

  it("does not duplicate cards in the reward window", () => {
    const game = createGame({
      seed: 7,
      rng: createSequenceRng(Array.from({ length: 64 }, () => 0)),
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
    expect(game.state.pendingRewards).toHaveLength(3);
    expect(new Set(game.state.pendingRewards.map((reward) => reward.cardId)).size).toBe(3);
  });

  it("allows skipping the reward without adding a new card", () => {
    const game = createGame({
      seed: 17,
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
    const deckSize = game.state.deck.length;

    game.skipReward();

    expect(game.state.phase).toBe("combat");
    expect(game.state.stage).toBe(2);
    expect(game.state.deck.length).toBe(deckSize);
    expect(game.state.acquiredCards).toHaveLength(0);
  });

  it("tracks reward cards so they can be saved after death", () => {
    const game = createGame({
      seed: 11,
      deck: [{ id: "laser" }, { id: "laser" }, { id: "laser" }, { id: "laser" }],
      stage: 1,
    });

    game.state.phase = "reward";
    game.state.pendingRewards = [
      { kind: "card", description: "Тестовая карта", name: "TEST CARD", desc: "test", cardId: "laser" },
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
      stage: 1,
    });

    game.state.drawPile = [];
    game.state.discard = [{ id: "clamp" }, { id: "scan" }, { id: "cool" }];
    game.state.hand = [];

    game.resolveEnemyTurn();

    expect(game.state.hand.length).toBeGreaterThan(0);
    expect(game.state.discard.length).toBe(0);
  });

  it("ends the run immediately when a card overheats the tool", () => {
    const game = createGame({
      seed: 19,
      deck: [{ id: "laser" }, { id: "laser" }, { id: "laser" }],
      stage: 1,
    });

    game.state.hand = [{ id: "laser" }];
    game.state.drawPile = [];
    game.state.discard = [];
    game.state.heat = 10;

    game.playCard(0);

    expect(game.state.phase).toBe("ended");
    expect(game.state.endReason).toBe("death");
    expect(game.state.overlayTitle).toBe("ПЕРЕГРЕВ");
    expect(game.state.heat).toBe(15);
  });

  it("applies spark heat to repair cards even when they have no heat effect", () => {
    const game = createGame({
      seed: 21,
      deck: [{ id: "clamp" }],
      stage: 3,
    });

    game.state.hand = [{ id: "clamp" }];
    game.state.drawPile = [];
    game.state.discard = [];

    game.playCard(0);

    expect(game.state.heat).toBe(1);
  });

  it("applies the scan bonus to the next repair card in the same hand", () => {
    const game = createGame({
      seed: 27,
      deck: [{ id: "scan" }, { id: "clamp" }, { id: "clamp" }, { id: "clamp" }],
      stage: 1,
    });

    game.state.hand = [{ id: "scan" }, { id: "clamp" }];
    game.state.drawPile = [{ id: "clamp" }, { id: "clamp" }, { id: "clamp" }];
    game.state.discard = [];

    game.playCard(0);

    expect(game.state.effects).toHaveLength(1);
    expect(game.state.effects[0]?.toView().description).toBe("Следующий ремонт удваивается");

    game.playCard(0);

    expect(game.state.effects).toHaveLength(0);
    expect(game.state.hp).toBe(game.state.maxHp - 6);
  });

  it("repeats the next card when relay is active", () => {
    const game = createGame({
      seed: 30,
      deck: [{ id: "relay" }, { id: "clamp" }],
      stage: 1,
    });

    game.state.hand = [{ id: "relay" }, { id: "clamp" }];
    game.state.drawPile = [];
    game.state.discard = [];

    game.playCard(0);
    game.playCard(0);

    expect(game.state.hp).toBe(game.state.maxHp - 6);
  });

  it("does not let draw effects create hidden cards past the hand limit", () => {
    const game = createGame({
      seed: 31,
      deck: [{ id: "diagnose" }, { id: "clamp" }, { id: "clamp" }, { id: "clamp" }],
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

  it("allows debug deck edits during combat", () => {
    const game = createGame({
      seed: 51,
      deck: [{ id: "clamp" }, { id: "scan" }, { id: "cool" }],
      stage: 1,
    });

    const startingDeckSize = game.state.deck.length;

    expect(game.debugAddCard("laser")).toBe(true);
    expect(game.state.deck).toHaveLength(startingDeckSize + 1);
    expect(game.state.deck.at(-1)?.id).toBe("laser");
    expect(game.state.drawPile.some((card) => card.id === "laser")).toBe(true);

    const laserIndex = game.state.deck.findIndex((card) => card.id === "laser");

    expect(game.debugRemoveCard(laserIndex)).toBe(true);
    expect(game.state.deck.some((card) => card.id === "laser")).toBe(false);
    expect(game.state.drawPile.some((card) => card.id === "laser")).toBe(false);
  });

});

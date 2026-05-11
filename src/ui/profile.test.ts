import { describe, expect, it } from "vitest";
import { appendSavedCard, buildStartingDeck, clearProfile, createDefaultProfile, loadProfile, saveProfile } from "./profile";
import { initialDeck } from "../game/cards/registry";

function createStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));

  return {
    getItem(key: string): string | null {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      data.set(key, value);
    },
    removeItem(key: string): void {
      data.delete(key);
    },
  };
}

describe("profile storage", () => {
  it("loads the default profile when storage is empty or invalid", () => {
    expect(loadProfile(createStorage())).toEqual(createDefaultProfile());
    expect(loadProfile(createStorage({ "heat-limit.profile.v1": "not json" }))).toEqual(createDefaultProfile());
  });

  it("persists saved cards and run number", () => {
    const storage = createStorage();
    const profile = {
      version: 1 as const,
      runNumber: 4,
      savedCards: [{ id: "laser" as const }, { id: "clamp" as const, upgraded: true }],
    };

    saveProfile(storage, profile);

    expect(loadProfile(storage)).toEqual(profile);
  });

  it("keeps saved cards capped at the base deck size", () => {
    const profile = {
      version: 1 as const,
      runNumber: 2,
      savedCards: Array.from({ length: initialDeck.length }, (_, index) => ({
        id: index % 2 === 0 ? ("laser" as const) : ("clamp" as const),
      })),
    };

    const next = appendSavedCard(profile, { id: "scan" });

    expect(next.savedCards).toHaveLength(initialDeck.length);
    expect(next.savedCards[0].id).toBe(profile.savedCards[1].id);
    expect(next.savedCards[next.savedCards.length - 1]?.id).toBe("scan");
  });

  it("trims overflowed saved cards on load and save", () => {
    const overflowProfile = {
      version: 1 as const,
      runNumber: 3,
      savedCards: Array.from({ length: initialDeck.length + 3 }, (_, index) => ({
        id: index % 2 === 0 ? ("laser" as const) : ("clamp" as const),
      })),
    };
    const storage = createStorage();

    saveProfile(storage, overflowProfile);

    const loaded = loadProfile(storage);
    expect(loaded.savedCards).toHaveLength(initialDeck.length);
    expect(loaded.savedCards[0].id).toBe(overflowProfile.savedCards[3].id);
    expect(loaded.savedCards[loaded.savedCards.length - 1]?.id).toBe(
      overflowProfile.savedCards[overflowProfile.savedCards.length - 1]?.id,
    );
  });

  it("builds a starting deck from the base deck plus saved cards", () => {
    const deck = buildStartingDeck({
      version: 1,
      runNumber: 2,
      savedCards: [{ id: "laser" }, { id: "clamp", upgraded: true }],
    });

    expect(deck.map((card) => `${card.id}${card.upgraded ? "+" : ""}`)).toEqual([
      "clamp",
      "clamp",
      "clamp",
      "scan",
      "scan",
      "cool",
      "cool",
      "patch",
      "weld",
      "laser",
      "clamp+",
    ]);
  });

  it("clears stored progress", () => {
    const storage = createStorage({ "heat-limit.profile.v1": JSON.stringify(createDefaultProfile()) });

    clearProfile(storage);

    expect(storage.getItem("heat-limit.profile.v1")).toBeNull();
  });
});

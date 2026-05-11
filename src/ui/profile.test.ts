import { describe, expect, it } from "vitest";
import { buildStartingDeck, createDefaultProfile, loadProfile, saveProfile } from "./profile";

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
});

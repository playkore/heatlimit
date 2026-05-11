import { cardDb, initialDeck, type CardId } from "../game/cards/registry";
import { cloneCard, type DeckCard } from "../game/cards/helpers";

export interface PersistentProfile {
  version: 1;
  runNumber: number;
  savedCards: DeckCard[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const STORAGE_KEY = "heat-limit.profile.v1";
const PROFILE_VERSION = 1;

export function createDefaultProfile(): PersistentProfile {
  return {
    version: PROFILE_VERSION,
    runNumber: 1,
    savedCards: [],
  };
}

export function loadProfile(storage: StorageLike): PersistentProfile {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultProfile();
    }

    const parsed: unknown = JSON.parse(raw);
    return normalizeProfile(parsed);
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(storage: StorageLike, profile: PersistentProfile): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(normalizeProfile(profile)));
}

export function clearProfile(storage: StorageLike): void {
  storage.removeItem(STORAGE_KEY);
}

export function appendSavedCard(profile: PersistentProfile, card: DeckCard): PersistentProfile {
  return {
    ...profile,
    savedCards: [...profile.savedCards, cloneCard(card)],
  };
}

export function buildStartingDeck(profile: PersistentProfile): DeckCard[] {
  return [...initialDeck.map(cloneCard), ...profile.savedCards.map(cloneCard)];
}

function normalizeProfile(value: unknown): PersistentProfile {
  if (!isRecord(value) || value.version !== PROFILE_VERSION) {
    return createDefaultProfile();
  }

  const runNumber = normalizePositiveInteger(value.runNumber, 1);
  const savedCards = Array.isArray(value.savedCards) ? value.savedCards.map(normalizeDeckCard).filter(isDeckCard) : [];

  return {
    version: PROFILE_VERSION,
    runNumber,
    savedCards,
  };
}

function normalizeDeckCard(value: unknown): DeckCard | null {
  if (!isRecord(value) || typeof value.id !== "string" || !(value.id in cardDb)) {
    return null;
  }

  const cardId = value.id as CardId;
  return {
    id: cardId,
    upgraded: value.upgraded === true ? true : undefined,
  };
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return fallback;
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDeckCard(value: DeckCard | null): value is DeckCard {
  return value !== null;
}

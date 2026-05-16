import type { StorageLike } from "../ui/profile";
import { createDefaultWorldMap, WORLD_HEIGHT, WORLD_TILE_SIZE, WORLD_VERSION, WORLD_WIDTH, type BuildingInstance, type TileId, type WorldMap } from "./data";
import { isBuildingState, isBuildingType, isTileId } from "./world-state";

export const WORLD_STORAGE_KEY = "heat-limit.world.v1";

interface SerializedWorldMap {
  version: number;
  width: number;
  height: number;
  tileSize: number;
  tiles: unknown[];
  buildings: unknown[];
}

export function saveWorldMap(storage: StorageLike, map: WorldMap): void {
  storage.setItem(WORLD_STORAGE_KEY, JSON.stringify(normalizeWorldMap(map)));
}

export function loadWorldMap(storage: StorageLike): WorldMap {
  try {
    const raw = storage.getItem(WORLD_STORAGE_KEY);
    if (!raw) {
      return createDefaultWorldMap();
    }

    const parsed: unknown = JSON.parse(raw);
    return normalizeLoadedWorldMap(parsed);
  } catch {
    return createDefaultWorldMap();
  }
}

export function clearWorldMap(storage: StorageLike): void {
  storage.removeItem(WORLD_STORAGE_KEY);
}

function normalizeLoadedWorldMap(value: unknown): WorldMap {
  if (!isSerializedWorldMap(value) || value.version !== WORLD_VERSION) {
    return createDefaultWorldMap();
  }

  const width = normalizePositiveInteger(value.width, WORLD_WIDTH);
  const height = normalizePositiveInteger(value.height, WORLD_HEIGHT);
  const tileSize = normalizePositiveInteger(value.tileSize, WORLD_TILE_SIZE);
  const defaultMap = createDefaultWorldMap();
  const tiles = normalizeTiles(value.tiles, width, height, defaultMap.tiles);
  const buildings = normalizeBuildings(value.buildings);

  return {
    width,
    height,
    tileSize,
    tiles,
    buildings,
  };
}

function normalizeWorldMap(map: WorldMap): WorldMap {
  const defaultMap = createDefaultWorldMap();
  return {
    width: normalizePositiveInteger(map.width, defaultMap.width),
    height: normalizePositiveInteger(map.height, defaultMap.height),
    tileSize: normalizePositiveInteger(map.tileSize, defaultMap.tileSize),
    tiles: normalizeTiles(map.tiles, map.width, map.height, defaultMap.tiles),
    buildings: normalizeBuildings(map.buildings),
  };
}

function normalizeTiles(tiles: unknown, width: number, height: number, fallback: readonly TileId[]): TileId[] {
  const expectedLength = width * height;
  if (!Array.isArray(tiles)) {
    return [...fallback.slice(0, expectedLength)] as TileId[];
  }

  const next = Array.from({ length: expectedLength }, (_, index) => {
    const value = tiles[index];
    return isTileId(value) ? value : fallback[index] ?? "grass";
  });

  return next as TileId[];
}

function normalizeBuildings(buildings: unknown): BuildingInstance[] {
  if (!Array.isArray(buildings)) {
    return createDefaultWorldMap().buildings.map((building) => ({ ...building }));
  }

  const next: BuildingInstance[] = [];
  for (const value of buildings) {
    if (!isWorldBuilding(value)) {
      continue;
    }

    next.push({
      id: value.id,
      type: value.type,
      x: normalizeInteger(value.x, 0),
      y: normalizeInteger(value.y, 0),
      state: value.state,
    });
  }

  return next.length > 0 ? next : createDefaultWorldMap().buildings.map((building) => ({ ...building }));
}

function isSerializedWorldMap(value: unknown): value is SerializedWorldMap {
  return typeof value === "object" && value !== null;
}

function isWorldBuilding(value: unknown): value is BuildingInstance {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    isBuildingType(candidate.type) &&
    typeof candidate.x === "number" &&
    typeof candidate.y === "number" &&
    isBuildingState(candidate.state)
  );
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return fallback;
  }

  return value;
}

function normalizeInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return fallback;
  }

  return value;
}

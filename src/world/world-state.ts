import {
  BUILDING_STATES,
  BUILDING_TYPES,
  TILE_IDS,
  type BuildingInstance,
  type BuildingState,
  type BuildingType,
  type TileId,
  type WorldMap,
} from "./data";

export interface WorldTilePoint {
  x: number;
  y: number;
}

export function cloneWorldMap(map: WorldMap): WorldMap {
  return {
    width: map.width,
    height: map.height,
    tileSize: map.tileSize,
    tiles: [...map.tiles],
    buildings: map.buildings.map((building) => ({ ...building })),
  };
}

export function isTileId(value: unknown): value is TileId {
  return typeof value === "string" && (TILE_IDS as readonly string[]).includes(value);
}

export function isBuildingType(value: unknown): value is BuildingType {
  return typeof value === "string" && (BUILDING_TYPES as readonly string[]).includes(value);
}

export function isBuildingState(value: unknown): value is BuildingState {
  return typeof value === "string" && (BUILDING_STATES as readonly string[]).includes(value);
}

export function getTileIndex(map: WorldMap, x: number, y: number): number {
  return y * map.width + x;
}

export function isWithinWorld(map: WorldMap, x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function getTileAt(map: WorldMap, x: number, y: number): TileId | null {
  if (!isWithinWorld(map, x, y)) {
    return null;
  }

  return map.tiles[getTileIndex(map, x, y)] ?? null;
}

export function paintTile(map: WorldMap, x: number, y: number, tileId: TileId): WorldMap {
  if (!isWithinWorld(map, x, y)) {
    return map;
  }

  const next = cloneWorldMap(map);
  next.tiles[getTileIndex(next, x, y)] = tileId;
  return next;
}

export function getBuildingById(map: WorldMap, buildingId: string): BuildingInstance | null {
  return map.buildings.find((building) => building.id === buildingId) ?? null;
}

export function setBuildingState(map: WorldMap, buildingId: string, state: BuildingState): WorldMap {
  const index = map.buildings.findIndex((building) => building.id === buildingId);
  if (index < 0) {
    return map;
  }

  if (map.buildings[index]?.state === state) {
    return map;
  }

  const next = cloneWorldMap(map);
  if (next.buildings[index]) {
    next.buildings[index] = { ...next.buildings[index], state };
  }
  return next;
}

export function toggleBuildingState(map: WorldMap, buildingId: string): WorldMap {
  const building = getBuildingById(map, buildingId);
  if (!building) {
    return map;
  }

  return setBuildingState(map, buildingId, building.state === "ruined" ? "repaired" : "ruined");
}

export function placeBuilding(map: WorldMap, building: BuildingInstance): WorldMap {
  if (!isBuildingType(building.type) || !isBuildingState(building.state)) {
    return map;
  }

  const next = cloneWorldMap(map);
  const nextBuilding = { ...building };
  const existingIndex = next.buildings.findIndex((entry) => entry.id === nextBuilding.id);
  if (existingIndex >= 0) {
    next.buildings[existingIndex] = nextBuilding;
  } else {
    next.buildings.push(nextBuilding);
  }

  return next;
}

export function eraseBuilding(map: WorldMap, buildingId: string): WorldMap {
  if (!map.buildings.some((building) => building.id === buildingId)) {
    return map;
  }

  const next = cloneWorldMap(map);
  next.buildings = next.buildings.filter((building) => building.id !== buildingId);
  return next;
}

export function findFirstRuinedBuilding(map: WorldMap): BuildingInstance | null {
  return map.buildings.find((building) => building.state === "ruined") ?? null;
}

export function createNextBuildingId(map: WorldMap, type: BuildingType): string {
  const base = `${type}-`;
  let index = map.buildings.filter((building) => building.type === type && building.id.startsWith(base)).length + 1;
  let candidate = `${base}${index}`;

  while (map.buildings.some((building) => building.id === candidate)) {
    index += 1;
    candidate = `${base}${index}`;
  }

  return candidate;
}

export function moveBuilding(map: WorldMap, buildingId: string, point: WorldTilePoint): WorldMap {
  const index = map.buildings.findIndex((building) => building.id === buildingId);
  if (index < 0) {
    return map;
  }

  const current = map.buildings[index];
  if (!current || (current.x === point.x && current.y === point.y)) {
    return map;
  }

  const next = cloneWorldMap(map);
  next.buildings[index] = { ...current, x: point.x, y: point.y };
  return next;
}

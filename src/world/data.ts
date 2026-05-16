export const TILE_IDS = [
  "grass",
  "dirt",
  "road-horizontal",
  "road-vertical",
  "road-cross",
  "concrete",
  "crater",
] as const;

export type TileId = (typeof TILE_IDS)[number];

export const BUILDING_TYPES = ["radar", "barracks", "factory", "turret", "power"] as const;

export type BuildingType = (typeof BUILDING_TYPES)[number];

export const BUILDING_STATES = ["ruined", "repaired"] as const;

export type BuildingState = (typeof BUILDING_STATES)[number];

export interface BuildingInstance {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  state: BuildingState;
}

export interface WorldMap {
  width: number;
  height: number;
  tileSize: number;
  tiles: TileId[];
  buildings: BuildingInstance[];
}

export const WORLD_VERSION = 1;
export const WORLD_WIDTH = 32;
export const WORLD_HEIGHT = 32;
export const WORLD_TILE_SIZE = 16;

const DEFAULT_BUILDINGS: BuildingInstance[] = [
  { id: "radar-1", type: "radar", x: 6, y: 6, state: "ruined" },
  { id: "barracks-1", type: "barracks", x: 23, y: 7, state: "repaired" },
  { id: "power-1", type: "power", x: 16, y: 10, state: "repaired" },
  { id: "factory-1", type: "factory", x: 24, y: 24, state: "ruined" },
  { id: "turret-1", type: "turret", x: 8, y: 24, state: "repaired" },
  { id: "factory-2", type: "factory", x: 17, y: 21, state: "ruined" },
];

export function createDefaultWorldMap(): WorldMap {
  const width = WORLD_WIDTH;
  const height = WORLD_HEIGHT;
  const tileSize = WORLD_TILE_SIZE;
  const tiles: TileId[] = Array.from({ length: width * height }, () => "grass");

  const setTile = (x: number, y: number, tileId: TileId): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    tiles[y * width + x] = tileId;
  };

  const paintDisk = (cx: number, cy: number, radius: number, tileId: TileId): void => {
    for (let y = cy - radius; y <= cy + radius; y += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          setTile(x, y, tileId);
        }
      }
    }
  };

  const paintRect = (x1: number, y1: number, x2: number, y2: number, tileId: TileId): void => {
    for (let y = y1; y <= y2; y += 1) {
      for (let x = x1; x <= x2; x += 1) {
        setTile(x, y, tileId);
      }
    }
  };

  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);

  paintRect(0, centerY - 1, width - 1, centerY + 1, "road-horizontal");
  paintRect(centerX - 1, 0, centerX + 1, height - 1, "road-vertical");

  paintRect(4, 4, 9, 9, "dirt");
  paintRect(20, 5, 27, 10, "dirt");
  paintRect(6, 20, 12, 27, "dirt");
  paintRect(20, 20, 28, 28, "dirt");

  paintDisk(4, 5, 1, "crater");
  paintDisk(27, 8, 1, "crater");
  paintDisk(11, 24, 2, "crater");
  paintDisk(20, 24, 1, "crater");
  paintDisk(15, 15, 2, "crater");

  const concretePads: Array<[number, number]> = [
    [6, 6],
    [23, 7],
    [16, 10],
    [24, 24],
    [8, 24],
    [17, 21],
  ];

  for (const [x, y] of concretePads) {
    paintRect(x - 1, y - 1, x + 1, y + 1, "concrete");
  }

  setTile(centerX, centerY, "road-cross");

  return {
    width,
    height,
    tileSize,
    tiles,
    buildings: DEFAULT_BUILDINGS.map((building) => ({ ...building })),
  };
}

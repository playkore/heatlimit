import { describe, expect, it } from "vitest";
import { createDefaultWorldMap } from "./data";
import { clearWorldMap, loadWorldMap, saveWorldMap } from "./world-assets";
import { createDefaultWorldEditorState, applyEditorAction } from "./world-editor";
import { eraseBuilding, paintTile, placeBuilding, setBuildingState, toggleBuildingState, getBuildingById } from "./world-state";

function createStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));

  return {
    get length() {
      return map.size;
    },
    clear(): void {
      map.clear();
    },
    getItem(key: string): string | null {
      return map.get(key) ?? null;
    },
    key(index: number): string | null {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string): void {
      map.delete(key);
    },
    setItem(key: string, value: string): void {
      map.set(key, value);
    },
  };
}

describe("world state", () => {
  it("creates a default world map", () => {
    const map = createDefaultWorldMap();

    expect(map.width).toBe(32);
    expect(map.height).toBe(32);
    expect(map.tileSize).toBe(16);
    expect(map.tiles).toHaveLength(32 * 32);
    expect(map.buildings.length).toBeGreaterThanOrEqual(5);
    expect(map.tiles.includes("road-cross")).toBe(true);
  });

  it("changes building state immutably", () => {
    const map = createDefaultWorldMap();
    const original = getBuildingById(map, "factory-1");

    const repaired = setBuildingState(map, "factory-1", "repaired");
    const updated = getBuildingById(repaired, "factory-1");

    expect(original?.state).toBe("ruined");
    expect(updated?.state).toBe("repaired");
    expect(repaired).not.toBe(map);
    expect(map).toBe(map);
  });

  it("toggles building state", () => {
    const map = createDefaultWorldMap();
    const next = toggleBuildingState(map, "barracks-1");

    expect(getBuildingById(map, "barracks-1")?.state).toBe("repaired");
    expect(getBuildingById(next, "barracks-1")?.state).toBe("ruined");
  });

  it("paints tiles without mutating the original map", () => {
    const map = createDefaultWorldMap();
    const next = paintTile(map, 2, 3, "crater");

    expect(map.tiles[3 * map.width + 2]).not.toBe("crater");
    expect(next.tiles[3 * next.width + 2]).toBe("crater");
  });

  it("places and erases buildings immutably", () => {
    const map = createDefaultWorldMap();
    const next = placeBuilding(map, {
      id: "test-factory",
      type: "factory",
      x: 12,
      y: 12,
      state: "ruined",
    });
    const removed = eraseBuilding(next, "test-factory");

    expect(getBuildingById(next, "test-factory")).not.toBeNull();
    expect(getBuildingById(removed, "test-factory")).toBeNull();
  });

  it("applies editor actions to tiles and buildings", () => {
    const map = createDefaultWorldMap();

    const painted = applyEditorAction(
      map,
      {
        ...createDefaultWorldEditorState(),
        tool: "paint-tile",
        tileId: "crater",
      },
      { x: 1, y: 1 },
    );
    const toggled = applyEditorAction(
      map,
      {
        ...createDefaultWorldEditorState(),
        tool: "toggle-building",
      },
      { x: 23, y: 7 },
    );

    expect(painted.tiles[1 * painted.width + 1]).toBe("crater");
    expect(getBuildingById(toggled, "barracks-1")?.state).toBe("ruined");
  });

  it("returns the default map for broken storage data", () => {
    const storage = createStorage({ "heat-limit.world.v1": "{ not json" });

    expect(loadWorldMap(storage).width).toBe(32);
  });

  it("saves and loads the world map", () => {
    const storage = createStorage();
    const map = createDefaultWorldMap();

    saveWorldMap(storage, map);
    const loaded = loadWorldMap(storage);

    expect(loaded.width).toBe(map.width);
    expect(loaded.height).toBe(map.height);
    expect(loaded.buildings).toHaveLength(map.buildings.length);

    clearWorldMap(storage);
    expect(loadWorldMap(storage).width).toBe(32);
  });
});

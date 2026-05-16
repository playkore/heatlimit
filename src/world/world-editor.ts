import type { BuildingType, TileId, WorldMap } from "./data";
import { createNextBuildingId, eraseBuilding, paintTile, placeBuilding, toggleBuildingState } from "./world-state";

export type EditorTool = "pan" | "paint-tile" | "place-building" | "toggle-building" | "erase-building";

export interface WorldEditorState {
  tool: EditorTool;
  tileId: TileId;
  buildingType: BuildingType;
}

export function createDefaultWorldEditorState(): WorldEditorState {
  return {
    tool: "pan",
    tileId: "grass",
    buildingType: "factory",
  };
}

export function applyEditorAction(
  map: WorldMap,
  state: WorldEditorState,
  point: { x: number; y: number },
): WorldMap {
  if (state.tool === "paint-tile") {
    return paintTile(map, point.x, point.y, state.tileId);
  }

  if (state.tool === "toggle-building") {
    const target = map.buildings.find((building) => building.x === point.x && building.y === point.y);
    return target ? toggleBuildingState(map, target.id) : map;
  }

  if (state.tool === "erase-building") {
    const target = map.buildings.find((building) => building.x === point.x && building.y === point.y);
    return target ? eraseBuilding(map, target.id) : map;
  }

  if (state.tool === "place-building") {
    const nextBuilding = {
      id: createNextBuildingId(map, state.buildingType),
      type: state.buildingType,
      x: point.x,
      y: point.y,
      state: "ruined" as const,
    };
    return placeBuilding(map, nextBuilding);
  }

  return map;
}

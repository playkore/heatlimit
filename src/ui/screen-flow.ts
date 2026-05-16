import { setBuildingState } from "../world/world-state";
import type { BuildingInstance, WorldMap } from "../world/data";

export type AppScreen = "map" | "battle";

export interface ScreenFlowState {
  screen: AppScreen;
  selectedBuildingId: string | null;
  activeBattleBuildingId: string | null;
}

export function createInitialScreenFlowState(): ScreenFlowState {
  return {
    screen: "map",
    selectedBuildingId: null,
    activeBattleBuildingId: null,
  };
}

export function beginBattleForBuilding(state: ScreenFlowState, building: BuildingInstance): ScreenFlowState {
  return {
    ...state,
    screen: "battle",
    selectedBuildingId: building.id,
    activeBattleBuildingId: building.id,
  };
}

export function returnToMapAfterBattle(state: ScreenFlowState): ScreenFlowState {
  return {
    ...state,
    screen: "map",
    activeBattleBuildingId: null,
  };
}

export function resolveVictoryToMap(
  state: ScreenFlowState,
  map: WorldMap,
  buildingId: string | null,
): { state: ScreenFlowState; map: WorldMap } {
  const repairedMap = buildingId ? setBuildingState(map, buildingId, "repaired") : map;
  return {
    state: returnToMapAfterBattle(state),
    map: repairedMap,
  };
}

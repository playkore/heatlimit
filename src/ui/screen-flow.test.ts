import { describe, expect, it } from "vitest";
import { createDefaultWorldMap, type BuildingInstance } from "../world/data";
import { beginBattleForBuilding, createInitialScreenFlowState, resolveVictoryToMap, returnToMapAfterBattle } from "./screen-flow";

describe("screen flow", () => {
  it("starts on the map screen", () => {
    const state = createInitialScreenFlowState();

    expect(state.screen).toBe("map");
    expect(state.selectedBuildingId).toBeNull();
    expect(state.activeBattleBuildingId).toBeNull();
  });

  it("switches to battle when a building is selected", () => {
    const state = beginBattleForBuilding(createInitialScreenFlowState(), {
      id: "factory-1",
      type: "factory",
      x: 10,
      y: 10,
      state: "ruined",
    } satisfies BuildingInstance);

    expect(state.screen).toBe("battle");
    expect(state.selectedBuildingId).toBe("factory-1");
    expect(state.activeBattleBuildingId).toBe("factory-1");
  });

  it("returns to the map after battle", () => {
    const state = returnToMapAfterBattle({
      screen: "battle",
      selectedBuildingId: "factory-1",
      activeBattleBuildingId: "factory-1",
    });

    expect(state.screen).toBe("map");
    expect(state.selectedBuildingId).toBe("factory-1");
    expect(state.activeBattleBuildingId).toBeNull();
  });

  it("repairs the selected building on victory and returns to the map", () => {
    const map = createDefaultWorldMap();
    const result = resolveVictoryToMap(
      {
        screen: "battle",
        selectedBuildingId: "factory-1",
        activeBattleBuildingId: "factory-1",
      },
      map,
      "factory-1",
    );

    expect(result.state.screen).toBe("map");
    expect(result.map.buildings.find((building) => building.id === "factory-1")?.state).toBe("repaired");
  });
});

import { bossDefect } from "../game/defects/boss";
import { iceDefect } from "../game/defects/ice";
import { leakDefect } from "../game/defects/leak";
import { sparkDefect } from "../game/defects/spark";
import type { DefectInstance } from "../game/data";
import type { BuildingInstance, BuildingType } from "./data";

const BUILDING_DEFECTS: Record<BuildingType, { id: string; title: string; emoji: string; baseHp: number; heatPerCycle: number; text: string; subtitle: string; boss?: boolean }> = {
  radar: iceDefect,
  barracks: leakDefect,
  factory: sparkDefect,
  turret: leakDefect,
  power: bossDefect,
};

export function createBuildingEncounter(building: BuildingInstance): DefectInstance {
  const defect = BUILDING_DEFECTS[building.type];
  return {
    ...defect,
    hp: defect.baseHp,
  };
}

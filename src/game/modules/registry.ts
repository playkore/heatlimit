import { arcModule } from "./arc";
import { autoscanModule } from "./autoscan";
import { badbatteryModule } from "./badbattery";
import { ceramicModule } from "./ceramic";
import { magnetModule } from "./magnet";
import { radiatorModule } from "./radiator";

export const modulesDb = {
  ceramic: ceramicModule,
  arc: arcModule,
  autoscan: autoscanModule,
  radiator: radiatorModule,
  magnet: magnetModule,
  badbattery: badbatteryModule,
} as const;

export type ModuleId = keyof typeof modulesDb;

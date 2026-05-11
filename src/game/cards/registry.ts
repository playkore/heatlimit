import { clampCard } from "./clamp";
import { coolCard } from "./cool";
import { cryoCard } from "./cryo";
import { diagnoseCard } from "./diagnose";
import { impulseCard } from "./impulse";
import { laserCard } from "./laser";
import { pasteCard } from "./paste";
import { patchCard } from "./patch";
import { scanCard } from "./scan";
import { strikeCard } from "./strike";
import { ventCard } from "./vent";
import { weldCard } from "./weld";
import type { CardDefinition } from "./api";

export const cardDb = {
  clamp: clampCard,
  scan: scanCard,
  cool: coolCard,
  patch: patchCard,
  weld: weldCard,
  vent: ventCard,
  strike: strikeCard,
  diagnose: diagnoseCard,
  paste: pasteCard,
  impulse: impulseCard,
  cryo: cryoCard,
  laser: laserCard,
} as const satisfies Record<string, CardDefinition>;

export type CardId = keyof typeof cardDb;

export const upgradeableIds: readonly CardId[] = [
  "clamp",
  "scan",
  "cool",
  "patch",
  "weld",
  "diagnose",
];

export const cardRewardPool: readonly CardId[] = [
  "vent",
  "strike",
  "diagnose",
  "paste",
  "impulse",
  "cryo",
  "laser",
  "cool",
  "patch",
  "weld",
  "scan",
  "clamp",
];

export const initialDeck: { id: CardId }[] = [
  { id: "clamp" },
  { id: "clamp" },
  { id: "clamp" },
  { id: "scan" },
  { id: "scan" },
  { id: "cool" },
  { id: "cool" },
  { id: "patch" },
  { id: "weld" },
];

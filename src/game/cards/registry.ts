import { bypassCard } from "./bypass";
import { condenserCard } from "./condenser";
import { clampCard } from "./clamp";
import { coolCard } from "./cool";
import { cryoPrepCard } from "./cryo-prep";
import { cryoCard } from "./cryo";
import { droneCard } from "./drone";
import { emergencyResetCard } from "./emergency-reset";
import { diagnoseCard } from "./diagnose";
import { focusCard } from "./focus";
import { impulseCard } from "./impulse";
import { isolentaCard } from "./isolenta";
import { laserCard } from "./laser";
import { magneticGrabCard } from "./magnetic-grab";
import { markingCard } from "./marking";
import { pasteCard } from "./paste";
import { patchCard } from "./patch";
import { redZoneCard } from "./red-zone";
import { relayCard } from "./relay";
import { resonanceCard } from "./resonance";
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
  focus: focusCard,
  "cryo-prep": cryoPrepCard,
  marking: markingCard,
  isolenta: isolentaCard,
  resonance: resonanceCard,
  drone: droneCard,
  "red-zone": redZoneCard,
  relay: relayCard,
  condenser: condenserCard,
  "emergency-reset": emergencyResetCard,
  "magnetic-grab": magneticGrabCard,
  bypass: bypassCard,
} as const satisfies Record<string, CardDefinition>;

export type CardId = keyof typeof cardDb;

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
  "focus",
  "cryo-prep",
  "marking",
  "isolenta",
  "resonance",
  "drone",
  "red-zone",
  "relay",
  "condenser",
  "emergency-reset",
  "magnetic-grab",
  "bypass",
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

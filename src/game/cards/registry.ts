import { clampCard } from "./clamp";
import { coolCard } from "./cool";
import { droneCard } from "./drone";
import { diagnoseCard } from "./diagnose";
import { impulseCard } from "./impulse";
import { laserCard } from "./laser";
import { markingCard } from "./marking";
import { patchCard } from "./patch";
import { redZoneCard } from "./red-zone";
import { relayCard } from "./relay";
import { radiatorCard } from "./radiator";
import { bypassCard } from "./bypass";
import { scanCard } from "./scan";
import { ventCard } from "./vent";
import { weldCard } from "./weld";
import type { CardDefinition } from "./api";

export const cardDb = {
  clamp: clampCard,
  scan: scanCard,
  cool: coolCard,
  patch: patchCard,
  diagnose: diagnoseCard,
  impulse: impulseCard,
  laser: laserCard,
  marking: markingCard,
  drone: droneCard,
  radiator: radiatorCard,
  bypass: bypassCard,
  "red-zone": redZoneCard,
  relay: relayCard,
  weld: weldCard,
  vent: ventCard,
} as const satisfies Record<string, CardDefinition>;

export type CardId = keyof typeof cardDb;

export const cardRewardPool: readonly CardId[] = [
  "scan",
  "clamp",
  "cool",
  "patch",
  "weld",
  "diagnose",
  "impulse",
  "laser",
  "drone",
  "radiator",
  "bypass",
  "red-zone",
  "relay",
  "marking",
  "vent",
];

export const initialDeck: { id: CardId }[] = [
  { id: "clamp" },
  { id: "clamp" },
  { id: "clamp" },
  { id: "scan" },
  { id: "cool" },
  { id: "patch" },
  { id: "patch" },
  { id: "weld" },
];

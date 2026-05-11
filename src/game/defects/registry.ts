import { bossDefect } from "./boss";
import { iceDefect } from "./ice";
import { leakDefect } from "./leak";
import { sparkDefect } from "./spark";

export const regularDefects = [leakDefect, iceDefect, sparkDefect] as const;
export const bossDefectEntry = bossDefect;

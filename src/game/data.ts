export interface EffectDef {
  icon: string;
  text: string;
}

export interface CardUpgrade {
  effects: readonly EffectDef[];
  damage?: number;
  heat?: number;
  bonus?: number;
  draw?: number;
  heatSet?: number;
  cycleShield?: number;
  exhaust?: boolean;
  damagePerHeat?: number;
  meltsIce?: boolean;
  text: string;
}

export interface CardDefinition extends CardUpgrade {
  name: string;
  icon: string;
  upgrade?: CardUpgrade;
}

export interface DeckCard {
  id: CardId;
  upgraded?: boolean;
}

export interface DefectDefinition {
  id: string;
  title: string;
  emoji: string;
  baseHp: number;
  heatPerCycle: number;
  text: string;
  subtitle: string;
  boss?: boolean;
}

export interface ModuleDefinition {
  name: string;
  icon: string;
  text: string;
}

export const MAX_HEAT = 10;
export const MAX_ACTIONS = 2;
export const HAND_SIZE = 3;
export const FINAL_STAGE = 5;

export const cardDb = {
  clamp: {
    name: "ЗАЖИМ",
    icon: "🗜️",
    effects: [{ icon: "🔧", text: "+3" }],
    damage: 3,
    heat: 0,
    text: "Пробоина зажата.",
    upgrade: {
      effects: [{ icon: "🔧", text: "+5" }],
      damage: 5,
      text: "Усиленный зажим быстро давит аварии.",
    },
  },
  scan: {
    name: "СКАН",
    icon: "📡",
    effects: [
      { icon: "🔧", text: "+1" },
      { icon: "⬆️", text: "+2" },
    ],
    damage: 1,
    heat: 0,
    bonus: 2,
    text: "Слабое место найдено.",
    upgrade: {
      effects: [
        { icon: "🔧", text: "+1" },
        { icon: "⬆️", text: "+3" },
        { icon: "🃏", text: "+1" },
      ],
      bonus: 3,
      draw: 1,
      text: "Скан даёт больший бонус и добирает карту.",
    },
  },
  cool: {
    name: "ОХЛАД.",
    icon: "❄️",
    effects: [{ icon: "🔥", text: "-3" }],
    damage: 0,
    heat: -3,
    text: "Мультитул остывает.",
    upgrade: {
      effects: [
        { icon: "🔥", text: "-4" },
        { icon: "🃏", text: "+1" },
      ],
      heat: -4,
      draw: 1,
      text: "Глубокое охлаждение и добор карты.",
    },
  },
  patch: {
    name: "ЗАПЛАТКА",
    icon: "🩹",
    effects: [{ icon: "🔧", text: "+4" }],
    damage: 4,
    heat: 0,
    text: "Пробоина герметизирована.",
    upgrade: {
      effects: [{ icon: "🔧", text: "+6" }],
      damage: 6,
      text: "Прочная заплатка держит лучше.",
    },
  },
  weld: {
    name: "СВАРКА",
    icon: "⚡",
    effects: [
      { icon: "🔧", text: "+7" },
      { icon: "🔥", text: "+3" },
    ],
    damage: 7,
    heat: 3,
    meltsIce: true,
    text: "Шов наложен. Жар растёт.",
    upgrade: {
      effects: [
        { icon: "🔧", text: "+9" },
        { icon: "🔥", text: "+3" },
      ],
      damage: 9,
      text: "Сварка стала мощнее без лишнего нагрева.",
    },
  },
  vent: {
    name: "ПРОДУВКА",
    icon: "💨",
    effects: [{ icon: "🔥", text: "=0" }],
    damage: 0,
    heatSet: 0,
    text: "Жар сброшен.",
  },
  strike: {
    name: "УДАР",
    icon: "🔨",
    effects: [
      { icon: "🔧", text: "+5" },
      { icon: "🔥", text: "+1" },
    ],
    damage: 5,
    heat: 1,
    text: "Деталь вбита на место.",
  },
  diagnose: {
    name: "ДИАГН.",
    icon: "🛰️",
    effects: [{ icon: "🃏", text: "+2" }],
    damage: 0,
    heat: 0,
    draw: 2,
    text: "Найдены новые варианты.",
    upgrade: {
      effects: [{ icon: "🃏", text: "+3" }],
      draw: 3,
      text: "Глубокая диагностика добирает три карты.",
    },
  },
  paste: {
    name: "ТЕРМОП.",
    icon: "🧴",
    effects: [
      { icon: "🔥", text: "-1" },
      { icon: "🛡️", text: "-2" },
    ],
    damage: 0,
    heat: -1,
    cycleShield: 2,
    text: "Нагрев аварии снижен.",
  },
  impulse: {
    name: "ИМПУЛЬС",
    icon: "💢",
    effects: [
      { icon: "🔧", text: "×🔥" },
      { icon: "🔥", text: "+2" },
    ],
    damagePerHeat: 1,
    heat: 2,
    text: "Импульс бьёт от накопленного жара.",
  },
  cryo: {
    name: "КРИО",
    icon: "🧊",
    effects: [
      { icon: "🔥", text: "=0" },
      { icon: "🗑️", text: "бой" },
    ],
    damage: 0,
    heatSet: 0,
    exhaust: true,
    text: "Жар сброшен. Карта сгорает.",
  },
  laser: {
    name: "ЛАЗЕР",
    icon: "🔆",
    effects: [
      { icon: "🔧", text: "+10" },
      { icon: "🔥", text: "+5" },
    ],
    damage: 10,
    heat: 5,
    meltsIce: true,
    text: "Мощный прожиг. Сильный перегрев.",
  },
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

export const modulesDb = {
  ceramic: {
    name: "КЕРАМОСОПЛО",
    icon: "🏺",
    text: "Первый нагрев от карты в каждом бою уменьшается на 1.",
  },
  arc: {
    name: "СТАБ. ДУГИ",
    icon: "〽️",
    text: "Каждая третья ремонтная карта даёт ещё 🔧+2.",
  },
  autoscan: {
    name: "АВТОСКАНЕР",
    icon: "📡",
    text: "В начале каждого боя: ⬆️+1 к следующему ремонту.",
  },
  radiator: {
    name: "ЗАПАС РАДИАТОР",
    icon: "🧯",
    text: "Раз за бой спасает от перегрева: 🔥10 → 🔥6.",
  },
  magnet: {
    name: "МАГН. ЗАЖИМ",
    icon: "🧲",
    text: "Все карты ЗАЖИМ дают ещё 🔧+1.",
  },
  badbattery: {
    name: "ПЛОХАЯ БАТ.",
    icon: "🔋",
    text: "Все ремонтные карты дают 🔧+2, но ответ аварии даёт 🔥+1.",
  },
} as const satisfies Record<string, ModuleDefinition>;

export type ModuleId = keyof typeof modulesDb;

export const regularDefects = [
  {
    id: "leak",
    title: "ПРОБОЙ ТРУБЫ",
    emoji: "🧊",
    baseHp: 22,
    heatPerCycle: 2,
    text: "Лёд держит трещину, но труба разваливается.",
    subtitle: "обычная авария",
  },
  {
    id: "ice",
    title: "ЛЕДЯНОЙ НАРОСТ",
    emoji: "❄️",
    baseHp: 24,
    heatPerCycle: 2,
    text: "Пока лёд не расплавлен, ремонт слабее на 🔧-1. СВАРКА и ЛАЗЕР плавят лёд.",
    subtitle: "ремонт -1 до расплавления",
  },
  {
    id: "spark",
    title: "ИСКРЯЩИЙ УЗЕЛ",
    emoji: "💥",
    baseHp: 20,
    heatPerCycle: 3,
    text: "Каждая ремонтная карта дополнительно греет мультитул на 🔥+1.",
    subtitle: "ремонтные карты: 🔥+1",
  },
] as const;

export const bossDefect = {
  id: "boss",
  title: "ГЛАВНЫЙ КОНТУР",
  emoji: "🛰️",
  baseHp: 44,
  heatPerCycle: 4,
  text: "Босс: первый ремонт в каждом цикле слабее на 🔧-2. Контур давит теплом.",
  subtitle: "первый удар цикла: 🔧-2",
  boss: true,
} as const;

export const initialDeck: DeckCard[] = [
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

export function cloneCard(card: DeckCard): DeckCard {
  return { id: card.id, upgraded: !!card.upgraded };
}

export function effectText(effects: readonly EffectDef[]): string {
  return effects.map((effect) => `${effect.icon}${effect.text}`).join(" ");
}

export interface CardResolved extends CardDefinition {
  id: CardId;
  upgraded: boolean;
}

export function getCardProps(card: DeckCard): CardResolved {
  const base = cardDb[card.id];
  const upgraded = !!card.upgraded && base.upgrade ? { ...base, ...base.upgrade } : { ...base };

  return {
    ...upgraded,
    id: card.id,
    upgraded: !!card.upgraded,
    name: `${base.name}${card.upgraded ? "+" : ""}`,
    icon: base.icon,
  };
}

export interface DefectInstance extends DefectDefinition {
  hp: number;
}

export function makeDefectForStage(stage: number): DefectInstance {
  if (stage === FINAL_STAGE) {
    return { ...bossDefect, hp: bossDefect.baseHp };
  }

  const base = regularDefects[(stage - 1) % regularDefects.length];
  return {
    ...base,
    hp: base.baseHp + (stage - 1) * 5,
    heatPerCycle: base.heatPerCycle + (stage >= 4 ? 1 : 0),
  };
}

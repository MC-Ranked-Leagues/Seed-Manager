import { strToU8, zipSync } from "fflate";
import type { Doc } from "@/convex/_generated/dataModel";
import { SEED_TYPES } from "@/lib/consts";

// MCSR Ranked MatchFlag.Type, in ordinal order. The bit for a flag is its index.
export const PRESET_FLAGS = [
  "FILTERED_SEED",
  "REDUCE_WAITING_TIME",
  "SHOW_ADVANCEMENT",
  "SHOW_FIRST_ADVANCEMENT_ONLY",
  "RESET_MESSAGE",
  "IGT_MODE",
  "MODIFIED_PORTAL_BEHAVIORS",
  "CLEAN_SPAWN",
  "GENERATE_ARTIFICIAL_LAVA_POOLS",
  "DISABLE_MINING_FATIGUE",
  "MODIFY_PIGLIN_BARTER",
  "NO_MONSTER_SPAWN_IN_BASTION",
  "STANDARDIZED_PERCH",
  "DEPRECATED_LOWER_DRAGON_FIRST_NODE",
  "IMMEDIATELY_DRAGON_PERCH",
  "DISABLE_F3_SCREEN",
  "DISABLE_COPY_LOCATION",
  "DISABLE_F3_DEBUGS",
  "DISABLE_FORFEIT",
  "DISABLE_RESET",
  "ICARUS",
  "HALF_HEART",
  "HARDCORE",
  "DISABLE_MODIFIED_LOOT_TABLES",
  "DISABLE_LIVE_MATCH_GUI",
  "PIGLIN_BRUTE_MODE",
  "BEGINNER_MODE",
  "OPTIMIZED_LIVE_REPLAY",
  "DISABLE_PUBLIC_REPLAY",
  "DISPLAY_SEED_TYPE",
  "ALLOW_USE_COMMANDS",
  "FORCE_REJOIN_DISCONNECTION",
  "REPLACE_ZOMBIE_SPAWNER",
  "READY_TOGGLE",
  "STANDARDIZED_WOODLIGHTS",
] as const;

export type PresetFlag = (typeof PRESET_FLAGS)[number];

export type Preset = ReturnType<typeof createPreset>;

export const DEFAULT_PRESET_NAME_FORMAT = "MCRL L{league} #{number} {type}";

// MCRL base preset flags shared by every league.
const DEFAULT_FLAGS: PresetFlag[] = [
  "FILTERED_SEED",
  "SHOW_ADVANCEMENT",
  "SHOW_FIRST_ADVANCEMENT_ONLY",
  "MODIFIED_PORTAL_BEHAVIORS",
  "CLEAN_SPAWN",
  "GENERATE_ARTIFICIAL_LAVA_POOLS",
  "DISABLE_MINING_FATIGUE",
  "MODIFY_PIGLIN_BARTER",
  "NO_MONSTER_SPAWN_IN_BASTION",
  "STANDARDIZED_PERCH",
  "DEPRECATED_LOWER_DRAGON_FIRST_NODE",
  "DISPLAY_SEED_TYPE",
  "FORCE_REJOIN_DISCONNECTION",
  "REPLACE_ZOMBIE_SPAWNER",
  "READY_TOGGLE",
  "STANDARDIZED_WOODLIGHTS",
];

// MCRL defaults; each league can save its own.
const LEAGUE_TIME_LIMIT_SECONDS: Partial<Record<number, number>> = {
  1: 780,
  2: 900,
  3: 1020,
  4: 1200,
  5: 1500,
  6: 1800,
  7: 3600,
};

// Bits of the room's "Display Seed Type" buttons. Ranked has no jungle
// pyramid button, so those seeds show no structure.
const PRESET_SEED_TYPE_BITS: Record<keyof typeof SEED_TYPES, number> = {
  BURIED_TREASURE: 1,
  SHIPWRECK: 2,
  VILLAGE: 4,
  RUINED_PORTAL: 8,
  DESERT_TEMPLE: 16,
  JUNGLE_PYRAMID: 0,
};

function createPreset() {
  return {
    author: "rankedLeagueSeedManager",
    name: "",
    option: {
      overworldSeed: "",
      netherSeed: "",
      theEndSeed: "",
      rngSeed: "",
      flag: { list: [{ value: 0 }, { value: 0 }] },
      category: "ANY",
      command: "",
      roomName: "",
      waitingImageUrl: "",
      availableFakePlayer: false,
      fakePlayerLevel: "RANDOM",
      manualMaxPlayers: 99,
      voteCount: 0,
      completions: 99,
      timeLimit: 0,
      timeAttack: 0,
      lowerNodeHeight: 0,
      slowmodeTime: 1,
      seedType: { value: 0 },
      bastionType: { value: 15 },
      gameMode: { type: "default" },
    },
    version: 2,
  };
}

export function getDefaultPreset() {
  return DEFAULT_FLAGS.reduce(
    (preset, flag) => setPresetFlag(preset, flag, true),
    createPreset()
  );
}

// The saved base preset, or the MCRL defaults when none is saved.
export function getBasePreset(settings: Doc<"settings"> | null) {
  return {
    preset: parsePreset(settings?.basePreset ?? "") ?? getDefaultPreset(),
    nameFormat: settings?.presetNameFormat ?? DEFAULT_PRESET_NAME_FORMAT,
  };
}

export function getLeagueTimeLimit(league: Doc<"leagues">) {
  return (
    league.presetTimeLimit ??
    LEAGUE_TIME_LIMIT_SECONDS[league.leagueNumber] ??
    0
  );
}

export function getLeaguePreset(
  settings: Doc<"settings"> | null,
  league: Doc<"leagues">
) {
  const { preset, nameFormat } = getBasePreset(settings);
  return {
    preset: {
      ...preset,
      option: { ...preset.option, timeLimit: getLeagueTimeLimit(league) },
    },
    nameFormat,
  };
}

export function parsePreset(json: string): Preset | null {
  try {
    const preset = JSON.parse(json) as Preset;
    return Array.isArray(preset?.option?.flag?.list) ? preset : null;
  } catch {
    return null;
  }
}

export function formatPresetFlag(flag: PresetFlag) {
  const label = flag.toLowerCase().replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function flagBit(flag: PresetFlag) {
  const bit = PRESET_FLAGS.indexOf(flag);
  // Two 32-bit groups, matching Java's signed ints (bit 31 is negative).
  return { group: Math.floor(bit / 32), mask: 1 << (bit % 32) };
}

export function hasPresetFlag(preset: Preset, flag: PresetFlag) {
  const { group, mask } = flagBit(flag);
  return ((preset.option.flag.list[group]?.value ?? 0) & mask) !== 0;
}

// Toggles one bit so flags this list doesn't know about are kept.
export function setPresetFlag(
  preset: Preset,
  flag: PresetFlag,
  enabled: boolean
): Preset {
  const { group, mask } = flagBit(flag);
  const list = preset.option.flag.list.map((item, index) =>
    index === group
      ? { value: enabled ? item.value | mask : item.value & ~mask }
      : item
  );
  return { ...preset, option: { ...preset.option, flag: { list } } };
}

export function buildPresetFiles(
  base: Preset,
  nameFormat: string,
  leagueNumber: number,
  seeds: Doc<"seeds">[]
) {
  const withDisplay = setPresetFlag(base, "DISPLAY_SEED_TYPE", true);

  return seeds.map((seed, index) => {
    const seedNumber = seed.seedNumber ?? index + 1;
    const name = nameFormat
      .replace(/\{league\}/g, String(leagueNumber))
      .replace(/\{number\}/g, String(seedNumber))
      .replace(/\{type\}/g, seed.type ? SEED_TYPES[seed.type] : "Seed");
    const preset: Preset = {
      ...withDisplay,
      name,
      option: {
        ...withDisplay.option,
        overworldSeed: seed.overworld,
        netherSeed: seed.nether,
        theEndSeed: seed.end,
        rngSeed: seed.rng,
        roomName: name,
        seedType: { value: seed.type ? PRESET_SEED_TYPE_BITS[seed.type] : 0 },
      },
    };

    // Zero-padded so the in-game list, which follows file order, stays in seed order.
    return {
      fileName: `${String(seedNumber).padStart(2, "0")} ${name.replace(/[\\/:*?"<>|]/g, "_")}.rsp`,
      preset,
    };
  });
}

export function zipPresetFiles(files: ReturnType<typeof buildPresetFiles>) {
  return zipSync(
    Object.fromEntries(
      files.map(({ fileName, preset }) => [
        fileName,
        strToU8(JSON.stringify(preset, null, 2)),
      ])
    )
  );
}

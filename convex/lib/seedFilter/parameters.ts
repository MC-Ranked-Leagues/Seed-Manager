import { z } from "zod";

const dimension = z.enum(["OVERWORLD", "NETHER"]);
const count = z.coerce.number().int().nonnegative();
const distance = z.coerce.number().nonnegative();
const boolean = z.enum(["true", "false"]);
const category = z.string().min(1).max(100);
const worldSeed = z
  .string()
  .regex(/^-?\d{1,19}$/, "Enter a signed 64-bit seed.")
  .pipe(
    z
      .string()
      .refine(
        (seed) => BigInt(seed) >= -(2n ** 63n) && BigInt(seed) < 2n ** 63n,
        "Enter a signed 64-bit seed."
      )
  );
const filters = z
  .object({
    seed: worldSeed.optional(),
    category: category.optional(),
    includeUsed: boolean.optional(),
    hasFood: boolean.optional(),
    hasLootingSword: boolean.optional(),
    lightSource: z.string().max(100).optional(),
    minScore: z.coerce.number().int().optional(),
    maxDistance: distance.optional(),
    minMagmaRavines: count.optional(),
    maxMagmaRavineDistance: distance.optional(),
    minStableTriples: count.optional(),
    minStableGaps: count.optional(),
    minVariableGoldBlocks: count.optional(),
    minIronCount: count.optional(),
    minDiamondCount: count.optional(),
    minGoldenCarrotCount: count.optional(),
    minGoldenAppleCount: count.optional(),
    minRottenFleshCount: count.optional(),
    maxRiverDistance: distance.optional(),
  })
  .strict();

export const listParameters = z
  .object({
    dimension,
    offset: z.number().int().nonnegative(),
    sortBy: z.enum(["eval", "time"]),
    filters: z
      .record(z.string(), z.string())
      .transform((values): z.input<typeof filters> =>
        Object.fromEntries(
          Object.entries(values).filter(([, value]) => value.trim() !== "")
        )
      )
      .pipe(filters),
  })
  .transform(({ filters, ...options }) => ({
    ...filters,
    ...options,
    limit: 26,
  }));

export const hitId = z.number().int().nonnegative();
export const validationParameters = z.object({ dimension, seed: worldSeed });

const rngCriteria = z.object({
  flintInXGravel: z.number().int().nonnegative().optional(),
  blazeRods: z.number().int().nonnegative().optional(),
  blazeKills: z.number().int().nonnegative().optional(),
  firstEyeBreak: z.number().int().nonnegative().optional(),
  obsidianCount: z.number().int().nonnegative().optional(),
  obsidianTrades: z.number().int().nonnegative().optional(),
  pearlsCount: z.number().int().nonnegative().optional(),
  pearlsTrades: z.number().int().nonnegative().optional(),
});

export const pairingParameters = rngCriteria
  .extend({
    overworldCategories: z.array(category).max(50),
    netherCategories: z.array(category).max(50),
    minEvalScore: z.number().int().optional(),
    maxEvalScore: z.number().int().optional(),
    villageType: z
      .enum(["DESERT", "PLAINS", "SAVANNA", "SNOWY", "TAIGA", "LEGACY"])
      .optional(),
    enterMethod: z.enum(["lava_pool", "obsidian_with_chest_patch"]).optional(),
    useCustomRng: z.boolean(),
  })
  .refine(
    (options) =>
      options.overworldCategories.length + options.netherCategories.length > 0,
    "Select at least one category."
  )
  .refine(
    (options) =>
      options.minEvalScore === undefined ||
      options.maxEvalScore === undefined ||
      options.minEvalScore <= options.maxEvalScore,
    "Minimum eval must not exceed maximum eval."
  )
  .transform(
    ({
      overworldCategories,
      netherCategories,
      minEvalScore,
      maxEvalScore,
      villageType,
      enterMethod,
      useCustomRng,
      ...rng
    }) => ({
      overworldCategories: overworldCategories.join(","),
      netherCategories: netherCategories.join(","),
      minEvalScore,
      maxEvalScore,
      villageType: overworldCategories.includes("village")
        ? villageType
        : undefined,
      enterMethod: overworldCategories.includes("rp") ? enterMethod : undefined,
      ...(useCustomRng ? { useCustomRng, ...rng } : {}),
    })
  );

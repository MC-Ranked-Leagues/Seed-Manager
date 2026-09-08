import { v } from "convex/values";

export const dimension = v.union(v.literal("OVERWORLD"), v.literal("NETHER"));
const evaluationFields = {
  worldSeed: v.string(),
  dimension,
  evalScore: v.number(),
  magmaRavineCount: v.optional(v.union(v.number(), v.null())),
  nearestMagmaRavineDistance: v.optional(v.union(v.number(), v.null())),
  endBuriednessHeight: v.optional(v.union(v.number(), v.null())),
  notes: v.string(),
  structures: v.array(
    v.object({
      structureName: v.string(),
      chunkX: v.number(),
      chunkZ: v.number(),
      score: v.union(v.number(), v.null()),
      data: v.string(),
    })
  ),
};
export const hitValidator = v.object({
  ...evaluationFields,
  id: v.number(),
  category: v.string(),
  foundAt: v.string(),
  used: v.boolean(),
});
const rngValidator = v.object({
  rngSeed: v.string(),
  firstFlintGravel: v.number(),
  blazeRods: v.number(),
  blazeKills: v.number(),
  eyeFirstBreakThrow: v.number(),
  obsidianCount: v.number(),
  obsidianTrades: v.number(),
  pearlsCount: v.number(),
  pearlsTrades: v.number(),
});
export const pairingArgs = {
  overworldCategories: v.array(v.string()),
  netherCategories: v.array(v.string()),
  minEvalScore: v.optional(v.number()),
  maxEvalScore: v.optional(v.number()),
  villageType: v.optional(
    v.union(
      v.literal("DESERT"),
      v.literal("PLAINS"),
      v.literal("SAVANNA"),
      v.literal("SNOWY"),
      v.literal("TAIGA"),
      v.literal("LEGACY")
    )
  ),
  enterMethod: v.optional(
    v.union(v.literal("lava_pool"), v.literal("obsidian_with_chest_patch"))
  ),
  useCustomRng: v.boolean(),
  flintInXGravel: v.optional(v.number()),
  blazeRods: v.optional(v.number()),
  blazeKills: v.optional(v.number()),
  firstEyeBreak: v.optional(v.number()),
  obsidianCount: v.optional(v.number()),
  obsidianTrades: v.optional(v.number()),
  pearlsCount: v.optional(v.number()),
  pearlsTrades: v.optional(v.number()),
};

export const listArgs = {
  dimension,
  offset: v.number(),
  filters: v.record(v.string(), v.string()),
  sortBy: v.union(v.literal("eval"), v.literal("time")),
};
export const listResult = v.object({
  hits: v.array(hitValidator),
  hasNext: v.boolean(),
});
export const validationResult = v.object({
  ...evaluationFields,
  structureSeed: v.string(),
  passed: v.boolean(),
});
export const pairingResult = v.object({
  overworld: v.union(hitValidator, v.null()),
  nether: v.union(hitValidator, v.null()),
  rng: v.union(rngValidator, v.null()),
});

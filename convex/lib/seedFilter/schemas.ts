import { z } from "zod";

export const hitSchema = z.object({
  id: z.number().int().safe(),
  worldSeed: z.string().regex(/^-?\d+$/),
  dimension: z.enum(["OVERWORLD", "NETHER"]),
  category: z.string(),
  foundAt: z.string(),
  used: z.boolean(),
  evalScore: z.number(),
  magmaRavineCount: z.number().nullish(),
  nearestMagmaRavineDistance: z.number().nullish(),
  endBuriednessHeight: z.number().nullish(),
  notes: z.unknown().transform((value) => JSON.stringify(value ?? null)),
  structures: z.array(
    z
      .object({
        structureName: z.string(),
        chunkX: z.number(),
        chunkZ: z.number(),
        data: z.unknown(),
      })
      .transform((structure) => {
        const score = z.object({ score: z.number() }).safeParse(structure.data);
        return {
          ...structure,
          score: score.success ? score.data.score : null,
          data: JSON.stringify(structure.data ?? null),
        };
      })
  ),
});

export const validationSchema = hitSchema
  .omit({ id: true, category: true, foundAt: true, used: true })
  .extend({ structureSeed: z.string(), passed: z.boolean() });
const rngSchema = z.object({
  rngSeed: z.string(),
  firstFlintGravel: z.number(),
  blazeRods: z.number(),
  blazeKills: z.number(),
  eyeFirstBreakThrow: z.number(),
  obsidianCount: z.number(),
  obsidianTrades: z.number(),
  pearlsCount: z.number(),
  pearlsTrades: z.number(),
});
export const pairingSchema = z.object({
  overworld: hitSchema.nullable(),
  nether: hitSchema.nullable(),
  rng: rngSchema.nullable(),
});

export const hitsSchema = z.array(hitSchema);
export const categoriesSchema = z.array(z.string());

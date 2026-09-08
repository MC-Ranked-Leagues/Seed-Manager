import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./lib/permissions";
import { parseParameters, request } from "./lib/seedFilter/client";
import {
  hitId,
  listParameters,
  pairingParameters,
  validationParameters,
} from "./lib/seedFilter/parameters";
import {
  categoriesSchema,
  hitSchema,
  hitsSchema,
  pairingSchema,
  validationSchema,
} from "./lib/seedFilter/schemas";
import {
  dimension,
  hitValidator,
  listArgs,
  listResult,
  pairingArgs,
  pairingResult,
  validationResult,
} from "./lib/seedFilter/validators";

export const authorize = internalQuery({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return null;
  },
});

export const list = action({
  args: listArgs,
  returns: listResult,
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.seedFilter.authorize, {});
    const hits = await request(
      "hits",
      hitsSchema,
      parseParameters(listParameters, args)
    );
    return { hits: hits.slice(0, 25), hasNext: hits.length > 25 };
  },
});

export const categories = action({
  args: { dimension },
  returns: v.array(v.string()),
  handler: async (ctx, args): Promise<string[]> => {
    await ctx.runQuery(internal.seedFilter.authorize, {});
    return await request("categories", categoriesSchema, args);
  },
});

export const get = action({
  args: { id: v.number() },
  returns: hitValidator,
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.seedFilter.authorize, {});
    return await request(`hits/${parseParameters(hitId, args.id)}`, hitSchema);
  },
});

export const validate = action({
  args: { dimension, seed: v.string() },
  returns: validationResult,
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.seedFilter.authorize, {});
    return await request(
      "validate",
      validationSchema,
      parseParameters(validationParameters, args),
      60000
    );
  },
});

export const randomPairing = action({
  args: pairingArgs,
  returns: pairingResult,
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.seedFilter.authorize, {});
    return await request(
      "random-pairing",
      pairingSchema,
      parseParameters(pairingParameters, args),
      60000
    );
  },
});

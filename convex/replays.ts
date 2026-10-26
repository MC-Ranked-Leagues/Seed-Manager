import { internalMutation, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { replayKeyFor } from "./lib/replayKey";
import { canManageLeagueAsAdminOrHost } from "./lib/permissions";
import { writeLog } from "./lib/logging";
import { MAX_LEAGUE_SEED_LIST_COUNT } from "./lib/consts";
import { requireSettings } from "./lib/settings";
import { compareSeedOrder } from "./lib/seedOrder";

export const getUploadTarget = internalQuery({
  args: { userId: v.id("users"), seedId: v.id("seeds") },
  returns: v.object({ key: v.string() }),
  handler: async (ctx, { userId, seedId }) => {
    const user = await ctx.db.get("users", userId);
    if (!user || user.status !== "active")
      throw new ConvexError("User not found");

    const settings = await requireSettings(ctx);
    if (settings.seedTestingPaused && !user.roles.includes("admin"))
      throw new ConvexError("Seed testing paused");

    const seed = await ctx.db.get("seeds", seedId);
    if (
      !seed ||
      !seed.leagueId ||
      !seed.assignedWeekNumber ||
      seed.assignedWeekNumber !== settings.currentWeekNumber
    )
      throw new ConvexError("Seed not found");

    if (!canManageLeagueAsAdminOrHost(user, seed.leagueId)) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Admin or host access required",
      });
    }

    const league = await ctx.db.get("leagues", seed.leagueId);
    if (!league) throw new ConvexError("League not found");

    return {
      key: replayKeyFor(
        league.leagueNumber,
        seed.assignedWeekNumber,
        seed.overworld
      ),
    };
  },
});

export const setReplayKey = internalMutation({
  args: { seedId: v.id("seeds"), key: v.string() },
  returns: v.null(),
  handler: async (ctx, { seedId, key }) => {
    const seed = await ctx.db.get("seeds", seedId);
    if (!seed) throw new ConvexError("Seed not found");

    if (seed.replayKey === key) return null;

    await ctx.db.patch("seeds", seedId, { replayKey: key });

    await writeLog(ctx, {
      eventType: "seed.updated",
      actorType: "system",
      actorName: "Replay storage",
      targetType: "seed",
      targetId: seed._id,
      targetLabel: `Seed ${seed.overworld}`,
      summary: `Stored replay key for seed #${seed.seedNumber ?? "unknown"} in week ${seed.assignedWeekNumber ?? "unknown"}.`,
    });

    return null;
  },
});

export const isPublishedReplay = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const seed = await ctx.db
      .query("seeds")
      .withIndex("by_replayKey", (q) => q.eq("replayKey", key))
      .first();
    if (!seed) return false;
    return true;
  },
});

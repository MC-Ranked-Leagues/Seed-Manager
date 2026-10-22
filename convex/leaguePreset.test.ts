/// <reference types="vite/client" />

import { makeFunctionReference } from "convex/server";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const updateBasePreset = makeFunctionReference<
  "mutation",
  { preset: string; presetNameFormat: string },
  null
>("settings:updateBasePreset");

const updateLeaguePreset = makeFunctionReference<
  "mutation",
  { leagueId: Id<"leagues">; presetTimeLimit: number },
  null
>("leagues:updateLeaguePreset");

test("lets only admins save the base preset and league time limits", async () => {
  const t = convexTest(schema, modules);
  const { leagueId, settingsId, adminId, hostId } = await t.run(async (ctx) => {
    const leagueId = await ctx.db.insert("leagues", {
      leagueNumber: 1,
      leagueName: "League One",
      seedCount: 0,
      usedSeedCount: 0,
    });
    return {
      leagueId,
      settingsId: await ctx.db.insert("settings", {
        key: "global",
        currentWeekNumber: 1,
        seedTestingPaused: false,
      }),
      adminId: await ctx.db.insert("users", {
        name: "Admin",
        status: "active",
        roles: ["admin"],
      }),
      hostId: await ctx.db.insert("users", {
        name: "Host",
        status: "active",
        roles: ["host"],
        hostLeagueId: [leagueId],
      }),
    };
  });
  const admin = t.withIdentity({ subject: adminId });
  const host = t.withIdentity({ subject: hostId });
  const base = {
    preset: JSON.stringify({ option: { flag: { list: [{ value: 1 }] } } }),
    presetNameFormat: "L{league} - #{number}",
  };
  const timeLimit = { leagueId, presetTimeLimit: 900 };

  await expect(host.mutation(updateBasePreset, base)).rejects.toThrow();
  await expect(host.mutation(updateLeaguePreset, timeLimit)).rejects.toThrow();
  await expect(
    admin.mutation(updateBasePreset, { ...base, preset: '{"option":{}}' })
  ).rejects.toThrow();
  await expect(
    admin.mutation(updateLeaguePreset, { leagueId, presetTimeLimit: -1 })
  ).rejects.toThrow();

  await admin.mutation(updateBasePreset, base);
  await admin.mutation(updateLeaguePreset, timeLimit);

  const { settings, league, logs } = await t.run(async (ctx) => ({
    settings: await ctx.db.get("settings", settingsId),
    league: await ctx.db.get("leagues", leagueId),
    logs: await ctx.db.query("logs").collect(),
  }));
  expect(settings).toMatchObject({
    basePreset: base.preset,
    presetNameFormat: base.presetNameFormat,
  });
  expect(league).toMatchObject({ presetTimeLimit: 900 });
  expect(logs).toMatchObject([
    { eventType: "preset.updated", actorId: adminId },
    { eventType: "league.updated", actorId: adminId, targetId: leagueId },
  ]);
});

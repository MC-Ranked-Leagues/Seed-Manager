/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

async function setup(roles: ("admin" | "host")[] = ["admin"]) {
  const t = convexTest(schema, modules);
  const id = await t.run((ctx) =>
    ctx.db.insert("users", { name: "Filter viewer", status: "active", roles })
  );
  vi.stubEnv("SEED_FILTER_API_URL", "https://filter.example");
  vi.stubEnv("SEED_FILTER_API_KEY", "test-secret");
  return t.withIdentity({ subject: id });
}
const args = {
  dimension: "OVERWORLD" as const,
  offset: 25,
  filters: { seed: "9223372036854775807" },
  sortBy: "eval" as const,
};
const hit = {
  id: 1,
  worldSeed: "9223372036854775807",
  dimension: "OVERWORLD",
  category: "village",
  foundAt: "2026-09-08T00:00:00Z",
  used: false,
  evalScore: 10,
  structures: [],
  notes: null,
};

test("every filter endpoint requires admin access before contacting the server", async () => {
  const t = await setup(["host"]);
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await expect(t.action(api.seedFilter.list, args)).rejects.toThrow(
    "Admin access required"
  );
  await expect(
    t.action(api.seedFilter.categories, { dimension: "NETHER" })
  ).rejects.toThrow("Admin access required");
  await expect(t.action(api.seedFilter.get, { id: 1 })).rejects.toThrow(
    "Admin access required"
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test("proxies filters with server credentials, preserves seeds, and detects the next page", async () => {
  const t = await setup();
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(
        JSON.stringify(Array.from({ length: 26 }, (_, id) => ({ ...hit, id })))
      )
    );
  vi.stubGlobal("fetch", fetchMock);
  const result = await t.action(api.seedFilter.list, args);
  expect(result.hits).toHaveLength(25);
  expect(result.hasNext).toBe(true);
  expect(result.hits[0]?.worldSeed).toBe(hit.worldSeed);
  const [url, options] = fetchMock.mock.calls[0]!;
  if (!(url instanceof URL)) throw new Error("Expected a URL request");
  expect(url.searchParams.get("seed")).toBe("9223372036854775807");
  expect(url.searchParams.get("offset")).toBe("25");
  expect(url.searchParams.get("limit")).toBe("26");
  expect(new Headers(options?.headers).get("Authorization")).toBe(
    "Bearer test-secret"
  );
  expect(options?.redirect).toBe("error");
});

test("rejects invalid seed bounds and arbitrary filter parameters before fetching", async () => {
  const t = await setup();
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    t.action(api.seedFilter.list, {
      ...args,
      filters: { seed: "9223372036854775808" },
    })
  ).rejects.toThrow("signed 64-bit");
  await expect(
    t.action(api.seedFilter.list, { ...args, filters: { limit: "100000" } })
  ).rejects.toThrow("Unknown filter");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("does not expose upstream error bodies", async () => {
  const t = await setup();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("secret upstream diagnostics", { status: 500 })
      )
  );
  await expect(t.action(api.seedFilter.list, args)).rejects.toThrow(
    "The seed filter is unavailable"
  );
});

test("validation keeps eval and structure scores separate, including zero", async () => {
  const t = await setup();
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        worldSeed: "-9223372036854775808",
        structureSeed: "123",
        dimension: "NETHER",
        passed: false,
        evalScore: -5,
        structures: [
          {
            structureName: "bastion_iron",
            chunkX: 1,
            chunkZ: -2,
            data: { score: 0 },
          },
          {
            structureName: "bastion_obby",
            chunkX: 1,
            chunkZ: -2,
            data: { score: 12 },
          },
          {
            structureName: "fortress_nearby",
            chunkX: 3,
            chunkZ: 4,
            data: null,
          },
        ],
        notes: null,
      })
    )
  );
  vi.stubGlobal("fetch", fetchMock);
  const result = await t.action(api.seedFilter.validate, {
    dimension: "NETHER",
    seed: "-9223372036854775808",
  });
  expect(result.evalScore).toBe(-5);
  expect(result.passed).toBe(false);
  expect(result.structures.map((structure) => structure.score)).toEqual([
    0,
    12,
    null,
  ]);
  const [url] = fetchMock.mock.calls[0]!;
  if (!(url instanceof URL)) throw new Error("Expected a URL request");
  expect(url.pathname).toBe("/api/validate");
  expect(url.searchParams.get("seed")).toBe("-9223372036854775808");
});

test("new tools require admin access and validate inputs before fetching", async () => {
  const host = await setup(["host"]);
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await expect(
    host.action(api.seedFilter.validate, { dimension: "OVERWORLD", seed: "1" })
  ).rejects.toThrow("Admin access required");
  await expect(
    host.action(api.seedFilter.randomPairing, {
      overworldCategories: ["village"],
      netherCategories: [],
      useCustomRng: false,
    })
  ).rejects.toThrow("Admin access required");
  const admin = await setup();
  await expect(
    admin.action(api.seedFilter.validate, {
      dimension: "OVERWORLD",
      seed: "9223372036854775808",
    })
  ).rejects.toThrow("signed 64-bit");
  await expect(
    admin.action(api.seedFilter.randomPairing, {
      overworldCategories: [],
      netherCategories: [],
      useCustomRng: false,
    })
  ).rejects.toThrow("Select at least one category");
  await expect(
    admin.action(api.seedFilter.randomPairing, {
      overworldCategories: ["village"],
      netherCategories: [],
      useCustomRng: false,
      minEvalScore: 3,
      maxEvalScore: -2,
    })
  ).rejects.toThrow("Minimum eval");
  expect(fetchMock).not.toHaveBeenCalled();
});

test("pairing forwards eval and custom RNG criteria and preserves nullable matches", async () => {
  const t = await setup();
  const rng = {
    rngSeed: "9223372036854775807",
    firstFlintGravel: 2,
    blazeRods: 7,
    blazeKills: 11,
    eyeFirstBreakThrow: -1,
    obsidianCount: 20,
    obsidianTrades: 72,
    pearlsCount: 16,
    pearlsTrades: 72,
  };
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(JSON.stringify({ overworld: hit, nether: null, rng }))
    );
  vi.stubGlobal("fetch", fetchMock);
  const result = await t.action(api.seedFilter.randomPairing, {
    overworldCategories: ["village", "rp"],
    netherCategories: ["housing"],
    minEvalScore: -10,
    maxEvalScore: 20,
    villageType: "DESERT",
    enterMethod: "lava_pool",
    useCustomRng: true,
    blazeRods: 7,
    blazeKills: 11,
    firstEyeBreak: 0,
  });
  expect(result.nether).toBeNull();
  expect(result.rng).toEqual(rng);
  const [url] = fetchMock.mock.calls[0]!;
  if (!(url instanceof URL)) throw new Error("Expected a URL request");
  expect(url.pathname).toBe("/api/random-pairing");
  expect(Object.fromEntries(url.searchParams)).toMatchObject({
    overworldCategories: "village,rp",
    minEvalScore: "-10",
    maxEvalScore: "20",
    villageType: "DESERT",
    enterMethod: "lava_pool",
    useCustomRng: "true",
    blazeRods: "7",
    firstEyeBreak: "0",
  });
});

test("pairing omits inactive category and RNG criteria", async () => {
  const t = await setup();
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      new Response(JSON.stringify({ overworld: null, nether: null, rng: null }))
    );
  vi.stubGlobal("fetch", fetchMock);
  await t.action(api.seedFilter.randomPairing, {
    overworldCategories: [],
    netherCategories: ["housing"],
    villageType: "DESERT",
    enterMethod: "lava_pool",
    useCustomRng: false,
    blazeRods: 7,
  });
  const [url] = fetchMock.mock.calls[0]!;
  if (!(url instanceof URL)) throw new Error("Expected a URL request");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    netherCategories: "housing",
  });
});

// @vitest-environment node
import { expect, test } from "vitest";
import { getSeedFilterSummary } from "./seedFilterPresentation";

test("shows food, loot and distance without changing the raw data", () => {
  const structure = {
    data: JSON.stringify({
      food: [{ type: "minecraft:cooked_porkchop", count: 4 }],
      goldenCarrotCount: 3,
      ironCount: 7,
      diamondCount: 0,
      hasLootingSword: true,
      distanceFromReferenceBlocks: 82.4,
      nearestTreeDistanceBlocks: 0,
    }),
  };
  const original = structure.data;
  expect(getSeedFilterSummary([structure])).toEqual({
    food: ["4 cooked porkchop", "3 golden carrots"],
    details: [
      "Iron 7",
      "Diamonds 0",
      "Looting sword",
      "Distance 82 blocks",
      "Tree 0 blocks",
    ],
  });
  expect(structure.data).toBe(original);
});

test("distinguishes missing food information from no food and keeps zero quality", () => {
  expect(getSeedFilterSummary([{ data: "null" }]).food).toEqual([]);
  expect(getSeedFilterSummary([{ data: '{"hasFood":false}' }]).food).toEqual([
    "No food",
  ]);
  expect(getSeedFilterSummary([{ data: '{"foodQuality":0}' }]).food).toEqual([
    "Quality 0",
  ]);
});

test("keeps valid details when optional data differs and does not repeat shared food", () => {
  const data = JSON.stringify({
    food: [{ type: "bread", count: 2 }],
    ironCount: "unknown",
    diamondCount: 1,
  });
  expect(getSeedFilterSummary([{ data }, { data }])).toEqual({
    food: ["2 bread"],
    details: ["Diamonds 1"],
  });
});

test("shows only relevant loot from every chest and totals repeated items", () => {
  const data = JSON.stringify({
    ironCount: 7,
    diamondCount: 2,
    chests: [
      {
        items: [
          { type: "minecraft:iron_ingot", count: 3 },
          { type: "bread", count: 2 },
          { type: "wheat", count: 4 },
        ],
      },
      {
        items: [
          { type: "iron_ingot", count: 4 },
          { type: "obsidian", count: 5 },
          { type: "iron_nugget", count: 3 },
          { type: "diamond", count: 2 },
        ],
      },
    ],
  });
  expect(getSeedFilterSummary([{ data }]).details).toEqual([
    "Chest loot: 7 iron ingot, 4 wheat, 3 iron nugget, 2 diamond",
  ]);
});

test("keeps other loot and food when chests are empty or missing items", () => {
  const data = JSON.stringify({
    chests: [{}, { items: [] }],
    ironCount: 2,
    food: [{ type: "bread", count: 3 }],
  });
  expect(getSeedFilterSummary([{ data }])).toEqual({
    food: ["3 bread"],
    details: ["Iron 2"],
  });
});

test("keeps derived iron value and counts that differ from chest totals", () => {
  const data = JSON.stringify({
    ironCount: 9,
    ironNuggetValue: 81,
    chests: [
      {
        items: [
          { type: "IRON_INGOT", count: 7 },
          { type: "iron_nugget", count: 2 },
        ],
      },
    ],
  });
  expect(getSeedFilterSummary([{ data }]).details).toEqual([
    "Chest loot: 7 iron ingot, 2 iron nugget",
    "Iron 9",
    "Iron value in nuggets 81",
  ]);
});

import { z } from "zod";

const number = z.number().nullish().catch(undefined);
const text = z.string().nullish().catch(undefined);
const item = z.object({ type: z.string(), count: z.number() });
const structureDetails = z.object({
  chests: z
    .array(z.object({ items: z.array(item).nullish().catch(undefined) }))
    .nullish()
    .catch(undefined),
  food: z.array(item).nullish().catch(undefined),
  hasFood: z.boolean().nullish().catch(undefined),
  foodSource: text,
  foodQuality: number,
  ironCount: number,
  diamondCount: number,
  ironNuggetValue: number,
  goldenCarrotCount: number,
  goldenAppleCount: number,
  rottenFleshCount: number,
  distanceFromReferenceBlocks: number,
  nearestTreeDistanceBlocks: number,
  hasLootingSword: z.boolean().nullish().catch(undefined),
});

const itemName = (value: string) =>
  value
    .toLowerCase()
    .replace(/^minecraft:/, "")
    .replace(/_/g, " ");

const displayedChestLoot = new Set([
  "wheat",
  "iron nugget",
  "iron ingot",
  "diamond",
]);

export function getSeedFilterSummary(structures: { data: string }[]) {
  const food = new Set<string>();
  const details = new Set<string>();
  let hasFood: boolean | undefined;
  for (const structure of structures) {
    const parsed = structureDetails.safeParse(JSON.parse(structure.data));
    if (!parsed.success) continue;
    const data = parsed.data;
    const chestLoot = new Map<string, number>();
    for (const chest of data.chests ?? []) {
      for (const item of chest.items ?? []) {
        if (item.count <= 0) continue;
        const name = itemName(item.type);
        chestLoot.set(name, (chestLoot.get(name) ?? 0) + item.count);
      }
    }
    const chestLootSummary = [...chestLoot]
      .filter(([name]) => displayedChestLoot.has(name))
      .map(([name, count]) => `${count} ${name}`);
    if (chestLootSummary.length) {
      details.add(`Chest loot: ${chestLootSummary.join(", ")}`);
    }
    if (data.hasFood !== null && data.hasFood !== undefined)
      hasFood = hasFood || data.hasFood;
    for (const item of data.food ?? []) {
      if (item.count > 0) food.add(`${item.count} ${itemName(item.type)}`);
    }
    if (data.foodSource)
      food.add(
        data.foodSource === "animals"
          ? "Animals nearby"
          : data.foodSource === "chest"
            ? "Chest food"
            : itemName(data.foodSource)
      );
    if (data.foodQuality !== null && data.foodQuality !== undefined)
      food.add(`Quality ${data.foodQuality}`);
    for (const [key, label, chestItem] of [
      ["goldenCarrotCount", "golden carrots", "golden carrot"],
      ["goldenAppleCount", "golden apples", "golden apple"],
      ["rottenFleshCount", "rotten flesh", "rotten flesh"],
    ] as const) {
      const value = data[key];
      if (
        value !== null &&
        value !== undefined &&
        value > 0 &&
        chestLoot.get(chestItem) !== value
      )
        food.add(`${value} ${label}`);
    }
    for (const [key, label, chestItem] of [
      ["ironCount", "Iron", "iron ingot"],
      ["diamondCount", "Diamonds", "diamond"],
      ["ironNuggetValue", "Iron value in nuggets", ""],
    ] as const) {
      const value = data[key];
      if (
        value !== null &&
        value !== undefined &&
        chestLoot.get(chestItem) !== value
      )
        details.add(`${label} ${value}`);
    }
    if (data.hasLootingSword) details.add("Looting sword");
    if (
      data.distanceFromReferenceBlocks !== null &&
      data.distanceFromReferenceBlocks !== undefined
    )
      details.add(
        `Distance ${Math.round(data.distanceFromReferenceBlocks)} blocks`
      );
    if (
      data.nearestTreeDistanceBlocks !== null &&
      data.nearestTreeDistanceBlocks !== undefined
    )
      details.add(`Tree ${Math.round(data.nearestTreeDistanceBlocks)} blocks`);
  }
  if (food.size === 0 && hasFood !== undefined)
    food.add(hasFood ? "Available" : "No food");
  return { food: [...food], details: [...details] };
}

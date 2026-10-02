import type { KeyboardEvent } from "react";
import type z from "zod";
import type { Id } from "@/convex/_generated/dataModel";
import { SEED_TYPES, type SeedType } from "@/lib/consts";
import { getErrorMessage } from "@/lib/errors";
import { validateManualSeedForm } from "@/lib/validators";

export const MAX_SEED_IMPORT_COUNT = 500;

export type SeedFormValues = {
  type: SeedType | null;
  leagueId: Id<"leagues"> | null;
  overworld: string;
  nether: string;
  end: string;
  rng: string;
};

export type SeedFormErrors = Partial<Record<keyof SeedFormValues, string>> & {
  form?: string;
  file?: string;
};

export type SeedDimensionValues = Pick<
  SeedFormValues,
  "overworld" | "nether" | "end" | "rng"
>;

export type SeedUploadInput = {
  type: SeedType;
  leagueId?: Id<"leagues">;
  overworld: string;
  nether: string;
  end: string;
  rng: string;
};

export type SeedJsonUploadInput = Omit<SeedUploadInput, "leagueId">;

export type SeedFilterSet = z.infer<typeof validateManualSeedForm>[];

export function sanitizeSeedNumber(value: string) {
  const sign = value.startsWith("-") ? "-" : "";
  const digits = value.replace(/\D/g, "");

  return `${sign}${digits}`;
}

export function parseMinecraftSeedClipboard(
  value: string
): SeedDimensionValues | null {
  const labelToField = {
    Overworld: "overworld",
    Nether: "nether",
    "The End": "end",
    RNG: "rng",
  } as const;
  const seeds: Partial<SeedDimensionValues> = {};
  const lines = value.trim().split(/\r?\n/);

  if (lines.length !== 4) {
    return null;
  }

  for (const line of lines) {
    const match = line.match(
      /^\s*(Overworld|Nether|The End|RNG):\s*(-?\d+)\s*$/
    );

    if (!match) {
      return null;
    }

    const [, label, seed] = match;
    const field = labelToField[label as keyof typeof labelToField];

    if (seeds[field] !== undefined) {
      return null;
    }

    seeds[field] = seed;
  }

  if (
    seeds.overworld === undefined ||
    seeds.nether === undefined ||
    seeds.end === undefined ||
    seeds.rng === undefined
  ) {
    return null;
  }

  return seeds as SeedDimensionValues;
}

export function preventNonNumericSeedInput(
  event: KeyboardEvent<HTMLInputElement>
) {
  if (event.ctrlKey || event.metaKey) {
    return;
  }

  const allowedKeys = [
    "Backspace",
    "Delete",
    "Tab",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
  ];

  const isDigit = /^[0-9]$/.test(event.key);
  const isMinusSign =
    event.key === "-" &&
    event.currentTarget.selectionStart === 0 &&
    !event.currentTarget.value.includes("-");

  if (!isDigit && !isMinusSign && !allowedKeys.includes(event.key)) {
    event.preventDefault();
  }
}

export function getManualSeedFormErrors(
  issues: Array<{ message: string; path: PropertyKey[] }>
) {
  const errors: SeedFormErrors = {};

  for (const issue of issues) {
    const field = issue.path.find(isSeedFormField);

    if (field) {
      errors[field] ??= issue.message;
      continue;
    }

    errors.form ??= issue.message;
  }

  return errors;
}

export async function readSeedFilterSet(
  leagueId: Id<"leagues">,
  uploadSeedTypes: SeedType[]
): Promise<{ error: string } | { seeds: SeedFilterSet }> {
  let text: string;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    return { error: "Allow clipboard access and try again." };
  }

  const parsedSeeds = text
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((block) => {
      const lines = block.trim().split(/\r?\n/);
      const typeLine = lines.find((line) => /^\s*Type:/.test(line));
      const seeds = parseMinecraftSeedClipboard(
        lines.filter((line) => line !== typeLine).join("\n")
      );
      const typeLabel = typeLine?.replace(/^\s*Type:\s*/, "").trim();
      const type = uploadSeedTypes.find(
        (seedType) => SEED_TYPES[seedType] === typeLabel
      );
      if (!seeds || !type) return null;

      const validatedData = validateManualSeedForm.safeParse({
        ...seeds,
        type,
        leagueId,
      });
      return validatedData.success ? validatedData.data : null;
    });
  if (!parsedSeeds.every((seed) => seed !== null)) {
    return {
      error:
        'Use "copy set for seed manager" on a seed filter league set, then try again.',
    };
  }

  return { seeds: parsedSeeds };
}

export async function importSeedFilterSet(
  seeds: SeedFilterSet,
  importSeed: (seed: SeedFilterSet[number]) => Promise<unknown>
): Promise<{ added: number; failures: string[] }> {
  const failures: string[] = [];
  for (const [index, seed] of seeds.entries()) {
    try {
      await importSeed(seed);
    } catch (error) {
      failures.push(
        `Seed ${index + 1}: ${getErrorMessage(error, "Could not add this seed")}`
      );
    }
  }

  return { added: seeds.length - failures.length, failures };
}

export function isSeedFormField(value: unknown): value is keyof SeedFormValues {
  return (
    value === "type" ||
    value === "leagueId" ||
    value === "overworld" ||
    value === "nether" ||
    value === "end" ||
    value === "rng"
  );
}

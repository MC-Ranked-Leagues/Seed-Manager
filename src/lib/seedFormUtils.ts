import type { KeyboardEvent } from "react";
import type z from "zod";
import type { Id } from "@/convex/_generated/dataModel";
import { SEED_TYPES, type SeedType } from "./consts";
import { getErrorMessage } from "./errors";
import { validateManualSeedForm } from "./validators";

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

export async function importSeedFilterSet(
  leagueId: Id<"leagues">,
  uploadSeedTypes: SeedType[],
  importSeed: (seed: z.infer<typeof validateManualSeedForm>) => Promise<unknown>
): Promise<{ error: string } | { added: number; failures: string[] }> {
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
      return seeds && type ? { ...seeds, type } : null;
    });
  if (parsedSeeds.some((seed) => !seed)) {
    return {
      error:
        'Use "copy set for seed manager" on a seed filter league set, then try again.',
    };
  }

  const failures: string[] = [];
  for (const [index, parsedSeed] of parsedSeeds.entries()) {
    const validatedData = validateManualSeedForm.safeParse({
      ...parsedSeed,
      leagueId,
    });
    if (!validatedData.success) {
      failures.push(`Seed ${index + 1}: invalid seed values`);
      continue;
    }
    try {
      await importSeed(validatedData.data);
    } catch (error) {
      failures.push(
        `Seed ${index + 1}: ${getErrorMessage(error, "Could not add this seed")}`
      );
    }
  }

  return { added: parsedSeeds.length - failures.length, failures };
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

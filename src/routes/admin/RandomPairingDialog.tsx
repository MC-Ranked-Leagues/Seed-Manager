import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/errors";
import { FilterSelect } from "./FilterSelect";
import { SeedFilterDetails } from "./SeedFilterDetails";

type PairingArgs = FunctionArgs<typeof api.seedFilter.randomPairing>;
const rngFields = [
  ["flintInXGravel", "First flint within gravel", "Any"],
  ["blazeRods", "Minimum blaze rods", "Any"],
  ["blazeKills", "Blaze kills", "11"],
  ["firstEyeBreak", "Earliest eye break throw", "Any"],
  ["obsidianCount", "Minimum obsidian", "Any"],
  ["obsidianTrades", "Obsidian trades", "72"],
  ["pearlsCount", "Minimum pearls", "Any"],
  ["pearlsTrades", "Pearl trades", "72"],
] as const;

export function RandomPairingDialog({ onClose }: { onClose: () => void }) {
  const getCategories = useAction(api.seedFilter.categories);
  const generate = useAction(api.seedFilter.randomPairing);
  const [categories, setCategories] = useState<{
    overworld: string[];
    nether: string[];
  } | null>(null);
  const [selected, setSelected] = useState({
    overworld: [] as string[],
    nether: [] as string[],
  });
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [villageType, setVillageType] = useState<
    NonNullable<PairingArgs["villageType"]> | ""
  >("");
  const [enterMethod, setEnterMethod] = useState<
    NonNullable<PairingArgs["enterMethod"]> | ""
  >("");
  const [customRng, setCustomRng] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FunctionReturnType<
    typeof api.seedFilter.randomPairing
  > | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([
      getCategories({ dimension: "OVERWORLD" }),
      getCategories({ dimension: "NETHER" }),
    ])
      .then(([overworld, nether]) => {
        if (active) {
          setCategories({ overworld, nether });
          setSelected({ overworld, nether });
        }
      })
      .catch((err: unknown) => {
        if (active)
          setCategoryError(getErrorMessage(err, "Could not load categories."));
      });
    return () => {
      active = false;
    };
  }, [getCategories, revision]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Random pairing</DialogTitle>
          <DialogDescription>
            Generate a pairing from unused filtered seeds. You can choose one or
            both dimensions.
          </DialogDescription>
        </DialogHeader>
        {categoryError ? (
          <div role="alert" className="space-y-3">
            <p className="text-destructive">{categoryError}</p>
            <Button
              variant="outline"
              onClick={() => {
                setCategoryError(null);
                setRevision((value) => value + 1);
              }}
            >
              Try again
            </Button>
          </div>
        ) : !categories ? (
          <div role="status" className="flex gap-2">
            <Spinner /> Loading categories…
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (pending) return;
              const form = new FormData(event.currentTarget);
              const args: PairingArgs = {
                overworldCategories: selected.overworld,
                netherCategories: selected.nether,
                useCustomRng: customRng,
              };
              for (const key of ["minEvalScore", "maxEvalScore"] as const) {
                const value = form.get(key);
                if (typeof value === "string" && value.trim())
                  args[key] = Number(value);
              }
              if (selected.overworld.includes("village") && villageType)
                args.villageType = villageType;
              if (selected.overworld.includes("rp") && enterMethod)
                args.enterMethod = enterMethod;
              if (customRng)
                for (const [key] of rngFields) {
                  const value = form.get(key);
                  if (typeof value === "string" && value.trim())
                    args[key] = Number(value);
                }
              setPending(true);
              setResult(null);
              setError(null);
              void generate(args)
                .then(setResult)
                .catch((err: unknown) =>
                  setError(
                    getErrorMessage(err, "Could not generate a pairing.")
                  )
                )
                .finally(() => setPending(false));
            }}
          >
            <fieldset
              disabled={pending}
              className="space-y-4"
              onChange={() => {
                setResult(null);
                setError(null);
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                {(["overworld", "nether"] as const).map((dimension) => (
                  <fieldset key={dimension} className="space-y-2">
                    <legend className="mb-2 text-sm font-medium">
                      {dimension === "overworld"
                        ? "Overworld categories"
                        : "Nether categories"}
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {categories[dimension].map((category) => {
                        const isSelected =
                          selected[dimension].includes(category);
                        return (
                          <Button
                            key={category}
                            type="button"
                            size="sm"
                            variant="outline"
                            className={
                              isSelected
                                ? "border-primary hover:border-primary hover:bg-primary/10"
                                : "border-destructive hover:border-destructive hover:bg-destructive/10"
                            }
                            aria-pressed={isSelected}
                            onClick={() => {
                              setResult(null);
                              setError(null);
                              setSelected((current) => ({
                                ...current,
                                [dimension]: current[dimension].includes(
                                  category
                                )
                                  ? current[dimension].filter(
                                      (value) => value !== category
                                    )
                                  : [...current[dimension], category],
                              }));
                            }}
                          >
                            {category}
                          </Button>
                        );
                      })}
                    </div>
                    {categories[dimension].length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No categories available.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResult(null);
                          setSelected((current) => ({
                            ...current,
                            [dimension]: categories[dimension],
                          }));
                        }}
                      >
                        Select all
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResult(null);
                          setSelected((current) => ({
                            ...current,
                            [dimension]: [],
                          }));
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </fieldset>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_5.5rem_5.5rem]">
                {selected.overworld.includes("village") && (
                  <div className="md:col-start-1">
                    <FilterSelect
                      label="Village type"
                      value={villageType}
                      options={[
                        ["", "Any"],
                        ...[
                          "DESERT",
                          "PLAINS",
                          "SAVANNA",
                          "SNOWY",
                          "TAIGA",
                          "LEGACY",
                        ].map((value): [string, string] => [
                          value,
                          value.toLowerCase(),
                        ]),
                      ]}
                      onChange={(value) => {
                        setVillageType(value as typeof villageType);
                        setResult(null);
                      }}
                    />
                  </div>
                )}
                {selected.overworld.includes("rp") && (
                  <div className="md:col-start-2">
                    <FilterSelect
                      label="Portal entry method"
                      value={enterMethod}
                      options={[
                        ["", "Any"],
                        ["lava_pool", "Lava pool"],
                        [
                          "obsidian_with_chest_patch",
                          "Obsidian with chest patch",
                        ],
                      ]}
                      onChange={(value) => {
                        setEnterMethod(value as typeof enterMethod);
                        setResult(null);
                      }}
                    />
                  </div>
                )}
                {(["minEvalScore", "maxEvalScore"] as const).map(
                  (key, index) => (
                    <div
                      key={key}
                      className={
                        index === 0
                          ? "space-y-2 md:col-start-3"
                          : "space-y-2 md:col-start-4"
                      }
                    >
                      <Label htmlFor={`pair-${key}`}>
                        {key === "minEvalScore"
                          ? "Minimum eval"
                          : "Maximum eval"}
                      </Label>
                      <Input
                        id={`pair-${key}`}
                        name={key}
                        type="number"
                        step="1"
                        placeholder="Any"
                      />
                    </div>
                  )
                )}
              </div>
              <div className="max-w-64">
                <FilterSelect
                  label="RNG mode"
                  value={customRng ? "custom" : "derived"}
                  options={[
                    ["derived", "Derive from overworld seed"],
                    ["custom", "Find RNG matching criteria"],
                  ]}
                  onChange={(value) => {
                    setCustomRng(value === "custom");
                    setResult(null);
                  }}
                />
              </div>
              {customRng && (
                <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {rngFields
                    .filter(([key]) =>
                      ["flintInXGravel", "firstEyeBreak"].includes(key)
                    )
                    .map(([key, label, placeholder]) => (
                      <div
                        key={key}
                        className="grid grid-rows-[1.5rem_auto] gap-2"
                      >
                        <Label htmlFor={`pair-${key}`} className="self-start">
                          {label}
                        </Label>
                        <Input
                          id={`pair-${key}`}
                          name={key}
                          type="number"
                          min="0"
                          step="1"
                          placeholder={placeholder}
                          className="max-w-32"
                        />
                      </div>
                    ))}
                  {[
                    {
                      id: "blaze",
                      label: "Blaze rods / kills",
                      fields: [rngFields[1], rngFields[2]],
                    },
                    {
                      id: "obsidian",
                      label: "Obsidian / trades",
                      fields: [rngFields[4], rngFields[5]],
                    },
                    {
                      id: "pearls",
                      label: "Ender pearls / trades",
                      fields: [rngFields[6], rngFields[7]],
                    },
                  ].map(({ id, label, fields }) => (
                    <div
                      key={label}
                      role="group"
                      aria-labelledby={`pair-${id}-label`}
                      className="grid grid-rows-[1.5rem_auto] gap-2"
                    >
                      <span
                        id={`pair-${id}-label`}
                        className="self-start text-xs leading-none font-medium"
                      >
                        {label}
                      </span>
                      <div className="flex max-w-40 items-center gap-1.5">
                        {fields.map(([key, fieldLabel, placeholder], index) => (
                          <div key={key} className="contents">
                            {index > 0 && (
                              <span
                                aria-hidden="true"
                                className="text-muted-foreground"
                              >
                                /
                              </span>
                            )}
                            <Label htmlFor={`pair-${key}`} className="sr-only">
                              {fieldLabel}
                            </Label>
                            <Input
                              id={`pair-${key}`}
                              name={key}
                              type="number"
                              min="0"
                              step="1"
                              placeholder={placeholder}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!customRng && selected.overworld.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Select an overworld category or use custom RNG to include an
                  RNG seed.
                </p>
              )}
            </fieldset>
            <Button
              type="submit"
              disabled={
                pending ||
                (!selected.overworld.length && !selected.nether.length)
              }
            >
              {pending && <Spinner />}
              {pending ? "Generating…" : "Generate pairing"}
            </Button>
          </form>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {result && (
          <div className="space-y-4 border-t pt-4" aria-live="polite">
            <h3 className="text-sm font-semibold">Generated pairing</h3>
            {(["overworld", "nether"] as const).map((dimension) => (
              <div key={dimension} className="space-y-3">
                <h4 className="font-medium">
                  {dimension === "overworld" ? "Overworld" : "Nether"}
                </h4>
                {result[dimension] ? (
                  <SeedFilterDetails hit={result[dimension]} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {selected[dimension].length
                      ? "No seed matched these criteria."
                      : "No categories selected."}
                  </p>
                )}
              </div>
            ))}
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="font-medium">RNG</h4>
              {result.rng ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <code className="break-all">{result.rng.rngSeed}</code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(result.rng!.rngSeed)
                          .then(() => toast.success("RNG seed copied"))
                          .catch(() => toast.error("Could not copy RNG seed."));
                      }}
                    >
                      Copy RNG seed
                    </Button>
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["First flint at gravel", result.rng.firstFlintGravel],
                      [
                        "Blaze rods / kills",
                        `${result.rng.blazeRods} / ${result.rng.blazeKills}`,
                      ],
                      [
                        "First eye break throw",
                        result.rng.eyeFirstBreakThrow < 0
                          ? "No break in tracked throws"
                          : result.rng.eyeFirstBreakThrow,
                      ],
                      [
                        "Obsidian / trades",
                        `${result.rng.obsidianCount} / ${result.rng.obsidianTrades}`,
                      ],
                      [
                        "Pearls / trades",
                        `${result.rng.pearlsCount} / ${result.rng.pearlsTrades}`,
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-xs text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="font-mono text-sm">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {customRng
                    ? "No RNG seed matched these criteria."
                    : "No RNG seed available without an overworld seed."}
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { getSeedFilterSummary } from "@/lib/seedFilterPresentation";
import { FilterSelect } from "./FilterSelect";
import { SeedFilterScore } from "./SeedFilterScore";
import { ValidateSeedDialog } from "./ValidateSeedDialog";
import { RandomPairingDialog } from "./RandomPairingDialog";
import { useEffect, useState } from "react";
import { useAction } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/errors";
import { FilteredSeedDialog } from "./FilteredSeedDialog";

type Dimension = "OVERWORLD" | "NETHER";
const numericFilters: [string, string][] = [
  ["minScore", "Minimum score"],
  ["maxDistance", "Maximum distance"],
  ["minMagmaRavines", "Minimum magma ravines"],
  ["maxMagmaRavineDistance", "Maximum ravine distance"],
  ["minStableTriples", "Minimum stable triples"],
  ["minStableGaps", "Minimum stable gaps"],
  ["minVariableGoldBlocks", "Minimum variable gold blocks"],
  ["minIronCount", "Minimum iron"],
  ["minDiamondCount", "Minimum diamonds"],
  ["minGoldenCarrotCount", "Minimum golden carrots"],
  ["minGoldenAppleCount", "Minimum golden apples"],
  ["minRottenFleshCount", "Minimum rotten flesh"],
  ["maxRiverDistance", "Maximum river distance"],
];

export function AdminFilteringPage() {
  const list = useAction(api.seedFilter.list);
  const getCategories = useAction(api.seedFilter.categories);
  const [tool, setTool] = useState<"validate" | "pairing" | null>(null);
  const [dimension, setDimension] = useState<Dimension>("OVERWORLD");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortBy, setSortBy] = useState<"eval" | "time">("eval");
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const requestKey = JSON.stringify({
    dimension,
    filters,
    sortBy,
    offset,
    revision,
  });
  const categoryKey = `${dimension}:${revision}`;
  const [categoryState, setCategoryState] = useState<{
    key: string;
    data: string[];
    error: string | null;
  } | null>(null);
  const [resultState, setResultState] = useState<{
    key: string;
    data: FunctionReturnType<typeof api.seedFilter.list> | null;
    error: string | null;
  } | null>(null);
  const categories =
    categoryState?.key === categoryKey ? categoryState.data : [];
  const categoryError =
    categoryState?.key === categoryKey ? categoryState.error : null;
  const result = resultState?.key === requestKey ? resultState.data : null;
  const error = resultState?.key === requestKey ? resultState.error : null;
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    void list({ dimension, filters, sortBy, offset })
      .then((data) => {
        if (active) setResultState({ key: requestKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (active)
          setResultState({
            key: requestKey,
            data: null,
            error: getErrorMessage(err, "Could not load filtered seeds."),
          });
      });
    return () => {
      active = false;
    };
  }, [dimension, filters, sortBy, offset, requestKey, list]);

  useEffect(() => {
    let active = true;
    void getCategories({ dimension })
      .then((data) => {
        if (active) setCategoryState({ key: categoryKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (active)
          setCategoryState({
            key: categoryKey,
            data: [],
            error: getErrorMessage(err, "Could not load categories."),
          });
      });
    return () => {
      active = false;
    };
  }, [dimension, categoryKey, getCategories]);

  const update = (key: string, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const loading = result === null && error === null;

  return (
    <section className="flex flex-col gap-5 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Seed filtering</h2>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setTool("validate")}>
            Validate seed
          </Button>
          <Button variant="outline" onClick={() => setTool("pairing")}>
            Random pairing
          </Button>
          <Button
            variant="outline"
            onClick={() => setRevision((value) => value + 1)}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex gap-2" role="group" aria-label="Dimension">
        {(["OVERWORLD", "NETHER"] as const).map((value) => (
          <Button
            key={value}
            variant={dimension === value ? "default" : "outline"}
            aria-pressed={dimension === value}
            onClick={() => {
              setDimension(value);
              setDraft({});
              setFilters({});
              setOffset(0);
              setSelectedId(null);
            }}
          >
            {value === "OVERWORLD" ? "Overworld" : "Nether"}
          </Button>
        ))}
      </div>

      <Card size="sm">
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setFilters({ ...draft });
              setOffset(0);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="filter-seed">Exact seed</Label>
                <Input
                  id="filter-seed"
                  value={draft.seed ?? ""}
                  onChange={(event) => update("seed", event.target.value)}
                  placeholder="World seed"
                  autoComplete="off"
                />
              </div>
              <FilterSelect
                label="Category"
                value={draft.category ?? ""}
                options={[
                  ["", "All categories"],
                  ...categories.map((value): [string, string] => [
                    value,
                    value,
                  ]),
                ]}
                onChange={(value) => update("category", value)}
              />
              <FilterSelect
                label="Sort by"
                value={sortBy}
                options={[
                  ["eval", "Eval"],
                  ["time", "Recently found"],
                ]}
                onChange={(value) => {
                  setSortBy(value as "eval" | "time");
                  setOffset(0);
                }}
              />
              <FilterSelect
                label="Usage"
                value={draft.includeUsed ?? "false"}
                options={[
                  ["false", "Unused only"],
                  ["true", "Include used"],
                ]}
                onChange={(value) => update("includeUsed", value)}
              />
            </div>
            {categoryError && (
              <p role="alert" className="text-sm text-destructive">
                {categoryError}
              </p>
            )}
            <details>
              <summary className="cursor-pointer text-sm font-medium">
                Score, distance and loot filters
              </summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {numericFilters.map(([key, label]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={`filter-${key}`}>{label}</Label>
                    <Input
                      id={`filter-${key}`}
                      type="number"
                      min={key === "minScore" ? undefined : 0}
                      step={
                        key.toLowerCase().includes("distance") ? "any" : "1"
                      }
                      value={draft[key] ?? ""}
                      onChange={(event) => update(key, event.target.value)}
                      placeholder="Any"
                    />
                  </div>
                ))}
                {(
                  [
                    ["hasFood", "Food"],
                    ["hasLootingSword", "Looting sword"],
                  ] as const
                ).map(([key, label]) => (
                  <FilterSelect
                    key={key}
                    label={label}
                    value={draft[key] ?? ""}
                    options={[
                      ["", "Any"],
                      ["true", "Yes"],
                      ["false", "No"],
                    ]}
                    onChange={(value) => update(key, value)}
                  />
                ))}
                <FilterSelect
                  label="Light source"
                  value={draft.lightSource ?? ""}
                  options={[
                    ["", "Any"],
                    ["flint_and_steel", "Flint and steel"],
                    ["fire_charge", "Fire charge"],
                    ["crafted_flint_and_steel", "Crafted flint and steel"],
                  ]}
                  onChange={(value) => update("lightSource", value)}
                />
              </div>
            </details>
            <div className="flex gap-2">
              <Button type="submit">Apply filters</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraft({});
                  setFilters({});
                  setOffset(0);
                }}
              >
                Reset filters
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <div role="alert" className="space-y-3 rounded-lg border p-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            onClick={() => setRevision((value) => value + 1)}
          >
            Try again
          </Button>
        </div>
      ) : loading ? (
        <div
          role="status"
          className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"
        >
          <Spinner /> Loading filtered seeds…
        </div>
      ) : (
        result && (
          <>
            {result.hits.length === 0 ? (
              <div className="rounded-lg border p-10 text-center">
                <h3 className="font-medium">No seeds found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try different filters or browse the other dimension.
                </p>
              </div>
            ) : (
              <Table
                containerClassName="rounded-md border"
                className="min-w-180"
              >
                <TableHeader>
                  <TableRow>
                    <TableHead>World seed</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Eval</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Info</TableHead>
                    <TableHead>Found</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <span className="sr-only">Details</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.hits.map((hit) => {
                    const summary = getSeedFilterSummary(hit.structures);
                    const info = [...summary.food, ...summary.details].join(
                      " · "
                    );
                    return (
                      <TableRow key={hit.id}>
                        <TableCell className="font-mono">
                          {hit.worldSeed}
                        </TableCell>
                        <TableCell>{hit.category}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {hit.evalScore}
                        </TableCell>
                        <TableCell>
                          <SeedFilterScore structures={hit.structures} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {info || "Not recorded"}
                        </TableCell>
                        <TableCell>
                          {new Date(hit.foundAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={hit.used ? "secondary" : "outline"}>
                            {hit.used ? "Used" : "Unused"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedId(hit.id)}
                            aria-label={`View ${hit.worldSeed}`}
                          >
                            View details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Page {offset / 25 + 1}
                {result.hits.length > 0 &&
                  ` · Showing ${offset + 1}–${offset + result.hits.length}`}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={offset === 0}
                  onClick={() => setOffset((value) => Math.max(0, value - 25))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={!result.hasNext}
                  onClick={() => setOffset((value) => value + 25)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )
      )}
      {tool === "validate" && (
        <ValidateSeedDialog
          initialDimension={dimension}
          onClose={() => setTool(null)}
        />
      )}
      {tool === "pairing" && (
        <RandomPairingDialog onClose={() => setTool(null)} />
      )}
      {selectedId !== null && (
        <FilteredSeedDialog
          key={selectedId}
          id={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </section>
  );
}

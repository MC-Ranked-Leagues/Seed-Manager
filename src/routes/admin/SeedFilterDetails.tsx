import { getSeedFilterSummary } from "@/lib/seedFilterPresentation";
import type { FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import type { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SeedFilterScore } from "./SeedFilterScore";

export function SeedFilterDetails({
  hit,
}: {
  hit:
    | FunctionReturnType<typeof api.seedFilter.get>
    | FunctionReturnType<typeof api.seedFilter.validate>;
}) {
  const summary = getSeedFilterSummary(hit.structures);
  return (
    <>
      <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <code className="text-lg break-all">{hit.worldSeed}</code>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void navigator.clipboard
                .writeText(hit.worldSeed)
                .then(() => toast.success("Seed copied"))
                .catch(() =>
                  toast.error(
                    "Could not copy seed. Select and copy it manually."
                  )
                );
            }}
          >
            Copy seed
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {"category" in hit && (
            <Badge variant="secondary">{hit.category}</Badge>
          )}
          <Badge variant="outline">Eval {hit.evalScore}</Badge>
          {"used" in hit && (
            <Badge variant="outline">{hit.used ? "Used" : "Unused"}</Badge>
          )}
        </div>
        {"foundAt" in hit && (
          <p className="text-muted-foreground">
            Found {new Date(hit.foundAt).toLocaleString()}
          </p>
        )}
        <div className="text-xs">
          <span className="text-muted-foreground">Score </span>
          <SeedFilterScore structures={hit.structures} />
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Food</dt>
            <dd>{summary.food.join(" · ") || "Not recorded"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Loot and distance</dt>
            <dd>{summary.details.join(" · ") || "Not recorded"}</dd>
          </div>
        </dl>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ["Magma ravines", hit.magmaRavineCount],
          ["Nearest magma ravine", hit.nearestMagmaRavineDistance],
          ["End buriedness height", hit.endBuriednessHeight],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono">{value ?? "Not recorded"}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">
          Structures{" "}
          <span className="text-muted-foreground">{hit.structures.length}</span>
        </h3>
        {hit.structures.length === 0 && (
          <p className="text-muted-foreground">No structures recorded.</p>
        )}
        {hit.structures.map((structure, index) => (
          <div
            key={`${structure.structureName}-${index}`}
            className="rounded-lg border p-3"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h4 className="font-medium">
                {structure.structureName.replace(/_/g, " ")}
              </h4>
              <span className="font-mono text-muted-foreground">
                Chunk X {structure.chunkX}, Z {structure.chunkZ}
              </span>
            </div>
            <p className="mt-1 text-muted-foreground">
              Block origin X {structure.chunkX * 16}, Z {structure.chunkZ * 16}
            </p>
            {structure.score !== null && (
              <p className="mt-2 font-medium">Score {structure.score}</p>
            )}
            {structure.data !== "null" && (
              <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(JSON.parse(structure.data), null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
      {hit.notes !== "null" && (
        <details>
          <summary className="cursor-pointer font-medium">
            Pipeline notes
          </summary>
          <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(JSON.parse(hit.notes), null, 2)}
          </pre>
        </details>
      )}
    </>
  );
}

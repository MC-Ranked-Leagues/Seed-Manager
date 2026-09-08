import { useState } from "react";
import { useAction } from "convex/react";
import type { FunctionReturnType } from "convex/server";
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
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/errors";
import { FilterSelect } from "./FilterSelect";
import { SeedFilterDetails } from "./SeedFilterDetails";

export function ValidateSeedDialog({
  initialDimension,
  onClose,
}: {
  initialDimension: "OVERWORLD" | "NETHER";
  onClose: () => void;
}) {
  const validate = useAction(api.seedFilter.validate);
  const [dimension, setDimension] = useState(initialDimension);
  const [seed, setSeed] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FunctionReturnType<
    typeof api.seedFilter.validate
  > | null>(null);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Validate seed</DialogTitle>
          <DialogDescription>
            Check a world seed against the current filters for one dimension.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (pending) return;
            setPending(true);
            setError(null);
            setResult(null);
            void validate({ dimension, seed: seed.trim() })
              .then(setResult)
              .catch((err: unknown) =>
                setError(getErrorMessage(err, "Could not validate this seed."))
              )
              .finally(() => setPending(false));
          }}
        >
          <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="validate-world-seed">World seed</Label>
              <Input
                id="validate-world-seed"
                required
                value={seed}
                autoComplete="off"
                placeholder="Signed 64-bit seed"
                onChange={(event) => {
                  setSeed(event.target.value);
                  setResult(null);
                  setError(null);
                }}
              />
            </div>
            <FilterSelect
              label="Validation dimension"
              value={dimension}
              options={[
                ["OVERWORLD", "Overworld"],
                ["NETHER", "Nether"],
              ]}
              onChange={(value) => {
                setDimension(value as typeof dimension);
                setResult(null);
                setError(null);
              }}
            />
          </fieldset>
          <Button type="submit" disabled={pending || !seed.trim()}>
            {pending && <Spinner />}
            {pending ? "Validating…" : "Validate seed"}
          </Button>
        </form>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {result && (
          <div className="space-y-4" aria-live="polite">
            <div className="flex flex-wrap gap-2">
              <Badge variant={result.passed ? "secondary" : "outline"}>
                {result.passed ? "Passed filters" : "Did not pass filters"}
              </Badge>
              <Badge variant="outline">
                {result.dimension === "OVERWORLD" ? "Overworld" : "Nether"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Structure seed <code>{result.structureSeed}</code>
            </p>
            <SeedFilterDetails hit={result} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { SeedFilterDetails } from "./SeedFilterDetails";
import { useEffect, useState } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/errors";

export function FilteredSeedDialog({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  const get = useAction(api.seedFilter.get);
  const [hit, setHit] = useState<FunctionReturnType<
    typeof api.seedFilter.get
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void get({ id })
      .then((value) => {
        if (active) setHit(value);
      })
      .catch((err: unknown) => {
        if (active) setError(getErrorMessage(err, "Could not load this seed."));
      });
    return () => {
      active = false;
    };
  }, [id, get, revision]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {hit
              ? `${hit.dimension === "OVERWORLD" ? "Overworld" : "Nether"} seed`
              : "Filtered seed"}
          </DialogTitle>
          <DialogDescription>
            Structures and evaluation data recorded by the experimental filter.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <div role="alert" className="space-y-3">
            <p className="text-destructive">{error}</p>
            <Button
              variant="outline"
              onClick={() => {
                setHit(null);
                setError(null);
                setRevision((value) => value + 1);
              }}
            >
              Try again
            </Button>
          </div>
        ) : !hit ? (
          <div role="status" className="flex items-center gap-2 py-8">
            <Spinner /> Loading seed…
          </div>
        ) : (
          <SeedFilterDetails hit={hit} />
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useMutation, useQuery } from "convex/react";
import { ClipboardPasteIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { getUploadSeedTypes } from "@/lib/consts";
import {
  importSeedFilterSet,
  readSeedFilterSet,
  type SeedFilterSet,
} from "@/lib/seedFormUtils";

export function ImportSeedFilterSetButton({
  league,
}: {
  league: Doc<"leagues">;
}) {
  const importSeeds = useMutation(api.seeds.importSeeds);
  const settings = useQuery(api.settings.current);
  const [pendingSeeds, setPendingSeeds] = useState<SeedFilterSet | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    added: number;
    failures: string[];
  } | null>(null);

  const prepareImport = async () => {
    if (busy || settings === undefined) return;

    setBusy(true);
    setResult(null);
    try {
      const prepared = await readSeedFilterSet(
        league._id,
        getUploadSeedTypes(settings?.enableJunglePyramidSeeds ?? false)
      );
      if ("error" in prepared) {
        toast.error("Set not imported", { description: prepared.error });
        return;
      }
      setPendingSeeds(prepared.seeds);
    } finally {
      setBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!pendingSeeds || busy || result) return;

    setBusy(true);
    try {
      const imported = await importSeedFilterSet(pendingSeeds, (seed) =>
        importSeeds({ seed })
      );
      if (imported.failures.length === 0) {
        toast.success(
          `${imported.added} ${imported.added === 1 ? "seed" : "seeds"} added to ${league.leagueName}`
        );
        setPendingSeeds(null);
        return;
      }
      setResult(imported);
      toast.error(
        `${imported.added} of ${pendingSeeds.length} seeds added to ${league.leagueName}`,
        { description: imported.failures.join("\n") }
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        disabled={busy || settings === undefined}
        onClick={() => void prepareImport()}
        size="sm"
        type="button"
        variant="outline"
      >
        {busy ? <Spinner /> : <ClipboardPasteIcon />}
        Import set from seed filter
      </Button>
      <AlertDialog
        open={pendingSeeds !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingSeeds(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {result ? "Set import results" : "Import this set?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {result ? (
                <>
                  {result.added} of {pendingSeeds?.length} seeds added to{" "}
                  {league.leagueName}.
                </>
              ) : (
                <>
                  Add {pendingSeeds?.length}{" "}
                  {pendingSeeds?.length === 1 ? "seed" : "seeds"} from your
                  clipboard to {league.leagueName}? If some seeds fail, the
                  others will still be added.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {result && (
            <ul className="max-h-60 overflow-y-auto text-xs text-destructive">
              {result.failures.map((failure) => (
                <li key={failure}>{failure}</li>
              ))}
            </ul>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>
              {result ? "Close" : "Cancel"}
            </AlertDialogCancel>
            {!result && (
              <AlertDialogAction
                disabled={busy}
                onClick={() => void confirmImport()}
                type="button"
              >
                {busy && <Spinner data-icon="inline-start" />}
                {busy ? "Importing..." : "Import set"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

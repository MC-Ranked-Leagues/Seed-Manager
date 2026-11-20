import { useEffect, useRef, useState } from "react";
import { useAction } from "convex/react";
import {
  AlertCircle,
  Download,
  Film,
  Loader2,
  Play,
  Upload,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/errors";
import {
  fetchPublishedSeedOrder,
  getReplayOverworldSeed,
  getWatchReplayUrl,
  uploadReplayFile,
} from "@/lib/replay";

interface ReplayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed: Doc<"seeds">;
  leagueNumber: number | undefined;
  canUpload: boolean;
  uploadPaused: boolean;
}

export function ReplayDialog({
  open,
  onOpenChange,
  seed,
  leagueNumber,
  canUpload,
  uploadPaused,
}: ReplayDialogProps) {
  const requestUpload = useAction(api.replayStorage.requestReplayUpload);
  const confirmUpload = useAction(api.replayStorage.confirmReplayUpload);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // keyed by seed so a stale order never shows for a different seed
  const [publishedOrder, setPublishedOrder] = useState<{
    seedId: string;
    order: number | null;
  } | null>(null);

  const weekNumber = seed.assignedWeekNumber;
  const hasReplay = Boolean(seed.replayKey);
  const matchOrder =
    publishedOrder?.seedId === seed._id ? publishedOrder.order : null;

  useEffect(() => {
    if (!open || !hasReplay || !leagueNumber || !weekNumber) return;

    const controller = new AbortController();
    fetchPublishedSeedOrder(
      leagueNumber,
      weekNumber,
      seed.overworld,
      controller.signal
    )
      .then((order) => setPublishedOrder({ seedId: seed._id, order }))
      .catch(() => {});
    return () => controller.abort();
  }, [open, hasReplay, leagueNumber, weekNumber, seed._id, seed.overworld]);

  async function handleFileSelect(file: File) {
    setIsUploading(true);
    setError(null);

    try {
      // check the replay is for THIS seed before uploading anything
      if (getReplayOverworldSeed(await file.arrayBuffer()) !== seed.overworld) {
        throw new Error("This replay was recorded on a different seed.");
      }

      await uploadReplayFile(
        file,
        (contentType) => requestUpload({ seedId: seed._id, contentType }),
        () => confirmUpload({ seedId: seed._id })
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to upload replay"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (isUploading) {
      return;
    }

    if (!nextOpen) {
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Replay</DialogTitle>
          <DialogDescription>
            {seed.replayKey
              ? `Replay for seed #${seed.seedNumber ?? "unknown"}.`
              : `No replay uploaded for seed #${seed.seedNumber ?? "unknown"} yet.`}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".rrf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleFileSelect(file);
            }
          }}
        />

        {seed.replayKey && (
          <div className="flex items-center gap-2 rounded-lg border p-3">
            <Film className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs">
              {seed.replayKey.split("/").pop()}
            </span>
            <a
              href={`${import.meta.env.VITE_CONVEX_SITE_URL}/api/seeds/replay?key=${encodeURIComponent(seed.replayKey)}`}
              aria-label="Download replay"
              title="Download replay"
              className={buttonVariants({
                variant: "outline",
                size: "icon-sm",
              })}
            >
              <Download />
            </a>
            {leagueNumber && weekNumber && matchOrder !== null && (
              <a
                href={getWatchReplayUrl(leagueNumber, weekNumber, matchOrder)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Watch replay"
                title="Watch replay"
                className={buttonVariants({
                  variant: "outline",
                  size: "icon-sm",
                })}
              >
                <Play />
              </a>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p className="leading-snug">{error}</p>
          </div>
        )}
        {canUpload && uploadPaused && (
          <p className="text-xs text-muted-foreground">
            Uploads are disabled while seed testing is paused.
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            disabled={isUploading}
            onClick={() => handleDialogOpenChange(false)}
          >
            Close
          </Button>
          {canUpload && (
            <Button
              disabled={isUploading || uploadPaused}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Upload data-icon="inline-start" />
              )}
              {isUploading
                ? "Uploading…"
                : seed.replayKey
                  ? "Replace replay"
                  : "Upload replay"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

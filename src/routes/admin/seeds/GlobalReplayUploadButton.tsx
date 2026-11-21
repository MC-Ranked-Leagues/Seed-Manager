import { useEffect, useRef, useState } from "react";
import { useAction, useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ReplayUploadSection } from "@/components/ReplayUploadSection";
import {
  ReplayUploadStatusIcon,
  type ReplayUploadStatus,
} from "@/components/ReplayUploadStatusIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { getErrorMessage } from "@/lib/errors";
import { getReplayOverworldSeed, uploadReplayFile } from "@/lib/replay";

type ReplaySeed = FunctionReturnType<
  typeof api.seedManagement.findReplaySeeds
>[number];

type MatchedReplay = {
  file: File;
  seed: ReplaySeed;
  status: ReplayUploadStatus;
  error?: string;
};

type ReplayPlan = {
  fileCount: number;
  // seeds without a replay, uploaded together
  paired: MatchedReplay[];
  // seeds that already have a replay, only replaced one at a time
  existing: MatchedReplay[];
  invalid: string[];
  unmatched: { fileName: string; overworld: string }[];
  duplicates: { fileName: string; seed: ReplaySeed }[];
};

export function GlobalReplayUploadButton({ disabled }: { disabled: boolean }) {
  const convex = useConvex();
  const requestUpload = useAction(api.replayStorage.requestReplayUpload);
  const confirmUpload = useAction(api.replayStorage.confirmReplayUpload);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<ReplayPlan | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);

  // warn before closing or reloading the tab mid-upload
  useEffect(() => {
    if (!isUploading) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isUploading]);

  async function handleFilesSelect(files: File[]) {
    setIsReading(true);
    try {
      setPlan(
        await buildReplayPlan(files, (overworlds) =>
          convex.query(api.seedManagement.findReplaySeeds, { overworlds })
        )
      );
      setHasUploaded(false);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not read the replays"));
    } finally {
      setIsReading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function updateMatched(seedId: Id<"seeds">, update: Partial<MatchedReplay>) {
    const apply = (items: MatchedReplay[]) =>
      items.map((item) =>
        item.seed.seedId === seedId ? { ...item, ...update } : item
      );
    setPlan((current) =>
      current
        ? {
            ...current,
            paired: apply(current.paired),
            existing: apply(current.existing),
          }
        : current
    );
  }

  async function uploadOne({ file, seed }: MatchedReplay) {
    updateMatched(seed.seedId, { status: "uploading", error: undefined });
    try {
      await uploadReplayFile(
        file,
        (contentType) => requestUpload({ seedId: seed.seedId, contentType }),
        () => confirmUpload({ seedId: seed.seedId })
      );
      updateMatched(seed.seedId, { status: "uploaded" });
    } catch (err) {
      updateMatched(seed.seedId, {
        status: "failed",
        error: getErrorMessage(err, "Failed to upload replay"),
      });
    }
  }

  // uploads everything not yet uploaded, so it also retries failures
  async function handleUpload() {
    if (!plan) return;

    setIsUploading(true);
    for (const item of plan.paired) {
      if (item.status !== "uploaded") await uploadOne(item);
    }
    setIsUploading(false);
    setHasUploaded(true);
  }

  async function handleReplace(item: MatchedReplay) {
    setIsUploading(true);
    await uploadOne(item);
    setIsUploading(false);
  }

  const failedCount =
    plan?.paired.filter((item) => item.status === "failed").length ?? 0;
  const uploadedCount =
    plan?.paired.filter((item) => item.status === "uploaded").length ?? 0;
  const matchedCount =
    (plan?.paired.length ?? 0) + (plan?.existing.length ?? 0);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".rrf"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) {
            void handleFilesSelect(files);
          }
        }}
      />
      <Button
        disabled={disabled || isReading}
        onClick={() => fileInputRef.current?.click()}
        type="button"
        variant="outline"
      >
        {isReading ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <Upload data-icon="inline-start" />
        )}
        Upload all replays
      </Button>

      <Dialog
        open={plan !== null}
        onOpenChange={(open) => {
          if (!open && !isUploading) setPlan(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {hasUploaded ? "Replay upload results" : "Upload replays"}
            </DialogTitle>
            <DialogDescription>
              {hasUploaded
                ? `${uploadedCount} of ${plan?.paired.length ?? 0} replays uploaded.`
                : matchedCount > 0
                  ? `${matchedCount} of ${plan?.fileCount ?? 0} selected files match a seed.`
                  : "None of the selected files match a seed."}
            </DialogDescription>
          </DialogHeader>

          {plan && (
            <div className="flex max-h-[60svh] flex-col gap-4 overflow-y-auto">
              <ReplayUploadSection title="Paired" count={plan.paired.length}>
                {plan.paired.map((item) => (
                  <li key={item.seed.seedId} className="flex items-start gap-2">
                    <ReplayUploadStatusIcon status={item.status} />
                    <MatchedReplayLabel item={item} />
                  </li>
                ))}
              </ReplayUploadSection>

              <ReplayUploadSection
                title="Already has a replay"
                count={plan.existing.length}
                tone="warning"
              >
                {plan.existing.map((item) => (
                  <li key={item.seed.seedId} className="flex items-start gap-2">
                    <ReplayUploadStatusIcon status={item.status} />
                    <MatchedReplayLabel item={item} />
                    {item.status === "uploaded" ? (
                      <span className="shrink-0 text-muted-foreground">
                        Replaced
                      </span>
                    ) : (
                      <Button
                        className="shrink-0"
                        disabled={isUploading || disabled}
                        onClick={() => void handleReplace(item)}
                        size="xs"
                        type="button"
                        variant="outline"
                      >
                        Replace
                      </Button>
                    )}
                  </li>
                ))}
              </ReplayUploadSection>

              <ReplayUploadSection
                title="No matching seed"
                count={plan.unmatched.length}
                tone="warning"
              >
                {plan.unmatched.map((item) => (
                  <li key={item.fileName}>
                    {item.fileName}{" "}
                    <span className="font-mono text-muted-foreground">
                      {item.overworld}
                    </span>
                  </li>
                ))}
              </ReplayUploadSection>

              <ReplayUploadSection
                title="Duplicates skipped"
                count={plan.duplicates.length}
                tone="warning"
              >
                {plan.duplicates.map((item) => (
                  <li key={item.fileName}>
                    {item.fileName}{" "}
                    <span className="text-muted-foreground">
                      (another file is already paired with{" "}
                      {getSeedLabel(item.seed)})
                    </span>
                  </li>
                ))}
              </ReplayUploadSection>

              <ReplayUploadSection
                title="Not a valid replay"
                count={plan.invalid.length}
                tone="error"
              >
                {plan.invalid.map((fileName) => (
                  <li key={fileName}>{fileName}</li>
                ))}
              </ReplayUploadSection>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isUploading}
              onClick={() => setPlan(null)}
            >
              {hasUploaded || plan?.paired.length === 0 ? "Close" : "Cancel"}
            </Button>
            {!hasUploaded && (plan?.paired.length ?? 0) > 0 && (
              <Button
                disabled={isUploading || disabled}
                onClick={() => void handleUpload()}
              >
                {isUploading ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Upload data-icon="inline-start" />
                )}
                {isUploading
                  ? "Uploading…"
                  : `Upload ${plan?.paired.length} ${plan?.paired.length === 1 ? "replay" : "replays"}`}
              </Button>
            )}
            {hasUploaded && failedCount > 0 && (
              <Button
                disabled={isUploading || disabled}
                onClick={() => void handleUpload()}
              >
                Retry failed
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MatchedReplayLabel({ item }: { item: MatchedReplay }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate">
        {getSeedLabel(item.seed)}{" "}
        <span className="text-muted-foreground">from {item.file.name}</span>
      </p>
      {item.error && <p className="text-destructive">{item.error}</p>}
    </div>
  );
}

function getSeedLabel(seed: ReplaySeed) {
  return `${seed.leagueName} · Week ${seed.weekNumber} · Seed #${seed.seedNumber ?? "?"}`;
}

async function buildReplayPlan(
  files: File[],
  findSeeds: (overworlds: string[]) => Promise<ReplaySeed[]>
): Promise<ReplayPlan> {
  const plan: ReplayPlan = {
    fileCount: files.length,
    paired: [],
    existing: [],
    invalid: [],
    unmatched: [],
    duplicates: [],
  };

  const parsed: { file: File; overworld: string }[] = [];
  for (const file of files) {
    try {
      parsed.push({
        file,
        overworld: getReplayOverworldSeed(await file.arrayBuffer()),
      });
    } catch {
      plan.invalid.push(file.name);
    }
  }

  const seeds = await findSeeds([
    ...new Set(parsed.map((item) => item.overworld)),
  ]);
  const seedsByOverworld = new Map(seeds.map((seed) => [seed.overworld, seed]));
  const usedSeedIds = new Set<Id<"seeds">>();

  for (const { file, overworld } of parsed) {
    const seed = seedsByOverworld.get(overworld);
    if (!seed) {
      plan.unmatched.push({ fileName: file.name, overworld });
    } else if (usedSeedIds.has(seed.seedId)) {
      plan.duplicates.push({ fileName: file.name, seed });
    } else {
      usedSeedIds.add(seed.seedId);
      (seed.hasReplay ? plan.existing : plan.paired).push({
        file,
        seed,
        status: "pending",
      });
    }
  }

  const compare = (a: MatchedReplay, b: MatchedReplay) =>
    a.seed.leagueNumber - b.seed.leagueNumber ||
    a.seed.weekNumber - b.seed.weekNumber ||
    (a.seed.seedNumber ?? 0) - (b.seed.seedNumber ?? 0);
  plan.paired.sort(compare);
  plan.existing.sort(compare);
  return plan;
}

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAction } from "convex/react";
import { CircleCheck, CircleDashed, CircleX, Upload } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
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

type PairedReplay = {
  file: File;
  seed: Doc<"seeds">;
  replacesExisting: boolean;
  status: "pending" | "uploading" | "uploaded" | "failed";
  error?: string;
};

type ReplayPlan = {
  paired: PairedReplay[];
  invalid: string[];
  unmatched: { fileName: string; overworld: string }[];
  duplicates: { fileName: string; seedNumber?: number }[];
};

export function BulkReplayUploadButton({
  seeds,
  disabled,
}: {
  seeds: Doc<"seeds">[];
  disabled: boolean;
}) {
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
      setPlan(await buildReplayPlan(files, seeds));
      setHasUploaded(false);
    } finally {
      setIsReading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function updatePaired(seedId: Id<"seeds">, update: Partial<PairedReplay>) {
    setPlan((current) =>
      current
        ? {
            ...current,
            paired: current.paired.map((item) =>
              item.seed._id === seedId ? { ...item, ...update } : item
            ),
          }
        : current
    );
  }

  async function handleUpload() {
    if (!plan) return;

    setIsUploading(true);
    for (const { file, seed } of plan.paired) {
      updatePaired(seed._id, { status: "uploading" });
      try {
        await uploadReplayFile(
          file,
          (contentType) => requestUpload({ seedId: seed._id, contentType }),
          () => confirmUpload({ seedId: seed._id })
        );
        updatePaired(seed._id, { status: "uploaded" });
      } catch (err) {
        updatePaired(seed._id, {
          status: "failed",
          error: getErrorMessage(err, "Failed to upload replay"),
        });
      }
    }
    setIsUploading(false);
    setHasUploaded(true);
  }

  function retryFailed() {
    setPlan((current) =>
      current
        ? {
            ...current,
            paired: current.paired.filter((item) => item.status === "failed"),
          }
        : current
    );
    setHasUploaded(false);
  }

  // seeds still without a replay once the selected files are uploaded
  const missing = plan
    ? seeds.filter(
        (seed) =>
          !seed.replayKey &&
          !plan.paired.some((item) => item.seed._id === seed._id)
      )
    : [];
  const failedCount =
    plan?.paired.filter((item) => item.status === "failed").length ?? 0;
  const uploadedCount =
    plan?.paired.filter((item) => item.status === "uploaded").length ?? 0;

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
        disabled={disabled || isReading || seeds.length === 0}
        onClick={() => fileInputRef.current?.click()}
        size="sm"
        type="button"
        variant="outline"
      >
        {isReading ? <Spinner /> : <Upload />}
        Upload replays
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
                : plan?.paired.length
                  ? `${plan.paired.length} of the selected files match a seed in this league.`
                  : "None of the selected files match a seed in this league."}
            </DialogDescription>
          </DialogHeader>

          {plan && (
            <div className="flex max-h-[60svh] flex-col gap-4 overflow-y-auto">
              <ReplaySection title="Paired" count={plan.paired.length}>
                {plan.paired.map((item) => (
                  <li key={item.seed._id} className="flex items-start gap-2">
                    <PairedStatusIcon status={item.status} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate">
                        Seed #{item.seed.seedNumber ?? "?"}{" "}
                        <span className="text-muted-foreground">
                          from {item.file.name}
                        </span>
                      </p>
                      {item.error ? (
                        <p className="text-destructive">{item.error}</p>
                      ) : (
                        item.replacesExisting &&
                        item.status === "pending" && (
                          <p className="text-amber-700 dark:text-amber-400">
                            Replaces the existing replay
                          </p>
                        )
                      )}
                    </div>
                  </li>
                ))}
              </ReplaySection>

              <ReplaySection
                title="Missing a replay"
                count={missing.length}
                tone="warning"
              >
                {missing.map((seed) => (
                  <li key={seed._id}>
                    Seed #{seed.seedNumber ?? "?"}{" "}
                    <span className="font-mono text-muted-foreground">
                      {seed.overworld}
                    </span>
                  </li>
                ))}
              </ReplaySection>

              <ReplaySection
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
              </ReplaySection>

              <ReplaySection
                title="Duplicates skipped"
                count={plan.duplicates.length}
                tone="warning"
              >
                {plan.duplicates.map((item) => (
                  <li key={item.fileName}>
                    {item.fileName}{" "}
                    <span className="text-muted-foreground">
                      (another file is already paired with seed #
                      {item.seedNumber ?? "?"})
                    </span>
                  </li>
                ))}
              </ReplaySection>

              <ReplaySection
                title="Not a valid replay"
                count={plan.invalid.length}
                tone="error"
              >
                {plan.invalid.map((fileName) => (
                  <li key={fileName}>{fileName}</li>
                ))}
              </ReplaySection>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isUploading}
              onClick={() => setPlan(null)}
            >
              {hasUploaded ? "Close" : "Cancel"}
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
              <Button onClick={retryFailed}>Retry failed</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReplaySection({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone?: "warning" | "error";
  children: ReactNode;
}) {
  if (count === 0) return null;

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <Badge
          variant={
            tone === "error"
              ? "destructive"
              : tone === "warning"
                ? "outline"
                : "secondary"
          }
        >
          {count}
        </Badge>
      </div>
      <ul className="flex flex-col gap-1 text-xs">{children}</ul>
    </section>
  );
}

function PairedStatusIcon({ status }: { status: PairedReplay["status"] }) {
  if (status === "uploading") {
    return <Spinner className="mt-0.5 size-3.5 shrink-0" />;
  }
  if (status === "uploaded") {
    return (
      <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
    );
  }
  if (status === "failed") {
    return <CircleX className="mt-0.5 size-3.5 shrink-0 text-destructive" />;
  }
  return (
    <CircleDashed className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
  );
}

async function buildReplayPlan(
  files: File[],
  seeds: Doc<"seeds">[]
): Promise<ReplayPlan> {
  const plan: ReplayPlan = {
    paired: [],
    invalid: [],
    unmatched: [],
    duplicates: [],
  };

  for (const file of files) {
    let overworld: string;
    try {
      overworld = getReplayOverworldSeed(await file.arrayBuffer());
    } catch {
      plan.invalid.push(file.name);
      continue;
    }

    const seed = seeds.find((item) => item.overworld === overworld);
    if (!seed) {
      plan.unmatched.push({ fileName: file.name, overworld });
    } else if (plan.paired.some((item) => item.seed._id === seed._id)) {
      plan.duplicates.push({
        fileName: file.name,
        seedNumber: seed.seedNumber,
      });
    } else {
      plan.paired.push({
        file,
        seed,
        replacesExisting: Boolean(seed.replayKey),
        status: "pending",
      });
    }
  }

  plan.paired.sort(
    (a, b) => (a.seed.seedNumber ?? 0) - (b.seed.seedNumber ?? 0)
  );
  return plan;
}

import { CircleCheck, CircleDashed, CircleX } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

export type ReplayUploadStatus =
  "pending" | "uploading" | "uploaded" | "failed";

export function ReplayUploadStatusIcon({
  status,
}: {
  status: ReplayUploadStatus;
}) {
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

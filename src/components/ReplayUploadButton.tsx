// src/components/ReplayUploadButton.tsx
import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { InvalidReplayError, getReplayOverworldSeed } from "@/lib/replay";

export function ReplayUploadButton({ seed }: { seed: Doc<"seeds"> }) {
  const requestUpload = useAction(api.replayStorage.requestReplayUpload);
  const confirmUpload = useAction(api.replayStorage.confirmReplayUpload);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      // check the replay is for THIS seed before uploading anything
      if (getReplayOverworldSeed(await file.arrayBuffer()) !== seed.overworld) {
        throw new InvalidReplayError(
          "This replay was recorded on a different seed."
        );
      }

      // upload straight to the CDN, then tell the server it's done
      const contentType = file.type || "application/octet-stream";
      const url = await requestUpload({
        seedId: seed._id,
        contentType,
      });
      const res = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      if (!res.ok) throw new Error("PUT failed");
      await confirmUpload({ seedId: seed._id });
    } catch (e) {
      setError(
        e instanceof ConvexError
          ? String(e.data)
          : e instanceof InvalidReplayError
            ? e.message
            : "Upload failed"
      );
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        hidden
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <Button
        disabled={busy}
        onClick={() => input.current?.click()}
        variant={seed.replayKey ? "secondary" : "default"}
      >
        {busy
          ? "Uploading…"
          : seed.replayKey
            ? "Replace replay"
            : "Upload replay"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </>
  );
}

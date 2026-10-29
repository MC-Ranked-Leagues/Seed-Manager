import { unzipSync, strFromU8 } from "fflate";

type ReplayMeta = {
  version?: unknown;
  overworldSeed?: unknown;
  seed?: unknown;
} | null;

export function getReplayOverworldSeed(bytes: ArrayBuffer): string {
  try {
    const files = unzipSync(new Uint8Array(bytes), {
      filter: (f) => f.name === "meta.json",
    });
    const metaBytes = files["meta.json"];
    if (!metaBytes) throw new Error("no meta.json");
    const meta = JSON.parse(strFromU8(metaBytes)) as ReplayMeta;
    const seed =
      typeof meta?.version === "number" && meta.version >= 30
        ? meta.overworldSeed
        : meta?.seed;
    if (typeof seed !== "string") throw new Error("no seed");
    return seed;
  } catch {
    throw new Error("This isn't a valid replay file");
  }
}

// upload straight to storage, then tell the server it's done
export async function uploadReplayFile(
  file: File,
  requestUpload: (contentType: string) => Promise<string>,
  confirmUpload: () => Promise<null>
) {
  const contentType = file.type || "application/octet-stream";
  const uploadUrl = await requestUpload(contentType);
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": contentType },
  });
  if (!res.ok) {
    throw new Error(`Upload failed (${res.status} ${res.statusText})`);
  }
  await confirmUpload();
}

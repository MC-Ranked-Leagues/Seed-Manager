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

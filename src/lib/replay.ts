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

// `order` only exists in the published history, so ask the same endpoint
// Seed Explorer reads. Returns null when the seed isn't published.
export async function fetchPublishedSeedOrder(
  leagueNumber: number,
  weekNumber: number,
  overworld: string,
  signal?: AbortSignal
): Promise<number | null> {
  const params = new URLSearchParams({
    leagueNumber: String(leagueNumber),
    weekNumber: String(weekNumber),
  });
  const response = await fetch(
    `${import.meta.env.VITE_CONVEX_SITE_URL}/api/seeds/history?${params}`,
    { signal }
  );
  if (!response.ok) return null;
  const seeds = (await response.json()) as {
    order: number;
    overworld: string;
  }[];
  return seeds.find((seed) => seed.overworld === overworld)?.order ?? null;
}

export function getWatchReplayUrl(
  leagueNumber: number,
  weekNumber: number,
  order: number
) {
  const params = new URLSearchParams({
    league: String(leagueNumber),
    week: String(weekNumber),
    match: String(order),
  });
  return `https://mcsr-browser.pages.dev/mcrl?${params}`;
}

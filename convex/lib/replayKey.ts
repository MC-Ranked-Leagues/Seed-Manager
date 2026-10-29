export function replayKeyFor(
  leagueNumber: number,
  weekNumber: number,
  overworld: string
): string {
  return `replays/replay-week${weekNumber}_league${leagueNumber}_${overworld}.rrf`;
}

export const REPLAY_KEY_PATTERN =
  /^replays\/replay-week\d+_league\d+_-?\d+\.rrf$/;

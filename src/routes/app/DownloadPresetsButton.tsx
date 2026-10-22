import { useQuery } from "convex/react";
import { Download } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  buildPresetFiles,
  getLeaguePreset,
  zipPresetFiles,
} from "@/lib/presets";

export function DownloadPresetsButton({
  league,
  seeds,
}: {
  league: Doc<"leagues">;
  seeds: Doc<"seeds">[];
}) {
  const settings = useQuery(api.settings.current);
  const { preset, nameFormat } = getLeaguePreset(settings ?? null, league);
  const files = buildPresetFiles(
    preset,
    nameFormat,
    league.leagueNumber,
    seeds
  );

  const download = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([zipPresetFiles(files)], { type: "application/zip" })
    );
    link.download = `MCRL League ${league.leagueNumber} presets.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href));
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            disabled={seeds.length === 0 || settings === undefined}
            size="sm"
            type="button"
            variant="outline"
          />
        }
      >
        <Download className="size-4" />
        Download presets (.zip)
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Download {league.leagueName} presets</DialogTitle>
        </DialogHeader>

        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li>Download the zip and extract it.</li>
          <li>
            Move the <code>.rsp</code> files into{" "}
            <code>%USERPROFILE%\mcsrranked\presets</code> (macOS/Linux:{" "}
            <code>~/mcsrranked/presets</code>), or import them one at a time
            with <strong>Import</strong> on the room&apos;s Preset tab.
          </li>
          <li>
            On an RSA account, open the private room&apos;s Preset tab, select
            the next seed and press <strong>Apply</strong>.
          </li>
          <li>
            The seed type only applies if the account has the Stone Pickaxe
            tier. Otherwise the room keeps its previous seed type.
          </li>
        </ol>

        <DialogFooter showCloseButton>
          <Button onClick={download} type="button">
            <Download className="size-4" />
            Download {seeds.length} {seeds.length === 1 ? "preset" : "presets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

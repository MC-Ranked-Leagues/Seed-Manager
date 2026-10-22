import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/lib/errors";
import { getLeagueTimeLimit } from "@/lib/presets";

export function EditLeaguePresetDialog({
  league,
  onClose,
}: {
  league: Doc<"leagues">;
  onClose: () => void;
}) {
  const updateLeaguePreset = useMutation(api.leagues.updateLeaguePreset);
  const [minutes, setMinutes] = useState(getLeagueTimeLimit(league) / 60);
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    setIsSaving(true);
    try {
      await updateLeaguePreset({
        leagueId: league._id,
        presetTimeLimit: Math.round(minutes * 60),
      });
      onClose();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Could not save this preset"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{league.leagueName} preset</DialogTitle>
      </DialogHeader>

      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor="league-preset-time-limit">
          Time limit (minutes)
        </FieldLabel>
        <Input
          id="league-preset-time-limit"
          min={0}
          onChange={(event) =>
            setMinutes(event.currentTarget.valueAsNumber || 0)
          }
          type="number"
          value={minutes}
        />
        <FieldError>{error}</FieldError>
      </Field>

      <DialogFooter>
        <Button
          disabled={isSaving}
          onClick={onClose}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button disabled={isSaving} onClick={() => void save()} type="button">
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

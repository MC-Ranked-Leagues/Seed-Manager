import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/errors";
import {
  DEFAULT_PRESET_NAME_FORMAT,
  PRESET_FLAGS,
  buildPresetFiles,
  formatPresetFlag,
  getDefaultPreset,
  getBasePreset,
  hasPresetFlag,
  parsePreset,
  setPresetFlag,
  type Preset,
} from "@/lib/presets";

// Example seed for the room name preview.
const PREVIEW_SEED = {
  seedNumber: 10,
  type: "BURIED_TREASURE",
} as Doc<"seeds">;

export function EditBasePresetDialog({
  settings,
  onClose,
}: {
  settings: Doc<"settings"> | null;
  onClose: () => void;
}) {
  const updateBasePreset = useMutation(api.settings.updateBasePreset);
  const [saved] = useState(() => getBasePreset(settings));
  const [preset, setPreset] = useState(saved.preset);
  const [json, setJson] = useState(() => JSON.stringify(saved.preset, null, 2));
  const [nameFormat, setNameFormat] = useState(saved.nameFormat);
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  const previewName =
    buildPresetFiles(preset, nameFormat, 1, [PREVIEW_SEED])[0]?.preset.name ??
    "";
  const jsonInvalid = parsePreset(json) === null;

  const updatePreset = (next: Preset) => {
    setPreset(next);
    setJson(JSON.stringify(next, null, 2));
  };

  const save = async () => {
    setIsSaving(true);
    try {
      await updateBasePreset({
        preset: JSON.stringify(preset),
        presetNameFormat: nameFormat,
      });
      onClose();
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Could not save this preset"));
    } finally {
      setIsSaving(false);
    }
  };

  const numberField = (
    id: string,
    label: string,
    key: "manualMaxPlayers" | "completions"
  ) => (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        min={0}
        onChange={(event) =>
          updatePreset({
            ...preset,
            option: {
              ...preset.option,
              [key]: event.currentTarget.valueAsNumber || 0,
            },
          })
        }
        type="number"
        value={preset.option[key]}
      />
    </Field>
  );

  return (
    <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
      <DialogHeader>
        <DialogTitle>Base preset</DialogTitle>
      </DialogHeader>

      <Field data-invalid={previewName.length > 32}>
        <FieldLabel htmlFor="preset-name-format">Room name format</FieldLabel>
        <Input
          id="preset-name-format"
          onChange={(event) => setNameFormat(event.currentTarget.value)}
          value={nameFormat}
        />
        <FieldDescription>
          Uses {"{league}"}, {"{number}"} and {"{type}"}. Example: {previewName}
        </FieldDescription>
        <FieldError>
          {previewName.length > 32 &&
            "Room names are limited to 32 characters in game."}
        </FieldError>
      </Field>

      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        {numberField("preset-max-players", "Max players", "manualMaxPlayers")}
        {numberField("preset-completions", "Completions", "completions")}
      </FieldGroup>

      <FieldSet>
        <FieldLegend variant="label">Room flags</FieldLegend>
        <div className="grid gap-2 sm:grid-cols-3">
          {PRESET_FLAGS.map((flag) => (
            <Field key={flag} orientation="horizontal">
              <Checkbox
                id={`preset-flag-${flag}`}
                checked={
                  flag === "DISPLAY_SEED_TYPE" || hasPresetFlag(preset, flag)
                }
                disabled={flag === "DISPLAY_SEED_TYPE"}
                onCheckedChange={(checked) =>
                  updatePreset(setPresetFlag(preset, flag, checked))
                }
              />
              <FieldLabel htmlFor={`preset-flag-${flag}`}>
                {formatPresetFlag(flag)}
              </FieldLabel>
            </Field>
          ))}
        </div>
      </FieldSet>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">
          Advanced: base preset JSON
        </summary>
        <Field className="mt-2" data-invalid={jsonInvalid}>
          <FieldDescription>
            Edit or paste a whole <code>.rsp</code> file.
          </FieldDescription>
          <Textarea
            aria-invalid={jsonInvalid}
            className="h-64 font-mono text-xs"
            onChange={(event) => {
              setJson(event.currentTarget.value);
              const parsed = parsePreset(event.currentTarget.value);
              if (parsed) setPreset(parsed);
            }}
            value={json}
          />
          <FieldError>{jsonInvalid && "Not a valid preset."}</FieldError>
        </Field>
      </details>

      <FieldError>{error}</FieldError>

      <DialogFooter>
        <Button
          className="sm:mr-auto"
          disabled={isSaving}
          onClick={() => {
            updatePreset(getDefaultPreset());
            setNameFormat(DEFAULT_PRESET_NAME_FORMAT);
          }}
          type="button"
          variant="ghost"
        >
          Reset to defaults
        </Button>
        <Button
          disabled={isSaving}
          onClick={onClose}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={isSaving || jsonInvalid}
          onClick={() => void save()}
          type="button"
        >
          {isSaving ? "Saving..." : "Save preset"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

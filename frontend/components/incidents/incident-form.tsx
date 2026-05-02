"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { incidentService } from "@/services/api/incident-service";
import type { CreateIncidentInput, IncidentType } from "@/types/incident";

const incidentTypeOptions: ReadonlyArray<{ value: IncidentType; label: string }> = [
  { value: "NearMiss", label: "Near Miss" },
  { value: "Accident", label: "Accident" }
];

const schema = z.object({
  type: z.enum(["NearMiss", "Accident"]),
  occurredAt: z
    .string()
    .trim()
    .min(1, "Date / Time is required")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Date / Time is invalid"),
  description: z.string().optional(),
  healthDataJson: z
    .string()
    .optional()
    .refine((value) => {
      const trimmed = value?.trim();
      if (!trimmed) {
        return true;
      }

      try {
        JSON.parse(trimmed);
        return true;
      } catch {
        return false;
      }
    }, "Health Data JSON must be valid JSON")
});

type FormValues = z.infer<typeof schema>;
type PhotoInputMode = "upload" | "url";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrls(urls: string[]): string[] {
  const unique = new Set<string>();

  for (const url of urls) {
    const trimmed = url.trim();
    if (!trimmed) {
      continue;
    }

    if (!unique.has(trimmed)) {
      unique.add(trimmed);
    }
  }

  return Array.from(unique);
}

interface IncidentFormProps {
  onSubmit: (payload: CreateIncidentInput) => Promise<void>;
}

export function IncidentForm({ onSubmit }: IncidentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      type: "NearMiss",
      occurredAt: "",
      description: "",
      healthDataJson: ""
    }
  });

  const [photoInputMode, setPhotoInputMode] = useState<PhotoInputMode>("upload");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadedPreviews = useMemo(
    () =>
      uploadedFiles.map((file) => ({
        key: `${file.name}-${file.lastModified}`,
        file,
        previewUrl: URL.createObjectURL(file)
      })),
    [uploadedFiles]
  );

  useEffect(() => {
    return () => {
      for (const item of uploadedPreviews) {
        URL.revokeObjectURL(item.previewUrl);
      }
    };
  }, [uploadedPreviews]);

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files ?? []);
    if (incomingFiles.length === 0) {
      return;
    }

    const validFiles: File[] = [];
    const validationErrors: string[] = [];

    for (const file of incomingFiles) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        validationErrors.push(`${file.name}: only JPG/PNG files are allowed.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        validationErrors.push(`${file.name}: file size must be 5MB or less.`);
        continue;
      }

      validFiles.push(file);
    }

    if (validationErrors.length > 0) {
      setPhotoError(validationErrors[0]);
    } else {
      setPhotoError(null);
    }

    if (validFiles.length > 0) {
      setUploadedFiles((prev) => [...prev, ...validFiles]);
    }

    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const addPhotoUrl = () => {
    const normalized = urlInput.trim();
    if (!normalized) {
      return;
    }

    if (!isValidHttpUrl(normalized)) {
      setPhotoError("Photo URL must start with http:// or https://");
      return;
    }

    setPhotoError(null);
    setPhotoUrls((prev) => normalizeUrls([...prev, normalized]));
    setUrlInput("");
  };

  const removePhotoUrl = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = handleSubmit(async (values) => {
    setPhotoError(null);
    setIsUploading(true);

    let uploadedUrls: string[] = [];

    try {
      if (uploadedFiles.length > 0) {
        try {
          uploadedUrls = await incidentService.uploadImages(uploadedFiles);
        } catch (error) {
          setPhotoError(error instanceof Error ? error.message : "Photo upload failed.");
          return;
        }
      }

      const finalPhotoUrls = normalizeUrls([...photoUrls, ...uploadedUrls]);

      await onSubmit({
        type: values.type,
        occurredAt: values.occurredAt,
        locationId: null,
        description: values.description?.trim() || undefined,
        healthDataJson: values.healthDataJson?.trim() || undefined,
        photoUrls: finalPhotoUrls
      });

      setUploadedFiles([]);
      setPhotoUrls([]);
      setUrlInput("");
      setPhotoInputMode("upload");
      reset();
    } finally {
      setIsUploading(false);
    }
  });

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="type">
          Type
        </label>
        <select
          id="type"
          className="h-11 rounded-xl border border-border bg-white px-3 text-sm"
          {...register("type")}
        >
          {incidentTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.type ? <p className="text-xs text-danger">{errors.type.message}</p> : null}
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="occurredAt">
          Date / Time
        </label>
        <Input id="occurredAt" type="datetime-local" {...register("occurredAt")} />
        {errors.occurredAt ? <p className="text-xs text-danger">{errors.occurredAt.message}</p> : null}
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="description">
          Description
        </label>
        <Textarea id="description" {...register("description")} />
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="healthDataJson">
          Health Data JSON (optional, encrypted backend)
        </label>
        <Textarea id="healthDataJson" {...register("healthDataJson")} />
        {errors.healthDataJson ? <p className="text-xs text-danger">{errors.healthDataJson.message}</p> : null}
      </div>

      <div className="grid gap-2">
        <p className="text-sm text-ink">Photos</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={photoInputMode === "upload" ? "primary" : "secondary"}
            onClick={() => setPhotoInputMode("upload")}
            disabled={isSubmitting || isUploading}
          >
            Upload
          </Button>
          <Button
            type="button"
            variant={photoInputMode === "url" ? "primary" : "secondary"}
            onClick={() => setPhotoInputMode("url")}
            disabled={isSubmitting || isUploading}
          >
            URL
          </Button>
        </div>

        {photoInputMode === "upload" ? (
          <div className="grid gap-2">
            <Input
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              multiple
              onChange={handleFileSelection}
              disabled={isSubmitting || isUploading}
            />
            <p className="text-xs text-muted">Allowed: JPG, PNG. Max file size: 5MB.</p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addPhotoUrl();
                }
              }}
              placeholder="https://example.com/photo.jpg"
              disabled={isSubmitting || isUploading}
            />
            <Button type="button" onClick={addPhotoUrl} disabled={isSubmitting || isUploading}>
              Add
            </Button>
          </div>
        )}

        {uploadedPreviews.length > 0 ? (
          <div className="grid gap-2">
            <p className="text-xs text-muted">Uploaded files</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {uploadedPreviews.map((item, index) => (
                <div key={item.key} className="rounded-xl border border-border bg-white p-2">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="h-24 w-full rounded-lg object-cover"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-muted">{item.file.name}</p>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => removeFile(index)}
                      disabled={isSubmitting || isUploading}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {photoUrls.length > 0 ? (
          <div className="grid gap-2">
            <p className="text-xs text-muted">Photo URLs</p>
            {photoUrls.map((url, index) => (
              <div key={`${url}-${index}`} className="flex items-center gap-2 rounded-xl border border-border bg-white p-2">
                <a href={url} target="_blank" rel="noreferrer" className="truncate text-xs text-brand underline">
                  {url}
                </a>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => removePhotoUrl(index)}
                  disabled={isSubmitting || isUploading}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {photoError ? <p className="text-xs text-danger">{photoError}</p> : null}
      </div>

      <Button disabled={isSubmitting || isUploading || !isValid} type="submit">
        {isSubmitting || isUploading ? "Creating incident..." : "Create Incident"}
      </Button>
    </form>
  );
}

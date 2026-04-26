"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseDelimitedInput } from "@/lib/utils";
import type { CreateIncidentInput, IncidentType } from "@/types/incident";

const schema = z.object({
  type: z.enum(["accident", "near_miss"]),
  dateTime: z.string().min(1, "Date/time is required"),
  locationId: z.string().min(1, "Location is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  photoUrls: z.string().min(3, "At least one photo URL is required"),
  healthDataJson: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

interface IncidentFormProps {
  onSubmit: (payload: CreateIncidentInput) => Promise<void>;
}

export function IncidentForm({ onSubmit }: IncidentFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "near_miss",
      dateTime: "",
      locationId: "",
      description: "",
      photoUrls: "",
      healthDataJson: ""
    }
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      type: values.type as IncidentType,
      dateTime: new Date(values.dateTime).toISOString(),
      locationId: values.locationId,
      description: values.description,
      photoUrls: parseDelimitedInput(values.photoUrls),
      healthDataJson: values.healthDataJson
    });

    reset();
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
          <option value="near_miss">Near Miss</option>
          <option value="accident">Accident</option>
        </select>
        {errors.type ? <p className="text-xs text-danger">{errors.type.message}</p> : null}
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="dateTime">
          Date / Time
        </label>
        <Input id="dateTime" type="datetime-local" {...register("dateTime")} />
        {errors.dateTime ? <p className="text-xs text-danger">{errors.dateTime.message}</p> : null}
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="locationId">
          Location ID
        </label>
        <Input id="locationId" placeholder="UUID from location master" {...register("locationId")} />
        {errors.locationId ? <p className="text-xs text-danger">{errors.locationId.message}</p> : null}
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="description">
          Description
        </label>
        <Textarea id="description" {...register("description")} />
        {errors.description ? <p className="text-xs text-danger">{errors.description.message}</p> : null}
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="photoUrls">
          Photo URLs (comma separated)
        </label>
        <Textarea id="photoUrls" {...register("photoUrls")} />
        {errors.photoUrls ? <p className="text-xs text-danger">{errors.photoUrls.message}</p> : null}
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="healthDataJson">
          Health Data JSON (optional, encrypted backend)
        </label>
        <Textarea id="healthDataJson" {...register("healthDataJson")} />
      </div>

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Creating incident..." : "Create Incident"}
      </Button>
    </form>
  );
}

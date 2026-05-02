"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";
import type { AnalysisCategory, UpsertAnalysisInput } from "@/types/analysis";
import type { Incident } from "@/types/incident";

const schema = z.object({
  incidentId: z.string().uuid("Incident id must be a valid UUID"),
  cause1: z.string().min(5, "Cause 1 is required"),
  cause2: z.string().optional(),
  cause3: z.string().optional(),
  cause4: z.string().optional(),
  cause5: z.string().optional(),
  category: z.enum([
    "Human",
    "Machine",
    "Method",
    "Material",
    "Measurement",
    "Environment",
    "Management",
    "Other"
  ]),
  fishboneJson: z
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
    }, "Fishbone JSON must be valid JSON")
});

type FormValues = z.infer<typeof schema>;

interface AnalysisFormProps {
  onSubmit: (payload: UpsertAnalysisInput) => Promise<void>;
  incidents: Incident[];
  isLoadingIncidents?: boolean;
}

export function AnalysisForm({ onSubmit, incidents, isLoadingIncidents = false }: AnalysisFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      incidentId: "",
      cause1: "",
      cause2: "",
      cause3: "",
      cause4: "",
      cause5: "",
      category: "Human",
      fishboneJson: ""
    }
  });

  useEffect(() => {
    const selectedIncidentId = getValues("incidentId");
    if (!selectedIncidentId && incidents.length > 0) {
      setValue("incidentId", incidents[0].id, { shouldValidate: true });
    }
  }, [getValues, incidents, setValue]);

  const submit = handleSubmit(async (values) => {
    const selectedIncidentId = values.incidentId;

    await onSubmit({
      incidentId: values.incidentId,
      cause1: values.cause1,
      cause2: values.cause2,
      cause3: values.cause3,
      cause4: values.cause4,
      cause5: values.cause5,
      category: values.category as AnalysisCategory,
      fishboneJson: values.fishboneJson?.trim() ? values.fishboneJson.trim() : undefined
    });

    reset({
      incidentId: selectedIncidentId,
      cause1: "",
      cause2: "",
      cause3: "",
      cause4: "",
      cause5: "",
      category: "Human",
      fishboneJson: ""
    });
  });

  const selectedIncidentId = watch("incidentId");

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="incidentId">
          Incident
        </label>
        <select
          id="incidentId"
          className="h-11 rounded-xl border border-border bg-white px-3 text-sm"
          {...register("incidentId")}
          disabled={isSubmitting || isLoadingIncidents || incidents.length === 0}
        >
          {incidents.length === 0 ? (
            <option value="">{isLoadingIncidents ? "Loading incidents..." : "No incidents available"}</option>
          ) : (
            incidents.map((incident) => (
              <option key={incident.id} value={incident.id}>
                {incident.type} - {formatDateTime(incident.occurredAt)} - {(incident.description ?? "No description").slice(0, 64)}
              </option>
            ))
          )}
        </select>
        {incidents.length > 0 ? (
          <p className="text-xs text-muted">Incident ID: {selectedIncidentId || incidents[0].id}</p>
        ) : null}
        {errors.incidentId ? <p className="text-xs text-danger">{errors.incidentId.message}</p> : null}
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="cause1">
          Cause 1 (required)
        </label>
        <Textarea id="cause1" {...register("cause1")} />
        {errors.cause1 ? <p className="text-xs text-danger">{errors.cause1.message}</p> : null}
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="cause2">
          Cause 2
        </label>
        <Textarea id="cause2" {...register("cause2")} />
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="category">
          Category
        </label>
        <select
          id="category"
          className="h-11 rounded-xl border border-border bg-white px-3 text-sm"
          {...register("category")}
        >
          <option value="Human">Human</option>
          <option value="Machine">Machine</option>
          <option value="Method">Method</option>
          <option value="Material">Material</option>
          <option value="Measurement">Measurement</option>
          <option value="Environment">Environment</option>
          <option value="Management">Management</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="fishboneJson">
          Fishbone JSON (optional)
        </label>
        <Textarea id="fishboneJson" {...register("fishboneJson")} />
        {errors.fishboneJson ? <p className="text-xs text-danger">{errors.fishboneJson.message}</p> : null}
      </div>

      <Button disabled={isSubmitting || isLoadingIncidents || incidents.length === 0} type="submit">
        {isSubmitting ? "Saving analysis..." : "Save Analysis"}
      </Button>
    </form>
  );
}

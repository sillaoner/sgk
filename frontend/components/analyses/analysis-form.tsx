"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AnalysisCategory, UpsertAnalysisInput } from "@/types/analysis";

const schema = z.object({
  incidentId: z.string().uuid("Incident id must be a valid UUID"),
  cause1: z.string().min(5, "Cause 1 is required"),
  cause2: z.string().optional(),
  cause3: z.string().optional(),
  cause4: z.string().optional(),
  cause5: z.string().optional(),
  category: z.enum([
    "human",
    "machine",
    "method",
    "material",
    "measurement",
    "environment",
    "management",
    "other"
  ]),
  fishboneJson: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

interface AnalysisFormProps {
  onSubmit: (payload: UpsertAnalysisInput) => Promise<void>;
}

export function AnalysisForm({ onSubmit }: AnalysisFormProps) {
  const {
    register,
    handleSubmit,
    reset,
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
      category: "human",
      fishboneJson: ""
    }
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      incidentId: values.incidentId,
      cause1: values.cause1,
      cause2: values.cause2,
      cause3: values.cause3,
      cause4: values.cause4,
      cause5: values.cause5,
      category: values.category as AnalysisCategory,
      fishboneJson: values.fishboneJson
    });

    reset();
  });

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="incidentId">
          Incident ID
        </label>
        <Input id="incidentId" {...register("incidentId")} />
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
          <option value="human">Human</option>
          <option value="machine">Machine</option>
          <option value="method">Method</option>
          <option value="material">Material</option>
          <option value="measurement">Measurement</option>
          <option value="environment">Environment</option>
          <option value="management">Management</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="grid gap-1">
        <label className="text-sm text-ink" htmlFor="fishboneJson">
          Fishbone JSON (optional)
        </label>
        <Textarea id="fishboneJson" {...register("fishboneJson")} />
      </div>

      <Button disabled={isSubmitting} type="submit">
        {isSubmitting ? "Saving analysis..." : "Save Analysis"}
      </Button>
    </form>
  );
}

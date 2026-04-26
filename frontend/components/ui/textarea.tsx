import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-brand",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

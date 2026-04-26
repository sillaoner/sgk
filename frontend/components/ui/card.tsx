import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <section className={cn("rounded-2xl border border-border bg-white p-5 shadow-card", className)}>
      {children}
    </section>
  );
}

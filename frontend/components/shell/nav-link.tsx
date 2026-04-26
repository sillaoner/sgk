"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  label: string;
}

export function NavLink({ href, label }: NavLinkProps) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl px-3 py-2 text-sm transition",
        active ? "bg-brand text-white" : "text-ink hover:bg-surface-alt"
      )}
    >
      {label}
    </Link>
  );
}

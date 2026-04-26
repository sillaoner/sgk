"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

interface RoleGuardProps {
  allow: Array<"admin" | "user">;
  children: React.ReactNode;
}

export function RoleGuard({ allow, children }: RoleGuardProps) {
  const router = useRouter();
  const { uiRole, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (uiRole && !allow.includes(uiRole)) {
      router.replace("/dashboard");
    }
  }, [allow, isAuthenticated, router, uiRole]);

  if (!isAuthenticated || !uiRole || !allow.includes(uiRole)) {
    return <LoadingSpinner label="Checking permissions..." />;
  }

  return <>{children}</>;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const authState = cookieStore.get("auth_state")?.value;

  if (authState !== "1") {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}

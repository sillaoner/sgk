import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const cookieStore = cookies();
  const authState = cookieStore.get("auth_state")?.value;

  if (authState === "1") {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_15%_20%,_#def5ee_0,_#f7fbfc_46%,_#f7f2e8_100%)] p-4">
      <div className="w-full max-w-md">
        <LoginForm />
      </div>
    </main>
  );
}

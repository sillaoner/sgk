import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function HomePage() {
  const cookieStore = cookies();
  const authState = cookieStore.get("auth_state")?.value;

  if (authState === "1") {
    redirect("/dashboard");
  }

  redirect("/login");
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErrorPanel } from "@/components/shared/error-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/api/auth-service";
import { useAuthStore } from "@/store/auth-store";

const schema = z.object({
  username: z.string().min(3, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const session = await authService.login(values);
<<<<<<< HEAD
      if (!session.accessToken) {
        throw new Error("Login response did not include access token.");
      }

=======
>>>>>>> abd55b3 (fixes)
      setSession(session);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  });

  return (
    <Card className="mx-auto w-full max-w-md border-none bg-white/95 p-8 shadow-soft">
      <h1 className="text-2xl font-semibold text-ink">Sign in to OHS Panel</h1>
      <p className="mt-1 text-sm text-muted">Use your company account.</p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="mb-1 block text-sm text-ink" htmlFor="username">
            Username
          </label>
          <Input id="username" autoComplete="username" {...register("username")} />
          {errors.username ? <p className="mt-1 text-xs text-danger">{errors.username.message}</p> : null}
        </div>

        <div>
          <label className="mb-1 block text-sm text-ink" htmlFor="password">
            Password
          </label>
          <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
          {errors.password ? <p className="mt-1 text-xs text-danger">{errors.password.message}</p> : null}
        </div>

        {error ? <ErrorPanel message={error} /> : null}

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </Card>
  );
}

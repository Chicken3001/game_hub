"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") ?? "";
  // Only allow same-origin relative paths; reject absolute URLs and protocol-relative URLs
  const redirectTo =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/hub";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-5xl shadow-lg">
            🎮
          </div>
          <h1 className="mt-4 text-4xl font-black text-indigo-900">Game Hub</h1>
          <p className="mt-1 font-bold text-violet-500">Your games are waiting!</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border-2 border-violet-100 bg-white p-8 shadow-[0_4px_24px_rgba(139,92,246,0.15)]">
          <h2 className="mb-1 text-2xl font-black text-indigo-900">Welcome back! 👋</h2>
          <p className="mb-6 text-sm font-semibold text-violet-500">
            Sign in to play. Need help? Ask a grown-up!
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {error && (
              <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-2.5">
                <p className="text-sm font-bold text-red-600" role="alert">
                  Oops! {error}
                </p>
              </div>
            )}
            <Button type="submit" disabled={loading} size="lg" className="mt-1 w-full">
              {loading ? "One sec… ⏳" : "Let's play! 🚀"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-xl font-bold text-violet-500">Getting ready… 🎮</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

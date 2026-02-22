import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const needsUsername = !profile?.username;

  return (
    <div className="min-h-screen">
      <header className="border-b-4 border-white/20 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/hub" className="flex items-center gap-2 text-white transition-transform hover:scale-105">
            <span className="text-3xl">🎮</span>
            <span className="text-2xl font-black tracking-tight">Game Hub</span>
          </Link>
          <nav className="flex items-center gap-3">
            {profile?.username && (
              <span className="hidden rounded-full bg-white/20 px-3 py-1.5 text-sm font-bold text-white sm:block">
                👋 {profile.username}
              </span>
            )}
            <Link href="/profile">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 focus:ring-white/50"
              >
                Profile
              </Button>
            </Link>
            <form action="/api/auth/signout" method="post">
              <Button
                size="sm"
                className="border-0 bg-white/20 text-white shadow-none hover:bg-white/35 focus:ring-white/50 active:bg-white/50 active:shadow-none active:translate-y-0"
              >
                Sign out
              </Button>
            </form>
          </nav>
        </div>
      </header>

      {needsUsername ? (
        <div className="mx-auto max-w-4xl px-4 pt-6">
          <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-r from-amber-100 to-yellow-100 p-4 text-amber-900 shadow-sm">
            <p className="font-black">✨ Set your username!</p>
            <p className="mt-1 text-sm font-semibold">
              Choose a fun name to get started!{" "}
              <Link href="/profile" className="font-black underline">
                Go to Profile
              </Link>
            </p>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}

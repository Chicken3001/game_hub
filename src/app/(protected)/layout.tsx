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
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b-4 border-white/20 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/hub" className="flex items-center gap-2 text-white transition-transform hover:scale-105">
            <span className="text-2xl">🎮</span>
            <span className="text-xl font-black tracking-tight">Game Hub</span>
          </Link>
          <nav className="flex items-center gap-2">
            {profile?.username && (
              <span className="hidden rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-white sm:block">
                👋 {profile.username}
              </span>
            )}
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20 focus:ring-white/50">
                Profile
              </Button>
            </Link>
            <form action="/api/auth/signout" method="post">
              <Button size="sm" className="border-0 bg-white/20 text-white shadow-none hover:bg-white/35 focus:ring-white/50 active:bg-white/50 active:shadow-none active:translate-y-0">
                Sign out
              </Button>
            </form>
          </nav>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-4">
          {needsUsername && (
            <div className="mb-3 rounded-2xl border-2 border-amber-300 bg-gradient-to-r from-amber-100 to-yellow-100 px-4 py-2.5 text-amber-900">
              <p className="text-sm font-black">
                ✨ Set your username!{" "}
                <Link href="/profile" className="underline">
                  Go to Profile
                </Link>
              </p>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

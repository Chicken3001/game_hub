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
    <div className="min-h-screen bg-sky-100">
      <header className="border-b-2 border-sky-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/hub" className="text-xl font-bold text-sky-900">
            🎮 Game Hub
          </Link>
          <nav className="flex items-center gap-4">
            {profile?.username && (
              <span className="text-sm font-medium text-sky-700">
                👋 {profile.username}
              </span>
            )}
            <Link href="/profile">
              <Button variant="ghost" size="sm">
                Profile
              </Button>
            </Link>
            <form action="/api/auth/signout" method="post">
              <Button variant="secondary" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </nav>
        </div>
      </header>
      {needsUsername ? (
        <div className="mx-auto max-w-4xl px-4 py-8">
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
            <p className="font-bold">✨ Set your username</p>
            <p className="mt-1 text-sm">
              Choose a fun name to get started!{" "}
              <Link href="/profile" className="font-semibold underline">
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

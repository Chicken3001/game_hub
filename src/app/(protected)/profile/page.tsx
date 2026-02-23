"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function ProfilePage() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (profile?.username) {
        setUsername(profile.username);
      }
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, username: username.trim() || null },
        { onConflict: "id" }
      );

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-sky-700 font-medium">Getting your profile…</p>
      </div>
    );
  }

  return (
    <Card className="max-w-md p-8">
      <h1 className="mb-2 text-3xl font-bold text-sky-900">Your profile</h1>
      <p className="mb-6 text-sky-700">This is the name other players will see. Make it fun!</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label htmlFor="username" className="text-sm font-bold text-sky-800">
          Your username
        </label>
        <Input
          id="username"
          type="text"
          placeholder="e.g. SuperStar123 or CoolKid"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={1}
          maxLength={50}
          required
        />
        {error && (
          <p className="text-sm text-red-600 font-medium" role="alert">
            Oops! {error}
          </p>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save my name"}
        </Button>
      </form>
    </Card>
  );
}

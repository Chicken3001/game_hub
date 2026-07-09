-- Applied via Supabase MCP after the database linter flagged two issues on the
-- objects created by 20260709000000_create_life_games.sql.
-- The fixes are folded back into that migration too, so a fresh `db reset`
-- comes up already hardened; this file keeps the deployed project in sync.

-- 1. life_is_member had a role-mutable search_path.
create or replace function public.life_is_member(p jsonb, uid uuid)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(p, '[]'::jsonb)) e
    where (e->>'user_id')::uuid = uid
  );
$$;

-- 2. The SECURITY DEFINER RPCs were still executable by `anon`:
--    `revoke ... from public` leaves Supabase's explicit grant to `anon` intact.
revoke execute on function public.life_join_game(uuid) from anon;
revoke execute on function public.life_start_game(uuid) from anon;

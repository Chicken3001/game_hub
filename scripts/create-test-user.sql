-- Creates a test user in auth.users + public.profiles.
-- Idempotent: safe to re-run. Uses pgcrypto crypt() for the password hash.
--
-- Run via Supabase SQL editor or the MCP execute_sql tool.
-- Credentials:
--   email:    testuser@gamehub.test
--   password: TestPass123!
--   username: testuser

do $$
declare
  v_email    text := 'testuser@gamehub.test';
  v_password text := 'TestPass123!';
  v_username text := 'testuser';
  v_user_id  uuid;
begin
  select id into v_user_id from auth.users where email = v_email;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated', v_email,
      crypt(v_password, gen_salt('bf')), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      '{}'::jsonb,
      now(), now(),
      '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, provider_id, provider,
      identity_data, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_user_id, v_user_id::text, 'email',
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      now(), now(), now()
    );
  else
    update auth.users
    set encrypted_password = crypt(v_password, gen_salt('bf')),
        updated_at = now()
    where id = v_user_id;
  end if;

  insert into public.profiles (id, username)
  values (v_user_id, v_username)
  on conflict (id) do update set username = excluded.username;
end$$;

select id, email from auth.users where email = 'testuser@gamehub.test';

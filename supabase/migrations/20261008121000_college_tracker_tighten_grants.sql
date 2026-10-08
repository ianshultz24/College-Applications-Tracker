-- Default privileges also granted TRUNCATE / REFERENCES / TRIGGER to authenticated.
-- TRUNCATE ignores RLS, so keep only the four row-level privileges the app needs.
revoke truncate, references, trigger on public.ct_schools from authenticated;
revoke truncate, references, trigger on public.ct_settings from authenticated;

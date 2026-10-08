-- College Tracker: schema, RLS and storage.
-- Additive only: this project ("Workflow") is shared with another app, so nothing
-- here alters existing objects. Every object is prefixed ct_ / ct-.

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create function public.ct_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- ct_schools
-- ---------------------------------------------------------------------------
create table public.ct_schools (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null check (length(btrim(name)) between 1 and 200),
  short_name        text check (length(short_name) <= 40),
  location          text check (length(location) <= 200),
  round             text check (round in ('ED1', 'ED2', 'EA', 'REA', 'RD', 'Rolling')),
  classification    text check (classification in ('Reach+', 'Reach', 'Target', 'Safety')),
  deadline          date,
  decision_start    date,
  decision_end      date,
  submitted         boolean not null default false,
  status            text not null default 'pending'
                    check (status in ('pending', 'accepted', 'rejected', 'waitlisted', 'withdrawn', 'deferred')),
  acceptance_rate   numeric(5, 2) check (acceptance_rate between 0 and 100),
  sat_25            smallint check (sat_25 between 400 and 1600),
  sat_75            smallint check (sat_75 between 400 and 1600),
  supplements_done  smallint check (supplements_done >= 0),
  supplements_total smallint check (supplements_total >= 0),
  portal_url        text check (length(portal_url) <= 2000),
  notes             text check (length(notes) <= 20000),
  custom_fields     jsonb not null default '[]'::jsonb check (jsonb_typeof(custom_fields) = 'array'),
  logo_path         text,
  position          double precision not null default extract(epoch from clock_timestamp()),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint ct_schools_sat_order check (sat_25 is null or sat_75 is null or sat_25 <= sat_75),
  constraint ct_schools_supplements_order
    check (supplements_done is null or supplements_total is null or supplements_done <= supplements_total),
  constraint ct_schools_decision_order
    check (decision_start is null or decision_end is null or decision_start <= decision_end)
);

comment on table public.ct_schools is 'College Tracker: one row per school application.';

create index ct_schools_user_position_idx on public.ct_schools (user_id, position);

create trigger ct_schools_set_updated_at
  before update on public.ct_schools
  for each row execute function public.ct_set_updated_at();

alter table public.ct_schools enable row level security;

create policy "ct_schools: select own" on public.ct_schools
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "ct_schools: insert own" on public.ct_schools
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "ct_schools: update own" on public.ct_schools
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "ct_schools: delete own" on public.ct_schools
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ct_schools from anon;
grant select, insert, update, delete on public.ct_schools to authenticated;

-- ---------------------------------------------------------------------------
-- ct_settings (one row per user)
-- ---------------------------------------------------------------------------
create table public.ct_settings (
  user_id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  colors          jsonb not null default '{}'::jsonb check (jsonb_typeof(colors) = 'object'),
  background_path text,
  blur_px         smallint not null default 12 check (blur_px between 0 and 60),
  dim             real not null default 0.25 check (dim between 0 and 0.95),
  tile_size       smallint check (tile_size between 64 and 320),
  show_names      boolean not null default false,
  my_sat          smallint check (my_sat between 400 and 1600),
  updated_at      timestamptz not null default now()
);

comment on table public.ct_settings is 'College Tracker: per-user appearance settings.';

create trigger ct_settings_set_updated_at
  before update on public.ct_settings
  for each row execute function public.ct_set_updated_at();

alter table public.ct_settings enable row level security;

create policy "ct_settings: select own" on public.ct_settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "ct_settings: insert own" on public.ct_settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "ct_settings: update own" on public.ct_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "ct_settings: delete own" on public.ct_settings
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ct_settings from anon;
grant select, insert, update, delete on public.ct_settings to authenticated;

revoke all on function public.ct_set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: ct-images (logos + backgrounds)
-- Public read via public URLs; writes only inside the caller's own folder:
--   <user_id>/logos/<file>.webp, <user_id>/backgrounds/<file>.webp
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ct-images',
  'ct-images',
  true,
  5242880, -- 5 MB
  array['image/webp', 'image/png', 'image/jpeg'] -- the app always uploads WebP; no SVG (script risk)
);

create policy "ct-images: owner select" on storage.objects
  for select to authenticated
  using (bucket_id = 'ct-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ct-images: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'ct-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ct-images: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'ct-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'ct-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ct-images: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'ct-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

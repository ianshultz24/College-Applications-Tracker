-- The "Tint strength" slider (Settings > Colors): how much status color goes into a decided tile.
alter table public.ct_settings
  add column tint real not null default 0.4 check (tint between 0.2 and 0.6);

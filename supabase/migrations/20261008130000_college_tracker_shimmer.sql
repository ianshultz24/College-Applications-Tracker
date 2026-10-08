-- The design's "Glass shimmer on hover" switch (Settings > Layout).
alter table public.ct_settings
  add column shimmer boolean not null default true;

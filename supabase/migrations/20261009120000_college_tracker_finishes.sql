-- The "Status frames & glimmer" switch (Settings > Layout): Accepted's gold frame and foil,
-- Waitlisted's dashed ring, Deferred's airmail stripes, Rejected's paper grain.
alter table public.ct_settings
  add column finishes boolean not null default true;

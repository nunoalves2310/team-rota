-- TEAM ROTA V3: draft/publish weeks
-- Run once in Supabase SQL Editor.

alter table public.rota_shifts
add column if not exists published boolean not null default true;

-- Existing rota entries remain visible because they are published by default.

-- Replace the rota SELECT policy so team members only see published shifts.
drop policy if exists "Authenticated users can view rota" on public.rota_shifts;

create policy "Users can view published rota"
on public.rota_shifts
for select
to authenticated
using (
    published = true
    or public.is_team_admin()
);

-- Admins can still create/update/delete all rota entries through the existing policies.

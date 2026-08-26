# Team Rota

A Vite + Supabase weekly team rota with:

- Username-style login backed by Supabase Auth
- Admin and read-only team-member roles
- Weekly calendar
- Admin shift editing
- Admin team management (edit/deactivate/activate)
- Copy a full week into the next week
- Shift-swap requests
- Holiday/time-off requests
- Admin approval workflow

## Supabase

The database SQL has already been created in the Supabase project. The app expects:

- `public.team_members`
- `public.rota_shifts`
- `public.shift_swap_requests`
- `public.time_off_requests`
- RPC `public.get_login_email(text)`

## Local setup

1. Copy `.env.example` to `.env`
2. Set:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Run:
   - `npm install`
   - `npm run dev`

## Vercel

Create a Vercel project from this folder and add the two Vite environment variables under Project Settings → Environment Variables. Redeploy after saving them.

Do not put a Supabase service-role/secret key in Vercel environment variables exposed to the browser. Only use the publishable/anon key.

## Important

The "username" is a login convenience. Supabase Auth still uses the internal email identity such as `nuno@teamrota.local`; the user only sees the username field in the app.

## V3 database migration

Run `v3_migration.sql` once in Supabase SQL Editor before deploying V3. It adds draft/publish support to rota shifts and restricts team members to published shifts.

-- Optional: seed the prototype rota for the week of 24 Aug 2026.
-- Run only if you want the initial demo shifts in the live database.

insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-24', 'Office' from public.team_members where username='nuno'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;

insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-25', 'Remote' from public.team_members where username='nuno'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;

insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-26', 'Office' from public.team_members where username='nuno'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;

insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-27', 'Office' from public.team_members where username='nuno'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;

insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-28', 'Leave' from public.team_members where username='nuno'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;

-- Kyle
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-24', 'Remote' from public.team_members where username='kyle'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-25', 'Remote' from public.team_members where username='kyle'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-26', 'Office' from public.team_members where username='kyle'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-27', 'On call' from public.team_members where username='kyle'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-28', 'Office' from public.team_members where username='kyle'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;

-- Dan
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-24', 'Office' from public.team_members where username='dan'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-25', 'Office' from public.team_members where username='dan'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-26', 'Training' from public.team_members where username='dan'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-27', 'Remote' from public.team_members where username='dan'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-28', 'Remote' from public.team_members where username='dan'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;

-- Glauber
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-24', 'On call' from public.team_members where username='glauber'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-25', 'Office' from public.team_members where username='glauber'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-26', 'Office' from public.team_members where username='glauber'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-27', 'Office' from public.team_members where username='glauber'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;
insert into public.rota_shifts (team_member_id, shift_date, shift_type)
select id, '2026-08-28', 'Leave' from public.team_members where username='glauber'
on conflict (team_member_id, shift_date) do update set shift_type=excluded.shift_type;

-- Run once in Supabase SQL Editor. Invite teammates from Authentication > Users.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  contact text not null,
  phone text not null,
  email text,
  stage text not null default 'Novo' check (stage in ('Novo','Em contato','Proposta','Ganho','Perdido')),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  owner_id uuid references public.profiles(id) on delete set null,
  close_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.opportunities add column if not exists next_contact_at date;
alter table public.opportunities add column if not exists priority text not null default 'Normal'
  check (priority in ('Baixa','Normal','Alta','Urgente'));
alter table public.opportunities add column if not exists is_saved boolean not null default true;

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Hamburgueria','Barbearia','Lanchonete')),
  phone text not null,
  address text not null check (address ilike '%Riacho Fundo II%' or address ilike '%Riacho Fundo 2%'),
  source_url text not null,
  checked_at date not null default current_date,
  status text not null default 'Novo' check (status in ('Novo','Contatado')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.opportunities enable row level security;
alter table public.prospects enable row level security;

drop policy if exists "Team members can view profiles" on public.profiles;
create policy "Team members can view profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Authenticated team can read opportunities" on public.opportunities;
create policy "Authenticated team can read opportunities" on public.opportunities for select to authenticated using (true);
drop policy if exists "Authenticated team can create opportunities" on public.opportunities;
create policy "Authenticated team can create opportunities" on public.opportunities for insert to authenticated with check (true);
drop policy if exists "Authenticated team can update opportunities" on public.opportunities;
create policy "Authenticated team can update opportunities" on public.opportunities for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated team can delete opportunities" on public.opportunities;
create policy "Authenticated team can delete opportunities" on public.opportunities for delete to authenticated using (true);

drop policy if exists "Authenticated team can read prospects" on public.prospects;
create policy "Authenticated team can read prospects" on public.prospects for select to authenticated using (true);
drop policy if exists "Authenticated team can create prospects" on public.prospects;
create policy "Authenticated team can create prospects" on public.prospects for insert to authenticated with check (true);
drop policy if exists "Authenticated team can update prospects" on public.prospects;
create policy "Authenticated team can update prospects" on public.prospects for update to authenticated using (true) with check (true);
drop policy if exists "Authenticated team can delete prospects" on public.prospects;
create policy "Authenticated team can delete prospects" on public.prospects for delete to authenticated using (true);

insert into public.prospects (id, name, category, phone, address, source_url, checked_at) values
('00000000-0000-4000-8000-000000000001','Cab Burger','Hamburgueria','+55 61 99288-4866','QN 7D, 1ª Etapa, Riacho Fundo II','https://mindtrip.ai/restaurant/riacho-fundo-federal-district/cab-burger-hamburgueria-no-riacho-fundo-ii/re-X5o4Tk3p','2026-10-23'),
('00000000-0000-4000-8000-000000000002','Seleto Burger','Hamburgueria','+55 61 99272-2058','QN 10, Conjunto 3, Riacho Fundo II','https://wanderlog.com/place/details/10096272/seleto-burger','2026-10-23'),
('00000000-0000-4000-8000-000000000003','Felipe Martins Barbearia Club','Barbearia','(61) 3574-6580','QN 8C, Conjunto 3, Riacho Fundo II','https://www.trinks.com/felipe-martins-barbearia-club','2026-10-23'),
('00000000-0000-4000-8000-000000000004','Barbearia Rodrigues','Barbearia','(61) 99815-6077','QN 21, Conjunto 2, Riacho Fundo II','https://barbeariaspertodemim.com/e/barbearia-rodrigues-atnhod/','2026-10-23'),
('00000000-0000-4000-8000-000000000005','La Fornace','Lanchonete','+55 61 99824-3832','1ª Etapa, Riacho Fundo II','https://www.benditoguia.com.br/empresa/la-fornace-riacho-fundo-ii-brasilia','2026-10-23')
on conflict (id) do nothing;

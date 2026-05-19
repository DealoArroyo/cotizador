-- ============================================================
-- CotizaPro — Supabase Schema
-- Pega este SQL en tu proyecto de Supabase:
-- Dashboard → SQL Editor → New Query → Pega → Run
-- ============================================================

-- Tabla principal: una fila por usuario con JSONB
create table if not exists public.user_data (
  user_id     uuid references auth.users(id) on delete cascade primary key,
  company     jsonb    not null default '{}',
  clients     jsonb    not null default '[]',
  products    jsonb    not null default '[]',
  quotations  jsonb    not null default '[]',
  invoices    jsonb    not null default '[]',
  payments    jsonb    not null default '[]',
  templates   jsonb    not null default '[]',
  settings    jsonb    not null default '{}',
  updated_at  timestamptz not null default now()
);

-- Row Level Security: cada usuario solo ve y edita su propia fila
alter table public.user_data enable row level security;

create policy "Usuarios ven sus propios datos"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Usuarios insertan sus propios datos"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "Usuarios actualizan sus propios datos"
  on public.user_data for update
  using (auth.uid() = user_id);

create policy "Usuarios eliminan sus propios datos"
  on public.user_data for delete
  using (auth.uid() = user_id);

-- Trigger para updated_at automático
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_user_data_updated_at
  before update on public.user_data
  for each row execute function public.set_updated_at();

-- ================================================================
-- Escalada Ads Calculator — Supabase Migration
-- Execute no SQL Editor do seu projeto Supabase
-- ================================================================

-- Tabela de mentorados
create table if not exists mentorados (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  store_url  text,
  niche      text,
  notes      text,
  created_at timestamptz default now()
);

-- Tabela de cenários (vinculada ao mentorado)
create table if not exists scenarios (
  id           uuid primary key default gen_random_uuid(),
  mentorado_id uuid references mentorados(id) on delete cascade,
  name         text not null,
  input        jsonb not null default '{}',
  results      jsonb not null default '{}',
  adjustments  text default '',
  created_at   timestamptz default now()
);

-- Índice para busca rápida por mentorado
create index if not exists scenarios_mentorado_idx on scenarios(mentorado_id);

-- Habilitar RLS (Row Level Security) — por padrão tudo aberto, ajuste conforme necessidade
alter table mentorados enable row level security;
alter table scenarios   enable row level security;

-- Política permissiva para uso sem autenticação (ajuste se adicionar auth depois)
create policy "allow all mentorados" on mentorados for all using (true) with check (true);
create policy "allow all scenarios"  on scenarios  for all using (true) with check (true);

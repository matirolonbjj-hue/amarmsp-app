-- ============================================================
-- A MAR — Gestão Costeira — Supabase Schema
-- Execute este SQL no Supabase SQL Editor
-- ============================================================

-- USUÁRIOS (espelho do auth.users para dados extras)
create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null unique,
  criado_em timestamptz default now()
);

-- CATEGORIAS
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz default now()
);

-- PRODUTOS
create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria_id uuid references public.categorias(id) on delete set null,
  preco_custo numeric(10,2) not null,
  preco_venda numeric(10,2) not null,
  estoque_atual integer default 0,
  estoque_minimo integer default 0,
  ativo boolean default true,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- VENDAS
create table if not exists public.vendas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete set null,
  data_venda date not null,
  total numeric(10,2) not null,
  observacao text,
  criado_em timestamptz default now()
);

-- ITENS DA VENDA
create table if not exists public.itens_venda (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid references public.vendas(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  quantidade integer not null,
  preco_unitario numeric(10,2) not null,
  preco_custo_unitario numeric(10,2) not null,
  subtotal numeric(10,2) not null
);

-- DESPESAS
create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users(id) on delete set null,
  descricao text not null,
  valor numeric(10,2) not null,
  categoria_despesa text,
  data_despesa date not null,
  criado_em timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Qualquer usuário autenticado acessa tudo
-- ============================================================

alter table public.usuarios enable row level security;
alter table public.categorias enable row level security;
alter table public.produtos enable row level security;
alter table public.vendas enable row level security;
alter table public.itens_venda enable row level security;
alter table public.despesas enable row level security;

-- Políticas: acesso total para usuários autenticados
create policy "Authenticated full access" on public.usuarios for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on public.categorias for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on public.produtos for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on public.vendas for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on public.itens_venda for all to authenticated using (true) with check (true);
create policy "Authenticated full access" on public.despesas for all to authenticated using (true) with check (true);

-- ============================================================
-- DADOS INICIAIS (Categorias)
-- ============================================================
insert into public.categorias (nome) values
  ('Moda Praia'),
  ('Acessórios'),
  ('Calçados'),
  ('Equipamentos'),
  ('Proteção Solar'),
  ('Eletrônicos')
on conflict do nothing;

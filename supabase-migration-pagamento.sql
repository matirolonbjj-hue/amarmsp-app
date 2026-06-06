-- ============================================================
-- MIGRATION: Métodos de pagamento + configurações de taxas
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar colunas na tabela vendas
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'dinheiro',
  ADD COLUMN IF NOT EXISTS parcelas INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS taxa_aplicada NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(10, 2) DEFAULT NULL;

-- 2. Criar tabela de configurações (chave-valor)
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS na tabela configuracoes
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access - configuracoes"
  ON configuracoes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION update_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_configuracoes_atualizado ON configuracoes;
CREATE TRIGGER trg_configuracoes_atualizado
  BEFORE UPDATE ON configuracoes
  FOR EACH ROW EXECUTE FUNCTION update_atualizado_em();

-- 5. Valores padrão (ajuste conforme sua maquininha)
INSERT INTO configuracoes (chave, valor) VALUES
  ('taxa_pix',        '1.99'),
  ('taxa_cartao_1x',  '2.49'),
  ('taxa_cartao_2x',  '3.49'),
  ('taxa_cartao_3x',  '3.99'),
  ('taxa_cartao_4x',  '4.49'),
  ('taxa_cartao_5x',  '4.99'),
  ('taxa_cartao_6x',  '5.49'),
  ('taxa_cartao_7x',  '5.99'),
  ('taxa_cartao_8x',  '6.49'),
  ('taxa_cartao_9x',  '6.99'),
  ('taxa_cartao_10x', '7.49'),
  ('taxa_cartao_11x', '7.99'),
  ('taxa_cartao_12x', '8.49')
ON CONFLICT (chave) DO NOTHING;

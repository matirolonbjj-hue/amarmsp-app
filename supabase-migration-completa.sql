-- ============================================================
-- MIGRAÇÃO COMPLETA — A MAR Gestão
-- Execute no Supabase SQL Editor (é seguro rodar mais de uma vez)
-- ============================================================

-- 1. Colunas de pagamento na tabela vendas
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT DEFAULT 'dinheiro',
  ADD COLUMN IF NOT EXISTS parcelas INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS taxa_aplicada NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(10, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bandeira TEXT DEFAULT NULL;

-- 2. Tabela de configurações (chave-valor)
CREATE TABLE IF NOT EXISTS configuracoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS na tabela configuracoes
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'configuracoes'
    AND policyname = 'Authenticated full access - configuracoes'
  ) THEN
    CREATE POLICY "Authenticated full access - configuracoes"
      ON configuracoes FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 4. Trigger atualizado_em
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

-- 5. Taxas padrão por bandeira (ajuste conforme sua maquininha)
INSERT INTO configuracoes (chave, valor) VALUES
  -- PIX
  ('taxa_pix', '1.29'),
  -- Débito
  ('taxa_debito_visa',      '1.49'),
  ('taxa_debito_master',    '1.49'),
  ('taxa_debito_elo',       '1.59'),
  ('taxa_debito_amex',      '1.89'),
  ('taxa_debito_hipercard', '1.89'),
  -- Crédito 1x
  ('taxa_credito_1x_visa',       '2.49'),
  ('taxa_credito_1x_master',     '2.49'),
  ('taxa_credito_1x_elo',        '2.59'),
  ('taxa_credito_1x_amex',       '2.99'),
  ('taxa_credito_1x_hipercard',  '2.99'),
  -- Crédito 2x
  ('taxa_credito_2x_visa',       '3.49'),
  ('taxa_credito_2x_master',     '3.49'),
  ('taxa_credito_2x_elo',        '3.59'),
  ('taxa_credito_2x_amex',       '3.99'),
  ('taxa_credito_2x_hipercard',  '3.99'),
  -- Crédito 3x
  ('taxa_credito_3x_visa',       '4.49'),
  ('taxa_credito_3x_master',     '4.49'),
  ('taxa_credito_3x_elo',        '4.59'),
  ('taxa_credito_3x_amex',       '4.99'),
  ('taxa_credito_3x_hipercard',  '4.99')
ON CONFLICT (chave) DO NOTHING;

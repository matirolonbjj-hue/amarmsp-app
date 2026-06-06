-- ============================================================
-- MIGRATION: Bandeiras de cartão (débito/crédito por bandeira)
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Adicionar coluna bandeira na tabela vendas
ALTER TABLE vendas
  ADD COLUMN IF NOT EXISTS bandeira TEXT DEFAULT NULL;

-- 2. Inserir taxas padrão por bandeira (ajuste conforme sua maquininha)
-- PIX
INSERT INTO configuracoes (chave, valor) VALUES ('taxa_pix', '1.29') ON CONFLICT (chave) DO NOTHING;

-- Débito
INSERT INTO configuracoes (chave, valor) VALUES
  ('taxa_debito_visa',       '1.49'),
  ('taxa_debito_master',     '1.49'),
  ('taxa_debito_elo',        '1.59'),
  ('taxa_debito_amex',       '1.89'),
  ('taxa_debito_hipercard',  '1.89')
ON CONFLICT (chave) DO NOTHING;

-- Crédito à vista (1x)
INSERT INTO configuracoes (chave, valor) VALUES
  ('taxa_credito_1x_visa',       '2.49'),
  ('taxa_credito_1x_master',     '2.49'),
  ('taxa_credito_1x_elo',        '2.59'),
  ('taxa_credito_1x_amex',       '2.99'),
  ('taxa_credito_1x_hipercard',  '2.99')
ON CONFLICT (chave) DO NOTHING;

-- Crédito 2x
INSERT INTO configuracoes (chave, valor) VALUES
  ('taxa_credito_2x_visa',       '3.49'),
  ('taxa_credito_2x_master',     '3.49'),
  ('taxa_credito_2x_elo',        '3.59'),
  ('taxa_credito_2x_amex',       '3.99'),
  ('taxa_credito_2x_hipercard',  '3.99')
ON CONFLICT (chave) DO NOTHING;

-- Crédito 3x
INSERT INTO configuracoes (chave, valor) VALUES
  ('taxa_credito_3x_visa',       '4.49'),
  ('taxa_credito_3x_master',     '4.49'),
  ('taxa_credito_3x_elo',        '4.59'),
  ('taxa_credito_3x_amex',       '4.99'),
  ('taxa_credito_3x_hipercard',  '4.99')
ON CONFLICT (chave) DO NOTHING;

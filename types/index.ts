export interface Usuario {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
}

export interface Categoria {
  id: string;
  nome: string;
  criado_em: string;
}

export interface Produto {
  id: string;
  nome: string;
  categoria_id: string | null;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  categorias?: Categoria;
}

export interface Venda {
  id: string;
  usuario_id: string;
  data_venda: string;
  total: number;
  valor_liquido?: number;
  metodo_pagamento?: "dinheiro" | "pix" | "debito" | "credito";
  bandeira?: "visa" | "master" | "elo" | "amex" | "hipercard" | null;
  parcelas?: number | null;
  taxa_aplicada?: number;
  observacao: string | null;
  criado_em: string;
  usuarios?: Usuario;
  itens_venda?: ItemVenda[];
}

export interface ItemVenda {
  id: string;
  venda_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  preco_custo_unitario: number;
  subtotal: number;
  produtos?: Produto;
}

export interface Despesa {
  id: string;
  usuario_id: string;
  descricao: string;
  valor: number;
  categoria_despesa: string | null;
  data_despesa: string;
  criado_em: string;
  usuarios?: Usuario;
}

export interface DashboardStats {
  vendasHoje: number;
  vendasSemana: number;
  vendasMes: number;
  lucroLiquidoMes: number;
  despesasMes: number;
  produtosEstoqueBaixo: number;
}

export interface VendaChartData {
  data: string;
  total: number;
}

export interface TopProduto {
  produto_id: string;
  nome: string;
  quantidade: number;
  total: number;
}

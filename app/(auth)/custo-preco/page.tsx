"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, calcMargem } from "@/lib/utils";
import type { Produto, Categoria } from "@/types";

const PAGE_SIZE = 15;

export default function CustoPrecoPage() {
  const supabase = createClient();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ margemMedia: 0, markupMedio: 0, abaixo30: 0, lucroOperacional: 0 });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCategorias(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadProdutos(); }, [filterCategoria, page]);

  async function loadCategorias() {
    const { data } = await supabase.from("categorias").select("*").order("nome");
    setCategorias(data || []);
  }

  async function loadProdutos() {
    setLoading(true);
    let query = supabase
      .from("produtos")
      .select("*, categorias(nome)", { count: "exact" })
      .eq("ativo", true)
      .order("nome");

    if (filterCategoria !== "all") query = query.eq("categoria_id", filterCategoria);

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count } = await query;
    const list = data || [];
    setProdutos(list);
    setTotal(count || 0);

    const margens = list.map((p) => calcMargem(p.preco_custo, p.preco_venda));
    const margemMedia = margens.length ? margens.reduce((s, m) => s + m, 0) / margens.length : 0;
    const markupMedio = list.length ? list.reduce((s, p) => s + (p.preco_custo > 0 ? p.preco_venda / p.preco_custo : 0), 0) / list.length : 0;
    const abaixo30 = margens.filter((m) => m < 30).length;
    const lucroOp = list.reduce((s, p) => s + (p.preco_venda - p.preco_custo) * p.estoque_atual, 0);

    setStats({ margemMedia, markupMedio, abaixo30, lucroOperacional: lucroOp });
    setLoading(false);
  }

  const margemBadge = (margem: number) => {
    if (margem >= 50) return { color: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950", dot: "bg-green-500" };
    if (margem >= 30) return { color: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950", dot: "bg-orange-400" };
    return { color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950", dot: "bg-red-500" };
  };

  const pages = Math.ceil(total / PAGE_SIZE);

  const catMargens: Record<string, number[]> = {};
  produtos.forEach((p) => {
    const cat = (p as Produto & { categorias?: { nome: string } }).categorias?.nome || "Outros";
    if (!catMargens[cat]) catMargens[cat] = [];
    catMargens[cat].push(calcMargem(p.preco_custo, p.preco_venda));
  });

  return (
    <div className="flex flex-col min-h-full">
      <Header searchPlaceholder="Buscar margens ou categorias..." />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Análise de Margens</h1>
            <p className="text-sm text-muted-foreground mt-1">Comparativo de custos e rentabilidade por produto e categoria.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm font-medium rounded-lg bg-[#1B9AAA] text-white">Visão Geral</button>
            <button className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors">Alertas Críticos</button>
            <button className="px-4 py-2 text-sm font-medium rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors">Exportar PDF</button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Margem Média</p>
              <p className="text-2xl font-bold mt-1">{stats.margemMedia.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">+2.4% vs mês ant.</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Markup Médio</p>
              <p className="text-2xl font-bold mt-1">{stats.markupMedio.toFixed(2)}x</p>
              <p className="text-xs text-muted-foreground mt-0.5">Estável</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Produtos Abaixo 30%</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.abaixo30}</p>
              <p className="text-xs text-red-500 font-medium mt-0.5">Ação necessária</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Lucro Operacional</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(stats.lucroOperacional / 1000 >= 1 ? stats.lucroOperacional : stats.lucroOperacional)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Meta: 85%</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <Select value={filterCategoria} onValueChange={(v) => { setFilterCategoria(v); setPage(1); }}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Categorias</SelectItem>
                      {categorias.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">Exibindo {produtos.length} itens</span>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                      <th className="text-left pb-3">Produto</th>
                      <th className="text-left pb-3">Categoria</th>
                      <th className="text-right pb-3">Custo</th>
                      <th className="text-right pb-3">Venda</th>
                      <th className="text-right pb-3">Margem %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">Carregando...</td></tr>
                    ) : produtos.length === 0 ? (
                      <tr><td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">Nenhum produto encontrado.</td></tr>
                    ) : (
                      produtos.map((p) => {
                        const margem = calcMargem(p.preco_custo, p.preco_venda);
                        const badge = margemBadge(margem);
                        return (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-lg">🏖️</div>
                                <div>
                                  <p className="text-sm font-medium">{p.nome}</p>
                                  <p className="text-xs text-muted-foreground">SKU: {p.id.slice(0, 8).toUpperCase()}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge variant="outline" className="text-[10px]">
                                {(p as Produto & { categorias?: { nome: string } }).categorias?.nome || "—"}
                              </Badge>
                            </td>
                            <td className="py-3 text-sm text-right">{formatCurrency(p.preco_custo)}</td>
                            <td className="py-3 text-sm text-right">{formatCurrency(p.preco_venda)}</td>
                            <td className="py-3 text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${badge.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                                {margem.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {pages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-sm text-[#1B9AAA] hover:underline disabled:opacity-40">
                      ← Anterior
                    </button>
                    <span className="text-sm text-muted-foreground">{page} / {pages}</span>
                    <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="text-sm text-[#1B9AAA] hover:underline disabled:opacity-40">
                      Próxima →
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="border-[#1B9AAA]/30 bg-[#1B9AAA]/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-[#1B9AAA]">Insight da Semana</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">
                  Verifique os produtos com margem abaixo de 30% e considere ajustar o preço de venda ou negociar com fornecedores.
                </p>
                <button className="mt-3 text-xs text-[#1B9AAA] font-medium hover:underline flex items-center gap-1">
                  Ver Sugestões ✦
                </button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Margens por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(catMargens).map(([cat, margens]) => {
                  const avg = margens.reduce((s, m) => s + m, 0) / margens.length;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium uppercase text-xs tracking-wider text-muted-foreground">{cat}</span>
                        <span className={`text-xs font-semibold ${avg >= 30 ? "text-[#1B9AAA]" : "text-red-500"}`}>{avg.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${avg >= 30 ? "bg-[#1B9AAA]" : "bg-red-400"}`}
                          style={{ width: `${Math.min(100, avg)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {Object.keys(catMargens).length === 0 && (
                  <p className="text-xs text-muted-foreground">Sem dados de categoria.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

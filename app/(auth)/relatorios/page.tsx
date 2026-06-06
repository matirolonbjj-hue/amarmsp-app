"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Tag, FileText, TrendingUp, DollarSign } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { createClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";

const COLORS = ["#1B9AAA", "#0D6E7A", "#AB6227", "#85d3e0"];

interface WeekData {
  semana: string;
  receita: number;
  despesas: number;
}

interface CatData {
  name: string;
  value: number;
  pct: number;
}

interface TopProd {
  nome: string;
  quantidade: number;
  ticket: number;
  faturamento: number;
  sku: string;
  status: string;
}

export default function RelatoriosPage() {
  const supabase = createClient();
  const [periodo, setPeriodo] = useState<"hoje" | "mensal" | "anual">("mensal");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalVendas: 0,
    despesas: 0,
    lucroBruto: 0,
    lucroLiquido: 0,
    deltaTotalVendas: "+12.5%",
    deltaDespesas: "-4.2%",
  });
  const [weekData, setWeekData] = useState<WeekData[]>([]);
  const [catData, setCatData] = useState<CatData[]>([]);
  const [topProdutos, setTopProdutos] = useState<TopProd[]>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadRelatorio(); }, [periodo]);

  async function loadRelatorio() {
    setLoading(true);
    const now = new Date();
    let start: string, end: string;

    if (periodo === "hoje") {
      start = end = format(now, "yyyy-MM-dd");
    } else if (periodo === "mensal") {
      start = format(startOfMonth(now), "yyyy-MM-dd");
      end = format(endOfMonth(now), "yyyy-MM-dd");
    } else {
      start = format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd");
      end = format(new Date(now.getFullYear(), 11, 31), "yyyy-MM-dd");
    }

    const [vendasRes, despesasRes, itensRes] = await Promise.all([
      supabase.from("vendas").select("total, data_venda").gte("data_venda", start).lte("data_venda", end),
      supabase.from("despesas").select("valor").gte("data_despesa", start).lte("data_despesa", end),
      supabase.from("itens_venda").select("quantidade, subtotal, preco_custo_unitario, preco_unitario, produto_id, produtos(nome, categoria_id, categorias(nome))")
        .gte("criado_em", start + "T00:00:00")
        .lte("criado_em", end + "T23:59:59"),
    ]);

    const totalVendas = (vendasRes.data || []).reduce((s, v) => s + v.total, 0);
    const totalDespesas = (despesasRes.data || []).reduce((s, d) => s + d.valor, 0);

    let lucroBruto = 0;
    for (const item of itensRes.data || []) {
      lucroBruto += (item.preco_unitario - item.preco_custo_unitario) * item.quantidade;
    }
    const lucroLiquido = lucroBruto - totalDespesas;

    setStats({
      totalVendas,
      despesas: totalDespesas,
      lucroBruto,
      lucroLiquido,
      deltaTotalVendas: "+12.5%",
      deltaDespesas: "-4.2%",
    });

    const vendas = vendasRes.data || [];
    const weeks: Record<string, { receita: number; despesas: number }> = {
      "SEM 1": { receita: 0, despesas: 0 },
      "SEM 2": { receita: 0, despesas: 0 },
      "SEM 3": { receita: 0, despesas: 0 },
      "SEM 4": { receita: 0, despesas: 0 },
    };
    vendas.forEach((v) => {
      const day = parseInt(v.data_venda.split("-")[2]);
      const week = day <= 7 ? "SEM 1" : day <= 14 ? "SEM 2" : day <= 21 ? "SEM 3" : "SEM 4";
      weeks[week].receita += v.total;
    });
    setWeekData(Object.entries(weeks).map(([semana, vals]) => ({ semana, ...vals })));

    const catMap: Record<string, number> = {};
    for (const item of itensRes.data || []) {
      const cat = (item.produtos as { categorias?: { nome?: string } } | null)?.categorias?.nome || "Outros";
      catMap[cat] = (catMap[cat] || 0) + item.subtotal;
    }
    const total = Object.values(catMap).reduce((s, v) => s + v, 0) || 1;
    setCatData(Object.entries(catMap).map(([name, value]) => ({ name, value, pct: Math.round((value / total) * 100) })));

    const prodMap: Record<string, TopProd> = {};
    for (const item of itensRes.data || []) {
      const pid = item.produto_id;
      const nome = (item.produtos as { nome?: string } | null)?.nome || "-";
      if (!prodMap[pid]) {
        prodMap[pid] = { nome, quantidade: 0, ticket: item.preco_unitario, faturamento: 0, sku: `MAR-${pid.slice(0, 4).toUpperCase()}`, status: "Em estoque" };
      }
      prodMap[pid].quantidade += item.quantidade;
      prodMap[pid].faturamento += item.subtotal;
    }
    setTopProdutos(Object.values(prodMap).sort((a, b) => b.faturamento - a.faturamento).slice(0, 5));
    setLoading(false);
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header searchPlaceholder="Pesquisar dados do relatório..." />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Relatórios de Desempenho</h1>
            <p className="text-sm text-muted-foreground mt-1">Análise panorâmica de vendas e saúde financeira da unidade.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["hoje", "mensal", "anual"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${periodo === p ? "bg-[#1B9AAA] text-white" : "hover:bg-muted text-muted-foreground"}`}
                >
                  {p === "hoje" ? "Hoje" : p === "mensal" ? "Mensal" : "Anual"}
                </button>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Exportar PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Vendas", value: formatCurrency(stats.totalVendas), delta: stats.deltaTotalVendas, positive: true, icon: <Tag className="w-5 h-5" /> },
            { label: "Despesas", value: formatCurrency(stats.despesas), delta: stats.deltaDespesas, positive: false, icon: <FileText className="w-5 h-5" /> },
            { label: "Lucro Bruto", value: formatCurrency(stats.lucroBruto), delta: "", positive: true, icon: <TrendingUp className="w-5 h-5" /> },
            { label: "Lucro Líquido", value: formatCurrency(stats.lucroLiquido), delta: "", positive: true, icon: <DollarSign className="w-5 h-5" />, highlight: true },
          ].map((item) => (
            <Card key={item.label} className={item.highlight ? "bg-[#0D6E7A] text-white border-0" : ""}>
              <CardContent className="pt-5">
                <div className={`p-2 rounded-lg w-fit mb-3 ${item.highlight ? "bg-white/20" : "bg-[#1B9AAA]/10 text-[#1B9AAA]"}`}>
                  {item.icon}
                </div>
                {item.delta && (
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${item.positive ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"} ${item.highlight ? "!bg-white/20 !text-white" : ""}`}>
                    {item.delta}
                  </span>
                )}
                <p className={`text-xs font-medium uppercase tracking-wider mt-2 ${item.highlight ? "text-white/70" : "text-muted-foreground"}`}>{item.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${item.highlight ? "text-white" : ""}`}>{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Fluxo de Caixa Mensal</CardTitle>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1B9AAA]" />Receita</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#b3ecf2]" />Despesas</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weekData} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatCurrency(v), name === "receita" ? "Receita" : "Despesas"]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="receita" fill="#1B9AAA" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesas" fill="#b3ecf2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Vendas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {catData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={catData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {catData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-3">
                    {catData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="font-medium">{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Produtos Mais Vendidos</CardTitle>
              <button className="text-xs text-[#1B9AAA] hover:underline font-medium">Ver tudo</button>
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full">
              <thead>
                <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="text-left pb-3 w-8"></th>
                  <th className="text-left pb-3">Produto</th>
                  <th className="text-right pb-3">Quantidade</th>
                  <th className="text-right pb-3">Ticket Médio</th>
                  <th className="text-right pb-3">Faturamento</th>
                  <th className="text-right pb-3">Status Estoque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">Carregando...</td></tr>
                ) : topProdutos.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">Sem dados de vendas.</td></tr>
                ) : (
                  topProdutos.map((p) => (
                    <tr key={p.sku} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm">🏖️</div>
                      </td>
                      <td className="py-3">
                        <p className="text-sm font-medium">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>
                      </td>
                      <td className="py-3 text-sm text-right">{p.quantidade} unid.</td>
                      <td className="py-3 text-sm text-right">{formatCurrency(p.ticket)}</td>
                      <td className="py-3 text-sm font-semibold text-right text-[#1B9AAA]">{formatCurrency(p.faturamento)}</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 text-[10px] font-medium rounded-md uppercase">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

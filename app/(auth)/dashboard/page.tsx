"use client";

import { useEffect, useState } from "react";
import {
  ShoppingBag,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { createClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Produto } from "@/types";
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface ChartData {
  label: string;
  total: number;
}

interface TopProdutoItem {
  produto_id: string;
  nome: string;
  quantidade: number;
  total: number;
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function DashboardPage() {
  const supabase = createClient();
  const [vendasHoje, setVendasHoje] = useState(0);
  const [vendasMes, setVendasMes] = useState(0);
  const [lucroMes, setLucroMes] = useState(0);
  const [estoqueBaixo, setEstoqueBaixo] = useState(0);
  const [produtosBaixo, setProdutosBaixo] = useState<Produto[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [topProdutos, setTopProdutos] = useState<TopProdutoItem[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Record<string, number>>({});
  const [tooltip, setTooltip] = useState<{ day: Date; value: number; x: number; y: number } | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadDashboard(); }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCalendarMonth(); }, [calendarMonth]);

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const todayStart = format(startOfDay(now), "yyyy-MM-dd");
    const todayEnd = format(endOfDay(now), "yyyy-MM-dd");
    const monthStart = format(startOfMonth(now), "yyyy-MM-dd");

    const [vendasHojeRes, vendasMesRes, vendasPeriodoRes] = await Promise.all([
      supabase.from("vendas").select("total").gte("data_venda", todayStart).lte("data_venda", todayEnd),
      supabase.from("vendas").select("id, total, itens_venda(quantidade, preco_custo_unitario, preco_unitario)").gte("data_venda", monthStart),
      supabase.from("vendas").select("data_venda, total").gte("data_venda", format(subDays(now, 29), "yyyy-MM-dd")).order("data_venda", { ascending: true }),
    ]);

    setVendasHoje((vendasHojeRes.data || []).reduce((s, v) => s + (v.total || 0), 0));

    const totalMes = (vendasMesRes.data || []).reduce((s, v) => s + (v.total || 0), 0);
    setVendasMes(totalMes);

    let lucro = 0;
    for (const venda of vendasMesRes.data || []) {
      for (const item of ((venda.itens_venda as Record<string, number>[]) || [])) {
        lucro += (item.preco_unitario - item.preco_custo_unitario) * item.quantidade;
      }
    }
    setLucroMes(lucro);

    const { data: prods } = await supabase.from("produtos").select("*, categorias(nome)").eq("ativo", true);
    const baixo = (prods || []).filter((p) => p.estoque_atual <= p.estoque_minimo);
    setEstoqueBaixo(baixo.length);
    setProdutosBaixo(baixo.slice(0, 5));

    const grouped: Record<string, number> = {};
    (vendasPeriodoRes.data || []).forEach((v) => {
      grouped[v.data_venda] = (grouped[v.data_venda] || 0) + v.total;
    });
    const chart = [];
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(now, i), "yyyy-MM-dd");
      chart.push({ label: format(new Date(d + "T00:00:00"), "dd/MM"), total: grouped[d] || 0 });
    }
    setChartData(chart);

    const { data: topItens } = await supabase.from("itens_venda").select("produto_id, quantidade, subtotal, produtos(nome)").order("quantidade", { ascending: false });
    const prodMap: Record<string, TopProdutoItem> = {};
    for (const item of topItens || []) {
      const pid = item.produto_id;
      if (!prodMap[pid]) prodMap[pid] = { produto_id: pid, nome: (item.produtos as { nome?: string })?.nome || "-", quantidade: 0, total: 0 };
      prodMap[pid].quantidade += item.quantidade;
      prodMap[pid].total += item.subtotal;
    }
    setTopProdutos(Object.values(prodMap).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5));
  }

  async function loadCalendarMonth() {
    const start = format(startOfMonth(calendarMonth), "yyyy-MM-dd");
    const end = format(endOfMonth(calendarMonth), "yyyy-MM-dd");
    const { data } = await supabase.from("vendas").select("data_venda, total").gte("data_venda", start).lte("data_venda", end);
    const map: Record<string, number> = {};
    (data || []).forEach((v) => { map[v.data_venda] = (map[v.data_venda] || 0) + v.total; });
    setCalendarData(map);
  }

  const pctHoje = vendasMes > 0 ? ((vendasHoje / vendasMes) * 100).toFixed(1) : "0";

  // calendar helpers
  const calDays = eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) });
  const firstDow = getDay(startOfMonth(calendarMonth));
  const maxVal = Math.max(...Object.values(calendarData), 1);

  function getDayBg(val: number) {
    if (val === 0) return { bg: "", text: "text-muted-foreground/40" };
    const pct = val / maxVal;
    if (pct < 0.15) return { bg: "bg-[#1B9AAA]/10", text: "text-[#1B9AAA]" };
    if (pct < 0.35) return { bg: "bg-[#1B9AAA]/25", text: "text-[#1B9AAA]" };
    if (pct < 0.55) return { bg: "bg-[#1B9AAA]/45", text: "text-[#0D6E7A] dark:text-white" };
    if (pct < 0.75) return { bg: "bg-[#1B9AAA]/65", text: "text-white" };
    return { bg: "bg-[#1B9AAA]", text: "text-white" };
  }

  function formatCompact(v: number) {
    if (v === 0) return "";
    if (v >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
    return `R$${v.toFixed(0)}`;
  }

  const calendarMonthTotal = Object.values(calendarData).reduce((s, v) => s + v, 0);
  const calendarDaysWithSales = Object.values(calendarData).filter((v) => v > 0).length;

  return (
    <div className="flex flex-col min-h-full">
      <Header searchPlaceholder="Buscar dados, produtos ou relatórios..." />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Visão Geral do Negócio</h1>
            <p className="text-sm text-muted-foreground mt-1">Bem-vindo de volta, gerente. Aqui está o que está acontecendo hoje.</p>
          </div>
          {estoqueBaixo > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 rounded-lg px-4 py-2 text-sm font-medium dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300">
              <AlertTriangle className="w-4 h-4" />
              URGENTE: {estoqueBaixo} {estoqueBaixo === 1 ? "ITEM ABAIXO" : "ITENS ABAIXO"} DO ESTOQUE MÍNIMO
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="VENDAS HOJE" value={formatCurrency(vendasHoje)} badge={`+${pctHoje}%`} badgeColor="success" icon={<ShoppingBag className="w-5 h-5" />} />
          <MetricCard title="VENDAS DO MÊS" value={formatCurrency(vendasMes)} badge="+8.2%" badgeColor="success" icon={<Calendar className="w-5 h-5" />} />
          <MetricCard title="LUCRO LÍQUIDO" value={formatCurrency(lucroMes)} badge="+5.4%" badgeColor="success" icon={<TrendingUp className="w-5 h-5" />} />
          <MetricCard title="ESTOQUE BAIXO" value={`${estoqueBaixo} Itens`} badge={estoqueBaixo > 0 ? "Crítico" : "OK"} badgeColor={estoqueBaixo > 0 ? "destructive" : "success"} icon={<Package className="w-5 h-5" />} />
        </div>

        {/* Calendar + Top Produtos */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Revenue Calendar */}
          <Card className="xl:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Faturamento por Dia</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {calendarDaysWithSales} dias com venda · Total {formatCurrency(calendarMonthTotal)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <span className="text-sm font-medium px-2 min-w-[120px] text-center capitalize">
                    {format(calendarMonth, "MMMM yyyy", { locale: ptBR })}
                  </span>
                  <button
                    onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                    className="p-1.5 rounded-md hover:bg-muted transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-[11px] font-medium text-muted-foreground py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells before first day */}
                {Array.from({ length: firstDow }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {calDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const val = calendarData[key] || 0;
                  const { bg, text } = getDayBg(val);
                  const today = isToday(day);

                  return (
                    <div
                      key={key}
                      className={`
                        relative rounded-lg p-1.5 flex flex-col items-center justify-center min-h-[52px] cursor-default transition-all
                        ${bg || "hover:bg-muted/40"}
                        ${today ? "ring-2 ring-[#1B9AAA] ring-offset-1 ring-offset-background" : ""}
                      `}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ day, value: val, x: rect.left + rect.width / 2, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <span className={`text-[11px] font-medium leading-none mb-1 ${today ? "text-[#1B9AAA] font-bold" : "text-muted-foreground"}`}>
                        {format(day, "d")}
                      </span>
                      {val > 0 && (
                        <span className={`text-[10px] font-semibold leading-none ${text}`}>
                          {formatCompact(val)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-end gap-1.5 mt-3">
                <span className="text-[10px] text-muted-foreground">Menos</span>
                {["bg-muted/30", "bg-[#1B9AAA]/15", "bg-[#1B9AAA]/30", "bg-[#1B9AAA]/55", "bg-[#1B9AAA]/75", "bg-[#1B9AAA]"].map((bg, i) => (
                  <div key={i} className={`w-4 h-4 rounded-sm ${bg}`} />
                ))}
                <span className="text-[10px] text-muted-foreground">Mais</span>
              </div>

              {/* Tooltip */}
              {tooltip && (
                <div
                  className="fixed z-50 pointer-events-none bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-xs -translate-x-1/2 -translate-y-full -mt-2"
                  style={{ left: tooltip.x, top: tooltip.y }}
                >
                  <p className="font-medium text-foreground">{format(tooltip.day, "dd 'de' MMMM", { locale: ptBR })}</p>
                  <p className="text-[#1B9AAA] font-semibold mt-0.5">
                    {tooltip.value > 0 ? formatCurrency(tooltip.value) : "Sem vendas"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 5 Produtos */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Top 5 Produtos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topProdutos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma venda registrada.</p>
              ) : (
                topProdutos.map((p, i) => (
                  <div key={p.produto_id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{p.quantidade} vendidos</p>
                    </div>
                    <span className="text-sm font-semibold text-[#1B9AAA]">{formatCurrency(p.total)}</span>
                  </div>
                ))
              )}
              <button className="mt-2 text-xs text-[#1B9AAA] hover:underline w-full text-center">
                Ver relatório completo
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Line chart */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Vendas (Últimos 30 Dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), "Vendas"]}
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                />
                <Line type="monotone" dataKey="total" stroke="#1B9AAA" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: "#1B9AAA" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventário Crítico */}
        {produtosBaixo.length > 0 && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Inventário Crítico</CardTitle>
                <div className="flex items-center gap-1 text-orange-600 text-xs font-medium dark:text-orange-400">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Reposição Necessária
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                    <th className="text-left pb-2">Produto</th>
                    <th className="text-left pb-2">Qtd Atual</th>
                    <th className="text-left pb-2">Mínimo</th>
                    <th className="text-left pb-2">Status</th>
                    <th className="text-right pb-2">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {produtosBaixo.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 text-sm font-medium">{p.nome}</td>
                      <td className="py-3">
                        <span className={`text-sm font-semibold ${p.estoque_atual === 0 ? "text-red-600" : "text-orange-600"}`}>
                          {p.estoque_atual}
                        </span>
                      </td>
                      <td className="py-3 text-sm text-muted-foreground">{p.estoque_minimo}</td>
                      <td className="py-3">
                        <Badge variant={p.estoque_atual === 0 ? "destructive" : "warning"} className="text-[10px] uppercase">
                          {p.estoque_atual === 0 ? "Crítico" : "Alerta"}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        <button className="text-xs text-[#1B9AAA] font-medium hover:underline">Pedir Agora</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function MetricCard({ title, value, badge, badgeColor, icon }: {
  title: string; value: string; badge: string;
  badgeColor: "success" | "destructive" | "warning"; icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 rounded-lg bg-[#1B9AAA]/10 text-[#1B9AAA]">{icon}</div>
          <Badge variant={badgeColor}>{badge}</Badge>
        </div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

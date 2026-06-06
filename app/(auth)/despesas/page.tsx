"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Plus, Download } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import type { Despesa } from "@/types";
import { format, endOfMonth } from "date-fns";

const CATEGORIAS = ["Infraestrutura", "Logística", "Marketing", "Manutenção", "Pessoal", "Impostos", "Outros"];

const CATEGORIA_ICONS: Record<string, string> = {
  Infraestrutura: "💡",
  Logística: "🚛",
  Marketing: "📢",
  Manutenção: "🔧",
  Pessoal: "👥",
  Impostos: "📋",
  Outros: "📦",
};

export default function DespesasPage() {
  const supabase = createClient();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMes, setTotalMes] = useState(0);
  const [filterPeriodo, setFilterPeriodo] = useState(format(new Date(), "yyyy-MM"));
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Despesa | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    descricao: "",
    valor: "",
    categoria_despesa: "",
    data_despesa: format(new Date(), "yyyy-MM-dd"),
    observacao: "",
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadDespesas(); }, [filterPeriodo, filterCategoria]);

  async function loadDespesas() {
    setLoading(true);
    const [year, month] = filterPeriodo.split("-");
    const start = `${year}-${month}-01`;
    const end = format(endOfMonth(new Date(parseInt(year), parseInt(month) - 1)), "yyyy-MM-dd");

    let query = supabase
      .from("despesas")
      .select("*")
      .gte("data_despesa", start)
      .lte("data_despesa", end)
      .order("data_despesa", { ascending: false });

    if (filterCategoria !== "all") query = query.eq("categoria_despesa", filterCategoria);

    const { data } = await query;
    const list = data || [];
    setDespesas(list);
    setTotalMes(list.reduce((s, d) => s + d.valor, 0));
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setFormData({ descricao: "", valor: "", categoria_despesa: "", data_despesa: format(new Date(), "yyyy-MM-dd"), observacao: "" });
    setDialogOpen(true);
  }

  function openEdit(d: Despesa) {
    setEditing(d);
    setFormData({
      descricao: d.descricao,
      valor: String(d.valor),
      categoria_despesa: d.categoria_despesa || "",
      data_despesa: d.data_despesa,
      observacao: "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const payload = {
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      categoria_despesa: formData.categoria_despesa || null,
      data_despesa: formData.data_despesa,
      usuario_id: user.id,
    };

    if (editing) {
      const { error } = await supabase.from("despesas").update(payload).eq("id", editing.id);
      if (!error) toast({ title: "Despesa atualizada!" });
    } else {
      const { error } = await supabase.from("despesas").insert(payload);
      if (!error) toast({ title: "Despesa registrada!" });
    }

    setSaving(false);
    setDialogOpen(false);
    loadDespesas();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover esta despesa?")) return;
    await supabase.from("despesas").delete().eq("id", id);
    toast({ title: "Despesa removida." });
    loadDespesas();
  }

  const catTotals = despesas.reduce((acc, d) => {
    const cat = d.categoria_despesa || "Outros";
    acc[cat] = (acc[cat] || 0) + d.valor;
    return acc;
  }, {} as Record<string, number>);

  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 3);

  return (
    <div className="flex flex-col min-h-full">
      <Header searchPlaceholder="Buscar despesas..." />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Despesas</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie e acompanhe os gastos operacionais da sua unidade costeira.</p>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4" /> Nova Despesa
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Período</Label>
                    <Input
                      type="month"
                      value={filterPeriodo}
                      onChange={(e) => setFilterPeriodo(e.target.value)}
                      className="w-44"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Categoria</Label>
                    <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas Categorias</SelectItem>
                        {CATEGORIAS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button className="ml-auto p-2 rounded-lg border border-border hover:bg-muted transition-colors">
                    <Download className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <table className="w-full">
                  <thead>
                    <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                      <th className="text-left pb-3 w-8"></th>
                      <th className="text-left pb-3">Descrição</th>
                      <th className="text-left pb-3">Categoria</th>
                      <th className="text-left pb-3">Data</th>
                      <th className="text-right pb-3">Valor</th>
                      <th className="text-right pb-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loading ? (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">Carregando...</td></tr>
                    ) : despesas.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">Nenhuma despesa neste período.</td></tr>
                    ) : (
                      despesas.map((d) => (
                        <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3">
                            <div className="w-9 h-9 rounded-lg bg-muted/80 flex items-center justify-center text-base">
                              {CATEGORIA_ICONS[d.categoria_despesa || "Outros"] || "📦"}
                            </div>
                          </td>
                          <td className="py-3">
                            <p className="text-sm font-medium">{d.descricao}</p>
                          </td>
                          <td className="py-3">
                            {d.categoria_despesa && (
                              <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                                {d.categoria_despesa}
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">{formatDate(d.data_despesa)}</td>
                          <td className="py-3 text-sm font-semibold text-right">{formatCurrency(d.valor)}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEdit(d)} className="text-xs text-[#1B9AAA] hover:underline font-medium">
                                Editar
                              </button>
                              <button onClick={() => handleDelete(d.id)} className="text-xs text-red-500 hover:underline font-medium">
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">Mostrando {despesas.length} de {despesas.length} despesas</span>
                  <span className="text-sm font-medium">
                    Total do Período Filtrado: <span className="text-[#1B9AAA] font-semibold">{formatCurrency(despesas.reduce((s, d) => s + d.valor, 0))}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="bg-[#0D6E7A] text-white border-0">
              <CardContent className="pt-6">
                <p className="text-xs uppercase tracking-wider text-white/60 font-medium">Total do Mês</p>
                <p className="text-3xl font-bold mt-1">{formatCurrency(totalMes)}</p>
                <p className="text-xs text-white/60 mt-1">vs. mês anterior</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Gastos por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedCats.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem dados.</p>
                ) : (
                  sortedCats.map(([cat, val]) => {
                    const pct = totalMes > 0 ? Math.round((val / totalMes) * 100) : 0;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{cat}</span>
                          <span className="text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1B9AAA] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Descrição *</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Ex: Energia Elétrica - Outubro"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={formData.data_despesa}
                  onChange={(e) => setFormData({ ...formData, data_despesa: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={formData.categoria_despesa} onValueChange={(v) => setFormData({ ...formData, categoria_despesa: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formData.descricao || !formData.valor}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Plus, Search, Pencil, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { formatCurrency } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import type { Produto, Categoria } from "@/types";

const PAGE_SIZE = 10;

export default function ProdutosPage() {
  const supabase = createClient();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    categoria_id: "",
    preco_custo: "",
    preco_venda: "",
    estoque_atual: "",
    estoque_minimo: "",
    ativo: true,
  });
  const [novaCat, setNovaCat] = useState("");
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCategorias(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadProdutos(); }, [search, filterCategoria, filterStatus, page]);

  async function loadCategorias() {
    const { data } = await supabase.from("categorias").select("*").order("nome");
    setCategorias(data || []);
  }

  async function loadProdutos() {
    setLoading(true);
    let query = supabase
      .from("produtos")
      .select("*, categorias(nome)", { count: "exact" })
      .order("nome");

    if (search) query = query.ilike("nome", `%${search}%`);
    if (filterCategoria !== "all") query = query.eq("categoria_id", filterCategoria);
    if (filterStatus === "ativo") query = query.eq("ativo", true);
    if (filterStatus === "inativo") query = query.eq("ativo", false);

    const from = (page - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, count } = await query;
    setProdutos(data || []);
    setTotal(count || 0);
    setLoading(false);
  }

  function openNew() {
    setEditing(null);
    setFormData({ nome: "", categoria_id: "", preco_custo: "", preco_venda: "", estoque_atual: "0", estoque_minimo: "0", ativo: true });
    setDialogOpen(true);
  }

  function openEdit(p: Produto) {
    setEditing(p);
    setFormData({
      nome: p.nome,
      categoria_id: p.categoria_id || "",
      preco_custo: String(p.preco_custo),
      preco_venda: String(p.preco_venda),
      estoque_atual: String(p.estoque_atual),
      estoque_minimo: String(p.estoque_minimo),
      ativo: p.ativo,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      nome: formData.nome,
      categoria_id: formData.categoria_id || null,
      preco_custo: parseFloat(formData.preco_custo),
      preco_venda: parseFloat(formData.preco_venda),
      estoque_atual: parseInt(formData.estoque_atual),
      estoque_minimo: parseInt(formData.estoque_minimo),
      ativo: formData.ativo,
      atualizado_em: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from("produtos").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Produto atualizado!", variant: "default" }); }
    } else {
      const { error } = await supabase.from("produtos").insert(payload);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
      else { toast({ title: "Produto criado!", variant: "default" }); }
    }

    setSaving(false);
    setDialogOpen(false);
    loadProdutos();
  }


  async function handleSaveCat() {
    if (!novaCat.trim()) return;
    const { error } = await supabase.from("categorias").insert({ nome: novaCat.trim() });
    if (!error) {
      setNovaCat("");
      setCatDialogOpen(false);
      loadCategorias();
      toast({ title: "Categoria criada!" });
    }
  }

  const pages = Math.ceil(total / PAGE_SIZE);
  const statusLabel = (p: Produto) => {
    if (!p.ativo) return { label: "Inativo", v: "outline" as const };
    if (p.estoque_atual === 0) return { label: "Esgotado", v: "destructive" as const };
    if (p.estoque_atual <= p.estoque_minimo) return { label: "Estoque Baixo", v: "warning" as const };
    return { label: "Em Estoque", v: "success" as const };
  };

  return (
    <div className="flex flex-col min-h-full">
      <Header searchPlaceholder="Pesquisar no estoque..." />

      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Controle de Estoque</h1>
            <p className="text-sm text-muted-foreground mt-1">Gerencie seus produtos e níveis de inventário</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setCatDialogOpen(true)} size="sm">
              Categorias
            </Button>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4" /> Novo Produto
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por nome ou SKU..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Categoria:</span>
                <Select value={filterCategoria} onValueChange={(v) => { setFilterCategoria(v); setPage(1); }}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Categorias</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativo">Ativos</SelectItem>
                    <SelectItem value="inativo">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="text-left pb-3 w-8"></th>
                  <th className="text-left pb-3">Produto</th>
                  <th className="text-left pb-3">Categoria</th>
                  <th className="text-left pb-3">Estoque Atual</th>
                  <th className="text-left pb-3">Preço Venda</th>
                  <th className="text-left pb-3">Status</th>
                  <th className="text-right pb-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">Carregando...</td></tr>
                ) : produtos.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">Nenhum produto encontrado.</td></tr>
                ) : (
                  produtos.map((p) => {
                    const s = statusLabel(p);
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3">
                          <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </td>
                        <td className="py-3">
                          <p className="text-sm font-medium">{p.nome}</p>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {(p as Produto & { categorias?: { nome: string } }).categorias?.nome || "—"}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{p.estoque_atual} unidades</span>
                            {p.estoque_atual <= p.estoque_minimo && p.ativo && (
                              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-sm">{formatCurrency(p.preco_venda)}</td>
                        <td className="py-3">
                          <Badge variant={s.v}>{s.label}</Badge>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(p)}
                              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {total > 0 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total} produtos
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-sm hover:bg-muted disabled:opacity-40"
                  >
                    ‹
                  </button>
                  {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${page === p ? "bg-[#1B9AAA] text-white" : "border border-border hover:bg-muted"}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="w-8 h-8 rounded-md border border-border flex items-center justify-center text-sm hover:bg-muted disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Nome do produto" className="mt-1" />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={formData.categoria_id} onValueChange={(v) => setFormData({ ...formData, categoria_id: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preço Custo (R$) *</Label>
                <Input type="number" step="0.01" value={formData.preco_custo} onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Preço Venda (R$) *</Label>
                <Input type="number" step="0.01" value={formData.preco_venda} onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estoque Atual</Label>
                <Input type="number" value={formData.estoque_atual} onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Estoque Mínimo</Label>
                <Input type="number" value={formData.estoque_minimo} onChange={(e) => setFormData({ ...formData, estoque_minimo: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="w-4 h-4 accent-[#1B9AAA]"
              />
              <Label htmlFor="ativo" className="font-normal cursor-pointer">Produto ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formData.nome || !formData.preco_custo || !formData.preco_venda}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Gerenciar Categorias</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              {categorias.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50 text-sm">
                  <span>{c.nome}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nova categoria..."
                value={novaCat}
                onChange={(e) => setNovaCat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveCat()}
              />
              <Button onClick={handleSaveCat} size="sm">Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Package({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V7" />
    </svg>
  );
}

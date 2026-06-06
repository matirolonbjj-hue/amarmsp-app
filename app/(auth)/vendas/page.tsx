"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Trash2, ChevronRight, Banknote, CreditCard, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import type { Venda, Produto } from "@/types";
import { format } from "date-fns";

interface CartItem {
  produto: Produto;
  quantidade: number;
}

type MetodoPagamento = "dinheiro" | "pix" | "debito" | "credito";
type Bandeira = "visa" | "master" | "elo" | "amex" | "hipercard";

const METODOS: { id: MetodoPagamento; label: string; icon: React.ElementType }[] = [
  { id: "dinheiro", label: "Dinheiro", icon: Banknote },
  { id: "pix",      label: "PIX",      icon: QrCode   },
  { id: "debito",   label: "Débito",   icon: CreditCard },
  { id: "credito",  label: "Crédito",  icon: CreditCard },
];

const BANDEIRAS: { id: Bandeira; label: string; color: string; bg: string }[] = [
  { id: "visa",       label: "Visa",       color: "#1A1F71", bg: "#EEF0FB" },
  { id: "master",     label: "Mastercard", color: "#EB001B", bg: "#FEECEC" },
  { id: "elo",        label: "Elo",        color: "#9A6E00", bg: "#FFF9E6" },
  { id: "amex",       label: "Amex",       color: "#007CC3", bg: "#E6F4FB" },
  { id: "hipercard",  label: "Hipercard",  color: "#822124", bg: "#FDEAEA" },
];

const PARCELAS_CREDITO = [
  { value: 1, label: "1x", sublabel: "à vista" },
  { value: 2, label: "2x", sublabel: ""         },
  { value: 3, label: "3x", sublabel: ""         },
];

function getBandeiraInfo(id: Bandeira | null) {
  return BANDEIRAS.find((b) => b.id === id) ?? null;
}

export default function VendasPage() {
  const supabase = createClient();
  const [historico, setHistorico] = useState<Venda[]>([]);
  const [loadingHist, setLoadingHist] = useState(true);
  const [searchProd, setSearchProd] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [prodSuggestions, setProdSuggestions] = useState<Produto[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [dataVenda, setDataVenda] = useState(format(new Date(), "yyyy-MM-dd"));
  const [observacao, setObservacao] = useState("");
  const [metodoPagamento, setMetodoPagamento] = useState<MetodoPagamento>("dinheiro");
  const [bandeira, setBandeira] = useState<Bandeira | null>(null);
  const [parcelas, setParcelas] = useState(1);
  const [taxas, setTaxas] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadHistorico(); loadProdutos(); loadTaxas(); }, []);

  async function loadHistorico() {
    const { data } = await supabase
      .from("vendas")
      .select("*, itens_venda(*, produtos(nome))")
      .order("criado_em", { ascending: false })
      .limit(20);
    setHistorico(data || []);
    setLoadingHist(false);
  }

  async function loadProdutos() {
    const { data } = await supabase.from("produtos").select("*").eq("ativo", true).gt("estoque_atual", 0).order("nome");
    setProdutos(data || []);
  }

  async function loadTaxas() {
    const { data } = await supabase.from("configuracoes").select("chave, valor");
    if (data) {
      const map: Record<string, number> = {};
      data.forEach((r: { chave: string; valor: string }) => { map[r.chave] = parseFloat(r.valor) || 0; });
      setTaxas(map);
    }
  }

  function getTaxa(): number {
    if (metodoPagamento === "dinheiro") return 0;
    if (metodoPagamento === "pix")      return taxas["taxa_pix"] || 0;
    if (!bandeira) return 0;
    if (metodoPagamento === "debito")   return taxas[`taxa_debito_${bandeira}`] || 0;
    return taxas[`taxa_credito_${parcelas}x_${bandeira}`] || 0;
  }

  const subtotal  = cart.reduce((s, i) => s + i.produto.preco_venda * i.quantidade, 0);
  const taxa      = getTaxa();
  const valorTaxa = subtotal * (taxa / 100);
  const liquido   = subtotal - valorTaxa;

  const precisaBandeira = metodoPagamento === "debito" || metodoPagamento === "credito";
  const podeFinalizar   = cart.length > 0 && (!precisaBandeira || bandeira !== null);

  function handleSearchProd(val: string) {
    setSearchProd(val);
    if (val.length < 1) { setProdSuggestions([]); return; }
    setProdSuggestions(produtos.filter((p) => p.nome.toLowerCase().includes(val.toLowerCase())).slice(0, 6));
  }

  function addToCart(produto: Produto) {
    setCart((prev) => {
      const existing = prev.find((i) => i.produto.id === produto.id);
      if (existing) return prev.map((i) => i.produto.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...prev, { produto, quantidade: 1 }];
    });
    setSearchProd("");
    setProdSuggestions([]);
  }

  function updateQty(produtoId: string, delta: number) {
    setCart((prev) => prev.map((i) => i.produto.id === produtoId ? { ...i, quantidade: i.quantidade + delta } : i).filter((i) => i.quantidade > 0));
  }

  function handleSetMetodo(m: MetodoPagamento) {
    setMetodoPagamento(m);
    setBandeira(null);
    setParcelas(1);
  }

  async function handleFinalizar() {
    if (!podeFinalizar) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "Usuário não autenticado.", variant: "destructive" }); setSaving(false); return; }

    const { data: venda, error: vendaError } = await supabase
      .from("vendas")
      .insert({
        usuario_id: user.id,
        data_venda: dataVenda,
        total: subtotal,
        valor_liquido: liquido,
        metodo_pagamento: metodoPagamento,
        bandeira: bandeira ?? null,
        parcelas: metodoPagamento === "credito" ? parcelas : null,
        taxa_aplicada: taxa,
        observacao: observacao || null,
      })
      .select()
      .single();

    if (vendaError || !venda) {
      toast({ title: "Erro ao registrar venda", description: vendaError?.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const itens = cart.map((i) => ({
      venda_id: venda.id,
      produto_id: i.produto.id,
      quantidade: i.quantidade,
      preco_unitario: i.produto.preco_venda,
      preco_custo_unitario: i.produto.preco_custo,
      subtotal: i.produto.preco_venda * i.quantidade,
    }));

    const { error: itensError } = await supabase.from("itens_venda").insert(itens);
    if (itensError) {
      toast({ title: "Erro ao salvar itens", description: itensError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    for (const i of cart) {
      await supabase.from("produtos").update({
        estoque_atual: i.produto.estoque_atual - i.quantidade,
        atualizado_em: new Date().toISOString(),
      }).eq("id", i.produto.id);
    }

    toast({ title: "Venda registrada com sucesso!" });
    setCart([]);
    setObservacao("");
    setDataVenda(format(new Date(), "yyyy-MM-dd"));
    setMetodoPagamento("dinheiro");
    setBandeira(null);
    setParcelas(1);
    setSaving(false);
    loadHistorico();
    loadProdutos();
  }

  function getHistLabel(v: Venda) {
    const itens = (v.itens_venda || []) as { produtos?: { nome?: string } }[];
    const first = itens[0]?.produtos?.nome || "Venda";
    return itens.length > 1 ? `${first} +${itens.length - 1}` : first;
  }

  function getHistMetodo(v: Venda) {
    const vv = v as Venda & { metodo_pagamento?: string; parcelas?: number; bandeira?: Bandeira };
    if (!vv.metodo_pagamento || vv.metodo_pagamento === "dinheiro") return null;
    const band = vv.bandeira ? getBandeiraInfo(vv.bandeira)?.label : null;
    if (vv.metodo_pagamento === "pix")     return "PIX";
    if (vv.metodo_pagamento === "debito")  return `Déb${band ? ` · ${band}` : ""}`;
    return `Cré ${vv.parcelas || 1}x${band ? ` · ${band}` : ""}`;
  }

  return (
    <div className="flex flex-col min-h-full">
      <Header searchPlaceholder="Buscar pedidos..." />
      <div className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Histórico */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Histórico</h2>
            <div className="space-y-2">
              {loadingHist ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : historico.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma venda registrada.</p>
              ) : (
                historico.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:bg-muted/40 cursor-pointer transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-[10px] font-mono bg-[#1B9AAA]/10 text-[#1B9AAA] px-1.5 py-0.5 rounded">
                          #{v.id.slice(-4).toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(v.data_venda)}</span>
                        {getHistMetodo(v) && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            {getHistMetodo(v)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{getHistLabel(v)}</p>
                      <p className="text-sm font-semibold text-[#1B9AAA]">{formatCurrency(v.total)}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Nova Venda */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <CardTitle>Nova Venda</CardTitle>
                  <Input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} className="w-40 text-sm" />
                </div>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Busca produto */}
                <div>
                  <Label className="text-sm font-medium">Produto</Label>
                  <div className="relative mt-1">
                    <Input
                      placeholder="Digite o nome do produto..."
                      value={searchProd}
                      onChange={(e) => handleSearchProd(e.target.value)}
                      className="bg-muted/50"
                    />
                    {prodSuggestions.length > 0 && (
                      <div className="absolute z-10 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                        {prodSuggestions.map((p) => (
                          <button key={p.id} onClick={() => addToCart(p)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors flex items-center justify-between">
                            <span>{p.nome}</span>
                            <span className="text-muted-foreground text-xs">{formatCurrency(p.preco_venda)} · {p.estoque_atual} un.</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Carrinho */}
                {cart.length > 0 && (
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
                        <th className="text-left pb-2">Produto</th>
                        <th className="text-center pb-2">Qtd</th>
                        <th className="text-right pb-2">Unit.</th>
                        <th className="text-right pb-2">Sub.</th>
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {cart.map((item) => (
                        <tr key={item.produto.id}>
                          <td className="py-2 text-sm font-medium">{item.produto.nome}</td>
                          <td className="py-2">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => updateQty(item.produto.id, -1)} className="w-5 h-5 rounded border border-border flex items-center justify-center text-xs hover:bg-muted">−</button>
                              <span className="text-sm font-medium w-5 text-center">{item.quantidade}</span>
                              <button onClick={() => updateQty(item.produto.id, 1)} className="w-5 h-5 rounded border border-border flex items-center justify-center text-xs hover:bg-muted">+</button>
                            </div>
                          </td>
                          <td className="py-2 text-sm text-right">{formatCurrency(item.produto.preco_venda)}</td>
                          <td className="py-2 text-sm font-semibold text-right text-[#1B9AAA]">{formatCurrency(item.produto.preco_venda * item.quantidade)}</td>
                          <td className="py-2 pl-2">
                            <button onClick={() => setCart((p) => p.filter((i) => i.produto.id !== item.produto.id))} className="text-muted-foreground hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* ── Método de Pagamento ── */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Forma de Pagamento</Label>

                  {/* 4 botões principais */}
                  <div className="grid grid-cols-4 gap-2">
                    {METODOS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleSetMetodo(m.id)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all text-xs font-medium",
                          metodoPagamento === m.id
                            ? "border-[#1B9AAA] bg-[#1B9AAA]/10 text-[#1B9AAA]"
                            : "border-border bg-muted/30 text-muted-foreground hover:border-[#1B9AAA]/50"
                        )}
                      >
                        <m.icon className="w-4 h-4" />
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Seleção de Bandeira (débito ou crédito) */}
                  {precisaBandeira && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                        Bandeira do Cartão {!bandeira && <span className="text-amber-500 ml-1">← selecione</span>}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {BANDEIRAS.map((b) => {
                          const chave = metodoPagamento === "debito"
                            ? `taxa_debito_${b.id}`
                            : `taxa_credito_${parcelas}x_${b.id}`;
                          const t = taxas[chave];
                          return (
                            <button
                              key={b.id}
                              onClick={() => setBandeira(b.id)}
                              className={cn(
                                "flex flex-col items-center px-3 py-2 rounded-xl border-2 transition-all min-w-[64px]",
                                bandeira === b.id
                                  ? "border-[#1B9AAA] shadow-sm"
                                  : "border-border hover:border-[#1B9AAA]/40"
                              )}
                            >
                              <span
                                className="text-xs font-bold px-2 py-0.5 rounded"
                                style={bandeira === b.id
                                  ? { background: b.color, color: "#fff" }
                                  : { background: b.bg, color: b.color }
                                }
                              >
                                {b.label}
                              </span>
                              {t > 0 && (
                                <span className="text-[10px] text-muted-foreground mt-1">{t}%</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Parcelas (só crédito) */}
                  {metodoPagamento === "credito" && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Parcelamento</p>
                      <div className="flex gap-2">
                        {PARCELAS_CREDITO.map((p) => {
                          const chave = bandeira ? `taxa_credito_${p.value}x_${bandeira}` : null;
                          const t = chave ? taxas[chave] : null;
                          return (
                            <button
                              key={p.value}
                              onClick={() => setParcelas(p.value)}
                              className={cn(
                                "flex flex-col items-center px-5 py-2.5 rounded-xl border-2 transition-all",
                                parcelas === p.value
                                  ? "border-[#1B9AAA] bg-[#1B9AAA] text-white"
                                  : "border-border text-muted-foreground hover:border-[#1B9AAA]/50"
                              )}
                            >
                              <span className="font-bold text-sm">{p.label}</span>
                              {p.sublabel && <span className="text-[10px] opacity-70">{p.sublabel}</span>}
                              {t != null && t > 0 && (
                                <span className={cn("text-[10px] mt-0.5", parcelas === p.value ? "opacity-80" : "text-muted-foreground")}>{t}%</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Observações */}
                <div>
                  <Label className="text-sm font-medium">Observações</Label>
                  <Textarea
                    placeholder="Notas sobre a venda..."
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="mt-1 bg-muted/50 resize-none"
                    rows={2}
                  />
                </div>

                {/* Resumo + Finalizar */}
                <div className="pt-2 border-t border-border space-y-2">
                  {taxa > 0 && bandeira && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Taxa {getBandeiraInfo(bandeira)?.label}
                        {metodoPagamento === "credito" && ` ${parcelas}x`}
                        {" "}({taxa}%)
                      </span>
                      <span className="text-red-500 font-medium">− {formatCurrency(valorTaxa)}</span>
                    </div>
                  )}
                  {metodoPagamento === "pix" && taxa > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Taxa PIX ({taxa}%)</span>
                      <span className="text-red-500 font-medium">− {formatCurrency(valorTaxa)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Bruto</p>
                      <p className="text-2xl font-semibold">{formatCurrency(subtotal)}</p>
                      {taxa > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Líquido: <span className="text-[#1B9AAA] font-semibold">{formatCurrency(liquido)}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => { setCart([]); setObservacao(""); }} disabled={cart.length === 0}>
                        Limpar
                      </Button>
                      <Button
                        onClick={handleFinalizar}
                        disabled={!podeFinalizar || saving}
                        title={precisaBandeira && !bandeira ? "Selecione a bandeira do cartão" : ""}
                      >
                        {saving ? "Salvando..." : "Finalizar Venda ✓"}
                      </Button>
                    </div>
                  </div>

                  {precisaBandeira && !bandeira && cart.length > 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">Selecione a bandeira do cartão para finalizar.</p>
                  )}
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

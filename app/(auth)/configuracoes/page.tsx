"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const BANDEIRAS = [
  { id: "visa",       label: "Visa",       color: "#1A1F71", bg: "#EEF0FB" },
  { id: "master",     label: "Mastercard", color: "#EB001B", bg: "#FEECEC" },
  { id: "elo",        label: "Elo",        color: "#9A6E00", bg: "#FFF9E6" },
  { id: "amex",       label: "Amex",       color: "#007CC3", bg: "#E6F4FB" },
  { id: "hipercard",  label: "Hipercard",  color: "#822124", bg: "#FDEAEA" },
];

const PARCELAS_CREDITO = ["1x", "2x", "3x"];

type TaxaMap = Record<string, string>;

function RateInput({ value, onChange, placeholder = "0.00" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Input
        type="number"
        min="0"
        max="100"
        step="0.01"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-7 text-sm text-right w-24"
      />
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const supabase = createClient();
  const [taxas, setTaxas] = useState<TaxaMap>({});
  const [saving, setSaving] = useState(false);

  const loadConfigs = useCallback(async () => {
    const { data } = await supabase.from("configuracoes").select("chave, valor");
    if (!data) return;
    const map: TaxaMap = {};
    data.forEach((r: { chave: string; valor: string }) => { map[r.chave] = r.valor; });
    setTaxas(map);
  }, [supabase]);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  function set(chave: string, valor: string) {
    setTaxas((prev) => ({ ...prev, [chave]: valor }));
  }

  async function handleSave() {
    setSaving(true);
    const entries = Object.entries(taxas)
      .filter(([, v]) => v !== "")
      .map(([chave, valor]) => ({ chave, valor }));

    const { error } = await supabase
      .from("configuracoes")
      .upsert(entries, { onConflict: "chave" });

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Taxas salvas com sucesso!" });
    }
    setSaving(false);
  }

  const t = (chave: string) => taxas[chave] || "";

  return (
    <div className="flex flex-col min-h-full">
      <Header searchPlaceholder="Buscar configurações..." />
      <div className="flex-1 p-6 max-w-3xl">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Taxas da Maquininha</h1>
            <p className="text-sm text-muted-foreground mt-1">Configure as taxas por bandeira e modalidade</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Tudo"}
          </Button>
        </div>

        <div className="space-y-6">

          {/* PIX */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                PIX na Maquininha
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-28">Taxa do PIX</span>
                <RateInput value={t("taxa_pix")} onChange={(v) => set("taxa_pix", v)} placeholder="ex: 1.99" />
                {t("taxa_pix") && parseFloat(t("taxa_pix")) > 0 && (
                  <span className="text-xs text-muted-foreground">
                    R$ 100 → líquido <strong className="text-foreground">R$ {(100 - parseFloat(t("taxa_pix"))).toFixed(2)}</strong>
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Débito */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                Cartão de Débito — por Bandeira
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                    <th className="text-left pb-2 font-medium">Bandeira</th>
                    <th className="text-right pb-2 font-medium">Taxa (%)</th>
                    <th className="text-right pb-2 font-medium pl-6">Líquido em R$100</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {BANDEIRAS.map((b) => {
                    const chave = `taxa_debito_${b.id}`;
                    const val = t(chave);
                    return (
                      <tr key={b.id} className="group">
                        <td className="py-2.5">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold"
                            style={{ background: b.bg, color: b.color }}
                          >
                            {b.label}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <RateInput value={val} onChange={(v) => set(chave, v)} />
                        </td>
                        <td className="py-2.5 text-right text-sm text-muted-foreground pl-6">
                          {val && parseFloat(val) > 0 ? (
                            <strong className="text-foreground">R$ {(100 - parseFloat(val)).toFixed(2)}</strong>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Crédito */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                Cartão de Crédito — por Bandeira e Parcelas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                    <th className="text-left pb-2 font-medium">Bandeira</th>
                    {PARCELAS_CREDITO.map((p) => (
                      <th key={p} className={cn("text-right pb-2 font-medium", p === "1x" && "text-[#1B9AAA]")}>
                        {p}{p === "1x" ? " (à vista)" : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {BANDEIRAS.map((b) => (
                    <tr key={b.id}>
                      <td className="py-2.5">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded text-xs font-bold"
                          style={{ background: b.bg, color: b.color }}
                        >
                          {b.label}
                        </span>
                      </td>
                      {PARCELAS_CREDITO.map((p) => {
                        const chave = `taxa_credito_${p}_${b.id}`;
                        return (
                          <td key={p} className="py-2.5 text-right">
                            <div className="flex justify-end">
                              <RateInput value={t(chave)} onChange={(v) => set(chave, v)} />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-3">
                * Crédito limitado a 3x conforme configuração da maquininha.
              </p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(dateStr + "T00:00:00"));
}

export function calcMargem(custo: number, venda: number): number {
  if (venda === 0) return 0;
  return ((venda - custo) / venda) * 100;
}

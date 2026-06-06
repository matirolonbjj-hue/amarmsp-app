"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0fbfc] via-[#d9f5f8] to-[#b3ecf2]">
      <div className="w-full max-w-[400px] mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-white/60">
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/logo_transparent.png"
              alt="A MAR"
              width={140}
              height={70}
              className="object-contain mb-2"
              priority
            />
            <p className="text-xs text-[#6b7280] uppercase tracking-widest mt-1">Gestão de Loja</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-[#374151]">
                E-mail de Acesso
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@amar.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 border-[#e5e7eb] h-11 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-sm font-medium text-[#374151]">
                  Senha
                </Label>
                <button type="button" className="text-xs text-[#1B9AAA] hover:underline font-medium">
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 border-[#e5e7eb] h-11 rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-[#e5e7eb] accent-[#1B9AAA]"
              />
              <Label htmlFor="remember" className="text-sm text-[#6b7280] font-normal cursor-pointer">
                Manter-me conectado
              </Label>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-[#0D6E7A] hover:bg-[#0b5f69] text-white font-medium"
            >
              {loading ? "Entrando..." : "Entrar →"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[#9ca3af]">
            Não possui uma conta?{" "}
            <span className="text-[#1B9AAA] font-medium cursor-pointer hover:underline">
              Solicitar Acesso
            </span>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#9ca3af]">
          — v2.4.0 coastal pro —
        </p>
      </div>
    </div>
  );
}

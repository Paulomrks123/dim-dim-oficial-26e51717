import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { openInstallGuide } from "@/components/PwaLifecycle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getState, resetData, setState, useStore, type Layout } from "@/lib/store";
import { hashPin, verifyPin } from "@/lib/pin";

const LAYOUTS: { id: Layout; label: string; hint: string; sample: string }[] = [
  { id: "mini", label: "Mínimo", hint: "O menor", sample: "text-[10px]" },
  { id: "compact", label: "Compacto", hint: "Bem compacto", sample: "text-xs" },
  { id: "normal", label: "Padrão", hint: "Equilibrado", sample: "text-sm" },
  { id: "large", label: "Grande", hint: "Mais legível", sample: "text-base" },
];

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [
    { title: "Configurações — Meu Dim Dim" },
    { name: "description", content: "Informações pessoais, PIN de acesso e gerenciamento de dados." },
    { property: "og:title", content: "Configurações — Meu Dim Dim" },
    { property: "og:description", content: "Gerencie seu perfil e seu PIN." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Page,
});

function Page() {
  const s = useStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cur, setCur] = useState(""); const [np, setNp] = useState(""); const [cp, setCp] = useState("");
  const [delPin, setDelPin] = useState("");
  useEffect(() => { setName(s.name); setEmail(s.email); }, [s.name, s.email]);

  const changePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(await verifyPin(cur, getState()))) return void toast.error("PIN atual incorreto");
    if (np.length < 4) return void toast.error("O novo PIN deve ter pelo menos 4 dígitos");
    if (np !== cp) return void toast.error("Confirmação não confere");
    const pinHash = await hashPin(np);
    setState((x) => ({ ...x, pin: undefined, pinHash })); setCur(""); setNp(""); setCp(""); toast.success("PIN alterado");
  };
  const del = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(await verifyPin(delPin, getState()))) return void toast.error("Não foi possível excluir os dados. Tente novamente.");
    if (!confirm("Deletar todos os dados?")) return;
    resetData(); setDelPin(""); toast.success("Dados removidos.");
  };

  return (
    <AppShell title="Configurações">
      <div className="settings-layout grid max-w-3xl gap-4">
        <section className="glass-card space-y-4 p-5">
          <div><h2 className="font-semibold">Tamanho do layout</h2><p className="text-xs text-muted-foreground">Ajuste o tamanho de textos e elementos em todo o app</p></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LAYOUTS.map((l) => {
              const active = (s.layout ?? "normal") === l.id;
              return (
                <button key={l.id} onClick={() => { setState((x) => ({ ...x, layout: l.id })); toast.success(`Layout ${l.label.toLowerCase()} aplicado`); }}
                  aria-pressed={active}
                  className={`rounded-2xl border p-3 text-center transition-all ${active ? "border-primary bg-primary/10 text-primary shadow-glow" : "border-border hover:border-primary/50"}`}>
                  <span className={`block font-display font-bold ${l.sample}`}>Aa</span>
                  <span className="mt-1 block text-sm font-medium">{l.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{l.hint}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section className="glass-card flex items-center gap-3 p-5">
          <img src="/icons/icon-192.png" alt="" width={44} height={44} className="h-11 w-11 rounded-xl" />
          <div className="flex-1"><h2 className="font-semibold">Instalar Meu Dim Dim</h2><p className="text-xs text-muted-foreground">Adicionar à Tela de Início</p></div>
          <Button onClick={openInstallGuide}>Instalar</Button>
        </section>
        <section className="glass-card space-y-4 p-5">
          <h2 className="font-semibold">Informações pessoais</h2>
          <div className="space-y-2"><Label>Nome completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Button onClick={() => { setState((x) => ({ ...x, name, email })); toast.success("Perfil salvo"); }}>Salvar</Button>
        </section>
        <form onSubmit={changePin} className="glass-card space-y-4 p-5">
          <h2 className="font-semibold">Alterar PIN</h2>
          <Input type="password" placeholder="PIN atual" value={cur} onChange={(e) => setCur(e.target.value)} />
          <Input type="password" placeholder="Novo PIN" value={np} onChange={(e) => setNp(e.target.value)} />
          <Input type="password" placeholder="Confirmar novo PIN" value={cp} onChange={(e) => setCp(e.target.value)} />
          <Button type="submit">Salvar</Button>
        </form>
        <form onSubmit={del} className="glass-card space-y-4 border-destructive/50 p-5">
          <h2 className="font-semibold text-destructive">Deletar dados</h2>
          <p className="text-sm text-muted-foreground">Remove todas as transações, categorias e metas. Confirme com o PIN usado para entrar no aplicativo. Não é possível desfazer.</p>
          <Label htmlFor="delete-access-pin">PIN de acesso</Label>
          <Input id="delete-access-pin" type="password" value={delPin} onChange={(e) => setDelPin(e.target.value)} />
          <Button type="submit" variant="destructive">Autorizar e deletar</Button>
        </form>
      </div>
    </AppShell>
  );
}

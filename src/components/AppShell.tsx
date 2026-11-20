import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LayoutDashboard, ArrowLeftRight, Tags, BarChart3, Settings, LogOut, Wallet, Menu, X, Repeat, Cloud, CloudOff } from "lucide-react";
import { isUnlocked, lock, LAYOUT_SIZE, useStore } from "@/lib/store";
import { syncRecurring } from "@/lib/recurring";
import { DetailsProvider } from "./DetailsDialog";
import { useCloudSync } from "./CloudSync";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PdfExport } from "./PdfExport";
import { CsvExport } from "./CsvExport";
import { CinematicScene, useCinematicReveal } from "./CinematicScene";
import { useIsMobile } from "@/hooks/use-mobile";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transacoes", label: "Transações", icon: ArrowLeftRight },
  { to: "/recorrentes", label: "Recorrentes", icon: Repeat },
  { to: "/categorias", label: "Categorias", icon: Tags },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const mobile = useIsMobile();
  const menuRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cloud = useCloudSync();

  const { layout } = useStore();
  useCinematicReveal(path, ready && cloud.ready && Boolean(cloud.session));
  useEffect(() => { document.documentElement.style.fontSize = LAYOUT_SIZE[layout ?? "normal"]; }, [layout]);
  useEffect(() => {
    if (!open || !mobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); }
      if (event.key !== "Tab") return;
      const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)') ?? []);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open, mobile]);
  useEffect(() => {
    if (!cloud.ready) return;
    if (!cloud.session || !isUnlocked()) navigate({ to: "/" });
    else { setReady(true); void syncRecurring(); }
  }, [navigate, cloud.ready, cloud.session]);

  if (!ready || !cloud.ready || !cloud.session || !isUnlocked()) return <div className="min-h-screen bg-background" />;

  const logout = async () => { lock(); await supabase.auth.signOut(); navigate({ to: "/" }); };
  const syncText = { loading: "Carregando…", local: "Neste aparelho", saving: "Salvando…", saved: "Salvo na nuvem", offline: "Sem conexão — tentar" }[cloud.status];

  return (
    <div className="app-workspace relative min-h-screen md:flex">
      <CinematicScene />
      <aside ref={menuRef} id="app-navigation" aria-label="Menu principal" aria-hidden={mobile && !open ? true : undefined} inert={mobile && !open} className={`app-sidebar fixed inset-y-0 left-0 z-40 w-64 max-w-[85vw] overflow-y-auto border-r border-sidebar-border bg-sidebar p-5 transition-transform md:sticky md:top-0 md:h-dvh md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-8 flex items-center gap-3">
          <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary"><Wallet className="h-5 w-5" /></div>
          <span className="font-display text-lg font-bold text-glow">Meu Dim Dim</span>
          <Button variant="ghost" size="icon" aria-label="Fechar menu" className="ml-auto md:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5" /></Button>
        </div>
        <nav className="space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = path.startsWith(to);
            return (
              <Link key={to} to={to} onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined} className={`nav-link flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${active ? "nav-active bg-primary/15 text-primary" : "text-sidebar-foreground/80 hover:bg-sidebar-accent"}`}>
                <Icon className="h-4 w-4" />{label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-3 space-y-2 border-t border-sidebar-border pt-3" aria-label="Exportar dados">
          <PdfExport />
          <CsvExport />
        </div>
        <Button variant="ghost" onClick={logout} className="mt-8 flex w-full justify-start gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" />Sair
        </Button>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-background/70 md:hidden" onClick={() => setOpen(false)} />}
      <main key={path} inert={mobile && open} className="page-enter workspace-main relative z-10 min-w-0 flex-1 p-4 md:p-8">
        <header className="workspace-header mb-3 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 md:flex">
          <Button ref={triggerRef} variant="ghost" size="icon" aria-label="Abrir menu" aria-expanded={open} aria-controls="app-navigation" className="md:hidden" onClick={() => setOpen(true)}><Menu className="h-6 w-6" /></Button>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="min-w-0">
              <p className="brand-caption mb-1 text-xs text-primary md:hidden">Meu Dim Dim</p>
              <h1 className="kinetic-title text-2xl font-bold md:text-3xl">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              <Button type="button" variant="ghost" onClick={cloud.retry} disabled={cloud.status !== "offline"} className={`mt-0.5 h-auto gap-1 p-0 text-[11px] ${cloud.status === "offline" ? "text-destructive" : "text-muted-foreground"}`}>
                {cloud.status === "offline" ? <CloudOff className="h-3 w-3" /> : <Cloud className="h-3 w-3" />}{syncText}
              </Button>
            </div>
          </div>
          <div className="header-actions flex flex-wrap gap-2">{actions}</div>
        </header>
        <div className="workspace-content"><DetailsProvider>{children}</DetailsProvider></div>
      </main>
    </div>
  );
}

export function StatCard({ label, value, tone, icon }: { label: string; value: string; tone: "primary" | "destructive" | "accent"; icon: ReactNode }) {
  const toneCls = { primary: "text-primary", destructive: "text-destructive", accent: "text-accent" }[tone];
  return (
    <div className="glass-card fx-shine p-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">{label}<span className={toneCls}>{icon}</span></div>
      <p className={`mt-2 font-display text-2xl font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "meu-dim-dim:install-dismissed";
const DISMISS_DAYS = 3;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}
function isIos() {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}
function recentlyDismissed() {
  const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return Date.now() - t < DISMISS_DAYS * 864e5;
}

/** Handles the install lifecycle: Chrome/Android prompt, iOS Safari guide, installed detection. */
export function PwaLifecycle() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<"none" | "android" | "ios">("none");
  const [installing, setInstalling] = useState(false);
  const [preview, setPreview] = useState(false);

  const install = async () => {
    if (!deferred || installing) return;
    setInstalling(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setDeferred(null);
      if (outcome === "dismissed") {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
      setMode("none");
    } catch {
      setDeferred(null);
      setMode(isIos() ? "ios" : "android");
      toast.error("Não foi possível abrir a instalação. Use o menu do navegador abaixo.");
    } finally {
      setInstalling(false);
    }
  };

  useEffect(() => {
    const host = window.location.hostname.toLowerCase();
    const inPreview = window.self !== window.top || host === "localhost" || /^(?:id-preview|preview|project)--/.test(host) || host.endsWith("lovableproject.com") || host.endsWith("lovableproject-dev.com");
    setPreview(inPreview);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (!recentlyDismissed()) setMode("android");
    };
    const onInstalled = () => {
      setMode("none"); setDeferred(null);
      toast.success("Meu Dim Dim instalado! Abra pela tela de início.");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    const open = () => {
      if (isStandalone()) { toast.success("Meu Dim Dim já está aberto como aplicativo."); return; }
      if (deferred && !inPreview) { void install(); return; }
      setMode(isIos() ? "ios" : "android");
    };
    window.addEventListener("pwa:open-install", open);
    let timer: number | undefined;
    // Show the install entry even when Chrome delays or suppresses its native event.
    // The native confirmation itself must still follow a user click.
    if (!inPreview && !isStandalone() && !recentlyDismissed()) {
      timer = window.setTimeout(() => setMode(isIos() ? "ios" : "android"), 2500);
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("pwa:open-install", open);
      clearTimeout(timer);
    };
  }, [deferred, installing]);

  const dismiss = () => { localStorage.setItem(DISMISS_KEY, String(Date.now())); setMode("none"); };

  if (mode === "none") return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-fade-up">
      <div role="region" aria-label="Instalação do aplicativo" className="glass-card mx-auto max-h-[80dvh] max-w-md overflow-y-auto p-4 shadow-glow">
        <div className="flex items-start gap-3">
          <img src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-xl" />
          <div className="flex-1">
            <p className="font-display font-bold">Instalar Meu Dim Dim</p>
            <p className="text-xs text-muted-foreground">Acesso rápido pela tela de início, em tela cheia, como um app.</p>
          </div>
           <Button variant="ghost" size="icon" aria-label="Fechar" onClick={dismiss} className="shrink-0 text-muted-foreground"><X className="h-4 w-4" /></Button>
        </div>

        {preview && (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-muted-foreground">Abra o app no navegador para instalar na tela inicial.</p>
            <Button asChild className="w-full"><a href="https://dim-dim-3.lovable.app" target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Abrir app para instalar</a></Button>
          </div>
        )}
        {!preview && mode === "android" && (
          deferred ? (
            <Button onClick={install} disabled={installing} className="mt-3 flex w-full items-center justify-center gap-2">
              <Download className="h-4 w-4" />Instalar agora
            </Button>
          ) : (
            <ol className="mt-3 space-y-1.5 text-sm">
              <li>1. Toque no menu <b>⋮</b> do Chrome</li>
              <li>2. Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b></li>
            </ol>
          )
        )}

        {!preview && mode === "ios" && (
          <ol className="mt-3 space-y-2 text-sm">
            <li className="flex items-center gap-2">1. No Safari, toque em <Share className="h-4 w-4 text-primary" /> <b>Compartilhar</b></li>
            <li className="flex items-center gap-2">2. Escolha <SquarePlus className="h-4 w-4 text-primary" /> <b>Adicionar à Tela de Início</b></li>
            <li className="flex items-center gap-2">3. Toque em <b>Adicionar</b> <CheckCircle2 className="h-4 w-4 text-primary" /></li>
          </ol>
        )}
      </div>
    </div>
  );
}

export const openInstallGuide = () => window.dispatchEvent(new Event("pwa:open-install"));

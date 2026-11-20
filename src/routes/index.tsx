import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import loginBrand from "@/assets/dimdim-login-brand.webp.asset.json";
import loginFloor from "@/assets/dimdim-login-floor.webp.asset.json";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getState, isUnlocked, setState, unlock } from "@/lib/store";
import { useCloudSync } from "@/components/CloudSync";
import { lovable } from "@/integrations/lovable/index";
import { hashPin, verifyPin } from "@/lib/pin";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "DIM DIM — Entrar" }, { name: "description", content: "Acesse sua conta DIM DIM com segurança." }, { property: "og:title", content: "DIM DIM — Entrar" }, { property: "og:description", content: "Acesse sua conta DIM DIM com segurança." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: PinPage,
});

function PinPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [shake, setShake] = useState(0);
  const [loading, setLoading] = useState(false);
  const { session, ready, status, retry } = useCloudSync();

  useEffect(() => {
    if (ready && session && isUnlocked()) navigate({ to: "/dashboard" });
  }, [navigate, ready, session]);

  const signIn = async (provider: "google" | "lovable") => {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) toast.error("Não foi possível entrar. Tente novamente.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return void toast.error("O PIN deve ter pelo menos 4 dígitos");
    setLoading(true);
    const saved = getState();
    if (!saved.pin && !saved.pinHash) {
      const pinHash = await hashPin(pin);
      setState((s) => ({ ...s, pin: undefined, pinHash }));
      toast.success("PIN criado com sucesso.");
    } else if (!(await verifyPin(pin, saved))) {
      setLoading(false);
      setShake((n) => n + 1);
      return void toast.error("PIN incorreto");
    }
    unlock();
    navigate({ to: "/dashboard" });
  };

  return (
    <main className="image-login">
      <header className="image-login-brand">
        <img src={loginBrand.url} alt="DIM DIM — Connecting Opportunities" width={937} height={610} fetchPriority="high" />
      </header>

      <section className="image-login-access" aria-label="Entrar na sua conta">
        {!ready ? (
          <div className="image-login-loading" role="status" aria-label="Carregando">
            <span className="login-ultimate-spinner" />
            {status === "offline" && <Button type="button" variant="outline" className="image-login-button" onClick={retry}><ArrowUpRight size={18} /> Tentar novamente</Button>}
          </div>
        ) : !session ? (
          <div className="image-login-actions">
            <Button type="button" variant="outline" className="image-login-button" onClick={() => signIn("google")}>
              <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"/><path fill="#4A90E2" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z"/><path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3c1.6-4.9 6.1-8.5 11.4-8.5Z"/></svg>
              Continuar com Google
            </Button>
            <div className="image-login-divider" aria-hidden="true"><span />ou<span /></div>
            <Button type="button" variant="outline" className="image-login-button image-login-primary" onClick={() => signIn("lovable")}>
              <LovableMark /> Continuar com Lovable
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="image-login-actions">
            <label className="image-login-label" htmlFor="quick-pin">PIN de acesso</label>
            <div className="image-login-input-wrap">
              <LockKeyhole size={20} aria-hidden="true" />
              <Input key={shake} id="quick-pin" type={showPin ? "text" : "password"} inputMode="numeric" autoComplete="current-password" placeholder="Digite seu PIN" value={pin} onChange={(e) => setPin(e.target.value)} className="image-login-input" aria-label="PIN de acesso" />
              <Button type="button" variant="ghost" size="icon" className="image-login-eye" onClick={() => setShowPin((v) => !v)} title={showPin ? "Ocultar PIN" : "Mostrar PIN"} aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}>{showPin ? <EyeOff size={20} /> : <Eye size={20} />}</Button>
            </div>
            <Button type="submit" variant="outline" disabled={loading || !pin} className="image-login-button image-login-primary">
              {loading ? <span className="login-ultimate-spinner" /> : <LockKeyhole size={18} />} ENTRAR
            </Button>
          </form>
        )}

      </section>
      <img className="image-login-floor" src={loginFloor.url} alt="" aria-hidden="true" width={937} height={218} />
    </main>
  );
}

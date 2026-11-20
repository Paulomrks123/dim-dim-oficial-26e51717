import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { bindAccount, getState, hasLegacyData, hasLocalAccount, lock, setState, subscribeStore } from "@/lib/store";
import { cloudData, mergeData, type CloudData } from "@/lib/sync-data";
import { hashPin } from "@/lib/pin";

const schema = z.object({
  name: z.string(), email: z.string(), pinHash: z.string().optional(),
  layout: z.enum(["mini", "compact", "normal", "large"]).optional(),
  categories: z.array(z.object({ id: z.string(), name: z.string(), color: z.string(), icon: z.string().optional(), limit: z.number().optional() })),
  transactions: z.array(z.object({ id: z.string(), type: z.enum(["income", "expense"]), amount: z.number(), description: z.string(), categoryId: z.string().optional(), date: z.string(), recurringId: z.string().optional() })),
  goals: z.array(z.object({ id: z.string(), name: z.string(), target: z.number(), current: z.number(), deadline: z.string().optional() })),
  syncedRecurring: z.array(z.string()).optional(),
});
type Status = "loading" | "local" | "saving" | "saved" | "offline";
const Context = createContext<{ session: Session | null; ready: boolean; status: Status; retry: () => void }>({ session: null, ready: false, status: "loading", retry: () => {} });
export const useCloudSync = () => useContext(Context);

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [retry, setRetry] = useState<() => void>(() => () => {});
  useEffect(() => {
    let disposed = false;
    let stop = () => {};
    let identity: string | null | undefined;
    const activate = async (next: Session | null) => {
      if (disposed || identity === (next?.user.id ?? null)) return;
      const previousIdentity = identity;
      stop();
      if (identity !== undefined) lock();
      identity = next?.user.id ?? null;
      setSession(next); setReady(false); setStatus(next ? "loading" : "local");
      if (!next) { bindAccount(null); setReady(true); return; }
      const id = next.user.id;
      if (previousIdentity) bindAccount(null);
      const legacy = hasLegacyData() && !localStorage.getItem("meu-dim-dim:legacy-owner") ? { ...getState() } : null;
      const cached = hasLocalAccount(id);
      bindAccount(id);
      const metaKey = `meu-dim-dim:sync:${id}`;
      let base = cloudData(getState());
      let revision = 0;
      try {
        const metadata = JSON.parse(localStorage.getItem(metaKey) ?? "null");
        if (metadata) { base = schema.parse(metadata.base); revision = Number(metadata.revision); }
      } catch { /* Preserve local snapshot when metadata is unavailable. */ }
      let cancelled = false;
      let busy = false;
      let applying = false;
      let initialized = false;
      const remember = () => localStorage.setItem(metaKey, JSON.stringify({ base, revision }));
      const apply = (data: CloudData) => {
        applying = true;
        setState(() => ({ ...data }));
        applying = false;
      };
      const sync = async () => {
        if (cancelled || busy) return;
        busy = true;
        if (!initialized || JSON.stringify(cloudData(getState())) !== JSON.stringify(base)) setStatus("saving");
        try {
          const { data: row, error } = await supabase.from("financial_accounts").select("data, revision").eq("user_id", id).maybeSingle();
          if (error) throw error;
          if (cancelled) return;
          if (!initialized) {
            if (row) {
              const remote = schema.parse(row.data);
              if (cached && revision > 0) apply(mergeData(base, cloudData(getState()), remote));
              else if (legacy) {
                const imported = cloudData(legacy);
                if (legacy.pin && !legacy.pinHash) imported.pinHash = await hashPin(legacy.pin);
                if (cancelled) return;
                const combined = { ...imported, ...remote,
                  categories: [...new Map([...imported.categories, ...remote.categories].map((r) => [r.id, r])).values()],
                  transactions: [...new Map([...imported.transactions, ...remote.transactions].map((r) => [r.id, r])).values()],
                  goals: [...new Map([...imported.goals, ...remote.goals].map((r) => [r.id, r])).values()],
                  name: remote.name || imported.name, email: remote.email || imported.email,
                  pinHash: remote.pinHash || imported.pinHash,
                };
                apply(combined);
                localStorage.setItem("meu-dim-dim:legacy-owner", id);
              } else apply(remote);
              base = remote; revision = Number(row.revision);
            } else if (!cached && legacy) {
              apply(cloudData(legacy));
              if (legacy.pin && !legacy.pinHash) setState((s) => ({ ...s, pin: legacy.pin }));
              localStorage.setItem("meu-dim-dim:legacy-owner", id);
            }
            initialized = true;
          } else if (row && Number(row.revision) !== revision) {
            const remote = schema.parse(row.data);
            apply(mergeData(base, cloudData(getState()), remote));
            base = remote; revision = Number(row.revision);
          }
          const current = getState();
          if (current.pin && !current.pinHash) {
            const pinHash = await hashPin(current.pin);
            if (cancelled) return;
            applying = true; setState((s) => ({ ...s, pin: undefined, pinHash })); applying = false;
          }
          const candidate = cloudData(getState());
          if (!row || JSON.stringify(candidate) !== JSON.stringify(base)) {
            const { data: saved, error: failure } = await supabase.rpc("save_financial_account", { p_data: JSON.parse(JSON.stringify(candidate)), p_revision: revision });
            if (failure) throw failure;
            if (cancelled) return;
            const savedRow = saved?.[0];
            if (!savedRow) { setStatus("saving"); return; }
            base = candidate; revision = Number(savedRow.revision);
          }
          if (getState().pinHash) {
            const raw = localStorage.getItem("meu-dim-dim:v2");
            if (raw && localStorage.getItem("meu-dim-dim:legacy-owner") === id) {
              const old = JSON.parse(raw);
              delete old.pin;
              old.pinHash = getState().pinHash;
              localStorage.setItem("meu-dim-dim:v2", JSON.stringify(old));
            }
          }
          remember();
          setStatus(JSON.stringify(cloudData(getState())) === JSON.stringify(base) ? "saved" : "saving");
        } catch { if (!cancelled) setStatus("offline"); }
        finally { busy = false; if (!cancelled) setReady(initialized || cached); }
      };
      let timer: ReturnType<typeof setTimeout> | undefined;
      const unsubscribe = subscribeStore(() => {
        if (applying || cancelled) return;
        setStatus("saving");
        clearTimeout(timer); timer = setTimeout(() => void sync(), 300);
      });
      const interval = setInterval(() => void sync(), 8000);
      const wake = () => void sync();
      window.addEventListener("online", wake); window.addEventListener("focus", wake);
      stop = () => { cancelled = true; unsubscribe(); clearInterval(interval); clearTimeout(timer); window.removeEventListener("online", wake); window.removeEventListener("focus", wake); };
      setRetry(() => wake);
      await sync();
    };
    void supabase.auth.getSession().then(({ data }) => activate(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (["SIGNED_IN", "SIGNED_OUT", "INITIAL_SESSION"].includes(event)) setTimeout(() => void activate(next), 0);
    });
    return () => { disposed = true; stop(); data.subscription.unsubscribe(); };
  }, []);
  return <Context.Provider value={{ session, ready, status, retry }}>{children}</Context.Provider>;
}
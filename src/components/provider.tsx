"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { browserDb, configured } from "@/lib/supabase";
import { applyDemo, seed } from "@/lib/demo";
import type { Command, Snapshot } from "@/lib/domain";
const KEY = "agrocontrol:demo:v1",
  MODE = "agrocontrol:demo-mode";
type Store = {
  data: Snapshot | null;
  loading: boolean;
  busy: boolean;
  error: string;
  demo: boolean;
  ready: boolean;
  session: Session | null;
  execute: (c: Command) => Promise<void>;
  refresh: () => Promise<void>;
  enterDemo: () => void;
  logout: () => Promise<void>;
  resetDemo: () => void;
};
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null),
    [session, setSession] = useState<Session | null>(null),
    [demo, setDemo] = useState(false),
    [ready, setReady] = useState(false),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    try {
      if (localStorage.getItem(MODE) === "yes") {
        setDemo(true);
        const stored = localStorage.getItem(KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (
            !Array.isArray(parsed.products) ||
            !Array.isArray(parsed.sales) ||
            !Array.isArray(parsed.movements) ||
            !Array.isArray(parsed.partners)
          )
            throw new Error();
          setData(parsed);
        } else setData(seed());
      }
    } catch {
      setError("La demo no pudo leer sus datos. Puedes restablecerla.");
    }
    setReady(true);
    if (configured) {
      void browserDb()
        .auth.getSession()
        .then(({ data }) => setSession(data.session));
      const { data } = browserDb().auth.onAuthStateChange((_event, s) =>
        setSession(s),
      );
      return () => data.subscription.unsubscribe();
    }
  }, []);
  const refresh = useCallback(async () => {
    if (demo || !session) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/data", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error);
      setData(json);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los datos.",
      );
      throw e;
    } finally {
      setLoading(false);
    }
  }, [demo, session]);
  useEffect(() => {
    if (!ready) return;
    if (!demo) {
      setData(null);
      if (session) void refresh().catch(() => {});
    }
  }, [session, demo, refresh, ready]);
  async function execute(command: Command) {
    setBusy(true);
    try {
      if (demo) {
        if (!data) throw new Error("Demo no disponible.");
        const next = applyDemo(data, command);
        localStorage.setItem(KEY, JSON.stringify(next));
        setData(next);
      } else {
        if (!session) throw new Error("Inicia sesión.");
        const r = await fetch("/api/commands", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(command),
        });
        const json = await r.json();
        if (!r.ok) throw new Error(json.error);
        await refresh().catch(() =>
          setError(
            "La operación se guardó, pero no se pudo actualizar la vista. Pulsa Actualizar.",
          ),
        );
      }
    } finally {
      setBusy(false);
    }
  }
  function enterDemo() {
    try {
      localStorage.setItem(MODE, "yes");
      const next = seed();
      localStorage.setItem(KEY, JSON.stringify(next));
      setData(next);
      setDemo(true);
      setError("");
    } catch {
      setError("Permite almacenamiento local para usar la demo.");
    }
  }
  async function logout() {
    localStorage.removeItem(MODE);
    setDemo(false);
    setData(null);
    setError("");
    if (configured) await browserDb().auth.signOut();
    setSession(null);
  }
  function resetDemo() {
    if (confirm("¿Restablecer los datos ficticios de la demo?")) enterDemo();
  }
  return (
    <Context.Provider
      value={{
        data,
        session,
        loading,
        busy,
        error,
        demo,
        ready,
        execute,
        refresh,
        enterDemo,
        logout,
        resetDemo,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const c = useContext(Context);
  if (!c) throw new Error("Falta Provider");
  return c;
}

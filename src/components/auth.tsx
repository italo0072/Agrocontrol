"use client";
import { useState, type FormEvent } from "react";
import { Sprout, ArrowRight, ShieldCheck } from "lucide-react";
import { browserDb, configured } from "@/lib/supabase";
import { useStore } from "./provider";
export function Auth() {
  const { enterDemo, error } = useStore();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await browserDb().auth.signInWithPassword({
        email,
        password,
      });
      if (error)
        throw new Error("No se pudo iniciar sesión. Revisa tus credenciales.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function recover() {
    if (!email) {
      setMessage("Escribe tu correo para solicitar la recuperación.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await browserDb().auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/recuperar`,
      });
      if (error) throw error;
      setMessage(
        "Si el correo corresponde a una cuenta, recibirás las instrucciones de recuperación.",
      );
    } catch {
      setMessage(
        "No se pudo solicitar la recuperación. Revisa la configuración de correo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex min-h-screen bg-slate-900">
      <section className="w-2/5 bg-slate-800/50 border-r border-slate-700 p-10 flex flex-col justify-center backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-8">
          <Sprout size={32} className="text-emerald-400" />
          <span className="text-2xl font-extrabold text-white tracking-tight">AgroControl</span>
        </div>
        <p className="text-xs tracking-[2.5px] text-emerald-400 font-bold uppercase mb-3">
          INFORMACIÓN CLARA. OPERACIÓN CONECTADA.
        </p>
        <h1 className="text-3xl tracking-tight text-white font-bold mb-6 leading-[1.05]">
          Más control para<br />
          hacer crecer<br />
          tu negocio.
        </h1>
        <p className="text-slate-400 text-lg max-w-[400px] leading-relaxed mb-8">
          Productos, existencias y ventas de fertilizantes en un solo lugar.
        </p>
        <div className="flex items-center gap-3 mt-auto">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span className="text-slate-400 text-base">Una fuente de información para todo tu equipo.</span>
        </div>
      </section>
      <section className="flex-1 flex items-center justify-center bg-slate-900 p-8">
        <div className="w-full max-w-[480px] bg-slate-800/50 border border-slate-700 p-10 rounded-2xl shadow-2xl backdrop-blur-xl">
          <p className="text-xs tracking-[2.5px] text-emerald-400 font-bold uppercase mb-3">
            BIENVENIDO A TU ESPACIO
          </p>
          <h2 className="text-2xl tracking-tight text-white font-bold mb-7">
            Inicia sesión
          </h2>
          <form onSubmit={login} className="flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-sm font-bold text-slate-500">
              Correo electrónico
              <input
                type="email"
                required
                autoComplete="username"
                className="input-pro"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-bold text-slate-500">
              Contraseña
              <input
                type="password"
                required
                autoComplete="current-password"
                className="input-pro"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button
              disabled={!configured || busy}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl shadow-[0_10px_15px_-5px_rgba(16,185,129,0.3)] transition-all duration-200 hover:bg-emerald-500 hover:shadow-[0_15px_25px_-5px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? "Conectando…" : "Ingresar"}
              <ArrowRight size={18} />
            </button>
            <button
              type="button"
              className="bg-transparent text-slate-500 border-0 text-sm cursor-pointer hover:text-emerald-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!configured || busy}
              onClick={() => void recover()}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
          {!configured && (
            <p className="mt-5 notice-info text-sm">
              Para usar datos compartidos, configura Supabase siguiendo el README.
              Puedes explorar la demo ahora.
            </p>
          )}
          {(message || error) && (
            <p role="status" className="mt-5 notice-error text-sm">
              {message || error}
            </p>
          )}
          <div className="mt-7 border-t border-slate-700 pt-6">
            <strong className="text-base text-white block">Explora antes de configurar</strong>
            <p className="text-slate-500 text-sm mt-1">Prueba el sistema con datos ficticios, sin crear una cuenta.</p>
            <button onClick={enterDemo} className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-600 bg-slate-700 text-white font-bold text-sm hover:bg-slate-600 transition-colors">
              Abrir demostración →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

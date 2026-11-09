"use client";
import { useState, type FormEvent } from "react";
import { browserDb } from "@/lib/supabase";
import { useStore } from "@/components/provider";
export default function Recover() {
  const { demo, logout } = useStore();
  const [password, setPassword] = useState(""),
    [repeat, setRepeat] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== repeat) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await browserDb().auth.updateUser({ password });
      if (error) throw error;
      setMessage("Contraseña actualizada. Cierra sesión y vuelve a ingresar.");
      setPassword("");
      setRepeat("");
    } catch {
      setMessage(
        "No se pudo cambiar la contraseña. Solicita un nuevo enlace de recuperación.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="section-card">
      <h1 className="text-lg font-bold text-slate-100 mb-2">
        Actualizar contraseña
      </h1>
      <p className="text-sm text-slate-400 mb-4">
        Abre el enlace de recuperación enviado a tu correo antes de continuar.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
          Nueva contraseña (mínimo 12 caracteres)
          <input
            type="password"
            minLength={12}
            required
            value={password}
            autoComplete="new-password"
            className="input-pro"
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
          Repite la contraseña
          <input
            type="password"
            minLength={12}
            required
            value={repeat}
            autoComplete="new-password"
            className="input-pro"
            onChange={(e) => setRepeat(e.target.value)}
          />
        </label>
        <button
          disabled={busy || demo}
          className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-3 rounded-lg shadow-[0_10px_15px_-5px_rgba(16,185,129,0.3)] transition-all duration-200 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Actualizando…" : "Actualizar contraseña"}
        </button>
      </form>
      {message && (
        <p role="status" className="mt-2 notice-success text-sm">
          {message}
        </p>
      )}
      <button
        onClick={() => void logout()}
        className="mt-2 inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-white/10 bg-white/5 text-slate-400 font-bold text-sm hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
      >
        Cerrar sesión
      </button>
    </section>
  );
}

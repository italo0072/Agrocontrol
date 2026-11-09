"use client";
import { useState, type FormEvent } from "react";
import { browserDb } from "@/lib/supabase";
import { useStore } from "@/components/provider";
import s from "@/components/ui.module.css";
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
    <section className={`${s.card} ${s.cardPad}`}>
      <h1>Actualizar contraseña</h1>
      <p>
        Abre el enlace de recuperación enviado a tu correo antes de continuar.
      </p>
      <form onSubmit={submit} className={s.stack}>
        <label>
          Nueva contraseña (mínimo 12 caracteres)
          <input
            type="password"
            minLength={12}
            required
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          Repite la contraseña
          <input
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          />
        </label>
        <button disabled={busy || demo}>
          {busy ? "Actualizando…" : "Actualizar contraseña"}
        </button>
      </form>
      {message && (
        <p role="status" className={s.notice}>
          {message}
        </p>
      )}
      <button className={s.secondary} onClick={() => void logout()}>
        Cerrar sesión
      </button>
    </section>
  );
}

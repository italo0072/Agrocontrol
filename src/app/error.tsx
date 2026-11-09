"use client";
import s from "@/components/ui.module.css";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className={`${s.card} ${s.cardPad}`} role="alert">
      <h1>No pudimos mostrar este módulo</h1>
      <p>Intenta otra vez. No se borrará la información guardada.</p>
      <button onClick={reset}>Reintentar</button>
    </section>
  );
}

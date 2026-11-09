"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="section-card" role="alert">
      <h1 className="text-lg font-bold text-slate-100 mb-2">
        No pudimos mostrar este módulo
      </h1>
      <p className="text-sm text-slate-400 mb-4">
        Intenta otra vez. No se borrará la información guardada.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-3 rounded-lg shadow-[0_10px_15px_-5px_rgba(16,185,129,0.3)] transition-all duration-200 hover:bg-emerald-500 active:scale-95"
      >
        Reintentar
      </button>
    </section>
  );
}

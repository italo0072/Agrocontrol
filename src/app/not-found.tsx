import Link from "next/link";
export default function Missing() {
  return (
    <section className="section-card">
      <h1 className="text-lg font-bold text-slate-100 mb-2">
        Esta página no existe
      </h1>
      <Link
        href="/"
        className="text-xs text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
      >
        Volver al resumen →
      </Link>
    </section>
  );
}

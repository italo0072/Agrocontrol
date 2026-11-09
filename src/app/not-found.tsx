import Link from "next/link";
import s from "@/components/ui.module.css";
export default function Missing() {
  return (
    <section className={`${s.card} ${s.cardPad}`}>
      <h1>Esta página no existe</h1>
      <Link href="/">Volver al resumen →</Link>
    </section>
  );
}

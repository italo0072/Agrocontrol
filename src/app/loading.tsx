import s from "@/components/ui.module.css";
export default function Loading() {
  return (
    <p className={s.loading} role="status">
      Cargando módulo…
    </p>
  );
}

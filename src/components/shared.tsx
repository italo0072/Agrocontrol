import type { ReactNode } from "react";
import s from "./ui.module.css";
export const money = (n: number) =>
  new Intl.NumberFormat("es-SV", { style: "currency", currency: "USD" }).format(
    n,
  );
export const quantity = (n: number) =>
  new Intl.NumberFormat("es-SV", { maximumFractionDigits: 3 }).format(n);
export const date = (d: string) =>
  new Intl.DateTimeFormat("es-SV", {
    timeZone: "America/El_Salvador",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));
export function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className={s.heading}>
      <div>
        <p className={s.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className={s.empty}>{children}</div>;
}
export function Notice({
  message,
  success = false,
}: {
  message: string;
  success?: boolean;
}) {
  return message ? (
    <p role="status" className={`${s.notice} ${success ? s.success : ""}`}>
      {message}
    </p>
  ) : null;
}
export function Badge({
  children,
  warn = false,
  inactive = false,
}: {
  children: ReactNode;
  warn?: boolean;
  inactive?: boolean;
}) {
  return (
    <span
      className={`${s.pill} ${warn ? s.warning : ""} ${inactive ? s.inactive : ""}`}
    >
      {children}
    </span>
  );
}
export function download(
  name: string,
  content: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

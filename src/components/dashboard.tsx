"use client";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Package,
  ShoppingCart,
  DollarSign,
} from "lucide-react";
import { useStore } from "./provider";
import { Heading, Empty, Badge, money, quantity, date } from "./shared";
import s from "./ui.module.css";
const dayKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
export function Dashboard() {
  const { data } = useStore();
  if (!data) return null;
  const active = data.products.filter((p) => p.active),
    low = active.filter((p) => p.stock <= p.min_stock),
    value = active.reduce((sum, p) => sum + p.stock * p.price, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return {
      label: new Intl.DateTimeFormat("es-SV", {
        timeZone: "America/El_Salvador",
        weekday: "short",
      }).format(d),
      total: data.sales
        .filter(
          (x) =>
            x.status === "vigente" &&
            dayKey(new Date(x.created_at)) === dayKey(d),
        )
        .reduce((sum, x) => sum + x.total, 0),
    };
  });
  const max = Math.max(...days.map((x) => x.total), 1);
  return (
    <>
      <Heading
        eyebrow="TODO TU NEGOCIO, EN UN MISMO LUGAR"
        title="Resumen de operaciones"
        description="La información que necesitas para tomar tu siguiente decisión."
      >
        <Link className={s.primaryLink} href="/ventas">
          Ver ventas
          <ArrowUpRight size={15} />
        </Link>
      </Heading>
      <section className={s.stats}>
        {[
          [
            "Ventas del mes",
            money(data.metrics.month_sales),
            `${data.metrics.month_count} ventas vigentes`,
            DollarSign,
          ],
          [
            "Productos activos",
            active.length,
            "Catálogo estandarizado",
            Package,
          ],
          [
            "Stock bajo",
            low.length,
            "Productos en mínimo o por debajo",
            AlertTriangle,
          ],
          [
            "Valor comercial",
            money(value),
            "Stock activo × precio de venta",
            Boxes,
          ],
        ].map(([label, n, caption, Icon]) => {
          const I = Icon as typeof Package;
          return (
            <article className={s.stat} key={String(label)}>
              <div className={s.statTop}>
                {String(label)}
                <span className={s.statIcon}>
                  <I size={16} />
                </span>
              </div>
              <strong>{n as string | number}</strong>
              <small>{String(caption)}</small>
            </article>
          );
        })}
      </section>
      <div className={s.dashboard}>
        <section className={s.card}>
          <div className={s.cardTitle}>
            <h2>Ventas de los últimos 7 días</h2>
            <span>USD · ventas cargadas</span>
          </div>
          <div
            className={s.chart}
            role="img"
            aria-label={days
              .map((d) => `${d.label}: ${money(d.total)}`)
              .join(", ")}
          >
            {days.map((d, i) => (
              <div className={s.barGroup} key={i}>
                <small>{d.total ? money(d.total) : "—"}</small>
                <div
                  className={s.bar}
                  style={{ height: `${Math.max((d.total / max) * 145, 3)}px` }}
                />
                <small>{d.label}</small>
              </div>
            ))}
          </div>
          <p className={s.chartLegend}>
            Importes de ventas vigentes. El gráfico utiliza las últimas 200
            ventas; el indicador mensual consulta el historial completo.
          </p>
        </section>
        <section className={s.card}>
          <div className={s.cardTitle}>
            <h2>Atención de inventario</h2>
            <Link href="/productos">Ver catálogo →</Link>
          </div>
          {low.length ? (
            low.slice(0, 4).map((p) => (
              <div className={s.lowRow} key={p.id}>
                <span className={s.lowIcon}>
                  <AlertTriangle size={16} />
                </span>
                <div>
                  <h3>{p.name}</h3>
                  <p>{p.presentation}</p>
                </div>
                <div>
                  <strong>
                    {quantity(p.stock)} {p.unit}
                  </strong>
                  <p>Mín. {quantity(p.min_stock)}</p>
                </div>
              </div>
            ))
          ) : (
            <Empty>No hay productos con existencias bajas.</Empty>
          )}
        </section>
      </div>
      <section className={s.card}>
        <div className={s.cardTitle}>
          <h2>Últimos movimientos</h2>
          <Link href="/inventario">Ver historial →</Link>
        </div>
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Movimiento</th>
                <th>Cantidad</th>
                <th>Referencia</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {data.movements.slice(0, 5).map((m) => {
                const p = data.products.find((p) => p.id === m.product_id);
                return (
                  <tr key={m.id}>
                    <td className={s.productName}>
                      {p?.name}
                      <small>{p?.sku}</small>
                    </td>
                    <td>
                      <Badge warn={m.quantity < 0}>{m.kind}</Badge>
                    </td>
                    <td>
                      {m.quantity > 0 ? "+" : ""}
                      {quantity(m.quantity)} {p?.unit}
                    </td>
                    <td>{m.reason}</td>
                    <td>{date(m.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!data.movements.length && (
          <Empty>
            Registra tu primera entrada de inventario para comenzar.
          </Empty>
        )}
      </section>
    </>
  );
}

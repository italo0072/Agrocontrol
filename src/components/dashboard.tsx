"use client";
import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Package,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useStore } from "./provider";
import { Heading, Empty, Badge, money, quantity, date } from "./shared";
const dayKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
const monthKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
  }).format(d);
export function Dashboard() {
  const { data } = useStore();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  if (!data) return null;

  const active = data.products.filter((p) => p.active),
    low = active.filter((p) => p.stock <= p.min_stock),
    value = active.reduce((sum, p) => sum + p.stock * p.price, 0);
  const currentMonth = monthKey(new Date());
  const monthPurchases = data.movements.filter(
    (m) =>
      m.kind === "entrada" &&
      m.unit_cost != null &&
      m.unit_cost > 0 &&
      monthKey(new Date(m.created_at)) === currentMonth,
  );
  const monthPurchaseSpend = monthPurchases.reduce(
    (sum, m) => sum + m.quantity * (m.unit_cost || 0),
    0,
  );
  const monthSales = data.sales.filter(
    (x) =>
      x.status === "vigente" &&
      monthKey(new Date(x.created_at)) === currentMonth,
  );
  const monthSalesTotal = monthSales.reduce((sum, x) => sum + x.total, 0);
  const monthSalesCount = monthSales.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const defaultFrom = new Date(today);
  defaultFrom.setDate(today.getDate() - 6);

  // Rango de fechas para los gráficos
  const rangeFrom = fromDate || defaultFrom.toISOString().split("T")[0];
  const rangeTo = toDate || today.toISOString().split("T")[0];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const dKey = dayKey(d);
    return {
      label: new Intl.DateTimeFormat("es-SV", {
        timeZone: "America/El_Salvador",
        weekday: "short",
      }).format(d),
      dateKey: dKey,
      total: data.sales
        .filter(
          (x) =>
            x.status === "vigente" &&
            dayKey(new Date(x.created_at)) === dKey &&
            new Date(x.created_at).toISOString().split("T")[0] >= rangeFrom &&
            new Date(x.created_at).toISOString().split("T")[0] <= rangeTo,
        )
        .reduce((sum, x) => sum + x.total, 0),
      purchaseTotal: data.movements
        .filter(
          (m) =>
            m.kind === "entrada" &&
            m.unit_cost != null &&
            m.unit_cost > 0 &&
            dayKey(new Date(m.created_at)) === dKey &&
            new Date(m.created_at).toISOString().split("T")[0] >= rangeFrom &&
            new Date(m.created_at).toISOString().split("T")[0] <= rangeTo,
        )
        .reduce((sum, m) => sum + m.quantity * (m.unit_cost || 0), 0),
    };
  });
  const maxSales = Math.max(...days.map((x) => x.total), 1);
  const maxPurchase = Math.max(...days.map((x) => x.purchaseTotal), 1);

  return (
    <>
      <Heading
        eyebrow="TODO TU NEGOCIO, EN UN MISMO LUGAR"
        title="Resumen de operaciones"
        description="La información que necesitas para tomar tu siguiente decisión."
      >
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <Link className="btn-primary" href="/ventas">
            Ver ventas
            <ArrowUpRight size={16} />
          </Link>
          <div className="flex flex-col sm:flex-row items-end gap-3 flex-1 sm:flex-initial max-w-[400px]">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-400">
                Desde
              </label>
              <input
                type="date"
                defaultValue={defaultFrom.toISOString().split("T")[0]}
                onChange={(e) => setFromDate(e.target.value)}
                className="input-pro sm:w-[160px]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-400">
                Hasta
              </label>
              <input
                type="date"
                defaultValue={today.toISOString().split("T")[0]}
                onChange={(e) => setToDate(e.target.value)}
                className="input-pro sm:w-[160px]"
              />
            </div>
          </div>
        </div>
      </Heading>
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5 mb-8">
        {[
          [
            "Ventas del mes",
            money(data.metrics.month_sales),
            `${data.metrics.month_count} ventas vigentes`,
            DollarSign,
          ],
          [
            "Compras del mes",
            money(data.metrics.month_purchase_total || 0),
            `${data.metrics.month_purchase_count || 0} entradas con costo`,
            ShoppingCart,
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
            <article className="stat-card" key={String(label)}>
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                <span>{String(label)}</span>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-400 shadow-emerald">
                  <I size={16} />
                </div>
              </div>
              <strong className="text-3xl tracking-[-1px] text-slate-100 font-bold leading-none">
                {n as string | number}
              </strong>
              <small className="text-slate-400 mt-2 block font-medium text-sm">
                {String(caption)}
              </small>
            </article>
          );
        })}
      </section>
      <div className="grid gap-6 md:grid-cols-[1.7fr_1fr]">
        {/* Gráfico de Ventas */}
        <section className="section-card p-6">
          <div className="p-5 border-b border-slate-700 flex items-center justify-between gap-5 pb-4">
            <h2 className="text-base font-bold text-slate-100">
              Ventas — últimos 7 días
            </h2>
            <span className="text-sm text-slate-400">
              USD · ventas cargadas
            </span>
          </div>
          <div
            className="p-6 flex items-end justify-around gap-8 h-[300px] border-b border-slate-700 pb-4"
            role="img"
            aria-label={days
              .map((d) => `${d.label}: ${money(d.total)}`)
              .join(", ")}
          >
            {days.map((d, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-4 transition-all duration-200 group"
              >
                <small className="text-slate-400 text-sm font-medium leading-none">
                  {d.total ? money(d.total) : "—"}
                </small>
                <div
                  className="w-full max-w-[56px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-xl shadow-emerald group-hover:opacity-90 transition-all duration-200"
                  style={{
                    height: `${Math.max((d.total / maxSales) * 180, 4)}px`,
                  }}
                />
                <small className="text-slate-400 text-sm">{d.label}</small>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400 px-6 mt-3 mb-0">
            Importes de ventas vigentes. La venta no puede exceder el stock
            disponible.
          </p>
        </section>

        {/* Gráfico de Compras */}
        <section className="section-card p-6">
          <div className="p-5 border-b border-slate-700 flex items-center justify-between gap-5 pb-4">
            <h2 className="text-base font-bold text-slate-100">
              Compras — últimos 7 días
            </h2>
            <span className="text-sm text-slate-400">
              USD · entradas con costo
            </span>
          </div>
          <div
            className="p-6 flex items-end justify-around gap-8 h-[300px] border-b border-slate-700 pb-4"
            role="img"
          >
            {days.map((d, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-4 transition-all duration-200 group"
              >
                <small className="text-slate-400 text-sm font-medium leading-none">
                  {d.purchaseTotal ? money(d.purchaseTotal) : "—"}
                </small>
                <div
                  className="w-full max-w-[56px] bg-gradient-to-t from-amber-500 to-amber-300 rounded-xl shadow-amber group-hover:opacity-90 transition-all duration-200"
                  style={{
                    height: `${Math.max((d.purchaseTotal / maxPurchase) * 180, 4)}px`,
                  }}
                />
                <small className="text-slate-400 text-sm">{d.label}</small>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-400 px-6 mt-3 mb-0">
            Importes de compras con costo registrado.
          </p>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,0.85fr)_minmax(0,2.6fr)]">
        <section className="section-card min-w-0">
          <div className="p-5 border-b border-slate-700 flex items-center justify-between gap-5 pb-3">
            <h2 className="text-sm font-bold text-slate-100">
              Atención de inventario
            </h2>
            <Link
              href="/productos"
              className="text-xs text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
            >
              Ver catálogo →
            </Link>
          </div>
          {low.length ? (
            low.slice(0, 4).map((p) => (
              <div
                className="p-4 border-b border-slate-700 flex items-center gap-4 last:border-0"
                key={p.id}
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 grid place-items-center">
                  <AlertTriangle size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-100">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-400">{p.presentation}</p>
                </div>
                <div className="ml-auto text-right">
                  <strong className="text-amber-500 font-bold text-base block">
                    {quantity(p.stock)} {p.unit}
                  </strong>
                  <p className="text-xs text-slate-400">
                    Mín. {quantity(p.min_stock)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <Empty>No hay productos con existencias bajas.</Empty>
          )}
        </section>
        <section className="section-card min-w-0">
          <div className="p-5 border-b border-slate-700 flex items-center justify-between gap-5 pb-3">
            <h2 className="text-sm font-bold text-slate-100">
              Últimos movimientos
            </h2>
            <Link
              href="/inventario"
              className="text-xs text-emerald-400 font-bold hover:text-emerald-300 transition-colors"
            >
              Ver historial →
            </Link>
          </div>
          <div className="overflow-x-auto p-5">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Producto
                  </th>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Movimiento
                  </th>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Cantidad
                  </th>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Costo unitario
                  </th>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Importe
                  </th>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Motivo
                  </th>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Proveedor
                  </th>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.movements.slice(0, 5).map((m) => {
                  const p = data.products.find((p) => p.id === m.product_id);
                  const partner = data.partners.find(
                    (x) => x.id === m.partner_id,
                  );
                  const unitCost =
                    m.unit_cost != null && m.unit_cost > 0 ? m.unit_cost : null;
                  const totalAmount =
                    unitCost != null ? m.quantity * unitCost : null;
                  return (
                    <tr key={m.id} className="table-row">
                      <td className="px-5 py-4 border-b border-slate-700 font-bold text-slate-100 text-base whitespace-nowrap">
                        {p?.name}
                        <br />
                        <small className="text-slate-400 text-xs">
                          {p?.sku}
                        </small>
                      </td>
                      <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                        <Badge warn={m.quantity < 0}>{m.kind}</Badge>
                      </td>
                      <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100 whitespace-nowrap">
                        {m.quantity > 0 ? "+" : ""}
                        {quantity(m.quantity)} {p?.unit}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                        {unitCost ? money(unitCost) : "—"}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                        {totalAmount != null ? money(totalAmount) : "—"}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                        {m.reason}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                        {partner?.name || "—"}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100 whitespace-nowrap">
                        {date(m.created_at)}
                      </td>
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
      </div>
    </>
  );
}

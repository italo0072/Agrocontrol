"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { csv } from "@/lib/domain";
import { useStore } from "./provider";
import { Heading, download, money, quantity, date, Empty } from "./shared";
function localDay(d: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/El_Salvador",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(d));
  const v = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${v("year")}-${v("month")}-${v("day")}`;
}
import { PurchaseSummary } from "./purchase-summary";
export function Reports() {
  const { data } = useStore();
  const [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  if (!data) return null;
  const invalid = Boolean(from && to && from > to),
    inRange = (d: string) =>
      !invalid && (!from || localDay(d) >= from) && (!to || localDay(d) <= to);
  const sales = data.sales.filter((x) => inRange(x.created_at)),
    moves = data.movements.filter((x) => inRange(x.created_at)),
    net = sales
      .filter((x) => x.status === "vigente")
      .reduce((sum, x) => sum + x.total, 0);
  const purchaseMovements = moves.filter(
    (m) => m.kind === "entrada" && m.unit_cost != null,
  );
  function stockExport() {
    if (!data) return;
    download(
      "agrocontrol-existencias.csv",
      csv([
        [
          "Código",
          "Producto",
          "Categoría",
          "Presentación",
          "Unidad",
          "Existencia",
          "Mínimo",
          "Precio USD",
          "Activo",
        ],
        ...data.products.map((p) => [
          p.sku,
          p.name,
          p.category,
          p.presentation,
          p.unit,
          p.stock,
          p.min_stock,
          p.price,
          p.active ? "Sí" : "No",
        ]),
      ]),
    );
  }
  function salesExport() {
    download(
      "agrocontrol-ventas.csv",
      csv([
        [
          "ID",
          "Fecha El Salvador",
          "Cliente",
          "Estado",
          "Total USD",
          "Responsable",
          "Notas",
          "Anulación",
        ],
        ...sales.map((x) => [
          x.id,
          date(x.created_at),
          x.customer_name,
          x.status,
          x.total,
          x.actor,
          x.notes,
          x.cancel_reason || "",
        ]),
      ]),
    );
  }
  function movesExport() {
    if (!data) return;
    download(
      "agrocontrol-movimientos.csv",
      csv([
        [
          "ID",
          "Fecha El Salvador",
          "Código",
          "Producto",
          "Unidad",
          "Cantidad",
          "Tipo",
          "Motivo",
          "Responsable",
          "Venta",
        ],
        ...moves.map((x) => {
          const p = data.products.find((p) => p.id === x.product_id);
          return [
            x.id,
            date(x.created_at),
            p?.sku || "",
            p?.name || "",
            p?.unit || "",
            x.quantity,
            x.kind,
            x.reason,
            x.actor,
            x.sale_id || "",
          ];
        }),
      ]),
    );
  }
  return (
    <>
      <Heading
        eyebrow="DATOS PARA DECIDIR"
        title="Reportes y exportaciones"
        description="Consulta y exporta información con columnas y unidades consistentes."
      />
      <p className="notice-info text-sm mb-7">
        Ventas y movimientos: hasta los 200 registros más recientes de cada
        tipo. Los filtros y CSV se aplican a esos registros, no a todo el
        historial. Existencias exporta el catálogo cargado. Para un cierre
        histórico completo, consulta la base de datos.
      </p>
      <div className="flex items-end gap-4 flex-wrap mb-7">
        <label className="flex-1 min-w-[200px] max-w-[440px] flex flex-col gap-2">
          <span className="text-xs text-slate-400">Desde</span>
          <input
            type="date"
            className="input-pro"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="flex-1 min-w-[200px] max-w-[440px] flex flex-col gap-2">
          <span className="text-xs text-slate-400">Hasta</span>
          <input
            type="date"
            className="input-pro"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          className="btn-secondary"
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          Limpiar fechas
        </button>
      </div>
      {invalid && (
        <p role="alert" className="notice-error text-sm mb-7">
          La fecha inicial no puede ser posterior a la final.
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="section-card p-6">
          <h2 className="text-sm font-bold text-slate-100 mb-4">
            Existencias actuales
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            Productos activos e inactivos, presentación, unidad, existencia y
            mínimo. No suma unidades incompatibles.
          </p>
          <button
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-white/10 bg-white/5 text-slate-400 font-bold transition-all duration-200 hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
            onClick={stockExport}
          >
            <Download size={16} />
            Exportar existencias CSV
          </button>
        </section>
        <section className="section-card p-6">
          <h2 className="text-sm font-bold text-slate-100 mb-4">
            Ventas del período visible
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            {sales.length} registros · Importe vigente:
            <br />
            <strong className="text-emerald-400">{money(net)}</strong>. Las
            anuladas no se suman.
          </p>
          <button
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-white/10 bg-white/5 text-slate-400 font-bold transition-all duration-200 hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={invalid}
            onClick={salesExport}
          >
            <Download size={16} />
            Exportar ventas CSV
          </button>
        </section>
        <section className="section-card p-6">
          <h2 className="text-sm font-bold text-slate-100 mb-4">
            Movimientos del período visible
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            {moves.length} movimientos con fecha, unidad, motivo, responsable y
            referencia de venta.
          </p>
          <button
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-white/10 bg-white/5 text-slate-400 font-bold transition-all duration-200 hover:border-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={invalid}
            onClick={movesExport}
          >
            <Download size={16} />
            Exportar movimientos CSV
          </button>
        </section>
        <section className="section-card p-6">
          <h2 className="text-sm font-bold text-slate-100 mb-4">
            Reglas del reporte
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Moneda USD. Fechas de El Salvador. Valor comercial = stock × precio
            de venta; no representa costo contable ni utilidad.
          </p>
          <p className="text-xs text-slate-400">
            Los CSV son exportaciones de consulta, no respaldos completos de la
            base de datos.
          </p>
        </section>

        <section className="section-card p-6 md:col-span-2">
          <h2 className="text-sm font-bold text-slate-100 mb-4">
            Compras y reabastecimiento
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Gasto total en entradas de inventario con costo registrado y precio
            promedio ponderado por unidad.
          </p>
          <PurchaseSummary moves={moves} products={data.products} />
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Fecha
                  </th>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Producto
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
                    Proveedor
                  </th>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Motivo
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchaseMovements.map((m) => {
                  const p = data.products.find((x) => x.id === m.product_id);
                  const partner = data.partners.find(
                    (x) => x.id === m.partner_id,
                  );
                  return (
                    <tr key={m.id} className="table-row">
                      <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                        {date(m.created_at)}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-700 font-bold text-slate-100 text-base">
                        {p?.name}
                        <br />
                        <small className="text-slate-400 text-xs">
                          {p?.sku}
                        </small>
                      </td>
                      <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                        {m.quantity} {p?.unit}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                        {m.unit_cost ? money(m.unit_cost) : "—"}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                        {m.unit_cost ? money(m.quantity * m.unit_cost) : "—"}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                        {partner?.name || "—"}
                      </td>
                      <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                        {m.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}

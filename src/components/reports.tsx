"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { csv } from "@/lib/domain";
import { useStore } from "./provider";
import { Heading, download, money, quantity, date, Empty } from "./shared";
import s from "./ui.module.css";
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
      <div className={s.notice}>
        Ventas y movimientos: hasta los 200 registros más recientes de cada
        tipo. Los filtros y CSV se aplican a esos registros, no a todo el
        historial. Existencias exporta el catálogo cargado. Para un cierre
        histórico completo, consulta la base de datos.
      </div>
      <div className={s.toolbar}>
        <label>
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button
          className={s.secondary}
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          Limpiar fechas
        </button>
      </div>
      {invalid && (
        <p className={s.notice} role="alert">
          La fecha inicial no puede ser posterior a la final.
        </p>
      )}
      <div className={s.reportCards}>
        <section className={`${s.card} ${s.cardPad}`}>
          <h2>Existencias actuales</h2>
          <p>
            Productos activos e inactivos, presentación, unidad, existencia y
            mínimo. No suma unidades incompatibles.
          </p>
          <button className={s.secondary} onClick={stockExport}>
            <Download size={15} />
            Exportar existencias CSV
          </button>
        </section>
        <section className={`${s.card} ${s.cardPad}`}>
          <h2>Ventas del período visible</h2>
          <p>
            {sales.length} registros · Importe vigente:{" "}
            <strong>{money(net)}</strong>. Las anuladas no se suman.
          </p>
          <button
            className={s.secondary}
            disabled={invalid}
            onClick={salesExport}
          >
            <Download size={15} />
            Exportar ventas CSV
          </button>
        </section>
        <section className={`${s.card} ${s.cardPad}`}>
          <h2>Movimientos del período visible</h2>
          <p>
            {moves.length} movimientos con fecha, unidad, motivo, responsable y
            referencia de venta.
          </p>
          <button
            className={s.secondary}
            disabled={invalid}
            onClick={movesExport}
          >
            <Download size={15} />
            Exportar movimientos CSV
          </button>
        </section>
        <section className={`${s.card} ${s.cardPad}`}>
          <h2>Reglas del reporte</h2>
          <p>
            Moneda USD. Fechas de El Salvador. Valor comercial = stock × precio
            de venta; no representa costo contable ni utilidad.
          </p>
          <p>
            Los CSV son exportaciones de consulta, no respaldos completos de la
            base de datos.
          </p>
        </section>
      </div>
    </>
  );
}

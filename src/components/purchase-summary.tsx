import { summarizePurchases } from "@/lib/purchases";
import type { Movement, Product } from "@/lib/domain";
import { money, quantity } from "./shared";
export function PurchaseSummary({
  moves,
  products,
}: {
  moves: Movement[];
  products: Product[];
}) {
  const summary = summarizePurchases(moves, products);
  return (
    <div className="section-card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-bold">Compras por producto y unidad</h2>
        <strong className="text-emerald-400">
          Importe visible: {money(summary.total)}
        </strong>
      </div>
      <p className="text-xs text-slate-400 mb-4">
        Entradas con costo, según los filtros y el historial cargado (hasta 200
        movimientos). No es un cierre contable. No se suman sacos, kg o litros
        entre sí.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-[580px] w-full text-sm">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Importe</th>
              <th>Costo promedio / unidad</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.map((g) => (
              <tr key={g.product_id}>
                <td>{g.name}</td>
                <td>
                  {quantity(g.quantity)} {g.unit}
                </td>
                <td>{money(g.spend)}</td>
                <td>
                  {money(g.average)} / {g.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!summary.rows.length && (
          <p className="py-6 text-slate-400">
            No hay entradas con costo dentro de los registros visibles.
          </p>
        )}
      </div>
    </div>
  );
}

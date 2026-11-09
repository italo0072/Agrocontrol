"use client";
import { useRef, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { can, commandSchema, userError } from "@/lib/domain";
import { useStore } from "./provider";
import { Heading, Notice, Empty, quantity, date, Badge, money } from "./shared";
export function Inventory() {
  const { data, busy, execute } = useStore();
  const [open, setOpen] = useState(false),
    [filter, setFilter] = useState(""),
    [product_id, setProduct] = useState(""),
    [direction, setDirection] = useState("entrada"),
    [amount, setAmount] = useState(""),
    [reason, setReason] = useState(""),
    [supplier, setSupplier] = useState(""),
    [unit_cost, setUnitCost] = useState(""),
    [message, setMessage] = useState("");
  const request = useRef<string | null>(null);
  if (!data) return null;
  const selected = data.products.find((p) => p.id === product_id),
    list = data.movements.filter((m) => !filter || m.product_id === filter);
  const purchaseMoves = data.movements.filter(
    (m) => m.kind === "entrada" && m.unit_cost != null && m.unit_cost > 0,
  );
  const totalPurchaseSpend = purchaseMoves.reduce(
    (sum, m) => sum + m.quantity * (m.unit_cost || 0),
    0,
  );
  const totalPurchaseQty = purchaseMoves.reduce((sum, m) => sum + m.quantity, 0);
  const totalPurchaseUnit = purchaseMoves.length > 0
    ? data.products.find((p) => p.id === purchaseMoves[0].product_id)?.unit
    : "";
  const avgPurchaseCost = totalPurchaseQty > 0 ? totalPurchaseSpend / totalPurchaseQty : 0;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      request.current ??= crypto.randomUUID();
      const c = commandSchema.parse({
        type: "movement",
        request_id: request.current,
        product_id,
        direction,
        quantity: amount ? Number(amount) : 0,
        reason,
        partner_id: supplier,
        unit_cost: unit_cost ? Number(unit_cost) : undefined,
      });
      await execute(c);
      request.current = null;
      setOpen(false);
      setAmount("");
      setReason("");
      setUnitCost("");
      setMessage("Movimiento registrado. Existencias actualizadas.");
    } catch (e) {
      setMessage(userError(e));
    }
  }
  return (
    <>
      <Heading
        eyebrow="TRAZABILIDAD DE EXISTENCIAS"
        title="Inventario"
        description="Cada entrada y salida queda registrada con su responsable."
      >
        {can(data.role, "movement") && (
          <button
            className="btn-primary"
            onClick={() => {
              setOpen((v) => !v);
              setMessage("");
              setUnitCost("");
              request.current = null;
            }}
          >
            <Plus size={18} className="mr-2" />
            Registrar movimiento
          </button>
        )}
      </Heading>
      <Notice message={message} />
      {open && (
        <section className="section-card">
          <h2 className="text-xl font-bold text-slate-100 mb-6">
            Movimiento manual
          </h2>
          <form
            onSubmit={submit}
            onChange={() => {
              request.current = null;
            }}
          >
            <div className="grid grid-cols-2 gap-6">
              <label className="flex flex-col gap-2 text-sm font-bold text-slate-500">
                Producto *
                <select
                  required
                  className="select-pro"
                  value={product_id}
                  onChange={(e) => setProduct(e.target.value)}
                >
                  <option value="">Selecciona…</option>
                  {data.products
                    .filter((p) => p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} · {p.name} ({quantity(p.stock)} {p.unit})
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-bold text-slate-500">
                Tipo
                <select
                  className="select-pro"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                >
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida / ajuste por pérdida</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-bold text-slate-500">
                Cantidad {selected ? `(${selected.unit})` : ""} *
                <input
                  type="text"
                  inputMode="decimal"
                  step="0.001"
                  min="0.001"
                  max="1000000"
                  required
                  className="input-pro"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-bold text-slate-500">
                Proveedor (opcional)
                <select
                  className="select-pro"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                >
                  <option value="">Sin proveedor</option>
                  {data.partners
                    .filter((p) => p.kind === "proveedor" && p.active)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-bold text-slate-500 col-span-2">
                Motivo / referencia *
                <input
                  required
                  maxLength={250}
                  placeholder="Ej. Compra OC-102 o ajuste por daño"
                  className="input-pro"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              {direction === "entrada" && (
                <label className="flex flex-col gap-2 text-sm font-bold text-slate-500">
                  Costo por unidad (USD)
                  <input
                    type="text"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    max="1000000"
                    className="input-pro"
                    value={unit_cost}
                    onChange={(e) =>
                      setUnitCost(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                  />
                </label>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Registra las ventas desde Ventas para evitar descontarlas dos
              veces. No se convierten sacos a kilogramos automáticamente.
            </p>
            <div className="flex gap-4 justify-end mt-7 flex-wrap">
              <button
                type="button"
                className="btn-secondary"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setUnitCost("");
                }}
              >
                Cancelar
              </button>
              <button disabled={busy} className="btn-primary">
                {busy ? "Registrando…" : "Confirmar movimiento"}
              </button>
            </div>
          </form>
        </section>
      )}
      {/* Resumen de costo de compras */}
      <section className="section-card">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between gap-5 pb-3">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Costo de compras (entradas con costo)</h2>
          <span className="text-xs text-slate-500">Solo movimientos de tipo Entrada con costo registrado</span>
        </div>
        <div className="grid grid-cols-3 gap-4 p-4">
          <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Gasto total en compras</div>
            <div className="text-2xl font-bold text-emerald-400">
              {money(totalPurchaseSpend)}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Unidades compradas</div>
            <div className="text-2xl font-bold text-slate-100">
              {totalPurchaseQty} {totalPurchaseUnit}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40">
            <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Costo promedio por unidad</div>
            <div className="text-2xl font-bold text-amber-400">
              {money(avgPurchaseCost)}
            </div>
          </div>
        </div>
      </section>
      <div className="flex items-end gap-4 flex-wrap mb-7">
        <label className="flex-1 min-w-[200px] max-w-[440px] flex flex-col gap-2">
          <span className="text-xs text-slate-500">Filtrar producto</span>
          <select
            className="select-pro"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Todos los productos</option>
            {data.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-500 self-end">
          Historial reciente: hasta 200 movimientos. Se conserva el historial
          completo en la base de datos.
        </p>
      </div>
      <section className="section-card overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between gap-5">
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Movimientos de inventario</h2>
          <span className="text-xs text-slate-500">{list.length} registros visibles</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full border-collapse">
            <thead>
              <tr>
                <th className="table-header-cell px-5 py-4 text-left">Fecha / Responsable</th>
                <th className="table-header-cell px-5 py-4 text-left">Producto</th>
                <th className="table-header-cell px-5 py-4 text-left">Tipo</th>
                <th className="table-header-cell px-5 py-4 text-left">Cantidad</th>
                <th className="table-header-cell px-5 py-4 text-left">Motivo</th>
                <th className="table-header-cell px-5 py-4 text-left">Proveedor</th>
                <th className="table-header-cell px-5 py-4 text-left">Costo unitario</th>
                <th className="table-header-cell px-5 py-4 text-left">Importe</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const p = data.products.find((x) => x.id === m.product_id);
                const partner = data.partners.find((x) => x.id === m.partner_id);
                const unitCost = m.unit_cost ?? null;
                const importTotal = unitCost != null ? m.quantity * unitCost : null;
                return (
                  <tr key={m.id} className="table-row">
                    <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                      {date(m.created_at)}
                      <br />
                      <small className="text-slate-500 text-xs">{m.actor}</small>
                    </td>
                    <td className="px-5 py-4 border-b border-slate-700 font-bold text-slate-100 text-base">
                      {p?.name || m.product_id}
                      <br />
                      <small className="text-slate-500 text-xs">{p?.sku}</small>
                    </td>
                    <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                      <Badge warn={m.quantity < 0}>{m.kind}</Badge>
                    </td>
                    <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                      {m.quantity > 0 ? "+" : ""}
                      {quantity(m.quantity)} {p?.unit}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                      {m.reason}
                      {m.sale_id && (
                        <small className="text-slate-500 text-xs block mt-1">
                          Venta: {m.sale_id.slice(0, 8)}
                        </small>
                      )}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                      {partner?.name || "—"}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                      {unitCost != null ? money(unitCost) : "—"}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                      {importTotal != null ? money(importTotal) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <Empty>Aún no hay movimientos para este producto.</Empty>
        )}
      </section>
    </>
  );
}

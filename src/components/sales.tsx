"use client";
import { useRef, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  can,
  commandSchema,
  userError,
  lineTotal,
  type Sale,
} from "@/lib/domain";
import { useStore } from "./provider";
import { Heading, Empty, Notice, Badge, money, quantity, date } from "./shared";
function SaleForm({ close }: { close: () => void }) {
  const { data, busy, execute } = useStore();
  const [customer, setCustomer] = useState(""),
    [notes, setNotes] = useState(""),
    [items, setItems] = useState<
      {
        product_id: string;
        quantity: string | number;
      }[]
    >([{ product_id: "", quantity: "" }]),
    [error, setError] = useState("");
  const req = useRef<string | null>(null);
  if (!data) return null;
  const total = items.reduce(
    (sum, i) =>
      sum +
      lineTotal(
        i.quantity ? Number(i.quantity) : 0,
        data.products.find((p) => p.id === i.product_id)?.price || 0,
      ),
    0,
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      req.current ??= crypto.randomUUID();
      await execute(
        commandSchema.parse({
          type: "sale",
          request_id: req.current,
          customer_id: customer,
          notes,
          items: items.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity ? Number(i.quantity) : 0,
          })),
        }),
      );
      close();
    } catch (e) {
      setError(userError(e));
    }
  }
  return (
    <section className="section-card">
      <h2 className="text-xl font-bold text-slate-100 mb-6">Nueva venta</h2>
      <form
        onSubmit={submit}
        onChange={() => {
          req.current = null;
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Cliente *
            <select
              required
              className="select-pro"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            >
              <option value="">Selecciona un cliente…</option>
              {data.partners
                .filter((p) => p.active && p.kind === "cliente")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Referencia / Notas
            <input
              maxLength={500}
              className="input-pro"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>
        <hr className="border-slate-700 my-5" />
        {items.map((i, index) => {
          const product = data.products.find((p) => p.id === i.product_id);
          return (
            <div
              className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end mb-4"
              key={index}
            >
              <div className="sm:col-span-6">
                <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
                  Producto *
                  <select
                    required
                    className="select-pro"
                    value={i.product_id}
                    onChange={(e) =>
                      setItems(
                        items.map((v, n) =>
                          n === index
                            ? { ...v, product_id: e.target.value }
                            : v,
                        ),
                      )
                    }
                  >
                    <option value="">Selecciona…</option>
                    {data.products
                      .filter((p) => p.active)
                      .map((p) => (
                        <option
                          disabled={items.some(
                            (v, n) => n !== index && v.product_id === p.id,
                          )}
                          key={p.id}
                          value={p.id}
                        >
                          {p.name} · {money(p.price)} / {p.unit} · disponible{" "}
                          {quantity(p.stock)}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="sm:col-span-3">
                <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
                  Cantidad {product?.unit}
                  <input
                    type="text"
                    inputMode="decimal"
                    required
                    min="0.001"
                    max="1000000"
                    step="0.001"
                    className="input-pro"
                    value={i.quantity}
                    onChange={(e) =>
                      setItems(
                        items.map((v, n) =>
                          n === index
                            ? {
                                ...v,
                                quantity: e.target.value.replace(
                                  /[^0-9.]/g,
                                  "",
                                ),
                              }
                            : v,
                        ),
                      )
                    }
                  />
                </label>
              </div>
              <div className="sm:col-span-2 flex items-end">
                <div className="text-base font-bold text-emerald-400">
                  {money(
                    lineTotal(
                      i.quantity ? Number(i.quantity) : 0,
                      product?.price || 0,
                    ),
                  )}
                </div>
              </div>
              <div className="sm:col-span-1 flex items-end">
                <button
                  type="button"
                  className="p-2.5 rounded-xl border-transparent bg-transparent text-slate-400 hover:bg-white/5 hover:text-emerald-400 hover:border-emerald-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label={`Quitar producto ${index + 1}`}
                  disabled={items.length === 1 || busy}
                  onClick={() => {
                    setItems(items.filter((_, n) => n !== index));
                    req.current = null;
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
        <button
          type="button"
          className="btn-secondary"
          disabled={items.length >= 30 || busy}
          onClick={() => {
            setItems([...items, { product_id: "", quantity: "" }]);
            req.current = null;
          }}
        >
          <Plus size={16} className="mr-2" />
          Agregar producto
        </button>
        <div className="text-right p-5 bg-emerald-500/5 rounded-xl mt-5 border border-emerald-500/10">
          <span className="text-xs text-slate-400 block">
            Total estimado USD
          </span>
          <strong className="text-2xl font-bold text-emerald-400 block">
            {money(total)}
          </strong>
          <small className="text-slate-400 text-xs">
            Se confirma con los precios vigentes en el servidor. Sin impuestos
            ni descuentos.
          </small>
        </div>
        <Notice message={error} />
        <div className="flex gap-4 justify-end mt-7 flex-wrap">
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={close}
          >
            Cancelar
          </button>
          <button disabled={busy} className="btn-primary">
            {busy ? "Procesando…" : "Registrar venta y descontar stock"}
          </button>
        </div>
      </form>
    </section>
  );
}
function SaleCard({ sale }: { sale: Sale }) {
  const { execute, busy, data } = useStore();
  const [open, setOpen] = useState(false),
    [reason, setReason] = useState(""),
    [error, setError] = useState("");
  async function cancel(e: FormEvent) {
    e.preventDefault();
    if (!confirm("¿Anular esta venta y devolver las existencias?")) return;
    try {
      await execute({ type: "cancel", sale_id: sale.id, reason });
      setReason("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <article className="card-pro">
      <div className="p-5 border-b border-slate-700 flex items-center justify-between gap-5 flex-wrap">
        <div>
          <h3 className="font-bold text-slate-100 text-base">
            {sale.customer_name}
          </h3>
          <small className="text-slate-400 block text-sm">
            {sale.id.slice(0, 8).toUpperCase()} · {date(sale.created_at)}
          </small>
        </div>
        <Badge inactive={sale.status === "anulada"}>{sale.status}</Badge>
        <strong className="text-emerald-400 font-bold text-xl">
          {money(sale.total)}
        </strong>
        <button
          className="p-2.5 rounded-xl border-transparent bg-transparent text-slate-400 hover:bg-white/5 hover:text-emerald-400 hover:border-emerald-500/20 transition-all duration-200"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Ocultar" : "Ver detalle"}
        </button>
      </div>
      {open && (
        <div className="p-5 bg-slate-800/30 border-t border-slate-700">
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Producto
                  </th>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Cantidad
                  </th>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Precio unitario
                  </th>
                  <th className="table-header-cell px-5 py-4 text-left">
                    Importe
                  </th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((i) => (
                  <tr key={i.product_id} className="table-row">
                    <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                      {i.product_name}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                      {quantity(i.quantity)} {i.unit}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                      {money(i.unit_price)}
                    </td>
                    <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                      {money(lineTotal(i.quantity, i.unit_price))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mb-2">Registró: {sale.actor}</p>
          {sale.notes && (
            <p className="text-xs text-slate-400 mb-2">Notas: {sale.notes}</p>
          )}
          {sale.cancel_reason && (
            <p className="text-xs text-slate-400 mb-2">
              Motivo de anulación: {sale.cancel_reason}
            </p>
          )}
          {sale.status === "vigente" && data && can(data.role, "cancel") && (
            <form className="flex flex-col gap-3 mt-4" onSubmit={cancel}>
              <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
                Motivo de anulación
                <input
                  required
                  maxLength={250}
                  className="input-pro"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button disabled={busy} className="btn-danger">
                Anular y devolver stock
              </button>
            </form>
          )}
          <Notice message={error} />
        </div>
      )}
    </article>
  );
}
export function Sales() {
  const { data } = useStore();
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("");
  if (!data) return null;
  const filtered = data.sales.filter(
    (x) =>
      (!status || x.status === status) &&
      `${x.customer_name} ${x.id}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="OPERACIÓN COMERCIAL"
        title="Ventas"
        description="Registra cada venta y actualiza el inventario en una sola operación."
      >
        {can(data.role, "sale") && (
          <button className="btn-primary" onClick={() => setOpen((v) => !v)}>
            <Plus size={18} className="mr-2" />
            Nueva venta
          </button>
        )}
      </Heading>
      {open && <SaleForm close={() => setOpen(false)} />}
      <div className="flex items-end gap-4 flex-wrap mb-7">
        <label className="flex-1 min-w-[200px] max-w-[440px] flex flex-col gap-2">
          <span className="text-xs text-slate-400">Buscar cliente o venta</span>
          <input
            className="input-pro"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre o identificador…"
          />
        </label>
        <label className="flex-1 min-w-[200px] max-w-[440px] flex flex-col gap-2">
          <span className="text-xs text-slate-400">Estado</span>
          <select
            className="select-pro"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="vigente">Vigentes</option>
            <option value="anulada">Anuladas</option>
          </select>
        </label>
        <p className="text-xs text-slate-400 self-end">
          Últimas 200 ventas registradas.
        </p>
      </div>
      {filtered.map((sale) => (
        <SaleCard key={sale.id} sale={sale} />
      ))}
      {!filtered.length && (
        <section className="section-card">
          <Empty>
            No hay ventas con estos filtros. Crea un cliente y registra tu
            primera venta.
          </Empty>
        </section>
      )}
    </>
  );
}

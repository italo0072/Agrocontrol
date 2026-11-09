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
import s from "./ui.module.css";
function SaleForm({ close }: { close: () => void }) {
  const { data, busy, execute } = useStore();
  const [customer, setCustomer] = useState(""),
    [notes, setNotes] = useState(""),
    [items, setItems] = useState([{ product_id: "", quantity: 1 }]),
    [error, setError] = useState("");
  const req = useRef<string | null>(null);
  if (!data) return null;
  const total = items.reduce(
    (sum, i) =>
      sum +
      lineTotal(
        i.quantity,
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
          items,
        }),
      );
      close();
    } catch (e) {
      setError(userError(e));
    }
  }
  return (
    <section className={`${s.card} ${s.cardPad}`}>
      <h2>Nueva venta</h2>
      <form
        onSubmit={submit}
        onChange={() => {
          req.current = null;
        }}
      >
        <div className={s.formGrid}>
          <label>
            Cliente *
            <select
              required
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
          <label>
            Referencia / Notas
            <input
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>
        <hr />
        {items.map((i, index) => {
          const product = data.products.find((p) => p.id === i.product_id);
          return (
            <div className={s.line} key={index}>
              <label>
                Producto *
                <select
                  required
                  value={i.product_id}
                  onChange={(e) =>
                    setItems(
                      items.map((v, n) =>
                        n === index ? { ...v, product_id: e.target.value } : v,
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
              <label>
                Cantidad {product?.unit}
                <input
                  type="number"
                  required
                  min="0.001"
                  max="1000000"
                  step="0.001"
                  value={i.quantity}
                  onChange={(e) =>
                    setItems(
                      items.map((v, n) =>
                        n === index
                          ? { ...v, quantity: Number(e.target.value) }
                          : v,
                      ),
                    )
                  }
                />
              </label>
              <div className={s.lineTotal}>
                {money(lineTotal(i.quantity, product?.price || 0))}
              </div>
              <button
                type="button"
                className={s.iconButton}
                aria-label={`Quitar producto ${index + 1}`}
                disabled={items.length === 1 || busy}
                onClick={() => {
                  setItems(items.filter((_, n) => n !== index));
                  req.current = null;
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className={s.secondary}
          disabled={items.length >= 30 || busy}
          onClick={() => {
            setItems([...items, { product_id: "", quantity: 1 }]);
            req.current = null;
          }}
        >
          <Plus size={14} />
          Agregar producto
        </button>
        <div className={s.total}>
          <span>Total estimado USD</span>
          <strong>{money(total)}</strong>
          <small>
            Se confirma con los precios vigentes en el servidor. Sin impuestos
            ni descuentos.
          </small>
        </div>
        <Notice message={error} />
        <div className={s.actions}>
          <button
            type="button"
            disabled={busy}
            className={s.secondary}
            onClick={close}
          >
            Cancelar
          </button>
          <button disabled={busy}>
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
    <article className={s.card}>
      <div className={s.saleHeader}>
        <div>
          <h3>{sale.customer_name}</h3>
          <small>
            {sale.id.slice(0, 8).toUpperCase()} · {date(sale.created_at)}
          </small>
        </div>
        <Badge inactive={sale.status === "anulada"}>{sale.status}</Badge>
        <strong>{money(sale.total)}</strong>
        <button
          className={s.inlineButton}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Ocultar" : "Ver detalle"}
        </button>
      </div>
      {open && (
        <div className={s.detail}>
          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((i) => (
                  <tr key={i.product_id}>
                    <td>{i.product_name}</td>
                    <td>
                      {quantity(i.quantity)} {i.unit}
                    </td>
                    <td>{money(i.unit_price)}</td>
                    <td>{money(lineTotal(i.quantity, i.unit_price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>Registró: {sale.actor}</p>
          {sale.notes && <p>Notas: {sale.notes}</p>}
          {sale.cancel_reason && (
            <p>Motivo de anulación: {sale.cancel_reason}</p>
          )}
          {sale.status === "vigente" && data && can(data.role, "cancel") && (
            <form className={s.toolbar} onSubmit={cancel}>
              <label>
                Motivo de anulación
                <input
                  required
                  maxLength={250}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button disabled={busy} className={s.danger}>
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
          <button onClick={() => setOpen((v) => !v)}>
            <Plus size={16} />
            Nueva venta
          </button>
        )}
      </Heading>
      {open && <SaleForm close={() => setOpen(false)} />}
      <div className={s.toolbar}>
        <label>
          Buscar cliente o venta
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre o identificador…"
          />
        </label>
        <label>
          Estado
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="vigente">Vigentes</option>
            <option value="anulada">Anuladas</option>
          </select>
        </label>
        <p>Últimas 200 ventas registradas.</p>
      </div>
      {filtered.map((sale) => (
        <SaleCard key={sale.id} sale={sale} />
      ))}
      {!filtered.length && (
        <section className={s.card}>
          <Empty>
            No hay ventas con estos filtros. Crea un cliente y registra tu
            primera venta.
          </Empty>
        </section>
      )}
    </>
  );
}

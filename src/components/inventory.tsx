"use client";
import { useRef, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { can, commandSchema, userError } from "@/lib/domain";
import { useStore } from "./provider";
import { Heading, Notice, Empty, quantity, date, Badge } from "./shared";
import s from "./ui.module.css";
export function Inventory() {
  const { data, busy, execute } = useStore();
  const [open, setOpen] = useState(false),
    [filter, setFilter] = useState(""),
    [product_id, setProduct] = useState(""),
    [direction, setDirection] = useState("entrada"),
    [amount, setAmount] = useState(""),
    [reason, setReason] = useState(""),
    [supplier, setSupplier] = useState(""),
    [message, setMessage] = useState("");
  const request = useRef<string | null>(null);
  if (!data) return null;
  const selected = data.products.find((p) => p.id === product_id),
    list = data.movements.filter((m) => !filter || m.product_id === filter);
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
        quantity: Number(amount),
        reason,
        partner_id: supplier,
      });
      await execute(c);
      request.current = null;
      setOpen(false);
      setAmount("");
      setReason("");
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
            onClick={() => {
              setOpen((v) => !v);
              setMessage("");
              request.current = null;
            }}
          >
            <Plus size={16} />
            Registrar movimiento
          </button>
        )}
      </Heading>
      <Notice message={message} />
      {open && (
        <section className={`${s.card} ${s.cardPad}`}>
          <h2>Movimiento manual</h2>
          <form
            onSubmit={submit}
            onChange={() => {
              request.current = null;
            }}
          >
            <div className={s.formGrid}>
              <label>
                Producto *
                <select
                  required
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
              <label>
                Tipo
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                >
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida / ajuste por pérdida</option>
                </select>
              </label>
              <label>
                Cantidad {selected ? `(${selected.unit})` : ""} *
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max="1000000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label>
                Proveedor (opcional)
                <select
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
              <label className={s.full}>
                Motivo / referencia *
                <input
                  required
                  maxLength={250}
                  placeholder="Ej. Compra OC-102 o ajuste por daño"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
            </div>
            <p className={s.muted}>
              Registra las ventas desde Ventas para evitar descontarlas dos
              veces. No se convierten sacos a kilogramos automáticamente.
            </p>
            <div className={s.actions}>
              <button
                type="button"
                className={s.secondary}
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              <button disabled={busy}>
                {busy ? "Registrando…" : "Confirmar movimiento"}
              </button>
            </div>
          </form>
        </section>
      )}
      <div className={s.toolbar}>
        <label>
          Filtrar producto
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todos los productos</option>
            {data.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.name}
              </option>
            ))}
          </select>
        </label>
        <p>
          Historial reciente: hasta 200 movimientos. Se conserva el historial
          completo en la base de datos.
        </p>
      </div>
      <section className={s.card}>
        <div className={s.cardTitle}>
          <h2>Movimientos de inventario</h2>
          <span>{list.length} registros visibles</span>
        </div>
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Fecha / Responsable</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Motivo / Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const p = data.products.find((x) => x.id === m.product_id);
                return (
                  <tr key={m.id}>
                    <td>
                      {date(m.created_at)}
                      <small>{m.actor}</small>
                    </td>
                    <td className={s.productName}>
                      {p?.name || m.product_id}
                      <small>{p?.sku}</small>
                    </td>
                    <td>
                      <Badge warn={m.quantity < 0}>{m.kind}</Badge>
                    </td>
                    <td>
                      {m.quantity > 0 ? "+" : ""}
                      {quantity(m.quantity)} {p?.unit}
                    </td>
                    <td>
                      {m.reason}
                      <small>
                        {data.partners.find((p) => p.id === m.partner_id)?.name}
                      </small>
                      {m.sale_id && (
                        <small>Venta: {m.sale_id.slice(0, 8)}</small>
                      )}
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

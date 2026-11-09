"use client";
import { useState, type FormEvent } from "react";
import { Plus, Search } from "lucide-react";
import { ZodError } from "zod";
import {
  categories,
  units,
  commandSchema,
  can,
  type Product,
  type Partner,
} from "@/lib/domain";
import { useStore } from "./provider";
import { Heading, Empty, Badge, Notice, money, quantity } from "./shared";
import s from "./ui.module.css";
const errorText = (e: unknown) =>
  e instanceof ZodError
    ? e.issues[0].message
    : e instanceof Error
      ? e.message
      : "No se pudo guardar.";
function ProductForm({
  initial,
  onClose,
}: {
  initial?: Product;
  onClose: (saved?: boolean) => void;
}) {
  const { execute, busy } = useStore();
  const [form, setForm] = useState({
      id: initial?.id,
      sku: initial?.sku || "",
      name: initial?.name || "",
      category: initial?.category || "Compuesto",
      unit: initial?.unit || "saco",
      presentation: initial?.presentation || "",
      price: initial?.price ?? 0,
      min_stock: initial?.min_stock ?? 0,
      active: initial?.active ?? true,
    }),
    [message, setMessage] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      await execute(commandSchema.parse({ type: "product", data: form }));
      onClose(true);
    } catch (e) {
      setMessage(errorText(e));
    }
  }
  return (
    <section className={`${s.card} ${s.cardPad}`}>
      <div className={s.formTitle}>
        <h2>{initial ? "Editar producto" : "Nuevo producto"}</h2>
        <span className={s.muted}>* Campos obligatorios</span>
      </div>
      <form onSubmit={submit}>
        <div className={s.formGrid}>
          <label>
            Código único *
            <input
              required
              maxLength={40}
              pattern="[A-Za-z0-9_-]+"
              placeholder="FER-001"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </label>
          <label>
            Nombre *
            <input
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Categoría
            <select
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value as typeof form.category,
                })
              }
            >
              {categories.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Unidad de inventario
            <select
              value={form.unit}
              onChange={(e) =>
                setForm({ ...form, unit: e.target.value as typeof form.unit })
              }
            >
              {units.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Presentación *
            <input
              required
              maxLength={80}
              placeholder="Saco de 50 kg"
              value={form.presentation}
              onChange={(e) =>
                setForm({ ...form, presentation: e.target.value })
              }
            />
          </label>
          <label>
            Precio de venta por unidad (USD) *
            <input
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              required
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Existencia mínima *
            <input
              type="number"
              min="0"
              max="1000000"
              step="0.001"
              required
              value={form.min_stock}
              onChange={(e) =>
                setForm({ ...form, min_stock: Number(e.target.value) })
              }
            />
          </label>
          <label className={s.check}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Producto activo
          </label>
        </div>
        <p className={s.muted}>
          El stock se modifica desde Inventario o Ventas. La unidad queda
          protegida cuando existen movimientos.
        </p>
        <Notice message={message} />
        <div className={s.actions}>
          <button
            type="button"
            className={s.secondary}
            disabled={busy}
            onClick={() => onClose()}
          >
            Cancelar
          </button>
          <button disabled={busy}>
            {busy ? "Guardando…" : "Guardar producto"}
          </button>
        </div>
      </form>
    </section>
  );
}
export function Products() {
  const { data } = useStore();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [state, setState] = useState("activos"),
    [edit, setEdit] = useState<Product | "new" | null>(null),
    [notice, setNotice] = useState("");
  if (!data) return null;
  const filtered = data.products.filter(
    (p) =>
      (!category || p.category === category) &&
      (state === "todos" || (state === "activos" ? p.active : !p.active)) &&
      `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="CATÁLOGO ESTANDARIZADO"
        title="Productos"
        description="Un código, una presentación y una unidad para cada producto."
      >
        {can(data.role, "product") && (
          <button
            onClick={() => {
              setNotice("");
              setEdit("new");
            }}
          >
            <Plus size={16} />
            Nuevo producto
          </button>
        )}
      </Heading>
      <Notice message={notice} success />
      {edit && (
        <ProductForm
          key={edit === "new" ? "new" : edit.id}
          initial={edit === "new" ? undefined : edit}
          onClose={(saved) => {
            setEdit(null);
            setNotice(saved ? "Producto guardado correctamente." : "");
          }}
        />
      )}
      <div className={s.toolbar}>
        <label>
          Buscar producto
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Código o nombre…"
          />
        </label>
        <label>
          Categoría
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas</option>
            {categories.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label>
          Visibilidad
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </label>
      </div>
      <section className={s.card}>
        <div className={s.cardTitle}>
          <h2>Catálogo de productos</h2>
          <span>{filtered.length} productos</span>
        </div>
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Código / Producto</th>
                <th>Categoría</th>
                <th>Presentación</th>
                <th>Precio</th>
                <th>Existencia</th>
                <th>Estado</th>
                {can(data.role, "product") && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className={s.code}>{p.sku}</span>
                    <div className={s.productName}>{p.name}</div>
                  </td>
                  <td>{p.category}</td>
                  <td>
                    {p.presentation}
                    <small>Unidad: {p.unit}</small>
                  </td>
                  <td>{money(p.price)}</td>
                  <td>
                    {quantity(p.stock)} {p.unit}
                  </td>
                  <td>
                    <Badge
                      inactive={!p.active}
                      warn={p.active && p.stock <= p.min_stock}
                    >
                      {!p.active
                        ? "Inactivo"
                        : p.stock <= p.min_stock
                          ? "Stock bajo"
                          : "Disponible"}
                    </Badge>
                  </td>
                  {can(data.role, "product") && (
                    <td>
                      <button
                        className={s.inlineButton}
                        onClick={() => {
                          setNotice("");
                          setEdit(p);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty>
            No hay productos con estos filtros. Registra uno para comenzar.
          </Empty>
        )}
      </section>
    </>
  );
}
function PartnerForm({
  initial,
  onClose,
}: {
  initial?: Partner;
  onClose: () => void;
}) {
  const { execute, busy } = useStore();
  const [form, setForm] = useState({
      id: initial?.id,
      name: initial?.name || "",
      kind: initial?.kind || "cliente",
      document: initial?.document || "",
      email: initial?.email || "",
      phone: initial?.phone || "",
      active: initial?.active ?? true,
    }),
    [message, setMessage] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await execute(commandSchema.parse({ type: "partner", data: form }));
      onClose();
    } catch (e) {
      setMessage(errorText(e));
    }
  }
  return (
    <section className={`${s.card} ${s.cardPad}`}>
      <h2>{initial ? "Editar contacto" : "Nuevo contacto"}</h2>
      <form onSubmit={submit}>
        <div className={s.formGrid}>
          <label>
            Nombre o razón social *
            <input
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Tipo
            <select
              disabled={Boolean(initial)}
              value={form.kind}
              onChange={(e) =>
                setForm({ ...form, kind: e.target.value as typeof form.kind })
              }
            >
              <option value="cliente">Cliente</option>
              <option value="proveedor">Proveedor</option>
            </select>
          </label>
          <label>
            Documento / Identificador
            <input
              maxLength={40}
              value={form.document}
              onChange={(e) => setForm({ ...form, document: e.target.value })}
            />
          </label>
          <label>
            Correo
            <input
              type="email"
              maxLength={254}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Teléfono
            <input
              maxLength={30}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className={s.check}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            Contacto activo
          </label>
        </div>
        <Notice message={message} />
        <div className={s.actions}>
          <button
            type="button"
            className={s.secondary}
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button disabled={busy}>
            {busy ? "Guardando…" : "Guardar contacto"}
          </button>
        </div>
      </form>
    </section>
  );
}
export function Contacts() {
  const { data } = useStore();
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState(""),
    [edit, setEdit] = useState<Partner | "new" | null>(null);
  if (!data) return null;
  const filtered = data.partners.filter(
    (p) =>
      (!kind || p.kind === kind) &&
      `${p.name} ${p.document}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="RELACIONES COMERCIALES"
        title="Clientes y proveedores"
        description="Una ficha consistente para cada contacto de tu empresa."
      >
        {can(data.role, "partner") && (
          <button onClick={() => setEdit("new")}>
            <Plus size={16} />
            Nuevo contacto
          </button>
        )}
      </Heading>
      {edit && (
        <PartnerForm
          key={edit === "new" ? "new" : edit.id}
          initial={edit === "new" ? undefined : edit}
          onClose={() => setEdit(null)}
        />
      )}
      <div className={s.toolbar}>
        <label>
          Buscar contacto
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre o documento…"
          />
        </label>
        <label>
          Tipo
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">Todos</option>
            <option value="cliente">Clientes</option>
            <option value="proveedor">Proveedores</option>
          </select>
        </label>
      </div>
      <section className={s.card}>
        <div className={s.cardTitle}>
          <h2>Directorio comercial</h2>
          <span>{filtered.length} contactos</span>
        </div>
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Contacto</th>
                <th>Estado</th>
                {can(data.role, "partner") && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className={s.productName}>{p.name}</td>
                  <td>{p.kind}</td>
                  <td>{p.document || "—"}</td>
                  <td>
                    {p.email || "—"}
                    <small>{p.phone}</small>
                  </td>
                  <td>
                    <Badge inactive={!p.active}>
                      {p.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  {can(data.role, "partner") && (
                    <td>
                      <button
                        className={s.inlineButton}
                        onClick={() => {
                          setEdit(p);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Editar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty>No hay contactos registrados con estos filtros.</Empty>
        )}
      </section>
    </>
  );
}

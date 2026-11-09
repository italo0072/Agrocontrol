"use client";
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { ZodError } from "zod";
import {
  units,
  commandSchema,
  can,
  numericDraft,
  requiredNumber,
  type Product,
  type Partner,
} from "@/lib/domain";
import { useStore } from "./provider";
import { Heading, Empty, Badge, Notice, money, quantity } from "./shared";
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
  const { execute, busy, data } = useStore();
  const [form, setForm] = useState({
      id: initial?.id,
      sku: initial?.sku || "",
      name: initial?.name || "",
      category: initial?.category || "",
      unit: initial?.unit || "saco",
      presentation: initial?.presentation || "",
      price: initial?.price?.toString() ?? "",
      min_stock: initial?.min_stock?.toString() ?? "",
      active: initial?.active ?? true,
    }),
    [message, setMessage] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      await execute(
        commandSchema.parse({
          type: "product",
          data: {
            ...form,
            price: requiredNumber(form.price, "Precio"),
            min_stock: requiredNumber(form.min_stock, "Mínimo"),
          },
        }),
      );
      onClose(true);
    } catch (e) {
      setMessage(errorText(e));
    }
  }
  return (
    <section className="section-card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-100">
          {initial ? "Editar producto" : "Nuevo producto"}
        </h2>
        <span className="text-xs text-slate-400">* Campos obligatorios</span>
      </div>
      <form onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Código único *
            <input
              required
              maxLength={40}
              pattern="[A-Za-z0-9_-]+"
              placeholder="FER-001"
              className="input-pro"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Nombre *
            <input
              required
              maxLength={120}
              className="input-pro"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Categoría
            <select
              className="select-pro"
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value as typeof form.category,
                })
              }
            >
              <option value="">Selecciona…</option>
              {data?.categories
                .filter((c) => c.active || c.name === form.category)
                .map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                    {!c.active ? " (inactiva)" : ""}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Unidad de inventario
            <select
              className="select-pro"
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
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Presentación *
            <input
              required
              maxLength={80}
              placeholder="Saco de 50 kg"
              className="input-pro"
              value={form.presentation}
              onChange={(e) =>
                setForm({ ...form, presentation: e.target.value })
              }
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Precio de venta por unidad (USD) *
            <input
              type="text"
              inputMode="decimal"
              min="0"
              max="1000000"
              step="0.01"
              required
              className="input-pro"
              value={form.price}
              onChange={(e) =>
                setForm({ ...form, price: numericDraft(e.target.value) })
              }
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Existencia mínima *
            <input
              type="text"
              inputMode="decimal"
              min="0"
              max="1000000"
              step="0.001"
              required
              className="input-pro"
              value={form.min_stock}
              onChange={(e) =>
                setForm({ ...form, min_stock: numericDraft(e.target.value) })
              }
            />
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-900"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <span className="text-slate-300 text-base">Producto activo</span>
          </label>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          El stock se modifica desde Inventario o Ventas. La unidad queda
          protegida cuando existen movimientos.
        </p>
        <Notice message={message} />
        <div className="flex gap-4 justify-end mt-7 flex-wrap">
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => onClose()}
          >
            Cancelar
          </button>
          <button disabled={busy} className="btn-primary">
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
            className="btn-primary"
            onClick={() => {
              setNotice("");
              setEdit("new");
            }}
          >
            <Plus size={18} className="mr-2" />
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
      <div className="flex items-end gap-4 flex-wrap mb-7">
        <label className="flex-1 min-w-[200px] max-w-[440px] flex flex-col gap-2">
          <span className="text-xs text-slate-400">Buscar producto</span>
          <input
            className="input-pro"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Código o nombre…"
          />
        </label>
        <label className="flex-1 min-w-[200px] max-w-[440px] flex flex-col gap-2">
          <span className="text-xs text-slate-400">Categoría</span>
          <select
            className="select-pro"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 min-w-[200px] max-w-[440px] flex flex-col gap-2">
          <span className="text-xs text-slate-400">Visibilidad</span>
          <select
            className="select-pro"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </label>
      </div>
      <section className="section-card overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between gap-5">
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Catálogo de productos
          </h2>
          <span className="text-xs text-slate-400">
            {filtered.length} productos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full border-collapse">
            <thead>
              <tr>
                <th className="table-header-cell px-5 py-4 text-left">
                  Código / Producto
                </th>
                <th className="table-header-cell px-5 py-4 text-left">
                  Categoría
                </th>
                <th className="table-header-cell px-5 py-4 text-left">
                  Presentación
                </th>
                <th className="table-header-cell px-5 py-4 text-left">
                  Precio
                </th>
                <th className="table-header-cell px-5 py-4 text-left">
                  Existencia
                </th>
                <th className="table-header-cell px-5 py-4 text-left">
                  Estado
                </th>
                {can(data.role, "product") && (
                  <th className="table-header-cell px-5 py-4 text-left">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="px-5 py-4 border-b border-slate-700 font-bold text-slate-100 text-base">
                    <span className="text-xs text-slate-400 font-mono bg-slate-900/50 px-2.5 py-1 rounded border border-slate-700 inline-block">
                      {p.sku}
                    </span>
                    <div className="text-slate-100">{p.name}</div>
                  </td>
                  <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                    {p.category}
                  </td>
                  <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                    {p.presentation}
                    <br />
                    <small className="text-slate-400 text-xs">
                      Unidad: {p.unit}
                    </small>
                  </td>
                  <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                    {money(p.price)}
                  </td>
                  <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                    {quantity(p.stock)} {p.unit}
                  </td>
                  <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
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
                    <td className="px-5 py-4 border-b border-slate-700 text-base">
                      <button
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors"
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
    <section className="section-card">
      <h2 className="text-xl font-bold text-slate-100 mb-6">
        {initial ? "Editar contacto" : "Nuevo contacto"}
      </h2>
      <form onSubmit={submit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Nombre o razón social *
            <input
              required
              maxLength={120}
              className="input-pro"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Tipo
            <select
              disabled={Boolean(initial)}
              className="select-pro"
              value={form.kind}
              onChange={(e) =>
                setForm({ ...form, kind: e.target.value as typeof form.kind })
              }
            >
              <option value="cliente">Cliente</option>
              <option value="proveedor">Proveedor</option>
              <option value="productor">Productor</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Documento / Identificador
            <input
              maxLength={40}
              className="input-pro"
              value={form.document}
              onChange={(e) => setForm({ ...form, document: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Correo
            <input
              type="email"
              maxLength={254}
              className="input-pro"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-slate-400">
            Teléfono
            <input
              maxLength={30}
              className="input-pro"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-900"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
            />
            <span className="text-slate-300 text-base">Contacto activo</span>
          </label>
        </div>
        <Notice message={message} />
        <div className="flex gap-4 justify-end mt-7 flex-wrap">
          <button
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button disabled={busy} className="btn-primary">
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
          <button className="btn-primary" onClick={() => setEdit("new")}>
            <Plus size={18} className="mr-2" />
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
      <div className="flex items-end gap-4 flex-wrap mb-7">
        <label className="flex-1 min-w-[200px] max-w-[440px] flex flex-col gap-2">
          <span className="text-xs text-slate-400">Buscar contacto</span>
          <input
            className="input-pro"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre o documento…"
          />
        </label>
        <label className="flex-1 min-w-[200px] max-w-[440px] flex flex-col gap-2">
          <span className="text-xs text-slate-400">Tipo</span>
          <select
            className="select-pro"
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="cliente">Clientes</option>
            <option value="proveedor">Proveedores</option>
            <option value="productor">Productores</option>
          </select>
        </label>
      </div>
      <section className="section-card overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between gap-5">
          <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Directorio comercial
          </h2>
          <span className="text-xs text-slate-400">
            {filtered.length} contactos
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full border-collapse">
            <thead>
              <tr>
                <th className="table-header-cell px-5 py-4 text-left">
                  Nombre
                </th>
                <th className="table-header-cell px-5 py-4 text-left">Tipo</th>
                <th className="table-header-cell px-5 py-4 text-left">
                  Documento
                </th>
                <th className="table-header-cell px-5 py-4 text-left">
                  Contacto
                </th>
                <th className="table-header-cell px-5 py-4 text-left">
                  Estado
                </th>
                {can(data.role, "partner") && (
                  <th className="table-header-cell px-5 py-4 text-left">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="px-5 py-4 border-b border-slate-700 font-bold text-slate-100 text-base">
                    {p.name}
                  </td>
                  <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                    {p.kind}
                  </td>
                  <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                    {p.document || "—"}
                  </td>
                  <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                    {p.email || "—"}
                    <br />
                    <small className="text-slate-400 text-xs">{p.phone}</small>
                  </td>
                  <td className="px-5 py-4 border-b border-slate-700 text-base text-slate-100">
                    <Badge inactive={!p.active}>
                      {p.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </td>
                  {can(data.role, "partner") && (
                    <td className="px-5 py-4 border-b border-slate-700 text-base">
                      <button
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors"
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

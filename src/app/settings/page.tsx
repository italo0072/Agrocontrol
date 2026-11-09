"use client";
import { useState } from "react";
import { Plus, Trash2, Edit2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  defaultCategories,
  allCategories,
  getCustomCategories,
  saveCustomCategories,
  type ProductCategory,
} from "@/lib/domain";
import { useStore } from "@/components/provider";
import { Badge } from "@/components/shared";
export default function SettingsPage() {
  const { data } = useStore();
  const [cats, setCats] = useState<ProductCategory[]>(() =>
    getCustomCategories(),
  );
  const [newCat, setNewCat] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  const allCatNames = allCategories();
  const activeCount = cats.filter((c) => c.active).length + defaultCategories.length;

  function notify(text: string, type: "ok" | "err") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  }

  function addCategory() {
    const name = newCat.trim();
    if (!name) {
      notify("Escribe un nombre para la categoría.", "err");
      return;
    }
    if (allCatNames.includes(name)) {
      notify("Esa categoría ya existe.", "err");
      return;
    }
    const next: ProductCategory[] = [
      ...cats,
      { id: crypto.randomUUID(), name, active: true, created_at: new Date().toISOString() },
    ];
    setCats(next);
    saveCustomCategories(next);
    setNewCat("");
    notify(`Categoría "${name}" creada.`, "ok");
  }

  function toggleCategory(id: string) {
    const next = cats.map((c) =>
      c.id === id ? { ...c, active: !c.active } : c,
    );
    setCats(next);
    saveCustomCategories(next);
  }

  function deleteCategory(id: string) {
    if (
      !confirm("¿Eliminar esta categoría? Los productos que la usen mantendrán su valor.")
    )
      return;
    const next = cats.filter((c) => c.id !== id);
    setCats(next);
    saveCustomCategories(next);
    notify("Categoría eliminada.", "ok");
  }

  if (!data) return null;

  return (
    <>
      <div className="flex items-start justify-between gap-6 mb-7 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[2px] text-emerald-400 font-bold uppercase">Configuración</p>
          <h1 className="text-2xl tracking-tight text-slate-100 font-bold mb-1.5">
            Categorías de productos
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-[520px]">
            Organiza tu catálogo de insumos. Las categorías nuevas se usan en
            el formulario de productos.
          </p>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl min-w-[180px]">
          <span className="text-xl font-bold text-emerald-400 leading-none">{activeCount}</span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">categorías activas</span>
        </div>
      </div>

      {message && (
        <div
          className={`notice-pro ${
            message.type === "ok"
              ? "notice-success"
              : "notice-error"
          }`}
          role="status"
        >
          {message.type === "ok" ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          {message.text}
        </div>
      )}

      <section className="section-card">
        <div className="p-5 border-b border-slate-700 flex items-center justify-between gap-5 flex-wrap">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-bold text-slate-100">Categorías personalizadas</h2>
            <p className="text-xs text-slate-500">{cats.length} creadas por ti</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex flex-col gap-2 min-w-[240px] max-w-[400px] flex-1">
              <input
                className="input-pro"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                placeholder="Ej. Foliar, Bioestimulante…"
              />
            </div>
            <button
              className="btn-primary px-6 whitespace-nowrap"
              onClick={addCategory}
              disabled={!newCat.trim() || allCatNames.includes(newCat.trim())}
            >
              <Plus size={18} className="mr-2" />
              Agregar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto p-5">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="table-header-cell px-5 py-4 text-left">Categoría</th>
                <th className="table-header-cell px-5 py-4 text-left w-[140px]">Tipo</th>
                <th className="table-header-cell px-5 py-4 text-left w-[140px]">Estado</th>
                <th className="table-header-cell px-5 py-4 text-left w-[220px]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {defaultCategories.map((name) => (
                <tr key={`default-${name}`} className="bg-slate-800/30 table-row">
                  <td className="px-5 py-4 border-b border-slate-700 font-bold text-slate-100">{name}</td>
                  <td>
                    <span className="badge-pro border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-3 py-1.5">Predeterminada</span>
                  </td>
                  <td>
                    <span className="badge-pro border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-3 py-1.5">Activa</span>
                  </td>
                  <td>
                    <span className="text-slate-500 text-xs">—</span>
                  </td>
                </tr>
              ))}
              {cats.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-0 py-0">
                    <div className="px-10 py-12 text-center text-slate-500">
                      <p className="text-base font-bold text-slate-400">Aún no has creado categorías personalizadas.</p>
                      <p className="text-sm text-slate-500 mt-1">Usa el campo de arriba para agregar la primera.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cats.map((c) => (
                  <tr key={c.id} className="table-row">
                    <td className="px-5 py-4 border-b border-slate-700 font-bold text-slate-100">
                      {editingCat === c.id ? (
                        <input
                          autoFocus
                          className="w-full px-4 py-3 rounded border border-slate-600 bg-slate-900 text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 text-base"
                          value={c.name}
                          onChange={(e) =>
                            setCats(
                              cats.map((x) =>
                                x.id === c.id ? { ...x, name: e.target.value } : x,
                              ),
                            )
                          }
                          onBlur={() => setEditingCat(null)}
                        />
                      ) : (
                        c.name
                      )}
                    </td>
                    <td>
                      <span className="badge-pro border-slate-600/40 bg-slate-700/30 text-slate-500 px-3 py-1.5">Personalizada</span>
                    </td>
                    <td>
                      <span
                        className={`badge-pro px-3 py-1.5 ${
                          c.active
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : "border-red-500/30 bg-red-500/10 text-red-400"
                        }`}
                      >
                        {c.active ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="flex gap-3 items-center">
                      {editingCat === c.id ? (
                        <>
                          <button
                            className="p-2.5 rounded border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors"
                            onClick={() => {
                              const next = cats.map((x) =>
                                x.id === c.id ? { ...x, active: true } : x,
                              );
                              setCats(next);
                              saveCustomCategories(next);
                              setEditingCat(null);
                              notify("Categoría guardada.", "ok");
                            }}
                            title="Guardar"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          <button
                            className="p-2.5 rounded border-transparent bg-transparent text-slate-500 hover:bg-white/5 hover:text-white transition-colors"
                            onClick={() => setEditingCat(null)}
                            title="Cancelar"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="p-2.5 rounded border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors"
                            onClick={() => setEditingCat(c.id)}
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            className={`p-2.5 rounded font-bold transition-colors ${
                              c.active
                                ? "border-red-500/35 bg-red-500/10 text-red-400 hover:bg-red-500/25"
                                : "border-slate-600 bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
                            }`}
                            onClick={() => toggleCategory(c.id)}
                            title={c.active ? "Desactivar" : "Activar"}
                          >
                            {c.active ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            className="p-2.5 rounded border-red-500/35 bg-red-500/10 text-red-400 font-bold hover:bg-red-500/25 hover:border-red-500 transition-colors"
                            onClick={() => deleteCategory(c.id)}
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-5 text-xs text-slate-500 leading-relaxed">
          Las categorías predeterminadas no se pueden eliminar ni desactivar.
          Las categorías personalizadas se guardan en este navegador (demo) y
          se usan en el formulario de productos.
        </p>
      </section>
    </>
  );
}

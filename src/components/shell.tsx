"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Contact,
  LayoutDashboard,
  LogOut,
  Package,
  RefreshCw,
  ShoppingCart,
  Sprout,
  BookOpen,
  Settings,
} from "lucide-react";
import { useStore } from "./provider";
import { Auth } from "./auth";
const links = [
  ["/", "Resumen", LayoutDashboard],
  ["/productos", "Productos", Package],
  ["/inventario", "Inventario", Boxes],
  ["/contactos", "Contactos", Contact],
  ["/ventas", "Ventas", ShoppingCart],
  ["/reportes", "Reportes", BarChart3],
  ["/guia", "Guía de uso", BookOpen],
  ["/settings", "Configuración", Settings],
] as const;
export function Shell({ children }: { children: React.ReactNode }) {
  const store = useStore(),
    path = usePathname();
  if (!store.ready)
    return (
      <p className="flex h-full items-center justify-center text-slate-400" role="status">
        Preparando AgroControl…
      </p>
    );
  if (!store.demo && !store.session) return <Auth />;
  return (
    <div className="flex min-h-screen bg-slate-900">
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      {/* Sidebar fijo a la izquierda, sin solapar el contenido */}
      <aside className="fixed inset-y-0 left-0 z-20 w-60 bg-slate-900 border-r border-slate-700 p-5 backdrop-blur-xl shadow-[4px_0_24px_-10px_rgba(0,0,0,0.4)]">
        <Link href="/" className="flex items-center gap-3 text-xl font-extrabold text-emerald-400 mb-8">
          <Sprout />
          AgroControl
        </Link>
        <p className="text-[10px] tracking-[2.5px] text-slate-500 font-extrabold uppercase mt-1 ml-1 mb-7">
          FINCA CAFETALERA
        </p>
        <nav aria-label="Navegación principal" className="flex flex-col gap-1.5">
          {links.map(([url, label, Icon]) => (
            <Link
              key={url}
              href={url}
              className={
                path === url
                  ? "sidebar-link active"
                  : "sidebar-link"
              }
              aria-current={path === url ? "page" : undefined}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-700 flex gap-3 items-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white grid place-items-center font-bold text-sm shrink-0 shadow-emerald">
            {(store.data?.email || "A").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong className="text-base font-bold text-slate-100 block max-w-[140px] overflow-wrap-anywhere">
              {store.demo ? "Demostración" : store.data?.email || "Usuario"}
            </strong>
            <small className="text-sm text-slate-500 capitalize block">
              {store.data?.role || "Sin rol"}
            </small>
          </div>
          <button
            className="p-2.5 rounded-lg border-transparent bg-transparent text-slate-500 hover:bg-white/5 hover:text-emerald-400 hover:border-emerald-500/20 transition-all duration-200"
            aria-label="Cerrar sesión"
            onClick={() => void store.logout()}
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col min-h-screen bg-slate-900 pl-60">
        {/* Topbar más alta y clara */}
        <header className="h-24 flex items-center justify-between border-b border-slate-700 bg-slate-900/90 px-5 text-sm text-slate-400 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.3)]" />
            {store.demo ? "Entorno de demostración" : "Espacio de trabajo"}
            <span className="px-4 text-slate-600">/</span>
            <strong className="text-slate-200 font-medium text-base">
              {links.find(([url]) => url === path)?.[1] || "AgroControl"}
            </strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn-secondary px-4"
              disabled={store.loading}
              onClick={() =>
                store.demo
                  ? store.resetDemo()
                  : void store.refresh().catch(() => {})
              }
            >
              <RefreshCw size={14} className="mr-1.5" />
              {store.demo ? "Restablecer demo" : "Actualizar"}
            </button>
            <button
              className="btn-secondary px-4 hidden md:block"
              aria-label="Cerrar sesión"
              onClick={() => void store.logout()}
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>
        {store.demo && (
          <div className="px-5 py-2.5 bg-amber-500/10 text-amber-400 text-sm font-bold border-b border-amber-500/20 tracking-wide">
            DEMO · Datos ficticios guardados en este navegador. Para trabajar en
            equipo, configura Supabase.
          </div>
        )}
        <main id="contenido" className="flex-1 flex flex-col w-full px-4 pb-8 sm:px-5">
          {store.error && (
            <div role="alert" className="notice-error">
              {store.error}
              {store.demo && (
                <button
                  onClick={store.resetDemo}
                  className="ml-3 text-emerald-400 hover:underline text-sm"
                >
                  Restablecer demo
                </button>
              )}
            </div>
          )}
          {store.loading && !store.data ? (
            <p role="status" className="flex h-full items-center justify-center text-slate-500 text-xl">
              Cargando información…
            </p>
          ) : !store.data ? (
            <section className="section-card">
              <h2 className="text-slate-100 font-bold text-xl mb-2">
                No hay información disponible
              </h2>
              <p className="text-slate-400 text-base">
                Comprueba la configuración y la asignación de tu rol.
              </p>
            </section>
          ) : (
            children
          )}
        </main>
        <footer className="mt-auto px-8 py-5 text-sm text-slate-500 border-t border-slate-700 bg-slate-900/80 flex items-center justify-between shrink-0 backdrop-blur-sm">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-100 text-base tracking-[-0.2px]">
              AgroControl · Finca Cafetalera
            </span>
            <span className="text-slate-500 text-sm">
              Inventario de insumos · Clientes y proveedores
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

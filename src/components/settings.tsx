"use client";
import { useState, type FormEvent } from "react";
import {
  Settings2,
  Tags,
  UserRound,
  ShieldCheck,
  MapPin,
  Plus,
} from "lucide-react";
import { can, commandSchema, userError, type Category } from "@/lib/domain";
import { browserDb } from "@/lib/supabase";
import { useStore } from "./provider";
import { Heading, Notice, Badge, Empty } from "./shared";
import s from "@/lib/ui";
function ProfileForm() {
  const { data, execute, busy, demo } = useStore();
  const [full_name, setName] = useState(data?.profile.full_name || ""),
    [phone, setPhone] = useState(data?.profile.phone || ""),
    [message, setMessage] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await execute(
        commandSchema.parse({ type: "profile", data: { full_name, phone } }),
      );
      setMessage("Tus datos se guardaron correctamente.");
    } catch (e) {
      setMessage(userError(e));
    }
  }
  return (
    <section className={`${s.card} ${s.cardPad}`}>
      <div className={s.settingsTitle}>
        <UserRound />
        <div>
          <h2>Mi perfil</h2>
          <p>Tu información de contacto dentro de la finca.</p>
        </div>
      </div>
      <form onSubmit={save}>
        <div className={s.formGrid}>
          <label>
            Nombre completo *
            <input
              required
              maxLength={100}
              autoComplete="name"
              value={full_name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Teléfono
            <input
              maxLength={30}
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label>
            Correo de acceso
            <input value={data?.email || ""} readOnly />
          </label>
          <label>
            Rol asignado
            <input readOnly value={data?.role || ""} />
          </label>
        </div>
        <p className={s.muted}>
          El correo y los permisos los administra el responsable del sistema.
        </p>
        <Notice message={message} />
        <div className={s.actions}>
          <button disabled={busy}>Guardar mi perfil</button>
        </div>
      </form>
    </section>
  );
}
function PasswordForm() {
  const { demo } = useStore();
  const [password, setPassword] = useState(""),
    [repeat, setRepeat] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    if (password !== repeat) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await browserDb().auth.updateUser({ password });
      if (error)
        throw new Error(
          "No se pudo actualizar. Vuelve a iniciar sesión y reintenta; si persiste, usa la recuperación de contraseña.",
        );
      setMessage("Contraseña actualizada correctamente.");
      setPassword("");
      setRepeat("");
    } catch (e) {
      setMessage(userError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={`${s.card} ${s.cardPad}`}>
      <div className={s.settingsTitle}>
        <ShieldCheck />
        <div>
          <h2>Seguridad de mi cuenta</h2>
          <p>Cambia tu contraseña sin modificar la de otros usuarios.</p>
        </div>
      </div>
      {demo ? (
        <p className={s.muted}>
          La demo no utiliza contraseñas. Esta opción se habilita al iniciar
          sesión con Supabase.
        </p>
      ) : (
        <form onSubmit={save}>
          <div className={s.formGrid}>
            <label>
              Nueva contraseña *
              <input
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Confirmar contraseña *
              <input
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              />
            </label>
          </div>
          <p className={s.muted}>Usa al menos 12 caracteres.</p>
          <Notice message={message} />
          <div className={s.actions}>
            <button disabled={busy}>
              {busy ? "Actualizando…" : "Cambiar contraseña"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
function FarmForm() {
  const { data, execute, busy } = useStore();
  const [farm_name, setName] = useState(data?.farm.farm_name || ""),
    [location, setLocation] = useState(data?.farm.location || ""),
    [message, setMessage] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await execute(
        commandSchema.parse({ type: "farm", data: { farm_name, location } }),
      );
      setMessage("Información de la finca actualizada.");
    } catch (e) {
      setMessage(userError(e));
    }
  }
  return (
    <section className={`${s.card} ${s.cardPad}`}>
      <div className={s.settingsTitle}>
        <MapPin />
        <div>
          <h2>Información de la finca</h2>
          <p>Datos compartidos por el equipo.</p>
        </div>
      </div>
      <form onSubmit={save}>
        <div className={s.formGrid}>
          <label>
            Nombre de la finca *
            <input
              required
              maxLength={100}
              value={farm_name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Ubicación
            <input
              maxLength={150}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
        </div>
        <Notice message={message} />
        <div className={s.actions}>
          <button disabled={busy}>Guardar datos de la finca</button>
        </div>
      </form>
    </section>
  );
}
function CategoryForm({
  initial,
  close,
}: {
  initial?: Category;
  close: () => void;
}) {
  const { execute, busy } = useStore();
  const [name, setName] = useState(initial?.name || ""),
    [active, setActive] = useState(initial?.active ?? true),
    [message, setMessage] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await execute(
        commandSchema.parse({
          type: "category",
          data: { id: initial?.id, name, active },
        }),
      );
      close();
    } catch (e) {
      setMessage(userError(e));
    }
  }
  return (
    <form onSubmit={save} className={s.categoryForm}>
      <div className={s.formGrid}>
        <label>
          Nombre de categoría *
          <input
            required
            maxLength={80}
            placeholder="Ej. Café cereza o herramientas"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className={s.check}>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Categoría activa
        </label>
      </div>
      <Notice message={message} />
      <div className={s.actions}>
        <button
          type="button"
          className={s.secondary}
          disabled={busy}
          onClick={close}
        >
          Cancelar
        </button>
        <button disabled={busy}>Guardar categoría</button>
      </div>
    </form>
  );
}
export function Settings() {
  const { data } = useStore();
  const [edit, setEdit] = useState<Category | "new" | null>(null);
  if (!data) return null;
  const admin = can(data.role, "category");
  return (
    <>
      <Heading
        eyebrow="UN SISTEMA A LA MEDIDA DE TU FINCA"
        title="Configuración"
        description="Administra tu perfil, el catálogo de categorías y los datos de la finca."
      />
      <ProfileForm />
      <PasswordForm />
      {admin && <FarmForm />}
      <section className={s.card}>
        <div className={s.cardTitle}>
          <div>
            <h2>Categorías de productos</h2>
            <span>
              Clasificación compartida para café, insumos y materiales.
            </span>
          </div>
          {admin && (
            <button onClick={() => setEdit("new")}>
              <Plus size={15} />
              Nueva categoría
            </button>
          )}
        </div>
        {edit && (
          <CategoryForm
            key={edit === "new" ? "new" : edit.id}
            initial={edit === "new" ? undefined : edit}
            close={() => setEdit(null)}
          />
        )}
        <div className={s.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Productos asociados</th>
                <th>Estado</th>
                {admin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {data.categories.map((c) => (
                <tr key={c.id}>
                  <td className={s.productName}>{c.name}</td>
                  <td>
                    {data.products.filter((p) => p.category === c.name).length}
                  </td>
                  <td>
                    <Badge inactive={!c.active}>
                      {c.active ? "Activa" : "Inactiva"}
                    </Badge>
                  </td>
                  {admin && (
                    <td>
                      <button
                        className={s.inlineButton}
                        onClick={() => setEdit(c)}
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
        <p className={`${s.cardPad} ${s.muted}`}>
          Al renombrar una categoría se actualizan sus productos. Al
          desactivarla se conserva el historial y deja de ofrecerse para
          productos nuevos.
        </p>
      </section>
    </>
  );
}

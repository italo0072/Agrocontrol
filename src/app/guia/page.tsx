import { Heading } from "@/components/shared";
export const metadata = { title: "Guía de uso" };
export default function Page() {
  return (
    <>
      <Heading
        eyebrow="PROCESOS CONSISTENTES"
        title="Guía de operación"
        description="Un flujo simple para mantener información confiable."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {[
          [
            "01 · Configura el catálogo",
            "Administración crea cada producto con un código único, unidad, presentación y precio. Usa códigos distintos para presentaciones distintas.",
          ],
          [
            "02 · Registra contactos",
            "Crea clientes y proveedores. Puedes desactivarlos sin borrar el historial comercial.",
          ],
          [
            "03 · Ingresa existencias",
            "Bodega registra una entrada por cada compra o saldo inicial. Indica el proveedor y una referencia del documento.",
          ],
          [
            "04 · Registra ventas",
            "Selecciona el cliente y agrega productos. El sistema comprueba stock y descuenta toda la venta en una transacción. El total usa precios vigentes.",
          ],
          [
            "05 · Corrige con trazabilidad",
            "Una salida manual debe tener motivo. Si una venta fue incorrecta, anúlala: se devuelven las existencias y se conserva el registro.",
          ],
          [
            "06 · Consulta y exporta",
            "Revisa alertas y exporta CSV. El historial visible muestra los últimos 200 registros; para análisis completo consulta la base.",
          ],
          [
            "Unidades y moneda",
            "Un saco, un kilogramo y un litro son unidades distintas. No hay conversiones automáticas. Los importes son USD, sin impuestos ni facturación fiscal.",
          ],
          [
            "Acceso por rol",
            "Administrador: catálogos y operaciones. Ventas: contactos, ventas y anulaciones. Bodega: movimientos. Lectura: consultas. Todos ven los datos de una sola empresa.",
          ],
        ].map(([title, body]) => (
          <section className="section-card p-6" key={title}>
            <h2 className="text-sm font-bold text-slate-100 mb-2">{title}</h2>
            <p className="text-sm text-slate-400">{body}</p>
          </section>
        ))}
      </div>
    </>
  );
}

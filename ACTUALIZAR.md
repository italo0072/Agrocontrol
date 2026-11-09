# Actualizar tu versión con Tailwind

Esta entrega parte de tu ZIP y conserva el diseño oscuro, Tailwind y el costo por unidad. Corrige las categorías, permisos, cálculos y adaptación móvil. Recupera perfil, finca, productores y registros de pagos solicitados anteriormente.

## Si ya tienes la base configurada

1. Detén el servidor y conserva una copia de tu proyecto y de tu `.env.local`.
2. Respalda tu base mediante las opciones de Supabase antes de actualizarla.
3. En Supabase → SQL Editor ejecuta TODO `supabase/004_reparacion_tailwind.sql`.
4. **No vuelvas a ejecutar `001_schema.sql`.** La actualización agrega las tablas y funciones necesarias y conserva registros. Es repetible: se probó ejecutándola dos veces sobre datos existentes. No elimina `member_role`; la define de forma compatible y mantiene la seguridad de los roles.
5. Extrae el código nuevo en otra carpeta y copia allí tu `.env.local` anterior. No copies la carpeta node_modules ni .next del proyecto viejo.
6. Ejecuta `npm ci`, luego `npm run dev` y abre http://localhost:3000.

Si ya tienes un repositorio Git propio, conserva su `.git` y `.env.local`: actualiza las fuentes, tests, supabase, documentos y archivos de configuración/dependencias. No reemplaces tu historial con el del ZIP. Después registra tus cambios y publícalos.

El ZIP no incluye tu archivo de credenciales. Usa la misma URL base y clave pública de tu proyecto. Ejemplo de formato: `https://TU_PROYECTO.supabase.co`, sin `/rest/v1/`.

## Instalación nueva

Ejecuta únicamente `001_schema.sql`: ahora incluye toda la estructura y las funciones de la aplicación. No hace falta ejecutar `004` después. Luego crea usuarios en Authentication → Users y asigna sus perfiles siguiendo docs/CONFIGURAR_SUPABASE.md. No ejecutes scripts con correos de ejemplo sin reemplazarlos.

## Categorías locales de tu versión anterior

Las categorías que creaste en la pantalla anterior estaban únicamente en `localStorage`, bajo `agrocontrol:categories`. Esta actualización no borra esa clave, pero no las sube automáticamente a Supabase. Recréelas desde Configuración para que se compartan y estén validadas. Los productos que ya existan en PostgreSQL conservan sus categorías y se incorporan al catálogo de categorías durante la migración.

La nueva Configuración permite a administración crear, renombrar y desactivar categorías; renombrar actualiza las asignaciones y desactivar conserva los productos existentes. No se permite eliminar una categoría dejando productos sin referencia.

## Qué comprobar

- Crear una categoría nueva, guardar un producto con ella y verlo desde otro usuario del mismo proyecto.
- Borrar un valor numérico y escribir 04: se conserva el campo vacío al borrar y se normaliza a 4 al escribir.
- Registrar entradas con costo. En inventario y reportes las cantidades y promedios se agrupan por producto/unidad y respetan los filtros.
- Un costo omitido queda sin registrar; cero es un costo explícito válido. Máximo dos decimales.
- Editar tu nombre/teléfono; administración también edita nombre/ubicación de la finca. No se puede elevar el rol desde el formulario.
- En móvil, abrir/cerrar el menú y usar los formularios en una columna. Las tablas tienen desplazamiento horizontal propio.
- Registrar y anular un pago de prueba. Son registros de egresos ya realizados, no transferencias ni cuentas por pagar automáticas.

## Límites del historial

La API carga hasta 200 movimientos, 200 ventas y 200 pagos recientes. Los filtros, gráficos, resúmenes por producto y CSV se aplican a ese conjunto y lo indican en pantalla. Los indicadores mensuales de ventas, compras con costo y pagos consultan el historial completo en PostgreSQL.

Las migraciones se probaron con PostgreSQL embebido. Debes comprobar tu instancia real, el correo de Auth y el flujo de la app antes de utilizar datos operativos.

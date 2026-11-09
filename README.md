# AgroControl · Finca cafetalera

Aplicación con **Next.js 16, App Router, TypeScript, React, Tailwind CSS y Supabase** para gestionar productos, categorías, recepciones, inventario, contactos, ventas y registros de pagos.

**Repositorio público:** pendiente de agregar tu URL real de GitHub.

**Aplicación publicada:** pendiente de agregar tu URL real de producción.

## Ejecutar en Windows

Instala Node.js 24 LTS desde https://nodejs.org y Git para publicar el repositorio. Extrae el ZIP completo, abre la carpeta `agrocontrol` en VS Code y abre una terminal donde está `package.json`.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Abre http://localhost:3000. Puedes usar **Abrir demostración** sin configurar Supabase. Detén el servidor con Ctrl+C. Si PowerShell bloquea npm.ps1, usa `npm.cmd` en lugar de `npm`. En Linux/macOS usa `cp` en lugar de `Copy-Item`.

Si ya tienes `.env.local`, consérvalo; no lo reemplaces por el ejemplo vacío.

## Configurar Supabase

### Proyecto nuevo

1. Crea un proyecto en https://supabase.com.
2. En SQL Editor ejecuta completo **`supabase/001_schema.sql`**, una sola vez. Es el único instalador del esquema y contiene toda la estructura de la aplicación.
3. Crea tu usuario en **Authentication → Users**, indicando tu correo y una contraseña. Confirma el correo desde el panel si ofrece esa opción.
4. Abre **`supabase/002_asignar_usuario_ejemplo.sql`**, reemplaza el correo de ejemplo por el del usuario creado y ejecútalo para asignar `admin`. El script no crea contraseñas.
5. Completa `.env.local` con la URL base y la clave pública del mismo proyecto:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA_PUBLISHABLE_O_ANON
```

No agregues `/rest/v1/` a la URL. No uses service_role ni claves secretas en variables `NEXT_PUBLIC_`. `.env.local` está excluido de Git. Reinicia el servidor después de modificarlo, sal de la demo e inicia sesión con tu usuario.

### Base anterior

Esta distribución contiene un único esquema, `001_schema.sql`, para bases nuevas. Si tu base ya tiene la estructura actual, consérvala: la corrección de React no requiere ejecutar SQL. No ejecutes 001 sobre tablas existentes. Si tu estructura es anterior, conserva tus datos y solicita una migración específica antes de modificarla.

Las categorías que antes se guardaban únicamente en `localStorage` deben recrearse desde Configuración para compartirlas con el equipo. La actualización no borra la clave local anterior.

### Usuarios y permisos

Crea cada usuario en Authentication y asígnale su perfil con el mismo procedimiento del archivo 002, cambiando el correo y el rol:

| Rol | Permisos |
|---|---|
| admin | Catálogos, categorías, finca y todas las operaciones |
| ventas | Contactos, ventas, registros de pagos y sus anulaciones |
| bodega | Entradas y salidas manuales |
| lectura | Consultas y exportaciones |

Cada usuario puede editar su nombre/teléfono y cambiar su propia contraseña. El formulario no permite elevar roles. Todos los usuarios autorizados pertenecen a una misma finca por proyecto Supabase.

Para recuperación de contraseña permite `http://localhost:3000/recuperar` y después la URL exacta de producción en Authentication → URL Configuration. La entrega de correos depende de la configuración de Auth/SMTP de Supabase.

## Uso

1. Configura categorías y registra productos con código, presentación y unidad.
2. Registra clientes, proveedores y productores.
3. Ingresa saldos o recepciones con cantidad, motivo y costo opcional.
4. Registra ventas: el servidor valida y descuenta existencias en una transacción.
5. Anula ventas incorrectas con motivo para devolver el stock conservando el historial.
6. Registra pagos ya realizados a contactos con fecha y comprobante.
7. Filtra y exporta reportes CSV.

No se permiten existencias negativas. Los reintentos con el mismo identificador no duplican ventas, entradas ni pagos. Las categorías se administran en Supabase; renombrarlas actualiza sus productos. Las cantidades y promedios de compras se agrupan por producto/unidad.

## Arquitectura y requisitos

- **Server Components:** layout y páginas App Router.
- **Client Components:** sesión, formularios, filtros y panel, con `useState` y `useEffect`.
- **API consumida por fetch:** `GET /api/data` y `POST /api/commands` mediante Route Handlers.
- **Persistencia:** Supabase Auth y PostgreSQL con RLS, permisos y funciones transaccionales.
- **Diseño:** Tailwind, menú móvil, formularios por breakpoint y tablas desplazables.
- **Carga y errores:** loading.tsx, error.tsx y estados de peticiones/formularios.
- **Rutas:** `/`, `/productos`, `/inventario`, `/contactos`, `/ventas`, `/pagos`, `/reportes`, `/settings`, `/guia` y `/recuperar`.

## Comprobar y generar producción

```powershell
npm run typecheck
npm run build
npm start
```

Se ejecutaron 35 pruebas automatizadas antes de retirar la infraestructura de pruebas de esta distribución depurada. El historial Git conserva esas pruebas y sus iteraciones. Esta versión mantiene las verificaciones de TypeScript y compilación. Los cambios de esta depuración no modifican las reglas del negocio ni el esquema SQL.

Antes de entregar comprueba en navegador: crear producto y categoría, entrada con costo, venta, sobreventa rechazada, anulación, perfil, pago y exportación. Prueba el menú y los formularios a 375, 768 y 1366 px y verifica los permisos con usuarios reales. Las pruebas anteriores no sustituyen esa validación de Supabase y producción.

## Publicar en GitHub

El ZIP conserva `.git`, necesario para mantener los commits del proceso. Extráelo completo; si ya tienes un repositorio propio, conserva su `.git` y `.env.local` y actualiza solo los archivos de la aplicación.

Crea un repositorio público vacío en https://github.com/new, sin README ni gitignore inicial. Desde esta carpeta:

```powershell
git log --oneline
git branch -M main
git remote add origin https://github.com/TU_USUARIO/agrocontrol.git
git push -u origin main
```

Si tu repositorio ya tiene origin, conserva el remoto correcto en lugar de volver a agregarlo. Registra tus revisiones reales con commits descriptivos y completa `VIBE_CODING.md`.

## Desplegar en Vercel

1. Inicia sesión en https://vercel.com e importa el repositorio de GitHub.
2. Framework Next.js; raíz donde está package.json; Node.js 24.x; build `npm run build`. No uses exportación estática, porque hay Route Handlers.
3. Agrega las dos variables de `.env.example` en Environment Variables. No subas `.env.local`.
4. Despliega, configura la URL en Supabase Auth y prueba el flujo completo.
5. Sustituye los campos pendientes al inicio de este README por tus URLs reales y publica el commit.

La URL pública y el repositorio todavía requieren publicación desde tus cuentas. La comprobación visual, Auth real y despliegue no se presentan como completados. Vercel no sustituye una actividad distinta que exija AWS.

## Alcance

Moneda USD y horarios de El Salvador. Sin conversiones automáticas de sacos, kg, quintales o litros. Costo comercial no equivale a costo contable o utilidad. Pagos registra egresos ya realizados: no ejecuta transferencias, genera deudas ni concilia facturas automáticamente.

La API carga hasta 200 registros recientes de movimientos, ventas y pagos. Los filtros, gráficos y CSV usan ese conjunto; los indicadores mensuales consultan todo el historial SQL. Los catálogos requieren ampliar paginación si llegan a 1,000 registros. Usa Actualizar para traer cambios de otros usuarios. No hay importación automática de Excel, mezclas, varias bodegas ni facturación fiscal.

La demo usa datos ficticios en un solo navegador. Los CSV son consultas, no respaldos completos: configura respaldos de PostgreSQL antes de usar datos operativos.

## Si aparece un aviso de suspensión después de actualizar

Detén `npm run dev`, elimina únicamente la caché `.next`, reinstala con `npm ci` y vuelve a iniciar. En PowerShell:

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm ci
npm run dev
```

Haz una recarga completa del navegador (Ctrl+Shift+R). No borres `.env.local`, la base ni los datos del navegador para esto. Se separó la navegación de la carga de sesión y se añadieron límites de Suspense; no se capturan ni se silencian sus excepciones. Sin la traza completa del aviso original no se puede confirmar su causa exacta; si persiste, conserva el nombre del componente y la traza de la consola.

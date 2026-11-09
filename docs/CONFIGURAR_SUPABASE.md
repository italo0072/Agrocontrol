# Configuración de Supabase paso a paso

Esta guía corresponde a una empresa y un proyecto Supabase nuevo. No ejecutes la migración en una base existente con tablas del mismo nombre. Los menús del panel pueden cambiar de nombre; busca las secciones equivalentes de SQL, usuarios, claves y URLs de Auth.

## 1. Crear proyecto

1. Entra a https://supabase.com y crea tu cuenta.
2. Crea un proyecto llamado `agrocontrol`. Selecciona región y configura una contraseña robusta para la base de datos. No necesitas escribir esa contraseña en el código.
3. Espera a que termine la creación del proyecto.

## 2. Crear tablas y reglas

1. En el panel abre **SQL Editor → New query**.
2. Abre en VS Code `supabase/001_schema.sql`.
3. Copia TODO su contenido al editor y ejecútalo una sola vez. Después ejecuta `supabase/004_reparacion_tailwind.sql` completo una sola vez. Si ya tenías la versión adjunta, ejecuta solamente el archivo 003 y consulta ACTUALIZAR.md.
4. Comprueba que existen `profiles`, `products`, `partners`, `movements`, `sales`, `categories`, `farm_settings` y `payments`.

La migración se ejecuta en una transacción. Si reporta un error, revisa el mensaje antes de repetir. No incluye comandos para borrar o resetear tablas. Si ya se ejecutó correctamente, no la repitas.

## 3. Crear el primer administrador

1. En **Authentication → Users**, utiliza Add user/Create user.
2. Escribe un correo tuyo y una contraseña de al menos 12 caracteres. Confirma el correo desde el panel si existe la opción de autoconfirmación.
3. En SQL Editor ejecuta lo siguiente reemplazando el correo. Usa un correo que ya aparezca en Authentication → Users:

```sql
insert into public.profiles(id,email,role)
select id,email,'admin'
from auth.users
where lower(email)=lower('TU_CORREO@EJEMPLO.COM')
on conflict(id) do update set email=excluded.email,role=excluded.role;

select email,role from public.profiles;
```

Debes ver tu correo con rol `admin`. Si no aparece, el usuario no existe o el correo no coincide. No hay registro público ni ascenso automático a administrador.

## 4. Crear personal y asignar roles

Crea cada usuario desde Authentication → Users y usa el mismo SQL cambiando el correo y el rol. Valores permitidos: `admin`, `ventas`, `bodega`, `lectura`.

| Operación                         | admin            | ventas | bodega | lectura |
| --------------------------------- | ---------------- | ------ | ------ | ------- |
| Consultar y exportar              | Sí               | Sí     | Sí     | Sí      |
| Crear/editar/desactivar productos | Sí               | No     | No     | No      |
| Crear/editar/desactivar contactos | Sí               | Sí     | No     | No      |
| Entradas/salidas manuales         | Sí               | No     | Sí     | No      |
| Registrar/anular ventas           | Sí               | Sí     | No     | No      |
| Asignar roles                     | Desde SQL Editor | No     | No     | No      |

Para retirar acceso a un usuario, elimina su perfil desde SQL Editor usando el correo exacto:

```sql
delete from public.profiles where email='CORREO_A_RETIRAR@EJEMPLO.COM';
```

Eso no borra ventas ni movimientos. El historial guarda el correo del responsable como texto. La siguiente consulta/operación de ese usuario será rechazada, aunque aún tenga sesión de Auth. Los datos ya descargados no se pueden retirar del dispositivo.

## 5. Obtener URL y clave pública

Busca en Project Settings → API / API Keys o en Connect:

- Project URL: `https://...supabase.co`.
- Publishable key o clave pública legacy `anon`.

Nunca copies service_role ni una secret key. La aplicación opera con la identidad del usuario y no necesita claves que omitan RLS.

En tu proyecto local:

```powershell
Copy-Item .env.example .env.local
```

Edita `.env.local` y completa:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_PUBLICA
```

Detén y vuelve a ejecutar `npm run dev`. Si estabas en demo, usa Cerrar sesión (icono de salida) y entra con el administrador creado.

## 6. Configurar recuperación de contraseña

En Authentication → URL Configuration:

- Para pruebas locales permite `http://localhost:3000/recuperar` en Redirect URLs.
- Para producción agrega `https://TU_APP.vercel.app/recuperar` y establece Site URL con tu dominio de producción.
- Si usas otro puerto o un dominio propio, agrega su URL exacta.

En el acceso escribe tu correo y pulsa “¿Olvidaste tu contraseña?”. Abre el enlace recibido, escribe la contraseña nueva y cierra sesión para volver a ingresar. La entrega de correo depende de la configuración y límites de Supabase; para una empresa configura su proveedor de correo conforme a la documentación de Supabase.

Configura una política de contraseña acorde con tu organización desde las opciones de Auth. La página de recuperación exige al menos 12 caracteres.

## 7. Primera operación con datos de prueba

1. Crea un producto de prueba con precio 10 y mínimo 5.
2. Registra un cliente.
3. Ingresa una entrada de 20 unidades con motivo “Prueba inicial”.
4. Registra una venta de 3 unidades: total 30, stock 17.
5. Anula la venta: stock 20 y venta anulada.
6. Prueba con un usuario lectura: no debe poder ejecutar escrituras, ni llamando directamente al RPC.

No cargues todos los datos de las hojas hasta validar unidades, códigos y saldos iniciales. El ejemplo no reemplaza la conciliación del inventario de la empresa.

## 8. Respaldo

Las exportaciones CSV son de consulta y no contienen toda la base ni todas las reglas. Configura respaldos de PostgreSQL de acuerdo con las opciones del proyecto Supabase y comprueba que pueden restaurarse. No compartas contraseñas, access tokens ni claves secretas para solicitar ayuda.

## Configuración dentro de la app

Cada usuario puede editar su nombre y teléfono desde Configuración. El correo y el rol no se pueden cambiar desde ese formulario. Administración también gestiona categorías y el nombre/ubicación de la finca. Para cambiar una contraseña usa la sección Seguridad de mi cuenta. En demo los cambios de contraseña están deshabilitados.

El rol ventas también puede registrar y anular registros de pagos a contactos. Bodega y lectura no pueden hacerlo. Los permisos se vuelven a validar dentro de PostgreSQL.

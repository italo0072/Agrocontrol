# Proceso de Vibe Coding · AgroControl

## Solicitud y concepción

El usuario pidió una aplicación Next.js para la tarea. Primero se construyó un gestor de postulaciones; después el usuario propuso una empresa de fertilizantes que utiliza muchas hojas de cálculo y necesita estandarizarlas. Autorizó construir esa nueva propuesta con los requisitos del enunciado. AgroControl se entrega como un proyecto separado; no se sobrescribe el anterior.

Asistente: ChatGPT/Codex. Los cambios y verificaciones descritos abajo fueron realizados por el asistente. La revisión del estudiante y el despliegue no se presentan como completados.

## Prompts reales relevantes del usuario

- “Se podría hacer un poco más compleja ... que sea para una empresa de fertilizante ... manejan muchas hojas de cálculo y ... todo esté estandarizado en una app”.
- “Podríamos hacer ese y que cumpla con los estándares establecidos”.

Son extractos abreviados de la solicitud. No se inventan prompts del estudiante ni conversaciones adicionales.

## Instrucciones de implementación formuladas por el asistente

Estas son síntesis del trabajo dirigido por el asistente, no mensajes enviados por el estudiante:

1. Crear una app Next.js 16 con TypeScript, App Router, CSS Modules y módulos de productos, contactos, inventario, ventas, reportes y guía.
2. Separar Server Components de UI interactiva. Usar hooks y Route Handlers para leer y escribir contra Supabase.
3. Aplicar roles en base de datos, RLS y permisos de funciones; no confiar solo en botones ocultos.
4. Confirmar ventas y movimientos en transacciones que eviten stock negativo, reintentos duplicados y anulaciones repetidas.
5. Añadir demo sin cuentas, validar reglas con PostgreSQL embebido y preparar instrucciones de ejecución y despliegue.

## Iteraciones ejecutadas

### 1. Arquitectura y datos

Se definieron contratos de comandos y tablas de perfiles, productos, contactos, movimientos y ventas. Se eligió una empresa por proyecto Supabase. Las unidades y presentaciones se almacenan por separado; no se suman ni convierten unidades incompatibles.

### 2. Interfaz y módulos

Se implementaron navegación lateral, resumen, tablas filtrables, formularios, historial y CSV. La demo usa el mismo contrato de comandos con un adaptador local; no se conecta a datos reales.

### 3. Validación y correcciones

- El primer build detectó un selector global `h1` dentro de CSS Modules. Se cambió a un selector acotado al módulo.
- La revisión del ciclo de carga identificó que el estado inicial podía borrar la demo restaurada. Se agregó la comprobación de inicialización antes de cargar una sesión real.
- Se alineó la precisión de mínimos de stock entre Zod y PostgreSQL.
- Se eliminó un botón anidado en un enlace y se agregó salida visible en móvil.
- Se evitó que mensajes de Zod completos aparecieran como detalles técnicos en formularios.
- Se corrigió la prueba de inmutabilidad para comparar contra una copia tomada antes de ejecutar la operación fallida.

### 4. Pruebas y documentación

Se ejecutaron pruebas de reglas, API y una migración real sobre PostgreSQL embebido PGlite, con roles y RLS. Se comprobó la compilación y el tipado. Se documentaron límites, pasos de Supabase/GitHub/Vercel y las pruebas pendientes en navegador y producción.

## Decisiones técnicas

- Supabase Auth + PostgreSQL para datos compartidos y roles.
- La API verifica al usuario con getUser y consulta el perfil autorizado.
- Clave pública/publishable, sin service_role en la aplicación.
- Funciones SECURITY DEFINER con search_path vacío, nombres de tabla calificados y comprobación interna del rol.
- Escrituras directas a tablas revocadas. Lectura limitada por RLS.
- Detalle de venta con nombre, unidad y precio históricos.
- Actualización del stock con bloqueos de filas y orden consistente. No se afirma una prueba de concurrencia real.
- Ventas y entradas con request_id único para reintentos.
- Desactivación/anulación en lugar de borrado de historial.
- CSS Modules para ajustarse explícitamente a los estilos admitidos en la tarea.
- CSV sanitizado contra fórmulas; exportación no equivale a respaldo de la base.

## Límites y trabajo del estudiante

Sin hojas reales no se realizó migración de Excel. Sin las cuentas del estudiante no se configuró Supabase ni se publicó en GitHub/Vercel. El historial visible está limitado a 200 registros por tipo y el catálogo requiere ampliar paginación si llega a 1,000. No se incluye contabilidad ni producción de mezclas.

Antes de entregar, ejecuta y revisa el proyecto, completa pruebas manuales, configura tus cuentas y registra una iteración propia. Mantén este registro fiel a lo que hiciste.

## Registro para completar

- Fecha:
- Objetivo de la mejora:
- Prompt real enviado:
- Propuesta de IA:
- Qué acepté, cambié o rechacé y por qué:
- Pruebas ejecutadas y resultados:
- Commit:
- URL pública verificada:

## Iteración sobre el ZIP modificado por el estudiante

Prompt real: “podrías arreglarlo para que cumpla con lo solicitado”, acompañado del enunciado de la actividad. La revisión anterior detectó categorías solo locales rechazadas por SQL, promedios de unidades incompatibles y falta de adaptación móvil.

Se conservó el diseño del usuario con Tailwind y su costo unitario. Se registró esa versión en un commit separado, sin atribuir su diseño al asistente. Después se conectó Configuración con Supabase, se repararon los cálculos y filtros y se añadieron navegación móvil y formularios de una columna. Se recuperaron también las funciones de perfil, finca, productores y registro de pagos de la iteración previa.

La migración 004 es incremental y repetible, verifica roles dentro de PostgreSQL y mantiene privada la función interna. Se probó sobre registros previos y con una segunda ejecución. Se añadieron pruebas de compras agrupadas, costos explícitos cero y precisión.

Se identificó y corrigió un hook del panel que estaba después de un retorno condicional. Los indicadores mensuales se obtienen de SQL completo; los gráficos y resúmenes cargados conservan su límite explícito.

No se probaron el correo ni Supabase real ni se publicaron cuentas del estudiante. Las verificaciones personales, los prompts reales de nuevas iteraciones y las URLs públicas deben completarse por el estudiante.

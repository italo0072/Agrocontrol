# Verificación de AgroControl

Entorno: Node.js 24.22.1, Next.js 16.4.5. Proyecto sin credenciales de Supabase del usuario.

| Verificación ejecutada         | Resultado                                                        |
| ------------------------------ | ---------------------------------------------------------------- |
| `npm test`                     | 19 pruebas/subpruebas aprobadas; 0 fallidas                      |
| `npm run typecheck`            | Aprobado                                                         |
| `npm run build`                | Aprobado; páginas App Router y dos Route Handlers generados      |
| Migración PostgreSQL en PGlite | Ejecutada correctamente                                          |
| Lectura con RLS                | Anónimo sin permisos y usuario sin perfil sin filas              |
| Roles de operación             | Lectura sin escrituras, bodega sin ventas, ventas sin catálogo   |
| Protección de stock            | Sobreventa rechazada con rollback                                |
| Reintentos                     | Entradas y ventas no se duplican con el mismo request_id         |
| Anulación                      | Compensación una sola vez y conservación del historial           |
| Integridad                     | Código duplicado y cambio de unidad con movimientos rechazados   |
| API                            | Errores controlados 401, 413 y 503 sin exponer detalles internos |

PGlite ejecuta PostgreSQL embebido: valida PL/pgSQL, políticas y transacciones sin conectarse a una base del usuario. No prueba Supabase Auth real, correo, infraestructura de Vercel ni competencia entre conexiones independientes.

No se ejecutó una sesión visual interactiva en navegador ni un despliegue público. Tampoco se cargaron hojas de cálculo reales ni se verificaron los procesos de una empresa concreta. Las comprobaciones pendientes se encuentran en docs/PRUEBAS_MANUALES.md.

Para entregar la tarea: configurar Supabase, probar la UI en móvil/escritorio y el flujo autenticado, publicar GitHub/Vercel, agregar URLs al README y registrar las revisiones del estudiante en VIBE_CODING.md.

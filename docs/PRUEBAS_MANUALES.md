# Validación manual del estudiante

Registra fecha, navegador, resultado y evidencia real. Estas pruebas no están marcadas como ejecutadas por adelantado.

| Caso | Pasos | Resultado esperado | Resultado real |
|---|---|---|---|
| Arranque demo | npm ci, npm run dev y Abrir demostración | Resumen con productos ficticios | Pendiente |
| Catálogo | Crear un código nuevo y luego repetirlo | El segundo se rechaza | Pendiente |
| Persistencia demo | Cambiar un producto y recargar | Se conserva en el mismo navegador | Pendiente |
| Contactos | Crear cliente y proveedor; editar y desactivar | Datos consistentes y estado visible | Pendiente |
| Entrada | Ingresar 20 sacos con referencia | Stock suma 20 y aparece responsable | Pendiente |
| Venta | Vender 3 unidades de precio 10 | Stock resta 3 y total 30 | Pendiente |
| Sobreventa | Intentar vender más de lo disponible | Rechazo sin descuentos parciales | Pendiente |
| Anulación | Anular indicando motivo | Se devuelve stock una sola vez | Pendiente |
| Unidades | Cambiar unidad con movimientos previos | Rechazo | Pendiente |
| Exportación | Abrir CSV en Excel y revisar acentos/unidades | Columnas correctas, sin fórmulas ejecutables | Pendiente |
| Fechas | Seleccionar desde posterior a hasta | Error visible | Pendiente |
| Móvil | Probar anchos 375 y 768 px | Navegación usable; tablas con desplazamiento propio | Pendiente |
| Escritorio | Probar 1366 px | Formularios y panel legibles | Pendiente |
| Teclado | Tab, Enter y foco visible | Controles accesibles y etiquetas asociadas | Pendiente |
| Sin red | Desconectar antes de guardar en modo real | Error y opción de reintentar/actualizar | Pendiente |
| Sesión | Ingresar y cerrar sesión | No se muestran datos al salir | Pendiente |
| Recuperación | Solicitar enlace y cambiar contraseña | Vuelve a ingresar con la nueva | Pendiente |
| Roles reales | Probar admin, ventas, bodega y lectura | Se respetan permisos en API y DB | Pendiente |
| Usuarios simultáneos | Dos sesiones intentan agotar el mismo stock | No hay stock negativo ni venta parcial | Pendiente |
| Despliegue | Ejecutar flujo completo en URL Vercel | Funciona públicamente con acceso protegido | Pendiente |

Para reintentos por red: si no recibiste confirmación, actualiza y consulta el historial antes de crear otra operación. Las solicitudes repetidas con el mismo request_id son idempotentes, pero abrir un formulario nuevo genera otro identificador.

Para cambios al catálogo y operaciones hechas por otra persona, pulsa Actualizar; no hay sincronización en tiempo real en esta versión.

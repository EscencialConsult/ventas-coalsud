ESENCIAL CONSULTORA · EJECUCIÓN DEL PROYECTO

# Plan de Implementación por Tareas — MVP COALSUD
**v1.1 (plan general: backend + frontend)**

Esencial Consultora — El Alto / La Paz, Bolivia

Backlog del MVP, ordenado para que **nada quede parado**: cada tarea de frontend (`FE-xx`) entra cuando su backend (`BE-xx`) ya está construido. Se construye por **rebanadas verticales** (una capacidad completa a la vez). **La seguridad está desde el arranque:** la RLS se activa en el cimiento (BE-06) y hay una auditoría de seguridad antes de salir (BE-22).

Nada de precios, reglas ni permisos en el frontend: el frontend pide y la base decide. El detalle de cada tarea de frontend está en `frontend/docs/08-Plan_Implementacion_Frontend.md`.

**● Cambios v1.1:**
- Las tareas se separan en BE y FE.
- Se suman: Edge Function de usuarios, retorno, ajuste, hoja de carga, cartera inicial, resumen por período, caso dorado F3 y prueba de concurrencia.
- Total **~311 h** (v1.0: ~250 h). Estimaciones orientativas.

> **Puntos de control con el cliente (⚠).** Antes de cerrar el Sprint 4 hay que validar SUP-07 y SUP-14 (circuito preventa vs mercadería en poder del vendedor). Antes del Sprint 6, SUP-08, SUP-09, SUP-12 y SUP-51. Antes del Sprint 7, SUP-24 y SUP-26. Lo que se construya antes no depende de esas respuestas. Lista de preguntas: [Registro de Supuestos §3](../01-requerimiento/Registro_de_Supuestos.md).

---

## ● Estado al 28/10/2026 (entrega)

| TAREAS | ESTADO |
|---|---|
| BE-01, BE-03 a BE-19 | ✅ Hechas y aplicadas en `VENTAS-COALSUD` (dev) |
| BE-02 | ◐ Hay un solo proyecto (`VENTAS-COALSUD`, us-east-1, ⚙ DT-30); `prod` no existe. Auth ajustado: signups off, contraseña ≥ 8, solo `public` (⚙ DT-42, [Entornos §3](Entornos_y_Despliegue.md)) |
| BE-20 | ✅ `eecc_consolidado` + `app.saldo_documento` (⚙ DT-38) |
| BE-21 | ✅ Reportes, `reporte_movimiento_periodo`, `cumplimiento_presupuesto`, `dashboard_kpis`, `avisos_shell`, `v_auditoria` + `60_eecc_reportes.test.sql` (⚙ DT-31 a DT-37) |
| BE-22 | ✅ `verificar_stock`, `70_integridad.test.sql`, concurrencia y rendimiento ([Estrategia de Pruebas §6](Estrategia_de_Pruebas.md)); lecturas optimizadas (⚙ DT-39). Checklist RLS: ver [Seguridad RLS §10](../02-diseno/Seguridad_RLS.md) |
| BE-23 | ✖ No se hace (decisión del usuario, ⚙ DT-41) |
| FE-01, FE-03 a FE-24 | ✅ Conectadas al backend real ([Plan del frontend](../../../frontend/docs/08-Plan_Implementacion_Frontend.md)) |
| FE-02, FE-25, FE-26 | ⏳ Netlify, e2e Playwright y capacitación |

Pruebas: 14 archivos pgTAP en verde (333 pruebas) con `npm run db:test:remoto`; frontend `lint`, `typecheck`, `test` y `build` en verde.

## Sprint 0 · Setup (~26 h)
| ID | TAREA | H | DEPENDE |
|---|---|---|---|
| BE-01 | Carpeta `backend/` + Supabase CLI + `supabase init` + Docker local + `package.json` de scripts | 4 | — |
| BE-02 | Proyectos Supabase `dev` y `prod` (región sa-east-1); Auth: signups off, confirmación off, contraseña ≥ 8 | 3 | BE-01 |
| BE-03 | Script `gen-types.mjs` | 1 | BE-01 |
| FE-01 | Carpeta `frontend/`: Vite + React 19 + TS + Tailwind 4 + React Router 7 + TanStack Query + supabase-js + oxlint + Vitest | 6 | — |
| FE-02 | Hosting en Netlify (deploy preview + prod), variables de entorno, rewrite SPA con `_redirects` (⚙ DT-18) | 4 | FE-01 |
| FE-03 | Árbol `core/shared/features`, tokens del sistema de diseño, componentes base (botón, input, tabla, badge, modal, toaster) | 8 | FE-01 |

## Sprint 1 · Base de datos y Acceso (~44 h)
| ID | TAREA | H | DEPENDE |
|---|---|---|---|
| BE-04 | Migraciones 1–9: todas las tablas, checks e índices | 8 | BE-01 |
| BE-05 | Funciones de contexto (`app.*`), `app.error`, `app.auditar`, triggers base (updated_at, inmutable, set_regional, saldo, bloqueo de día, último nacional) | 6 | BE-04 |
| BE-06 | RLS por los 5 patrones + grants + bucket `facturas` con políticas + `10_rls.test.sql` | 6 | BE-05 |
| BE-07 | Edge Function `admin-usuarios` + `mi_perfil`, `hoy`, `marcar_password_cambiado` | 6 | BE-06 |
| BE-08 | Datos base reales (migración `datos_base`) + `seeds/20_usuarios_prueba.sql` | 2 | BE-07 |
| FE-04 | Login, cambio de contraseña obligatorio, `AuthProvider`, cierre por inactividad | 7 | BE-07 |
| FE-05 | Shell (sidebar por rol, topbar), `RolGuard`, selector de regional activa, mapeo de errores | 9 | FE-04 |

## Sprint 2 · Maestros (~28 h)
| ID | TAREA | H | DEPENDE |
|---|---|---|---|
| BE-09 | Seeds del catálogo de F3 (líneas con orden, productos) + condiciones de pago | 4 | BE-08 |
| BE-10 | Trigger de auditoría de maestros + pruebas de las políticas de maestros | 4 | BE-06 |
| FE-06 | Usuarios (nacional): listado, alta, edición, desactivación, reseteo | 5 | BE-07 |
| FE-07 | Clientes: listado con búsqueda y filtros, alta/edición | 6 | BE-10 |
| FE-08 | Vendedores | 3 | BE-10 |
| FE-09 | Catálogo: productos, líneas, condiciones de pago; configuración de regionales y almacenes | 6 | BE-10 |

## Sprint 3 · Inventario (~34 h)
| ID | TAREA | H | DEPENDE |
|---|---|---|---|
| BE-11 | RPC de ingreso, salida, retorno, traspaso y ajuste + numeración + `20_inventario.test.sql` | 12 | BE-05 |
| BE-12 | `v_stock`, `v_movimiento`, `kardex`, `saldo_vendedores` | 4 | BE-11 |
| FE-10 | Stock (almacén, vendedores, total) + alertas de mínimo | 5 | BE-12 |
| FE-11 | Formularios de documentos de inventario (ingreso, salida, retorno, traspaso, ajuste) | 8 | BE-11 |
| FE-12 | Historial de movimientos, kardex, saldo en poder de vendedores | 5 | BE-12 |

## Sprint 4 · Notas de venta (~44 h) ← núcleo
| ID | TAREA | H | DEPENDE |
|---|---|---|---|
| BE-13 | `emitir_nota_venta` (origen almacén/vendedor, foto de precios y condición, auditoría) + `30_ventas.test.sql` | 10 | BE-11 |
| BE-14 | `registrar_factura_nota` + `anular_nota_venta` + `v_nota_venta` + pruebas | 6 | BE-13 |
| BE-15 | `hoja_carga` | 2 | BE-13 |
| FE-13 | Formulario de nota (cliente → sugerencias, ítems con stock disponible, precio editable, total en vivo) | 10 | BE-13 |
| FE-14 | Historial y detalle de notas: factura + PDF, anular, indicadores | 8 | BE-14 |
| FE-15 | Impresión A5 duplicada en A4 + impresión de la hoja de carga | 8 | BE-14, BE-15 |

## Sprint 5 · Cobranzas y Devoluciones (~28 h)
| ID | TAREA | H | DEPENDE |
|---|---|---|---|
| BE-16 | `registrar_devolucion`, `max_devolvible`, `registrar_nc_contable`, `v_devolucion` + pruebas | 8 | BE-14 |
| BE-17 | `registrar_cobranzas`, `anular_cobranza`, `cargar_cartera_inicial`, `v_saldo_documento`, `v_cobranza`, `ingresos_vendedores` + `40_cobranzas.test.sql` | 8 | BE-14 |
| FE-16 | Devolución desde el detalle de la nota | 5 | BE-16 |
| FE-17 | Registrar cobro (cliente → documentos → importes), anular cobro, ingresos por vendedor (imprimible) | 7 | BE-17 |

## Sprint 6 · Liquidación / Reporte diario (~40 h) ← el corazón
| ID | TAREA | H | DEPENDE |
|---|---|---|---|
| BE-18 | `calcular_liquidacion`, `totales_liquidacion`, `reporte_liquidacion` + **caso dorado F3** | 12 | BE-16, BE-17 |
| BE-19 | `cerrar_liquidacion` (factura + secuencial), `reabrir_liquidacion` (último), `dias_pendientes_cierre` + `50_liquidacion.test.sql` | 8 | BE-18 |
| FE-18 | Pantalla de liquidación: matriz por línea, pie, arqueo, detalle de notas, cobranzas y devoluciones | 10 | BE-18 |
| FE-19 | Cierre y reapertura con sus validaciones, historial, días pendientes | 4 | BE-19 |
| FE-20 | Export Excel con formato de planilla (exceljs) | 6 | BE-18 |

## Sprint 7 · Reportes, EECC, Presupuesto, Auditoría (~37 h)
| ID | TAREA | H | DEPENDE |
|---|---|---|---|
| BE-20 | `eecc_consolidado` + pruebas con la cartera de F4 | 8 | BE-17 |
| BE-21 | Reportes (top clientes, productos, rotación, ventas por regional, movimiento por período), `cumplimiento_presupuesto`, `dashboard_kpis` + `60_eecc_reportes.test.sql` | 8 | BE-18 |
| FE-21 | EECC (nacional) + export con formato F4/F5 | 6 | BE-20 |
| FE-22 | Reportes + dashboard | 8 | BE-21 |
| FE-23 | Presupuesto: carga y cumplimiento | 4 | BE-21 |
| FE-24 | Auditoría (nacional) | 3 | BE-10 |

## Sprint 8 · Seguridad, pruebas y puesta en marcha (~30 h)
| ID | TAREA | H | DEPENDE |
|---|---|---|---|
| BE-22 | Auditoría de seguridad: checklist RLS, `70_integridad.test.sql`, `verificar_stock`, prueba de concurrencia, rendimiento (RNF-01) | 6 | todo BE |
| FE-25 | e2e Playwright priorizados: notas, liquidación, inventario, permisos | 10 | todo FE |
| BE-23 | Carga inicial real: catálogo con precios, clientes, vendedores, inventario inicial, cartera inicial; cierre del día de carga ([Datos Iniciales](Datos_Iniciales.md)) | 8 | BE-22 |
| FE-26 | Capacitación a cada regional + acompañamiento de la primera semana | 6 | BE-23 |

---

## Dependencias clave
- Sprint 1 depende del 0; **la RLS (BE-06) es el cimiento** de todo servicio.
- Las notas (S4) dependen de los maestros (S2) y del inventario (S3).
- La liquidación (S6) depende de notas, cobranzas, devoluciones y movimientos.
- El EECC (S7) depende de las cobranzas y de la cartera inicial (BE-17).
- Las pruebas (S8) dependen de todo.

## Resumen de horas
| SPRINT | BE | FE | TOTAL |
|---|---|---|---|
| 0 · Setup | 8 | 18 | 26 |
| 1 · Base y acceso | 28 | 16 | 44 |
| 2 · Maestros | 8 | 20 | 28 |
| 3 · Inventario | 16 | 18 | 34 |
| 4 · Notas | 18 | 26 | 44 |
| 5 · Cobranzas/Devoluciones | 16 | 12 | 28 |
| 6 · Liquidación | 20 | 20 | 40 |
| 7 · Reportes/EECC | 16 | 21 | 37 |
| 8 · Puesta en marcha | 14 | 16 | 30 |
| **Total** | **144** | **167** | **~311 h** |

## Cómo cargarlo en un gestor de tareas
- Lista = cada sprint. Tarea = cada ID (`BE-xx` / `FE-xx`).
- Campos: estimación (h), dependencia, CU/RF relacionado, ⚠ SUP que la condiciona.

ESENCIAL CONSULTORA · FRONTEND

# Plan de Implementación del Frontend — COALSUD
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

Detalle de las tareas `FE-xx` del [Plan general](../../backend/docs/04-ejecucion/Plan_Implementacion.md): qué se entrega, cuándo está terminada y de qué tarea del backend depende. **Total FE ≈ 167 h.**

**Definición de terminado** (toda tarea):
- `lint`, `typecheck`, `test` y `build` en verde;
- la pantalla sigue su especificación en `06-pantallas/`;
- los errores del contrato se presentan como dice la especificación;
- ● autorrevisión contra las reglas generales ([Stack §4.3](01-Stack_y_Convenciones.md)): requests, carga por sección, botones y errores;
- los CP E2E de la tarea pasan, o quedan escritos y marcados `fixme` si dependen de un backend que no está.

### ● Avance

> ● **28/10/2026: conectado al backend real.** Con el backend completo (BE-01 a BE-22) en el proyecto `VENTAS-COALSUD` (⚙ DT-30), el `.env` usa `VITE_MODO_DATOS=supabase`. Las filas "✅ modo fixtures" quedan funcionando contra Supabase. Se verificó contra la API real: las 40 lecturas (`from(...).select(...)`) responden, y cada `rpc()` usa argumentos que existen en su firma; las RPC nuevas responden como nacional y como regional, con sus permisos. Se corrigieron tres desajustes con la base: presupuesto (`categoria_cliente` y `usuario_id`, ⚙ DT-35), acciones y `datos` de auditoría (⚙ DT-37) y el movimiento por período en Bs (⚙ DT-32). `lint`, `typecheck`, `test` (97) y `build` en verde. Pendiente: FE-02 (Netlify), FE-25 (e2e Playwright) y FE-26 (capacitación).

| TAREA | ESTADO | NOTA |
|---|---|---|
| FE-01 Proyecto base | ✅ 26/10/2026 | React 19.3 · Vite 8.3 · TS 7 · Tailwind 4.3 · TanStack Query 5 · Router 7 · oxlint · Vitest |
| FE-02 Hosting | ⏳ pendiente | Netlify (⚙ DT-18): necesita conectar el repo; `public/_redirects` ya está |
| FE-03 Esqueleto y sistema de diseño | ✅ 26/10/2026 | Tokens, componentes base, `Tabla` responsive, `SeccionConsulta`, manejador global de errores, `/dev/ui` |
| FE-04 Autenticación | ✅ modo fixtures | Login con "Entrar como…", cambio de contraseña obligatorio, inactividad. La implementación supabase está escrita y falta probarla con BE-07 |
| FE-05 Shell, permisos y regional activa | ✅ 26/10/2026 | Menú por rol con badges, guards, selector, banner de días sin cerrar |
| FE-06 Usuarios | ✅ modo fixtures | Alta/edición con regionales, contraseña temporal generada, resetear, desactivar con confirmación (ULTIMO_NACIONAL). Lista filtrada en pantalla |
| FE-07 Clientes | ✅ modo fixtures | Listado con filtros en la URL, debounce y paginación de servidor; alta/edición (vendedor de la misma regional, canal sugerido); detalle con pestañas Notas y Saldo |
| FE-08 Vendedores | ✅ modo fixtures | Mercadería en poder (⚙ DT-24); desactivar con saldo → modal con productos y "Registrar retorno" |
| FE-09 Catálogo y configuración | ✅ modo fixtures | Productos (stock de la regional activa), líneas reordenables (arrastrar + flechas), condiciones, regionales y almacenes. Sin la carga de cartera (FE-17) |
| Pruebas del Sprint 2 | ⏳ al final | A pedido del usuario, los tests (unitarios y E2E) se escriben al final, junto con FE-25 |
| FE-10 Stock y kardex | ✅ modo fixtures | Stock agrupado por producto (almacén / vendedores / total; con "Todas", una columna por regional), filtros en la URL (`bajo_minimo=1` desde la campana), kardex por ubicación y período en modal |
| FE-11 Documento de inventario | ✅ modo fixtures | Un formulario para los 5 tipos (`/inventario/nuevo/:tipo`): fecha propia, disponible por fila, STOCK_INSUFICIENTE en la fila, DIA_CERRADO en banner, aviso al salir con cambios |
| FE-12 Movimientos, documentos y vendedores | ✅ modo fixtures | Movimientos y documentos con paginación de servidor; detalle del documento; "Recibido de …" en traspasos; saldo en poder por vendedor (Reglas §7.1). Imprimir/Excel de esta pestaña: con el export genérico de tablas (FE-22) |
| Pruebas del Sprint 3 | ⏳ al final | Junto con FE-25, como las del Sprint 2 |
| FE-13 Nueva nota | ✅ modo fixtures | Buscador de clientes en el servidor (propone vendedor, canal y condición), ítems con `useReducer`, disponible según origen (almacén o saldo del vendedor, con sugerencia si el vendedor lleva todo), precio editable con "modificado", totales en vivo, "Registrar e imprimir" |
| FE-14 Historial y detalle | ✅ modo fixtures | Filtros en la URL (fechas, estado, vendedor, condición, sin factura, búsqueda), detalle con factura + PDF (≤ 10 MB, ver con URL firmada), cuenta, anular con `Confirmacion` y motivo de bloqueo en el botón. "Devolver" y las cobranzas/devoluciones de la nota: Sprint 5 |
| FE-15 Impresión y hoja de carga | ✅ modo fixtures | `/imprimir/nota/:id` (A5 duplicada en A4, marca de agua si está anulada, 2 páginas con más de 12 ítems) y hoja de carga en pantalla e impresión (una página por vendedor, aviso de cambios desde la última impresión) |
| Pruebas del Sprint 4 | ⏳ al final | Junto con FE-25 |
| FE-16 Devoluciones | ✅ modo fixtures | "Devolver" en el detalle de notas de días cerrados (modal con máximo por producto, reembolso o abono, importe en vivo), devoluciones de la nota, listado `/devoluciones` con N° de NC contable |
| FE-17 Cobranzas | ✅ modo fixtures | `/cobranzas/nueva` (varios documentos, `?nota=` y `?cliente=`), cobranzas de la nota con anular (motivo obligatorio), rendimiento por vendedor `/reportes/vendedores` + impresión, carga de cartera inicial en Configuración (CSV con vista previa). Excel del rendimiento: con el export genérico de tablas (FE-22) |
| Pruebas del Sprint 5 | ⏳ al final | Junto con FE-25 |
| FE-18 Reporte del día | ✅ modo fixtures | Caja de arqueo con desglose por forma de pago, matriz F3 por línea (primera columna fija, "Sin movimiento" plegable, catálogo completo, Devolución/Ajuste solo si hay, traspaso con signo; cards en móvil), pie, créditos/detalle de notas con filtro por vendedor, cobranzas y devoluciones del día; pestaña Cobranzas con anular y "Registrar cobro" con la fecha del reporte |
| FE-19 Cerrar / reabrir / historial | ✅ modo fixtures | Cerrar en orden: días anteriores abiertos → facturas faltantes (carga en línea N° + PDF) → confirmación con el arqueo. Reabrir (nacional, solo el último día cerrado, motivo obligatorio). Historial con los días pendientes arriba |
| FE-20 Excel e impresión de la liquidación | ✅ modo fixtures | `liquidacion.excel.ts` (exceljs con import dinámico: celdas combinadas, colores de F3, formatos Q/Bs, paneles inmovilizados, horizontal a 1 página de ancho) e impresión A4 horizontal con encabezado repetido |
| Pruebas del Sprint 6 | ⏳ al final | Junto con FE-25 |
| FE-21 EECC | ✅ modo fixtures | `/eecc` (nacional): KPIs, un bloque por regional y categoría con columnas año anterior + meses, detalle de documentos por cliente, Excel F4/F5 (vencido y mora opcionales) e impresión horizontal |
| FE-22 Reportes | ✅ modo fixtures | `/reportes/*` en pestañas: top clientes, productos, rotación, por regional, rendimiento por vendedor y movimiento por período; Imprimir y Excel en todos (export genérico `excelTabla`). El dashboard ya consume su servicio; en fixtures, el cumplimiento sale de las mismas metas de Presupuesto |
| FE-23 Presupuesto | ✅ modo fixtures | Metas por regional, vendedor o categoría; real, avance, proyección y estado (Reglas §8); proyección de cierre por regional; alta/edición con DUPLICADO |
| FE-24 Auditoría | ✅ modo fixtures | `/auditoria` (nacional): filtros en la URL, resumen legible por acción (`resumenes.ts`), enlace al registro, "Ver datos" (JSON) y Excel de todo el filtro. En fixtures, las acciones de la demo quedan auditadas |
| Pruebas del Sprint 7 | ⏳ al final | Junto con FE-25 |
| Pantallas "en construcción" | ✅ retiradas | Todas las rutas del menú tienen pantalla; se quitó `EnConstruccion` |
| FE-22 (parcial) Dashboard | ✅ modo fixtures | KPIs, ventas por regional, cumplimiento, últimas notas |
| Rediseño visual (Sistema de Diseño v1.2) | ✅ 27/10/2026 | ⚙ DT-19 a DT-23: filtro de período del dashboard con calendario propio, Inter con cifras tabulares y menos texto en pantalla, tokens y densidad media, botones con relieve, sidebar contraíble, desplegables y tooltip propios, modales/drawer/toasts animados con motion, gráficos SVG (sparkline, anillo, barras), login con panel de marca |

---

## 0 · Cómo arrancar

El Sprint 0 del frontend (**FE-01, FE-02, FE-03**) **no depende del backend** y se puede empezar ya. Desde FE-04 (login) hace falta un Supabase con el esquema. Hay dos caminos para que el frontend no quede parado:

| OPCIÓN | QUÉ ES | PRO | CONTRA |
|---|---|---|---|
| A | Hacer en paralelo el mínimo del backend: BE-01, BE-04 a BE-08 (~30 h) y levantar `supabase start` local | El frontend trabaja contra el contrato real desde el día 1 | Requiere Docker y el backend avanzando a la par |
| **B ✅ ELEGIDA** (⚙ DT-17) | Servicios con **fixtures** (datos de ejemplo tipados con las formas del contrato) detrás de `VITE_MODO_DATOS=fixtures`; login con botones para simular el usuario | El frontend avanza solo | Trabajo extra (implementaciones fixture); riesgo de desalineación con el contrato, que se controla tipando los fixtures con `core/models` |

**Con la opción B:**
- FE-04 se hace en modo simulado.
- Cada tarea FE entrega la pantalla con su servicio `fixtures`.
- La implementación `supabase` de cada servicio se escribe cuando llega la tarea BE correspondiente, como una subtarea "conectar".

---

## Sprint 0 · Setup (18 h)

### FE-01 · Proyecto base (6 h)
- `npm create vite@latest frontend -- --template react-ts`; React 19, Vite 8.
- Dependencias de [Stack §2](01-Stack_y_Convenciones.md).
- Tailwind 4 con `@tailwindcss/vite`.
- Alias `@/`; `tsconfig` estricto.
- oxlint con el `.oxlintrc.json` de la referencia; Vitest + jsdom; Playwright instalado; `.env.example`; `lib/supabase.ts` (falla rápido si faltan las variables).
- **Listo cuando:** `npm run dev` muestra una página en blanco con la fuente cargada y `npm run build` pasa.

### FE-02 · Hosting (4 h)
- Sitio en Netlify con deploy preview por PR y producción desde `main`; variables por contexto; rewrite SPA con `public/_redirects` (igual que `comrural`).
- **Listo cuando:** una URL de preview muestra el build.

### FE-03 · Esqueleto y sistema de diseño (8 h)
- Árbol de [Estructura §2](03-Estructura_del_Proyecto.md); tokens `@theme` de [Diseño §1](04-Sistema_de_Diseno.md).
- Componentes base: `Button`, `Input`, `Select`, `Textarea`, `Badge`, `EstadoBadge`, `Card`, `KpiTile`, `Modal`, `Confirmacion`, `Toaster`, `EmptyState`, `Skeleton`, `TablaBuscador` (sin datos reales).
- `AppShell` con sidebar/topbar maquetados. Formatos de `shared/format` con sus tests unitarios.
- **Listo cuando:** existe una ruta interna `/dev/ui` (solo en dev) con todos los componentes; los tests de formato pasan.

## Sprint 1 · Acceso (16 h) — depende de BE-07

### FE-04 · Autenticación (7 h)
- `AuthProvider` (patrón de la referencia), `useSesion`, login, cambio de contraseña obligatorio, `useInactividad` con aviso (30 min), logout.
- `mapearError` + `acciones.ts` con el catálogo completo del contrato.
- **CP:** 02.1, 02.2, 02.5, 02.6.

### FE-05 · Shell real, permisos y regional activa (9 h)
- `RegionalActivaProvider`, `SelectorRegional`, `permisos.ts`, `RolGuard`, menú por rol con badges (placeholder hasta tener las RPC), `BannerDia`, `useHoy`.
- Router con lazy por área.
- **CP:** 02.4 (la UI no muestra acciones al nacional).

## Sprint 2 · Maestros (20 h) — depende de BE-07 y BE-10

| ID | PANTALLA | H | CP |
|---|---|---|---|
| FE-06 | [Usuarios](06-pantallas/03_Usuarios.md) | 5 | 01.1–01.4, 01.7 |
| FE-07 | [Clientes](06-pantallas/04_Clientes_y_Vendedores.md) (listado, filtros en la URL, modal, detalle) | 6 | 03.1–03.3 |
| FE-08 | [Vendedores](06-pantallas/04_Clientes_y_Vendedores.md) | 3 | 03.5 |
| FE-09 | [Catálogo y configuración](06-pantallas/05_Catalogo_y_Configuracion.md) (sin la carga de cartera, que va en FE-17) | 6 | 04.1, 04.2, 04.5 |

## Sprint 3 · Inventario (18 h) — depende de BE-11 y BE-12

| ID | ENTREGABLE | H | CP |
|---|---|---|---|
| FE-10 | Pestaña Stock + kardex + alertas (badge del menú) | 5 | 05.5 |
| FE-11 | Formulario genérico de documento de inventario (5 tipos) | 8 | 05.1, 05.2, 05.4, 05.7, 05.9 |
| FE-12 | Movimientos, documentos (detalle) y saldo de vendedores | 5 | 05.11 |

## Sprint 4 · Notas de venta (26 h) — depende de BE-13 a BE-15

| ID | ENTREGABLE | H | CP |
|---|---|---|---|
| FE-13 | [Nueva nota](06-pantallas/07_Notas_de_Venta.md): `BuscadorCliente` con sugerencias, ítems con `useReducer`, disponible por origen, precio editable con la marca "modificado", total en vivo, "Registrar e imprimir" | 10 | 06.1, 06.2, 06.10 |
| FE-14 | Historial con filtros + detalle: factura y PDF (Storage), ver PDF firmado, anular con `Confirmacion`, indicadores | 8 | 06.4, 06.7 |
| FE-15 | Impresión A5 duplicada en A4 + hoja de carga (pantalla e impresión) | 8 | 06.6, 06.19 |

## Sprint 5 · Cobranzas y devoluciones (12 h) — depende de BE-16 y BE-17

| ID | ENTREGABLE | H | CP |
|---|---|---|---|
| FE-16 | Modal de devolución + listado de devoluciones + N° NC contable | 5 | 06.9 |
| FE-17 | Registrar cobro (multi-documento), anular cobro, rendimiento por vendedor (pantalla + impresión), carga de cartera inicial (configuración) | 7 | 07.1, 07.2, 07.4, 07.6, 07.7 |

## Sprint 6 · Liquidación (20 h) — depende de BE-18 y BE-19

| ID | ENTREGABLE | H | CP |
|---|---|---|---|
| FE-18 | [Reporte del día](06-pantallas/09_Liquidacion.md): caja de arqueo, matriz por línea con "sin movimiento" plegable, columnas extra, pie, detalle de notas, cobranzas y devoluciones; pestaña Cobranzas | 10 | 08.1, 08.4, 08.5 |
| FE-19 | Cerrar (modales de validación) / reabrir (nacional) / historial / días pendientes | 4 | 08.7, 08.13, 06.5 |
| FE-20 | Excel e impresión con formato de planilla | 6 | 08.6 |

## Sprint 7 · Reportes, EECC, presupuesto, auditoría (21 h) — depende de BE-20 y BE-21

| ID | ENTREGABLE | H | CP |
|---|---|---|---|
| FE-21 | EECC + drawer de documentos + Excel con formato F4/F5 | 6 | 10.2, 10.3 |
| FE-22 | Reportes (6) + dashboard real | 8 | 10.1, 10.4, 10.5 |
| FE-23 | Presupuesto | 4 | 09.1, 09.2 |
| FE-24 | Auditoría | 3 | 11.1, 11.3 |

## Sprint 8 · Cierre (16 h)

| ID | ENTREGABLE | H |
|---|---|---|
| FE-25 | Suite e2e completa (ver [Estrategia de Pruebas](09-Estrategia_de_Pruebas_Frontend.md)), corrida contra local con seeds | 10 |
| FE-26 | Capacitación por regional (guion: circuito del día → notas → hoja de carga → cobros → cierre) + acompañamiento de la primera semana | 6 |

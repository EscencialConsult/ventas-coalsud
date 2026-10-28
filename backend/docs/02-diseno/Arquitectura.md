ESENCIAL CONSULTORA · DISEÑO DEL SISTEMA

# Arquitectura del Sistema — COALSUD S.R.L.
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

Diseño de la arquitectura técnica. El sistema es web, multiusuario y con roles por regional.
- **Stack:** React (frontend) + Supabase (backend central).
- **Operación:** **online** (⚠ SUP-05).
- La arquitectura del frontend está en `frontend/docs/02-Arquitectura_Frontend.md`.

**● Cambios v1.1:**
- Se agregan la **Edge Function** de administración de usuarios (crear cuentas exige `service_role`, que no puede ir en el navegador).
- La base se separa en dos esquemas (`public` / `app`).
- Las tablas transaccionales quedan de solo lectura para el cliente.
- Se fija la zona horaria y se completa la lista de RPC.

---

## 1 — Principios

- **100 % web y multiusuario, con vistas por rol y regional.** El regional ve solo sus regionales; el nacional ve todo.
- **La base manda.** La seguridad (RLS) y los cálculos (totales, arqueo, stock) viven en Postgres, no en el navegador. Si alguien consulta la API salteándose el React, las reglas siguen vigentes.
- **Centralizado.** Una sola base central (Supabase): única fuente de verdad.
- **Trazabilidad por usuario.** Cada operación sensible queda registrada con quién y cuándo (RF32).
- **La facturación es externa.** La factura legal la hace Contabilidad en otro sistema; el nuestro solo registra y adjunta el número.
- **● Un solo reloj.** "Hoy" es la fecha de Bolivia (`America/La_Paz`) calculada en la base, nunca en el navegador (RNF-29).

---

## 2 — Vista general

```
                              CENTRAL (NUBE) · Supabase (región sa-east-1, ⚠ SUP-40)
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │  Auth (email+contraseña, sin signup público)                                  │
   │  PostgREST API ── esquema public: tablas (RLS) · vistas · RPC security definer │
   │  Postgres ── esquema app: helpers de permisos, triggers, cálculos (privado)    │
   │  Storage ── bucket privado «facturas» (políticas por regional)                 │
   │  Edge Function «admin-usuarios» (usa service_role internamente) ●              │
   └──────────────────────────────────────────────────────────────────────────────┘
                                   │  HTTPS
        ┌──────────────────────────┼──────────────────────────┐
        ▼                          ▼                          ▼
   ADMIN LA PAZ+CBBA          ADMIN SANTA CRUZ           ADMIN NACIONAL
   (Vanessa)                  (Fernando)                 (Irene / ingeniero)
   React en el navegador      React en el navegador      React en el navegador
   carga inventario, notas,   igual, para SCZ            consolida, EECC, auditoría,
   cobranzas, cierra el día                              usuarios, catálogo, reabre día

   Frontend: build estático (Vite) publicado en Netlify (⚙ DT-18)
```

- **Central (nube):** Supabase guarda todos los datos, autentica y hace cumplir los permisos (RLS + RPC).
- **Clientes:** cada administrador usa la app React desde el navegador, contra la base central, con la clave pública `anon` + su JWT.
- **Impresión:** la nota de venta se imprime desde el navegador (`@media print`, A5 duplicada en A4). Los PDF de factura se adjuntan al Storage privado.

---

## 3 — Componentes y tecnologías

| CAPA | TECNOLOGÍA | ROL |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript | App web (detalle en `frontend/docs/01-Stack_y_Convenciones.md`) |
| UI | Tailwind CSS 4 (paleta de la demo: rojo `#c8401a`) | Pantallas, tablas, formularios |
| Estado / datos | TanStack Query 5 | Fetching, caché, invalidación |
| Ruteo | React Router 7 | Rutas + guards por rol |
| Central | Supabase: Postgres 15+, Auth, RLS, Storage, PostgREST | Datos, autenticación, permisos |
| Lógica crítica | Funciones RPC `security definer` + triggers (PL/pgSQL) | Totales, stock, cierre, traspaso, numeración |
| ● Administración de cuentas | Supabase Edge Function (Deno/TypeScript) | Crear/editar/desactivar usuarios y resetear contraseñas (⚠ SUP-30) |
| Export | exceljs (⚙ DT-09) | Excel de reportes con formato de planilla |
| Impresión | Ventana del navegador + `@media print` | Nota A5 duplicada en A4 |
| ● Pruebas | pgTAP (BD) · Vitest + Playwright (FE) | ⚙ DT-07 |
| Hosting | Netlify (frontend, ⚙ DT-18) · Supabase Cloud (backend, ⚠ SUP-40) | Publica la app |

---

## 4 — Qué va en el cliente vs en la base

| RESPONSABILIDAD | DÓNDE |
|---|---|
| Pantallas, formularios, navegación | React |
| Validación de UX (campos obligatorios, formatos) | React (**repetida** en la base) |
| Caché y sincronización | TanStack Query |
| **Autorización (quién ve o edita qué)** | **RLS + guardas dentro de cada RPC** |
| **Totales, saldos, arqueo, EECC** | **Vistas y funciones Postgres** |
| **Descuento de stock, traspaso espejo, salida/retorno** | **RPC + trigger de saldo** |
| **Anulación, devolución, cobranza, cierre, reapertura** | **RPC `security definer`** |
| **Numeración por regional** | **Tabla `correlativo` con bloqueo de fila, dentro de la RPC** |
| **Fecha de "hoy" y validación de fechas** | **`app.hoy()` en la base** |
| Cálculo del total *mientras se carga* la nota | React, **solo para mostrar**; el total válido lo devuelve la RPC |
| Export a Excel | React, sobre datos ya filtrados por RLS |

> El cliente propone; la base dispone. Nunca se calcula un total ni se decide un permiso en JavaScript para "confiar" en él al guardar.

---

## 5 — Superficie de la API

### 5.1 — Esquemas (⚙ DT-02)
| ESQUEMA | CONTENIDO | EXPUESTO POR LA API |
|---|---|---|
| `public` | Tablas, vistas de lectura, funciones RPC | Sí (PostgREST) |
| `app` | `hoy()`, `is_nacional()`, `mis_regionales()`, `puede_leer_regional()`, `puede_escribir_regional()`, `asegurar_dia_abierto()`, `siguiente_numero()`, `auditar()`, triggers, cálculos internos | **No** |

### 5.2 — Escrituras
| TIPO DE DATO | CÓMO SE ESCRIBE |
|---|---|
| Maestros: `cliente`, `vendedor`, `producto`, `linea_comercial`, `condicion_pago`, `regional`, `almacen`, `presupuesto` | `insert`/`update` directo, **protegido por RLS**; auditado por trigger |
| Transaccionales: notas, ítems, documentos y movimientos de inventario, devoluciones, cobranzas, cartera inicial, liquidación | **Solo por RPC** (sin políticas de escritura, ⚙ DT-03) |
| `stock_saldo`, `correlativo`, `auditoria` | Solo triggers y RPC internas |
| `usuario`, `usuario_regional`, `auth.users` | Solo la Edge Function `admin-usuarios` (más la RPC `marcar_password_cambiado` para el propio usuario) |

### 5.3 — RPC (resumen; contrato completo en [Contrato de API](../03-especificacion/Contrato_API.md))
| RPC | HACE |
|---|---|
| `emitir_nota_venta` | valida día, cliente, vendedor y stock; crea la nota con sus ítems; descuenta el origen; calcula el total; numera; audita precio y descuento |
| `registrar_factura_nota` ● | registra o corrige el N° y el PDF de la factura (permitido con el día cerrado); audita |
| `anular_nota_venta` | marca anulada, repone stock al origen (misma fecha de la nota), audita |
| `registrar_devolucion` | día de la nota cerrado; repone stock hoy en el almacén; reembolso o abono; audita |
| `registrar_ingreso` / `registrar_salida` ● / `registrar_retorno` ● / `registrar_ajuste` ● | documento de inventario + movimientos |
| `registrar_traspaso` | movimiento espejo origen → destino, atómico |
| `registrar_cobranzas` ● / `anular_cobranza` ● | imputación a documentos; anulación con día abierto |
| `cargar_cartera_inicial` ● | solo nacional; documentos de saldo inicial |
| `reporte_liquidacion` ● | matriz + totales + detalles (en vivo o snapshot) |
| `cerrar_liquidacion` | valida factura y cierre secuencial; congela snapshot; bloquea el día |
| `reabrir_liquidacion` | solo nacional y solo el último día cerrado; guarda el snapshot en la auditoría |
| `eecc_consolidado` | EECC a una fecha de corte (solo nacional) |
| `avisos_shell` ●, `hoja_carga` ●, `saldo_vendedores` ●, `ingresos_vendedores` ●, `kardex` ●, `reporte_*` ● (incluye `reporte_movimiento_periodo`), `cumplimiento_presupuesto` ●, `dashboard_kpis` ● | lecturas calculadas (`security invoker`: respetan la RLS) |

El resto (listar clientes, productos, notas o stock) son `select` normales, ya protegidos por la RLS.

### 5.4 — ● Edge Function `admin-usuarios`
- Recibe el JWT del llamador, verifica en la base que sea **nacional activo** y recién entonces usa la `service_role` (secreto del servidor) para operar `auth.users`, `usuario` y `usuario_regional`.
- Acciones: `crear`, `actualizar`, `desactivar`, `reactivar`, `resetear_password`.
- Rechaza dejar la base sin nacionales activos (también lo impide un trigger).

### 5.5 — Errores
Toda regla de negocio rechazada responde `errcode P0001`, con el **código en `hint`** (p. ej. `DIA_CERRADO`, `STOCK_INSUFICIENTE`) y detalles en `detail` (JSON). El frontend traduce por código (⚙ DT-06). El catálogo completo está en el [Contrato de API §2](../03-especificacion/Contrato_API.md).

---

## 6 — Selección de regional activa

Vanessa opera **dos** regionales. La barra superior lleva un **selector de regional activa** para quien tiene más de una:
- **Nacional:** "Todas" + cada regional (lectura consolidada).
- **Regional con una sola:** fija, sin selector.
- **Regional con varias:** selector entre las suyas.

La regional activa es un filtro de la interfaz y el `regional_id` que viaja en cada RPC. La base valida de todos modos que el usuario pueda escribir en ella.

---

## 7 — Entornos y despliegue

Detalle en [Entornos y Despliegue](../04-ejecucion/Entornos_y_Despliegue.md).
- **Entornos:**
  - `local`: Supabase CLI + Docker;
  - `dev`: proyecto Supabase de pruebas + deploy preview de Netlify;
  - `prod`: proyecto Supabase Pro + Netlify producción.
- **Variables del frontend** (`.env`, nunca en el repo): `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. La `service_role` vive solo en los secretos de la Edge Function y en la CLI de quien migra.
- **Migraciones:** todo cambio de esquema, RLS o función va como archivo SQL versionado en `backend/supabase/migrations/`. Nada "a mano" en el panel.
- **Tipos TypeScript:** se generan con `supabase gen types typescript` y se copian al frontend (⚙ DT-13).
- **Backups:** backups diarios de Supabase Pro + export periódico a Excel (requerimiento de resguardo).

---

## 8 — Seguridad (resumen)

- Supabase Auth + Row Level Security + guardas en las RPC (ver [Seguridad RLS](Seguridad_RLS.md)).
- Canal seguro (HTTPS/TLS); credenciales gestionadas por Supabase Auth; signups públicos deshabilitados.
- Auditoría de operaciones sensibles (solo se agrega).
- Cierre de sesión por inactividad a los 30 minutos (⚠ SUP-38).
- Un usuario desactivado queda bloqueado también en la base: las funciones de permisos exigen `usuario.activo`.

---

## 9 — Despliegue por etapas

- **MVP:** circuito completo sobre la base central (clientes → inventario → notas → cobranzas → liquidación → cierre → reportes), seguridad RLS desde el arranque, impresión por navegador, EECC y auditoría para el nacional.
- **Fase 2:** operación offline donde haga falta (⚠ SUP-05), traspaso en dos pasos (⚠ SUP-37), precio por regional (⚠ SUP-03), afinados de reportes y dashboard.

---

## 10 — Resumen del stack

React 19 + TypeScript + Vite + Tailwind 4 + TanStack Query + React Router 7 · Supabase (Postgres + Auth + RLS + Storage + PostgREST + RPC + Edge Function) · exceljs para Excel · impresión por navegador · hosting en Netlify. La factura la emite Contabilidad en otro sistema (externo).

ESENCIAL CONSULTORA · ESPECIFICACIÓN TÉCNICA

# Esquema de Base de Datos — COALSUD S.R.L.
**v1.1 · PostgreSQL 15+ (Supabase) · 26/10/2026**

Esencial Consultora — El Alto / La Paz, Bolivia

Especificación física: tablas, columnas, tipos, restricciones, índices, vistas, funciones y triggers. Es la fuente para escribir las migraciones en `backend/supabase/migrations/`. Si la migración y esta hoja difieren, se corrige una de las dos en el mismo PR.

El modelo lógico está en el [Modelo de Datos](../02-diseno/Modelo_de_Datos.md), las fórmulas en [Reglas de Cálculo](Reglas_de_Calculo.md) y las políticas en [Seguridad RLS](../02-diseno/Seguridad_RLS.md).

---

## 0 — Convenciones

| TEMA | REGLA |
|---|---|
| Esquemas | `public` (tablas, vistas, RPC) · `app` (helpers, triggers; no expuesto) (⚙ DT-02) |
| Nombres | `snake_case`, singular, en castellano; FK = `<tabla>_id` |
| PK | `id uuid primary key default gen_random_uuid()` (salvo `auditoria`, `correlativo` y `usuario_regional`) |
| Auditoría de fila | `created_at timestamptz not null default now()`; maestros y tablas con `UPDATE` permitido: `updated_at` (trigger `app.tg_set_updated_at`) |
| Dinero | `numeric(14,2)` · Porcentaje: `numeric(5,2)` · Cantidad: `numeric(14,2)` |
| Texto | `text`, recortado (`btrim`) en las RPC; vacíos → `null` |
| Vocabularios | `text` + `CHECK (… in (…))` (RNF-26: ampliar = una migración de una línea) |
| Borrado | Ninguna tabla de negocio admite `DELETE` de clientes (sin política); los maestros se desactivan con `activo = false` |
| Extensiones | `pgcrypto` (incluida), `pg_trgm` (búsqueda de clientes/productos), `pgtap` (solo pruebas) |
| Zona horaria | Las fechas de negocio son `date`, calculadas con `app.hoy()`; los instantes, `timestamptz` |

---

## 1 — Tablas

### 1.1 — `regional`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| codigo | text | no | | `unique`, `check (codigo ~ '^[A-Z]{2,5}$')` — prefijo de numeración (`LP`, `CBBA`, `SCZ`) |
| nombre | text | no | | `unique` |
| activo | boolean | no | true | |
| created_at / updated_at | timestamptz | no | now() | |

### 1.2 — `usuario`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | | PK, `references auth.users(id) on delete restrict` |
| nombre | text | no | | |
| email | text | no | | `unique` (minúsculas) |
| rol | text | no | | `check (rol in ('nacional','regional'))` |
| activo | boolean | no | true | |
| debe_cambiar_password | boolean | no | true | |
| created_at / updated_at | timestamptz | no | now() | |

Trigger `app.tg_ultimo_nacional` (before update/delete): rechaza (`ULTIMO_NACIONAL`) dejar 0 nacionales activos.

### 1.3 — `usuario_regional`
| COLUMNA | TIPO | NULL | RESTRICCIÓN |
|---|---|---|---|
| usuario_id | uuid | no | FK `usuario` on delete cascade |
| regional_id | uuid | no | FK `regional` |
| | | | PK `(usuario_id, regional_id)` |

Trigger: solo los usuarios con `rol = 'regional'` pueden tener filas.

### 1.4 — `vendedor`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| regional_id | uuid | no | | FK `regional` |
| nombre | text | no | | índice único `(regional_id, lower(nombre))` |
| telefono | text | sí | | |
| activo | boolean | no | true | |
| created_at / updated_at | timestamptz | no | now() | |

`unique (id, regional_id)`: destino de las FK compuestas que garantizan "vendedor de la misma regional" (§1.22).

Trigger `app.tg_vendedor_baja`: no permite `activo = false` si tiene saldo en `stock_saldo` > 0 (`VENDEDOR_CON_SALDO`).

### 1.5 — `almacen`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| regional_id | uuid | no | | FK `regional` |
| nombre | text | no | | `unique (regional_id, nombre)` |
| activo | boolean | no | true | |
| created_at / updated_at | timestamptz | no | now() | |

### 1.6 — `linea_comercial`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| nombre | text | no | | `unique` |
| orden | integer | no | 0 | orden en el reporte diario |
| activo | boolean | no | true | |
| created_at / updated_at | timestamptz | no | now() | |

### 1.7 — `producto`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| codigo | text | sí | | `unique` |
| nombre | text | no | | índice único `lower(nombre)`; índice GIN trigram |
| linea_id | uuid | no | | FK `linea_comercial` |
| orden | integer | no | 0 | orden dentro de la línea |
| precio_base | numeric(14,2) | no | | `check (precio_base >= 0)` |
| stock_minimo | numeric(14,2) | no | 0 | `check (stock_minimo >= 0)` (⚠ SUP-29) |
| activo | boolean | no | true | |
| created_at / updated_at | timestamptz | no | now() | |

### 1.8 — `condicion_pago`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| nombre | text | no | | `unique` |
| tipo | text | no | | `check (tipo in ('contado','credito'))` |
| dias | integer | no | 0 | `check (dias >= 0 and (tipo = 'credito' or dias = 0))` |
| orden | integer | no | 0 | |
| activo | boolean | no | true | |
| created_at / updated_at | timestamptz | no | now() | |

### 1.9 — `cliente`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| regional_id | uuid | no | | FK `regional` |
| nombre | text | no | | índice `(regional_id, lower(nombre))`; GIN trigram |
| razon_social | text | sí | | |
| nit | text | sí | | índice `(regional_id, nit)` |
| categoria | text | no | | `check (categoria in ('supermercado','mayorista','minorista','institucional'))` |
| canal | text | no | | `check (canal in ('supermercado','ruta','institucional'))` |
| vendedor_id | uuid | sí | | FK `vendedor` |
| condicion_pago_id | uuid | no | | FK `condicion_pago` |
| zona | text | sí | | |
| telefono · email · direccion | text | sí | | |
| activo | boolean | no | true | |
| created_at / updated_at | timestamptz | no | now() | |

Trigger `app.tg_cliente_vendedor`: `vendedor.regional_id = cliente.regional_id` (`VALIDACION`). `unique (id, regional_id)`: destino de la FK compuesta de §1.18.

### 1.10 — `documento_inventario`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| numero | text | no | | `unique (regional_id, numero)` |
| tipo | text | no | | `check (tipo in ('ingreso','salida','retorno','traspaso','ajuste'))` |
| regional_id | uuid | no | | FK `regional` (lo pone el trigger desde `almacen_id`) |
| almacen_id | uuid | no | | FK `almacen` |
| almacen_destino_id | uuid | sí | | FK `almacen`; `check ((tipo = 'traspaso') = (almacen_destino_id is not null))` |
| vendedor_id | uuid | sí | | FK `vendedor`; `check ((tipo in ('salida','retorno')) = (vendedor_id is not null))` |
| fecha | date | no | | |
| referencia | text | sí | | (N° de remito, proveedor…) |
| motivo | text | sí | | `check (tipo <> 'ajuste' or length(btrim(coalesce(motivo, ''))) > 0)` (sin `coalesce`, un `motivo` nulo pasaba el check) |
| usuario_id | uuid | no | | FK `usuario` |
| created_at | timestamptz | no | now() | |

Índices: `(regional_id, fecha)`, `(almacen_destino_id, fecha)`.

### 1.11 — `documento_inventario_item`
| COLUMNA | TIPO | NULL | RESTRICCIÓN |
|---|---|---|---|
| id | uuid | no | PK |
| documento_id | uuid | no | FK `documento_inventario` on delete cascade |
| producto_id | uuid | no | FK `producto`; `unique (documento_id, producto_id)` |
| cantidad | numeric(14,2) | no | `check (cantidad <> 0)` (> 0 salvo en ajuste; lo valida la RPC) |

### 1.12 — `movimiento_inventario` (libro mayor)
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| fecha | date | no | | |
| tipo | text | no | | `check (tipo in ('ingreso','salida','retorno','traspaso_salida','traspaso_entrada','venta','anulacion','devolucion','ajuste'))` |
| regional_id | uuid | no | | FK `regional` (trigger desde `almacen_id`, ⚙ DT-05) |
| almacen_id | uuid | no | | FK `almacen` |
| vendedor_id | uuid | sí | | FK `vendedor` (nulo = stock físico del almacén) |
| producto_id | uuid | no | | FK `producto` |
| cantidad | numeric(14,2) | no | | `check (cantidad <> 0)` |
| documento_id | uuid | sí | | FK `documento_inventario` |
| nota_venta_id | uuid | sí | | FK `nota_venta` |
| devolucion_id | uuid | sí | | FK `devolucion` |
| usuario_id | uuid | no | | FK `usuario` |
| created_at | timestamptz | no | clock_timestamp() | orden real de inserción (con `now()` empatan los de una misma transacción y el kardex queda sin orden) |
| | | | | `check (num_nonnulls(documento_id, nota_venta_id, devolucion_id) = 1)` |

Índices: `(regional_id, producto_id, fecha)`, `(regional_id, fecha, tipo)`, `(almacen_id, vendedor_id, producto_id, fecha, created_at)`, `(nota_venta_id)`, `(documento_id)`, `(devolucion_id)`.
Triggers: `app.tg_mov_set_regional` (before insert), `app.tg_bloqueo_dia` (before insert), `app.tg_mov_actualiza_saldo` (after insert), `app.tg_inmutable` (before update/delete).

### 1.13 — `stock_saldo` (⚙ DT-04)
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| almacen_id | uuid | no | | FK `almacen` |
| vendedor_id | uuid | sí | | FK `vendedor` |
| producto_id | uuid | no | | FK `producto` |
| regional_id | uuid | no | | FK `regional` |
| cantidad | numeric(14,2) | no | 0 | `check (cantidad >= 0)` |
| updated_at | timestamptz | no | now() | |
| | | | | `unique nulls not distinct (almacen_id, vendedor_id, producto_id)` |

Índice: `(regional_id, producto_id)`.

### 1.14 — `nota_venta`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| numero | text | no | | `unique (regional_id, numero)` |
| regional_id | uuid | no | | FK `regional` |
| fecha | date | no | | |
| cliente_id | uuid | no | | FK `cliente` |
| vendedor_id | uuid | no | | FK `vendedor` |
| canal | text | no | | mismo `check` que `cliente.canal` |
| condicion_pago_id | uuid | no | | FK `condicion_pago` |
| condicion_tipo | text | no | | `check (condicion_tipo in ('contado','credito'))` — foto |
| dias_credito | integer | no | 0 | `check (dias_credito >= 0)` — foto |
| fecha_vencimiento | date | | | `generated always as (fecha + dias_credito) stored` |
| descuento_pct | numeric(5,2) | no | 0 | `check (descuento_pct between 0 and 100)` |
| origen_stock | text | no | 'almacen' | `check (origen_stock in ('almacen','vendedor'))` (⚠ SUP-14) |
| numero_factura | text | sí | | `check (numero_factura is null or length(btrim(numero_factura)) between 1 and 30)` |
| factura_pdf_path | text | sí | | ruta en el bucket `facturas` |
| factura_registrada_en | timestamptz | sí | | |
| estado | text | no | 'emitida' | `check (estado in ('emitida','anulada'))` |
| motivo_anulacion | text | sí | | |
| anulada_por | uuid | sí | | FK `usuario` |
| anulada_en | timestamptz | sí | | `check ((estado = 'anulada') = (anulada_en is not null))` |
| observaciones | text | sí | | |
| usuario_id | uuid | no | | FK `usuario` |
| created_at / updated_at | timestamptz | no | now() | |

Índices: `(regional_id, fecha)`, `(cliente_id, fecha)`, `(vendedor_id, fecha)`, `(regional_id, numero_factura)`, parcial `(regional_id, fecha) where numero_factura is null and estado = 'emitida'`.
Triggers: `app.tg_bloqueo_dia` (salvo cambios solo de columnas de factura), `app.tg_nota_inmutable`, `app.tg_set_updated_at`.

### 1.15 — `nota_venta_item`
| COLUMNA | TIPO | NULL | RESTRICCIÓN |
|---|---|---|---|
| id | uuid | no | PK |
| nota_venta_id | uuid | no | FK `nota_venta` on delete cascade |
| producto_id | uuid | no | FK `producto`; `unique (nota_venta_id, producto_id)` (⚠ SUP-47) |
| cantidad | numeric(14,2) | no | `check (cantidad > 0)` |
| precio_base | numeric(14,2) | no | `check (precio_base >= 0)` — foto del catálogo |
| precio_aplicado | numeric(14,2) | no | `check (precio_aplicado >= 0)` |
| subtotal | numeric(14,2) | | `generated always as (round(cantidad * precio_aplicado, 2)) stored` |

### 1.16 — `devolucion`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| numero | text | no | | `unique (regional_id, numero)` |
| regional_id | uuid | no | | FK `regional` (= la de la nota) |
| fecha | date | no | | (= `app.hoy()` al registrar) |
| nota_venta_id | uuid | no | | FK `nota_venta` |
| tipo_reverso | text | no | | `check (tipo_reverso in ('reembolso','abono_cuenta'))` |
| motivo | text | no | | `check (length(btrim(motivo)) > 0)` |
| nc_contable_numero | text | sí | | N° de nota de crédito de Contabilidad (se carga después) |
| usuario_id | uuid | no | | FK `usuario` |
| created_at | timestamptz | no | now() | |

Índices: `(regional_id, fecha)`, `(nota_venta_id)`.

### 1.17 — `devolucion_item`
| COLUMNA | TIPO | NULL | RESTRICCIÓN |
|---|---|---|---|
| id | uuid | no | PK |
| devolucion_id | uuid | no | FK `devolucion` on delete cascade |
| producto_id | uuid | no | FK `producto`; `unique (devolucion_id, producto_id)` |
| cantidad | numeric(14,2) | no | `check (cantidad > 0)` |
| precio_aplicado | numeric(14,2) | no | foto del ítem de la nota |

### 1.18 — `cxc_saldo_inicial` (⚠ SUP-24)
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| regional_id | uuid | no | | FK `regional` |
| cliente_id | uuid | no | | FK compuesta `(cliente_id, regional_id)` → `cliente (id, regional_id)`: de la misma regional |
| numero_documento | text | no | | `unique (regional_id, numero_documento)` |
| fecha_documento | date | no | | |
| fecha_vencimiento | date | sí | | (nulo → se asume `fecha_documento`) |
| importe | numeric(14,2) | no | | `check (importe > 0)` — saldo pendiente a la fecha de carga |
| observaciones | text | sí | | |
| usuario_id | uuid | no | | FK `usuario` |
| created_at | timestamptz | no | now() | |

### 1.19 — `cobranza`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| numero | text | no | | `unique (regional_id, numero)` |
| regional_id | uuid | no | | FK `regional` (= la del documento) |
| fecha | date | no | | |
| nota_venta_id | uuid | sí | | FK `nota_venta` |
| cxc_saldo_inicial_id | uuid | sí | | FK `cxc_saldo_inicial`; `check (num_nonnulls(nota_venta_id, cxc_saldo_inicial_id) = 1)` |
| forma_pago | text | no | | `check (forma_pago in ('efectivo','transferencia','qr','cheque','deposito','otro'))` |
| referencia_pago | text | sí | | |
| importe | numeric(14,2) | no | | `check (importe > 0)` |
| estado | text | no | 'vigente' | `check (estado in ('vigente','anulada'))` |
| motivo_anulacion | text | sí | | |
| anulada_por | uuid | sí | | FK `usuario` |
| anulada_en | timestamptz | sí | | `check ((estado = 'anulada') = (anulada_en is not null))` |
| observaciones | text | sí | | |
| usuario_id | uuid | no | | FK `usuario` |
| created_at | timestamptz | no | now() | |

Índices: `(regional_id, fecha)`, `(nota_venta_id) where estado = 'vigente'`, `(cxc_saldo_inicial_id) where estado = 'vigente'`.

### 1.20 — `liquidacion`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| regional_id | uuid | no | | FK `regional`; `unique (regional_id, fecha)` |
| fecha | date | no | | |
| estado | text | no | 'abierta' | `check (estado in ('abierta','cerrada'))` |
| cerrada_por / cerrada_en | uuid / timestamptz | sí | | `cerrada_por` FK `usuario` |
| reabierta_por / reabierta_en | uuid / timestamptz | sí | | `reabierta_por` FK `usuario` |
| motivo_reapertura | text | sí | | |
| total_contado_bruto · total_credito_bruto · descuento_contado · descuento_credito · total_cobranzas · total_reembolsos · total_ventas · total_efectivo | numeric(14,2) | sí | | `check (estado = 'abierta' or (total_ventas is not null and total_efectivo is not null))` |
| created_at / updated_at | timestamptz | no | now() | |

Índice parcial: `(regional_id, fecha) where estado = 'abierta'`.

### 1.21 — `liquidacion_linea` (snapshot)
| COLUMNA | TIPO | NULL |
|---|---|---|
| id | uuid | no (PK) |
| liquidacion_id | uuid | no (FK on delete cascade; `unique (liquidacion_id, producto_id)`) |
| producto_id · linea_id | uuid | no |
| orden_linea · orden_producto | integer | no |
| producto_nombre · linea_nombre | text | no |
| precio_unit | numeric(14,2) | no |
| saldo_inicial · pedido · traspaso · devolucion · ajuste | numeric(14,2) | no (default 0) |
| venta_contado_q · venta_contado_bs · venta_credito_q · venta_credito_bs · total_ventas_q · total_ventas_bs | numeric(14,2) | no (default 0) |
| saldo_final | numeric(14,2) | no |

### 1.22 — `presupuesto`
| COLUMNA | TIPO | NULL | DEFAULT | RESTRICCIÓN |
|---|---|---|---|---|
| id | uuid | no | gen_random_uuid() | PK |
| periodo | text | no | | `check (periodo ~ '^\d{4}-(0[1-9]\|1[0-2])$')` |
| regional_id | uuid | no | | FK `regional` |
| vendedor_id | uuid | sí | | FK compuesta `(vendedor_id, regional_id)` → `vendedor (id, regional_id)`: de la misma regional (nulo = toda la regional) |
| categoria_cliente | text | sí | | mismo `check` que `cliente.categoria` |
| meta | numeric(14,2) | no | | `check (meta > 0)` |
| observaciones | text | sí | | |
| usuario_id | uuid | no | | FK `usuario`; lo pone `app.tg_presupuesto_usuario` con `auth.uid()` (⚙ DT-35) |
| created_at / updated_at | timestamptz | no | now() | |
| | | | | `unique nulls not distinct (periodo, regional_id, vendedor_id, categoria_cliente)` |

### 1.23 — `auditoria`
| COLUMNA | TIPO | NULL | DEFAULT |
|---|---|---|---|
| id | bigint | no | `generated always as identity` (PK) |
| usuario_id | uuid | sí | (nulo = proceso del sistema) |
| regional_id | uuid | sí | |
| accion | text | no | |
| entidad | text | no | (nombre de tabla) |
| entidad_id | text | no | |
| datos | jsonb | no | `'{}'` — `{antes, despues, contexto}` |
| created_at | timestamptz | no | now() |

Índices: `(created_at desc)`, `(entidad, entidad_id)`, `(usuario_id, created_at desc)`, `(regional_id, created_at desc)`, `(accion, created_at desc)`. Trigger `app.tg_inmutable` (before update/delete).

### 1.24 — `correlativo`
| COLUMNA | TIPO | NULL | RESTRICCIÓN |
|---|---|---|---|
| regional_id | uuid | no | FK `regional` |
| tipo_documento | text | no | `check (tipo_documento in ('nota_venta','ingreso','salida','retorno','traspaso','ajuste','devolucion','cobranza'))` |
| ultimo | integer | no | default 0 |
| | | | PK `(regional_id, tipo_documento)` |

---

## 2 — Vistas (`security_invoker = true`)

| VISTA | COLUMNAS PRINCIPALES | USO |
|---|---|---|
| `v_nota_venta` | todas las de `nota_venta` + `regional_codigo`, `cliente_nombre`, `cliente_nit`, `vendedor_nombre`, `condicion_nombre`, `bruto`, `descuento_bs`, `total`, `cobrado`, `abonado`, `saldo` (crédito; 0 si es contado o anulada), `pendiente_factura`, `tiene_devolucion`, `dia_cerrado` y `usuario_nombre` (⚙ DT-26) | Historial, detalle, impresión |
| `v_saldo_documento` | `tipo_doc` (`nota`/`saldo_inicial`), `documento_id`, `regional_id`, `cliente_id`, `cliente_nombre`, `vendedor_id`, `numero`, `numero_factura`, `fecha`, `fecha_vencimiento`, `importe`, `cobrado`, `abonado`, `saldo`, `vencido`, `dias_mora` (a hoy) | Pantalla de cobranza, saldo por cliente |
| `v_stock` | almacén: **todo producto activo en cada almacén visible** (cantidad 0 si nunca se movió, para alertar faltantes; los inactivos solo si tienen saldo), acotado con `mis_regionales()` porque producto y almacén los ve todo usuario activo; vendedor: sus filas de `stock_saldo`. Columnas: `ubicacion` (`almacen`/`vendedor`), `almacen_nombre`, `vendedor_nombre`, `producto_nombre`, `linea_id`, `linea_nombre`, `orden` (línea × 1000 + producto, ⚙ DT-25), `stock_minimo`, `bajo_minimo` (solo almacén, `cantidad < stock_minimo`), `precio_base` (⚙ DT-24) | Stock y alertas |
| `v_movimiento` | `movimiento_inventario` + nombres + `documento_numero` (doc/nota/devolución) + `usuario_nombre` | Historial de movimientos |
| `v_documento_inventario` (⚙ DT-25) | `documento_inventario` + `almacen_nombre`, `almacen_destino_nombre`, `regional_destino_id`, `vendedor_nombre`, `usuario_nombre`, `items` (cantidad de ítems) | Documentos de inventario (la regional destino ve los traspasos recibidos) |
| `v_devolucion` | `devolucion` + `importe`, `nota_numero`, `cliente_id`, `cliente_nombre`, `usuario_nombre` (⚙ DT-27) | Listado de devoluciones |
| `v_cobranza` | `cobranza` + `tipo_doc`, `cliente_id`, `cliente_nombre`, `documento_numero`, `numero_factura`, `vendedor_id`, `dia_cerrado`, `usuario_nombre` (⚙ DT-27) | Bloque de cobranzas, listados |
| `v_liquidacion` | `liquidacion` + `regional_codigo`, `cerrada_por_nombre` | Historial de liquidaciones |
| `v_auditoria` (⚙ DT-29, DT-37) | `auditoria` + `usuario_nombre` ('Sistema' si es nulo), `regional_codigo`, `registro` (N° del documento, fecha de la liquidación, nombre de la regional en la cartera inicial, período del presupuesto o nombre del maestro / usuario) | Auditoría (solo nacional, por la RLS de `auditoria`) |

---

## 3 — Funciones del esquema `app` (internas)

| FUNCIÓN | FIRMA | NOTAS |
|---|---|---|
| `hoy` | `() returns date` | `(now() at time zone 'America/La_Paz')::date` |
| `usuario_activo` · `is_nacional` · `mis_regionales` · `puede_leer_regional` · `puede_escribir_regional` | ver [Seguridad RLS §3](../02-diseno/Seguridad_RLS.md) | `stable security definer` |
| `error` | `(p_codigo text, p_mensaje text, p_detalle jsonb default null) returns void` | `raise exception using errcode = 'P0001', message = p_mensaje, hint = p_codigo, detail = p_detalle::text`. Habilitada a `authenticated` para las lecturas invoker que validan (⚙ DT-36) |
| `exigir_activo` | `() returns void` | usuario con `activo = false` → `USUARIO_INACTIVO` |
| `exigir_escritura` | `(p_regional uuid) returns void` | `exigir_activo()`; si no `puede_escribir_regional` → `NO_AUTORIZADO` |
| `exigir_nacional` | `() returns void` | `exigir_activo()`; si no es nacional → `SOLO_NACIONAL` |
| `ultimo_cierre` | `(p_regional uuid) returns date` | `max(fecha)` con `estado = 'cerrada'` (o `'-infinity'`) |
| `asegurar_dia_abierto` | `(p_regional uuid, p_fecha date) returns uuid` | [Reglas §11](Reglas_de_Calculo.md); crea y bloquea la fila de `liquidacion`, y recién después del bloqueo controla el cierre (un cierre concurrente ya se ve) |
| `siguiente_numero` | `(p_regional uuid, p_tipo text) returns text` | `insert … on conflict do update set ultimo = ultimo + 1 returning ultimo` (bloqueo de fila implícito) → `prefijo(tipo) \|\| regional.codigo \|\| '-' \|\| lpad(n, max(4, largo(n)), '0')` (sigue en `-10000`: `lpad` a 4 truncaría); nota de venta sin prefijo de tipo (`LP-0001`) |
| `mover` | `(p_fecha, p_tipo, p_almacen, p_vendedor, p_producto, p_cantidad, p_doc, p_nota, p_dev) returns void` | inserta el movimiento (los triggers hacen el resto) |
| `leer_items` | `(p_items jsonb, p_con_signo boolean default false) returns table (producto_id, cantidad)` | valida `[{producto_id, cantidad}]`: al menos uno, sin repetidos, producto activo, cantidad > 0 (≠ 0 con signo), 2 decimales como máximo |
| `registrar_documento` | `(p_tipo, p_almacen, p_vendedor, p_destino, p_fecha, p_referencia, p_motivo, p_items) returns jsonb` | núcleo de las 5 RPC de inventario: permiso sobre la regional real del almacén, día abierto (en las dos regionales si es traspaso, en orden fijo para evitar deadlocks), número, documento, movimientos y auditoría `registrar_<tipo>` |
| `auditar` | `(p_accion, p_entidad, p_entidad_id, p_regional, p_datos jsonb) returns void` | inserta en `auditoria` con `auth.uid()` |
| `calcular_liquidacion` | `(p_regional uuid, p_fecha date) returns setof app.t_linea_liquidacion` | Líneas en vivo ([Reglas §3.1](Reglas_de_Calculo.md)) |
| `totales_liquidacion` | `(p_regional uuid, p_fecha date) returns app.t_totales_liquidacion` | [Reglas §3.2–3.3](Reglas_de_Calculo.md) |
| `saldo_documento` | `(p_tipo text, p_id uuid, p_corte date default null) returns numeric` | [Reglas §5](Reglas_de_Calculo.md) (BE-20). Un documento; para muchos se usa `documentos_por_cobrar` |
| `comparte_regional` | `(p_usuario uuid) returns boolean` | el usuario comparte alguna regional con el de la sesión (política de `usuario`) |
| `carpeta_regional` | `(p_ruta text) returns uuid` | primera carpeta de una ruta de Storage como uuid, o null (políticas de `facturas`) |
| `usuario_json` · `validar_rol_regionales` · `asignar_regionales` · `auditar_usuario` | ver migración `perfil_y_usuarios` | helpers de las RPC `admin_*` (admin-usuarios, solo `service_role`) |
| `almacen_principal` | `(p_regional uuid) returns uuid` | el almacén activo más antiguo de la regional: de ahí descuenta la nota (el contrato no elige almacén) |
| `leer_items_nota` | `(p_items jsonb) returns table (producto_id, producto, cantidad, precio_base, precio_aplicado)` | `leer_items` + precio aplicado (≥ 0, 2 decimales) + foto del precio de catálogo |
| `importe_devolucion` | `(p_devolucion uuid) returns numeric` | `round(Σ cantidad × precio_aplicado × (1 − descuento/100), 2)` con el descuento de la nota (Reglas §4) |
| `cuenta_nota` | `(p_nota uuid) returns table (total, cobrado, abonado, reembolsado, saldo)` | cuenta de una nota (Reglas §1, §4, §5); topes de abono, reembolso y cobranza |
| `saldo_cartera` | `(p_cxc uuid) returns numeric` | importe − cobranzas vigentes de un documento de cartera inicial |
| `nombre_usuario` | `(p_id uuid) returns text` | solo el nombre, aunque la RLS de `usuario` oculte la fila (p. ej. quien envió un traspaso desde otra regional); lo usan las vistas |
| `verificar_stock` | `() returns table (almacen_id, vendedor_id, producto_id, saldo_tabla, saldo_movimientos)` | filas con diferencia; debe devolver 0 filas (BE-22; solo `postgres` / `service_role`) |
| `ventas_netas` | `(p_desde date, p_hasta date) returns table (origen, regional_id, fecha, nota_venta_id, cliente_id, vendedor_id, importe)` | partidas de ventas netas: + total de cada nota emitida del rango, − importe de cada devolución del rango con los datos de la nota (⚙ DT-31). Definer acotado a `mis_regionales()` (⚙ DT-39) |
| `documentos_por_cobrar` | `(p_corte date) returns table (tipo_doc, documento_id, regional_id, cliente_id, fecha, vence, saldo)` | notas a crédito y cartera inicial con su saldo a la fecha de corte, en conjuntos (EECC y CxC del dashboard). Incluye los saldados. Definer acotado a `mis_regionales()` (⚙ DT-39) |
| `tg_presupuesto_usuario` | trigger | `presupuesto.usuario_id := coalesce(auth.uid(), usuario_id)` (⚙ DT-35) |

---

## 4 — Triggers

| TRIGGER | TABLA(S) | MOMENTO | HACE |
|---|---|---|---|
| `tg_set_updated_at` | maestros, `nota_venta`, `liquidacion`, `presupuesto`, `usuario` | before update | `updated_at = now()` |
| `tg_auditar_maestro` (BE-10, migración `auditoria_maestros`) | `cliente`, `vendedor`, `producto`, `linea_comercial`, `condicion_pago`, `regional`, `almacen`, `presupuesto` | after insert/update | auditoría `crear` (`{despues: fila}`), `editar`, `desactivar`, `reactivar` o `cambio_precio_base` (si cambia `producto.precio_base`), con `{antes, despues}` **solo de las columnas que cambiaron**. Un update sin cambios reales no se audita. `regional_id` = la de la fila (o la propia, en `regional`) |
| `tg_mov_set_regional` | `movimiento_inventario`, `documento_inventario` | before insert | `regional_id := almacen.regional_id` |
| `tg_mov_actualiza_saldo` | `movimiento_inventario` | after insert | entrada: upsert en `stock_saldo`; salida: `update` (un upsert valida el `check` de la fila propuesta antes del conflicto y rechazaría salidas con saldo); si viola `check (cantidad >= 0)` → `STOCK_INSUFICIENTE` con detalle `{producto, disponible, solicitado, ubicacion}` |
| `tg_bloqueo_dia` | `nota_venta`, `cobranza`, `devolucion`, `documento_inventario`, `movimiento_inventario` | before insert/update | si `fecha ≤ app.ultimo_cierre(regional)` → `DIA_CERRADO` (también los días sin fila anteriores al último cierre, Reglas §11). En inventario, la regional se lee del almacén (el trigger corre antes que `tg_mov_set_regional`). En `nota_venta`, se ignoran los updates que solo tocan `numero_factura`, `factura_pdf_path`, `factura_registrada_en` y `updated_at` (⚠ SUP-06) |
| `tg_nota_inmutable` | `nota_venta` | before update | solo permite: `emitida → anulada` (+ columnas de anulación) y cambios de las columnas de factura |
| `tg_inmutable` | `nota_venta_item`, `movimiento_inventario`, `documento_inventario(_item)`, `devolucion_item`, `auditoria`, `liquidacion_linea` (update) | before update/delete | rechaza (`INMUTABLE`). `liquidacion_linea` permite delete solo dentro de `reabrir_liquidacion` (variable de sesión `app.reabriendo`) |
| `tg_cliente_vendedor` | `cliente` | before insert/update | vendedor de la misma regional |
| `tg_vendedor_baja` | `vendedor` | before update | sin saldo en su poder para desactivar |
| `tg_ultimo_nacional` | `usuario` | before update/delete | ≥ 1 nacional activo |
| `tg_regional_codigo` | `regional` | before update | no cambiar `codigo` si existe algún `correlativo.ultimo > 0` (`VALIDACION`) |
| `tg_usuario_regional_rol` | `usuario_regional` | before insert/update | solo usuarios con `rol = 'regional'` (`VALIDACION`) |
| `tg_presupuesto_usuario` (BE-21) | `presupuesto` | before insert | `usuario_id` = el usuario de la sesión (⚙ DT-35) |

---

## 5 — Tipos compuestos (`app`)

```sql
create type app.t_linea_liquidacion as (
  producto_id uuid, linea_id uuid, orden_linea int, orden_producto int,
  producto_nombre text, linea_nombre text, precio_unit numeric(14,2),
  saldo_inicial numeric(14,2), pedido numeric(14,2), traspaso numeric(14,2),
  devolucion numeric(14,2), ajuste numeric(14,2),
  venta_contado_q numeric(14,2), venta_contado_bs numeric(14,2),
  venta_credito_q numeric(14,2), venta_credito_bs numeric(14,2),
  total_ventas_q numeric(14,2), total_ventas_bs numeric(14,2),
  saldo_final numeric(14,2), con_movimiento boolean
);
create type app.t_totales_liquidacion as (
  total_contado_bruto numeric(14,2), total_credito_bruto numeric(14,2),
  descuento_contado numeric(14,2), descuento_credito numeric(14,2),
  total_cobranzas numeric(14,2), total_reembolsos numeric(14,2),
  total_ventas numeric(14,2), total_efectivo numeric(14,2)
);
```

---

## 6 — Orden de las migraciones

| # | ARCHIVO (`supabase/migrations/`) | CONTENIDO |
|---|---|---|
| 1 | `20261027000100_extensiones_y_esquemas.sql` | `pg_trgm`, esquema `app`, revocar `app` a `anon`/`authenticated`; quitar los privilegios por defecto de `anon`/`authenticated` sobre tablas y secuencias de `public` (los grants van explícitos en 12, Seguridad RLS §3.3) |
| 2 | `20261027000200_organizacion.sql` | regional, usuario, usuario_regional, vendedor, almacen |
| 3 | `20261027000300_catalogo.sql` | linea_comercial, producto, condicion_pago |
| 4 | `20261027000400_clientes.sql` | cliente |
| 5 | `20261027000500_inventario.sql` | documento_inventario(+item), movimiento_inventario, stock_saldo |
| 6 | `20261027000600_ventas.sql` | nota_venta(+item), devolucion(+item) |
| 7 | `20261027000700_cobranzas.sql` | cxc_saldo_inicial, cobranza |
| 8 | `20261027000800_liquidacion.sql` | liquidacion(+linea), tipos compuestos |
| 9 | `20261027000900_presupuesto_auditoria.sql` | presupuesto, auditoria, correlativo |
| 10 | `20261027180508_funciones_contexto.sql` | `app.hoy`, permisos, `app.error`, `app.auditar` |
| 11 | `20261027180512_triggers.sql` | triggers de §4 salvo `tg_auditar_maestro` (BE-10) |
| 12 | `20261027190924_rls.sql` | `enable rls` + políticas + grants |
| 12b | `20261027191957_perfil_y_usuarios.sql` | `mi_perfil`, `hoy`, `marcar_password_cambiado` y RPC `admin_*` (BE-07) |
| 12c | `20261027194041_datos_base.sql` | datos base reales: regionales, almacenes, condiciones de pago y líneas (BE-08) |
| 12d | `20261027194641_auditoria_maestros.sql` | `tg_auditar_maestro` (BE-10) |
| 13a | `20261027202021_lecturas_inventario.sql` | `v_stock`, `v_movimiento`, `v_documento_inventario`, `kardex`, `saldo_vendedores` (BE-12) |
| 13 | `<fecha>_vistas.sql` | resto de las vistas de §2 |
| 14 | `20261027195103_rpc_inventario.sql` | helpers (día abierto, numeración, mover, ítems) e ingreso, salida, retorno, traspaso y ajuste (BE-11). Kardex y saldos: BE-12 |
| 15a | `20261027203017_rpc_ventas.sql` | `emitir_nota_venta` (BE-13) |
| 15b | `20261027203444_factura_anulacion.sql` | `v_nota_venta`, `registrar_factura_nota`, `anular_nota_venta` (BE-14) |
| 15c | `20261027203804_hoja_carga.sql` | `hoja_carga` (BE-15) |
| 15d | `20261027204357_devoluciones.sql` | `registrar_devolucion`, `max_devolvible`, `registrar_nc_contable`, `v_devolucion`; `tg_bloqueo_dia` deja cargar `nc_contable_numero` con el día cerrado (BE-16) |
| 17a | `20261027205321_liquidacion.sql` | `calcular_liquidacion`, `totales_liquidacion`, `reporte_liquidacion` (BE-18) |
| 17b | `20261027205742_cierre_liquidacion.sql` | `cerrar_liquidacion`, `reabrir_liquidacion`, `dias_pendientes_cierre`, `v_liquidacion` (BE-19) |
| 16a | `20261027204749_cobranzas.sql` | `registrar_cobranzas`, `anular_cobranza`, `cargar_cartera_inicial`, `v_saldo_documento`, `v_cobranza`, `ingresos_vendedores` (BE-17) |
| 15 | `<fecha>_rpc_ventas.sql` | emitir, factura, anular, devolución, hoja de carga |
| 16 | `<fecha>_rpc_cobranzas.sql` | cobranzas, anulación, cartera inicial |
| 17 | `<fecha>_rpc_liquidacion.sql` | cálculo, reporte, cierre, reapertura |
| 18 | `<fecha>_rpc_reportes.sql` | EECC, vendedores, presupuesto, reportes, dashboard |
| 19 | `20261027190929_storage.sql` | bucket `facturas` + políticas |
| 18a | `20261028164451_eecc.sql` | `app.saldo_documento`, `eecc_consolidado` (BE-20) |
| 18b | `20261028164453_reportes.sql` | `app.ventas_netas`, reportes comerciales, `reporte_movimiento_periodo`, `tg_presupuesto_usuario`, `cumplimiento_presupuesto`, `dashboard_kpis`, `avisos_shell`, `v_auditoria` (BE-21) |
| 20 | `20261028164456_integridad.sql` | `app.verificar_stock` (BE-22) |
| 20b | `20261028170948_eecc_rendimiento.sql` | `eecc_consolidado` en conjuntos (BE-22, RNF-01) |
| 20c | `20261028173326_rendimiento_lecturas.sql` | `app.ventas_netas`, `reporte_productos_vendidos` definer acotados; `app.documentos_por_cobrar`; `dashboard_kpis` y `eecc_consolidado` sobre ella (BE-22, ⚙ DT-39) |

Todas las de la tabla existen y están aplicadas en dev (BE-04 a BE-22); las filas 13, 15, 16, 17 y 18 sin fecha son el plan original, repartido en las migraciones con fecha. Una migración aplicada no se edita: los cambios van en una nueva (como 20b y 20c). Las siguientes se crean con `supabase migration new <nombre>`, que les pone la fecha del día: así quedan siempre después de las anteriores. No usar fechas futuras a mano.

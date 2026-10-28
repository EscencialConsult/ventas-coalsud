ESENCIAL CONSULTORA · DISEÑO DEL SISTEMA

# Modelo de Datos — Sistema Comercial para COALSUD S.R.L.
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

Diseño lógico de la base de datos, derivado del [SRS v1.1](../01-requerimiento/SRS.md) y de los casos de uso (CU-01 a CU-12). El motor es **PostgreSQL 15+ (Supabase)**; la operación es online contra una única base central. El detalle físico (tipos, restricciones, índices, triggers) está en el [Esquema de Base de Datos](../03-especificacion/Esquema_BD.md).

**Convención:**
- `PK` = clave primaria · `FK→tabla` = clave foránea · `/campo` = derivado (lo calcula la base).
- Los tipos, roles y estados son valores controlados (`CHECK`).
- Los vocabularios que el negocio amplía (líneas, condiciones de pago) son tablas.
- Identificadores `uuid` (⚙ DT-15). Montos `numeric(14,2)` en Bs; cantidades `numeric(14,2)`.

**● Cambios v1.1 respecto de v1.0:**

| CAMBIO | MOTIVO |
|---|---|
| `inventario` → **`stock_saldo`** (por almacén **y vendedor**), mantenido solo por trigger | Saldo en poder del vendedor (⚠ SUP-07); bloqueo de fila contra sobreventa (⚙ DT-04) |
| `nota_salida` / `nota_salida_item` → **`documento_inventario`** / **`documento_inventario_item`** (ingreso, salida, retorno, traspaso, ajuste) | Un solo encabezado para todos los documentos de inventario; agrega retorno y ajuste |
| `movimiento_inventario` agrega `vendedor_id` y `documento_id`; quita `saldo_anterior` y `saldo_nuevo` (se calculan al leer) | Custodia del vendedor; sin derivados almacenados |
| Nueva **`condicion_pago`**; `nota_venta` copia `condicion_tipo`, `dias_credito` y `/fecha_vencimiento` | Mora del EECC (⚠ SUP-25) |
| `nota_venta.numero_factura` pasa a **admitir nulo**; agrega `origen_stock` | ⚠ SUP-06, SUP-14 |
| `devolucion` quita `cliente_id` y `afecta_caja`; agrega `tipo_reverso` y `nc_contable_numero` | 3FN (el cliente sale de la nota); ⚠ SUP-17 |
| `cobranza` quita `cliente_id` y `numero_factura`; agrega `cxc_saldo_inicial_id`, `estado` y `referencia_pago` | 3FN; ⚠ SUP-22, SUP-23, SUP-24 |
| Nuevas **`cxc_saldo_inicial`** y **`correlativo`** | Cartera inicial (⚠ SUP-24); numeración sin huecos (⚠ SUP-28) |
| `liquidacion_linea` agrega `devolucion`, `ajuste` y nombres congelados; `liquidacion` agrega descuentos, reembolsos y motivo de reapertura | ⚠ SUP-10, SUP-11, SUP-12, SUP-21 |
| `producto` agrega `orden` y `stock_minimo`; `cliente` agrega `zona`, `nit`, `razon_social` y `condicion_pago_id` | ⚠ SUP-29, SUP-49 |
| `usuario.id` = `auth.users.id`; agrega `email` y `debe_cambiar_password` | ⚠ SUP-30 |
| `auditoria` agrega `regional_id` | Filtro de la pantalla de auditoría |

---

## 1 — Diagrama entidad-relación

```
                 ┌──────────── usuario_regional ────────────┐
auth.users ─1:1─ usuario ──N:M──────────────────────────── regional
                                                              │1
       ┌──────────────┬──────────────┬───────────────┬────────┼─────────────┬──────────────┐
       │N             │N             │N              │N       │N            │N             │N
    almacen        vendedor       cliente        nota_venta  cobranza   liquidacion    presupuesto
       │1             │1            │1  │           │1  │1     ▲  ▲        │1
       │              │             │   └──N────────┘   │      │  │        │N
       │              │             │                   │N     │  │   liquidacion_linea
       │              │             │          nota_venta_item  │  │   (snapshot al cerrar)
       │              │             │                   │      │  │
       │              │             │N                  │1     │  └─── cxc_saldo_inicial ─N:1─ cliente
       │              │      cxc_saldo_inicial          └──1:N─┘          (cartera previa)
       │              │                                 devolucion ─1:N─ devolucion_item
       │              │                                 (liga a nota_venta original)
       │N             │N
  documento_inventario ─1:N─ documento_inventario_item
  (ingreso · salida · retorno · traspaso · ajuste)
       │1
       │N
  movimiento_inventario ◀── también lo originan nota_venta (venta/anulación) y devolucion
  (libro mayor: almacén + vendedor opcional + producto + cantidad con signo)
       │ trigger
       ▼
  stock_saldo (almacén, vendedor|null, producto) ── saldo vigente

linea_comercial ─1:N─ producto ─1:N─ (items, movimientos, stock, líneas de liquidación)
condicion_pago ─1:N─ cliente (por defecto), nota_venta
correlativo (regional, tipo_documento) ── último número emitido
auditoria ◀── cualquier entidad (entidad + entidad_id, solo se agrega)
```

---

## 2 — Entidades y atributos

### 2.1 — Seguridad y organización
| ENTIDAD | ATRIBUTOS |
|---|---|
| **regional** | PK id · codigo (`LP`/`CBBA`/`SCZ`, prefijo de numeración) · nombre · activo |
| **usuario** | PK id (= `auth.users.id`) · nombre · email · rol (`nacional`/`regional`) · activo · debe_cambiar_password |
| **usuario_regional** | PK (usuario_id, regional_id) — M:N; el nacional no lleva filas (ve todas) |
| **vendedor** | PK id · FK→regional · nombre · telefono · activo — **no es usuario del sistema** |
| **almacen** | PK id · FK→regional · nombre · activo (uno por regional en el arranque) |

### 2.2 — Catálogo y configuración
| ENTIDAD | ATRIBUTOS |
|---|---|
| **linea_comercial** | PK id · nombre · orden · activo |
| **producto** | PK id · codigo (nulo) · nombre · FK→linea_comercial · orden · precio_base · stock_minimo · activo |
| **condicion_pago** | PK id · nombre (`Contado`, `Crédito 30 días`…) · tipo (`contado`/`credito`) · dias · orden · activo |

### 2.3 — Inventario
| ENTIDAD | ATRIBUTOS |
|---|---|
| **documento_inventario** | PK id · numero (`NI-LP-0001`…) · tipo (`ingreso`/`salida`/`retorno`/`traspaso`/`ajuste`) · FK→regional · FK→almacen · FK→almacen (destino, solo traspaso) · FK→vendedor (salida/retorno) · fecha · referencia · motivo (obligatorio en ajuste) · FK→usuario · created_at |
| **documento_inventario_item** | PK id · FK→documento_inventario · FK→producto · cantidad (> 0; en ajuste, con signo ≠ 0) |
| **movimiento_inventario** | PK id · fecha · tipo (`ingreso`/`salida`/`retorno`/`traspaso_salida`/`traspaso_entrada`/`venta`/`anulacion`/`devolucion`/`ajuste`) · FK→regional · FK→almacen · FK→vendedor (nulo = en almacén) · FK→producto · cantidad (+/−, ≠ 0) · FK→documento_inventario \| FK→nota_venta \| FK→devolucion (exactamente uno) · FK→usuario · created_at · /saldo_anterior · /saldo_nuevo |
| **stock_saldo** | PK (almacen_id, vendedor_id, producto_id) · FK→regional · cantidad (≥ 0) · updated_at — *saldo vigente, solo por trigger* |

### 2.4 — Clientes y ventas
| ENTIDAD | ATRIBUTOS |
|---|---|
| **cliente** | PK id · FK→regional · nombre · razon_social · nit · categoria (`supermercado`/`mayorista`/`minorista`/`institucional`) · canal (`supermercado`/`ruta`/`institucional`) · FK→vendedor (nulo) · FK→condicion_pago (por defecto) · zona · telefono · email · direccion · activo |
| **nota_venta** | PK id · numero (`LP-0001`) · FK→regional · fecha · FK→cliente · FK→vendedor · canal · FK→condicion_pago · condicion_tipo · dias_credito · /fecha_vencimiento · descuento_pct · origen_stock (`almacen` por defecto / `vendedor`) · numero_factura (**nulo hasta registrarla**) · factura_pdf_path · factura_registrada_en · estado (`emitida`/`anulada`) · motivo_anulacion · anulada_por · anulada_en · observaciones · FK→usuario · created_at · updated_at · /subtotal · /descuento_bs · /total · /pendiente_factura |
| **nota_venta_item** | PK id · FK→nota_venta · FK→producto · cantidad · precio_base · precio_aplicado · /subtotal |

### 2.5 — Devoluciones, cobranzas y cartera
| ENTIDAD | ATRIBUTOS |
|---|---|
| **devolucion** | PK id · numero (`DEV-LP-0001`) · FK→regional · fecha (**hoy**) · FK→nota_venta (original) · tipo_reverso (`reembolso`/`abono_cuenta`) · motivo · nc_contable_numero (nulo) · FK→usuario · created_at · /importe |
| **devolucion_item** | PK id · FK→devolucion · FK→producto · cantidad · precio_aplicado (foto de la nota) |
| **cxc_saldo_inicial** | PK id · FK→regional · FK→cliente · numero_documento · fecha_documento · fecha_vencimiento · importe · observaciones · FK→usuario · created_at |
| **cobranza** | PK id · numero (`CB-LP-0001`) · FK→regional · fecha · FK→nota_venta \| FK→cxc_saldo_inicial (exactamente uno) · forma_pago (`efectivo`/`transferencia`/`qr`/`cheque`/`deposito`/`otro`) · referencia_pago · importe · estado (`vigente`/`anulada`) · motivo_anulacion · anulada_por · anulada_en · observaciones · FK→usuario · created_at |

### 2.6 — Liquidación diaria
| ENTIDAD | ATRIBUTOS |
|---|---|
| **liquidacion** | PK id · FK→regional · fecha · (único regional + fecha) · estado (`abierta`/`cerrada`) · cerrada_por · cerrada_en · reabierta_por · reabierta_en · motivo_reapertura — *totales congelados al cerrar (nulos mientras está abierta):* total_contado_bruto · total_credito_bruto · descuento_contado · descuento_credito · total_cobranzas · total_reembolsos · total_ventas · total_efectivo |
| **liquidacion_linea** | PK id · FK→liquidacion · FK→producto · FK→linea_comercial · orden_linea · orden_producto · producto_nombre · linea_nombre · precio_unit · saldo_inicial · pedido · traspaso (con signo) · devolucion · ajuste · venta_contado_q · venta_contado_bs · venta_credito_q · venta_credito_bs · total_ventas_q · total_ventas_bs · saldo_final — *snapshot congelado al cerrar* |

### 2.7 — Presupuesto, auditoría y numeración
| ENTIDAD | ATRIBUTOS |
|---|---|
| **presupuesto** | PK id · periodo (`2026-10`) · FK→regional · FK→vendedor (nulo) · categoria_cliente (nulo) · meta (Bs) · observaciones · FK→usuario · created_at · updated_at |
| **auditoria** | PK id (bigint) · FK→usuario (nulo = sistema) · FK→regional (nulo) · accion · entidad · entidad_id · datos (jsonb: antes/después/contexto) · created_at — *solo se agrega* |
| **correlativo** | PK (regional_id, tipo_documento) · ultimo — *lo usan las RPC con bloqueo de fila* |

---

## 3 — Relaciones principales

| RELACIÓN | CARDINALIDAD | NOTA |
|---|---|---|
| regional — usuario (vía usuario_regional) | N:M | Vanessa = LP + CBBA |
| regional — almacen / vendedor / cliente | 1:N | Por regional |
| linea_comercial — producto | 1:N | El orden de ambos define la planilla |
| documento_inventario — documento_inventario_item | 1:N | Composición |
| documento_inventario / nota_venta / devolucion — movimiento_inventario | 1:N | Todo movimiento tiene un único origen |
| almacen × vendedor × producto — stock_saldo | 1 fila por combinación | `vendedor_id` nulo = stock físico del almacén |
| nota_venta — nota_venta_item | 1:N | Composición |
| nota_venta — devolucion | 1:N | Varias devoluciones parciales por nota |
| nota_venta / cxc_saldo_inicial — cobranza | 1:N | Pagos parciales |
| liquidacion — liquidacion_linea | 1:N | Snapshot al cerrar |
| cualquier entidad — auditoria | 1:N | Transversal, solo se agrega |

---

## 4 — Cálculos clave (viven en la base, no en el cliente)

Fórmulas completas y ejemplos en [Reglas de Cálculo](../03-especificacion/Reglas_de_Calculo.md).

| CÁLCULO | FÓRMULA |
|---|---|
| Subtotal ítem | `round(cantidad × precio_aplicado, 2)` |
| Total nota | `round(Σ subtotales × (1 − descuento_pct/100), 2)` |
| Stock (almacén o vendedor) | Σ `movimiento_inventario.cantidad` de esa ubicación (= `stock_saldo`) |
| Stock de la regional | Σ movimientos de todas las ubicaciones de la regional |
| Saldo final (producto/día) ● | `saldo_inicial + pedido ± traspaso + devolucion ± ajuste − contado_q − credito_q` |
| Total Ventas (día) ● | `Contado neto + Crédito neto` |
| Total Efectivo (día) ● | `Contado neto + Cobranzas − Reembolsos` |
| Saldo por cobrar de un documento ● | `importe − Σ cobranzas vigentes − Σ devoluciones con abono a cuenta` |
| Vencimiento ● | `fecha + dias_credito` |

---

## 5 — Notas de diseño

- **El stock es un libro mayor con dos niveles.** El stock nunca se edita: se asienta un `movimiento_inventario` con signo. Cada fila dice en qué almacén está la mercadería y, si `vendedor_id` no es nulo, que está **en poder de ese vendedor**.
  - En preventa (por defecto, `origen_stock = 'almacen'`), la nota descuenta el almacén y el nivel del vendedor no se usa; la hoja de carga es un reporte.
  - En la modalidad "mercadería en poder del vendedor" (`origen_stock = 'vendedor'`), sí se usa.
  - El mismo modelo sirve para las dos, sin cambios de tablas (⚠ SUP-07, SUP-14).
  - La salida y el retorno son dos filas que se compensan dentro de la regional.
  - El traspaso son dos filas en regionales distintas; la cantidad no viaja duplicada.
  - *(RF08, RF09, RF34, Q6, Q13, ⚠ SUP-07)*
- **El saldo vigente se mantiene por trigger.** `stock_saldo` lo actualiza solo un trigger al insertar movimientos, que rechaza saldos negativos. Es la única tabla de saldos y una desviación consciente (ver [Normalización](Normalizacion.md) §4.3).
- **Los totales no se almacenan: se calculan.** El total de la nota, el saldo por cobrar y el arqueo de un día abierto salen de vistas y funciones. Solo el día **cerrado** guarda totales, porque es un snapshot.
- **El día cerrado se congela.** Al cerrar, `liquidacion_linea` y los totales de `liquidacion` guardan el snapshot inmutable; un trigger bloquea notas, cobranzas, devoluciones y movimientos de esa fecha y regional. *(RF24, RF33, Q20)*
- **precio_base vs precio_aplicado.** Uno es la referencia del catálogo, el otro lo efectivamente cobrado (editable en la nota); la diferencia se audita. *(RF16, Q11)*
- **Fotos históricas en la nota.** `condicion_tipo`, `dias_credito` y `precio_base` se copian al emitir: si mañana cambia la condición o el precio del catálogo, la nota vieja no cambia.
- **Auditoría transversal sin FK rígida.** `auditoria` usa `entidad + entidad_id` para trazar cualquier registro con una sola estructura; solo se agrega.
- **El EECC no es una tabla.** Es una **función con fecha de corte** que consolida notas a crédito, cartera inicial, cobranzas y abonos *(RF30, Q1, ⚠ SUP-27)*.
- **Numeración sin huecos.** `correlativo` se bloquea por fila dentro de la RPC que emite. Si la transacción falla, el número no se consume. *(⚠ SUP-28)*

---

## 6 — Resumen

| ÁREA | TABLAS |
|---|---|
| Seguridad y organización | regional, usuario, usuario_regional, vendedor, almacen |
| Catálogo y configuración | linea_comercial, producto, condicion_pago |
| Inventario | documento_inventario, documento_inventario_item, movimiento_inventario, stock_saldo |
| Clientes y ventas | cliente, nota_venta, nota_venta_item |
| Devoluciones, cobranzas y cartera | devolucion, devolucion_item, cobranza, cxc_saldo_inicial |
| Liquidación | liquidacion, liquidacion_linea |
| Presupuesto, auditoría y numeración | presupuesto, auditoria, correlativo |
| **Total** | ● **24 tablas** + vistas `v_nota_venta`, `v_saldo_documento`, `v_stock` + funciones de reporte (liquidación, EECC, reportes) |

Cada dato vive en un solo lugar: el stock sale de los movimientos, los totales se calculan, y lo que importa para la rendición de cuentas queda en `auditoria`.

---

## 7 — Puntos de extensión
- **Precio por regional.** Hoy el precio es único por producto (⚠ SUP-03); si hiciera falta, se agrega `producto_precio_regional` sin tocar el resto.
- **Mínimo por almacén.** Hoy es único por producto (⚠ SUP-29); se extiende con `producto_minimo_almacen`.
- **Traspaso en dos pasos.** Si se requiere confirmar la recepción (⚠ SUP-37), se agrega el estado `en_transito` al documento de traspaso.
- **Operación offline.** Hoy online (⚠ SUP-05).
- **Integración fiscal.** Fuera de alcance: la factura la hace Contabilidad; solo se cruza el número.

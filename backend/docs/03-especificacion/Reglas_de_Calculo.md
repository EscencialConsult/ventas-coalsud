ESENCIAL CONSULTORA · ESPECIFICACIÓN TÉCNICA

# Reglas de Cálculo — COALSUD S.R.L.
**v1.1 · 26/10/2026**

Esencial Consultora — El Alto / La Paz, Bolivia

Define **cómo se calcula** cada número que muestra el sistema. Todo se calcula en Postgres (vistas y funciones); el frontend solo muestra. Si un número de pantalla no coincide con esta hoja, el error está en el código, no en la hoja.

Los supuestos (⚠ SUP-xx) se detallan en el [Registro de Supuestos](../01-requerimiento/Registro_de_Supuestos.md).

---

## 0 — Convenciones

| TEMA | REGLA |
|---|---|
| Moneda | Bs, `numeric(14,2)`. Redondeo con `round(x, 2)` (mitad hacia arriba, en valor absoluto) **una vez**, al final de cada importe de documento |
| Cantidades | `numeric(14,2)` (se admiten fracciones, p. ej. kg a granel) |
| "Hoy" | `app.hoy() = (now() at time zone 'America/La_Paz')::date` (RNF-29) |
| Ventas | Solo cuentan las notas con `estado = 'emitida'`; las anuladas nunca suman |
| Cobranzas | Solo cuentan las de `estado = 'vigente'` |
| Signo del stock | `movimiento_inventario.cantidad` es positivo si entra a la ubicación y negativo si sale |
| Ubicación | Almacén (`vendedor_id` nulo) o almacén + vendedor (en poder del vendedor) |

---

## 1 — Nota de venta

| CONCEPTO | FÓRMULA |
|---|---|
| Subtotal ítem | `round(cantidad × precio_aplicado, 2)` (columna generada) |
| Bruto nota | `Σ subtotal` de sus ítems |
| Total nota | `round(bruto × (1 − descuento_pct / 100), 2)` |
| Descuento Bs | `bruto − total` |
| Vencimiento | `fecha + dias_credito` (contado: `dias_credito = 0`) |
| Pendiente de factura | `numero_factura is null and estado = 'emitida'` |
| Total en letras (impresión) | Lo arma el frontend a partir del total devuelto por la base: "Son: Seiscientos veintiuno 00/100 Bolivianos" |

**Ejemplo (CP-06.18):** ítems 230 + 220 + 240 = bruto 690.00 · descuento 10 % → total `round(690 × 0.90, 2)` = **621.00** · descuento Bs 69.00.

---

## 2 — Stock

| CONCEPTO | FÓRMULA |
|---|---|
| Stock de una ubicación | `Σ cantidad` de sus movimientos (= `stock_saldo.cantidad`) |
| Stock físico del almacén | ubicación con `vendedor_id is null` |
| Saldo en poder del vendedor *v* | `Σ cantidad` de los movimientos con `vendedor_id = v` |
| Stock de la regional | `Σ cantidad` de todos los movimientos con `regional_id = r` (almacén + vendedores) |
| Stock a una fecha *D* | ídem, filtrando `fecha ≤ D` |
| Kardex (saldo anterior / nuevo) | Suma acumulada por ubicación y producto, ordenada por `(fecha, created_at, id)`: `saldo_nuevo = sum(cantidad) over (…)`; `saldo_anterior = saldo_nuevo − cantidad` |
| Bajo mínimo | `stock físico del almacén < producto.stock_minimo` (⚠ SUP-29) |

**Movimientos que genera cada operación:**

| OPERACIÓN | MOVIMIENTOS (por producto) | FECHA |
|---|---|---|
| Ingreso | almacén `+q` (`ingreso`) | la elegida |
| Salida a vendedor | almacén `−q` (`salida`) · vendedor `+q` (`salida`) | la elegida |
| Retorno | vendedor `−q` (`retorno`) · almacén `+q` (`retorno`) | la elegida |
| Traspaso | almacén origen `−q` (`traspaso_salida`) · almacén destino `+q` (`traspaso_entrada`) | la elegida (ambos lados) |
| Ajuste | almacén `±q` (`ajuste`) | la elegida |
| Venta | almacén `−q` (preventa, por defecto) o vendedor `−q` si vende desde su saldo (`venta`) | la de la nota |
| Anulación | `+q` en la misma ubicación de la venta (`anulacion`) | **la de la nota** (no la de hoy) |
| Devolución | almacén `+q` (`devolucion`) | hoy |

---

## 3 — Liquidación / reporte diario (regional *r*, fecha *D*)

### 3.1 — Columnas por producto *p*
Sea `M` = movimientos con `regional_id = r` y `producto_id = p`.

| COLUMNA | FÓRMULA | ORIGEN |
|---|---|---|
| P/Unit | `producto.precio_base` vigente (al cerrar, se congela) | ⚠ SUP-04 |
| **Saldo Inicial** | `Σ M.cantidad` con `fecha < D` | ⚠ SUP-08 |
| **Pedido** | `Σ M.cantidad` con `fecha = D` y `tipo = 'ingreso'` | ⚠ SUP-08 |
| **Traspaso** (±) | `Σ M.cantidad` con `fecha = D` y `tipo in ('traspaso_entrada','traspaso_salida')` | ⚠ SUP-09 |
| Devolución | `Σ M.cantidad` con `fecha = D` y `tipo = 'devolucion'` | ⚠ SUP-10 |
| Ajuste (±) | `Σ M.cantidad` con `fecha = D` y `tipo = 'ajuste'` | ⚠ SUP-10 |
| **Contado Q / Bs** | `Σ item.cantidad` / `Σ item.subtotal` de las notas emitidas de *r* con `fecha = D` y `condicion_tipo = 'contado'` | bruto (⚠ SUP-11) |
| **Crédito Q / Bs** | ídem con `condicion_tipo = 'credito'` | bruto |
| **Total Ventas Q / Bs** | Contado + Crédito | |
| **Saldo Final** | `SI + Pedido + Traspaso + Devolución + Ajuste − Contado Q − Crédito Q` | |

**Invariante (se prueba en pgTAP):** `Saldo Final = Σ M.cantidad con fecha ≤ D`. Se cumple porque:
- salida y retorno se compensan dentro de la regional;
- la venta de una nota anulada y su anulación tienen la misma fecha y se cancelan;
- las ventas de las notas emitidas son exactamente `−(Contado Q + Crédito Q)`.

**Productos que aparecen:**
- **Pantalla:** primero los que tienen algún valor ≠ 0 en Pedido, Traspaso, Devolución, Ajuste o Total Q; después, plegados, el resto de los activos.
- **Export:** todos los activos, más los inactivos con algún valor ≠ 0.
- **Orden:** `linea_comercial.orden`, `producto.orden`, `producto.nombre`.

Las columnas Devolución y Ajuste se muestran solo si alguna fila del día tiene un valor ≠ 0 en ellas.

### 3.2 — Pie de la matriz (como la planilla)
| FILA | CONTADO | CRÉDITO | TOTAL |
|---|---|---|---|
| TOTAL VENTAS | `Σ Contado Bs` | `Σ Crédito Bs` | suma |
| DESCUENTOS | `Σ (bruto − total)` de las notas contado | ídem crédito | suma |
| TOTALES | Contado neto | Crédito neto | **Total Ventas** |

### 3.3 — Arqueo (caja resumen)
| CONCEPTO | FÓRMULA |
|---|---|
| Contado | Contado neto |
| Crédito | Crédito neto |
| Cobranzas | `Σ cobranza.importe` vigentes de *r* con `fecha = D` |
| Reembolsos | `Σ importe` de las devoluciones de *r* con `fecha = D` y `tipo_reverso = 'reembolso'` (fila visible solo si > 0) |
| **Total Ventas** | `Contado neto + Crédito neto` |
| **Total Efectivo** | `Contado neto + Cobranzas − Reembolsos` (⚠ SUP-12) |
| Desglose informativo | Cobranzas por `forma_pago` |

### 3.4 — Bloques de detalle
- **Notas del día** (⚠ SUP-13, SUP-46): todas las notas de *r* con `fecha = D`. Columnas: N° de nota, N° de factura (o "PENDIENTE"), cliente, vendedor, condición, total neto, estado. Subtotales: crédito, contado y total (= Total Ventas). Las anuladas, al final y tachadas, sin sumar.
- **Cobranzas del día:** N° de cobranza, cliente, documento (nota/factura o "Saldo inicial N°…"), forma de pago, referencia, importe. Total = Cobranzas.
- **Devoluciones del día** (si hay): N° de devolución, nota original, cliente, tipo, importe.

### 3.5 — Cierre
Al cerrar:
- se insertan las líneas del export en `liquidacion_linea`, con nombres, orden y precio congelados;
- se guardan en `liquidacion` los totales de §3.2 y §3.3.

Una vez cerrado, `reporte_liquidacion` lee **solo** del snapshot.

### 3.6 — Verificación con la planilla real (F3, La Paz, 11/06/2026) — caso CP-08.10
| PRODUCTO | P/U | SI | PEDIDO | TRASP. | CONT Q | CONT Bs | CRÉD Q | CRÉD Bs | SF | TOT Q | TOT Bs |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Quinua Tricolor 1 kg | 44 | 15 | | | 9 | 396.00 | 6 | 264.00 | **0** | 15 | 660.00 |
| Quinua Blanca 1 kg | 44 | 22 | 5 | | 24 | 1,056.00 | | | **3** | 24 | 1,056.00 |
| Jugo Quinua Manzana 300 ml | 7 | 50 | | +5 | 20 | 140.00 | 6 | 39.00 | **29** | 26 | 179.00 |
| Barra de Chocolate 30 gr | 4.5 | 92 | | +11 | 60 | 270.00 | 30 | 135.00 | **13** | 90 | 405.00 |

`15 − 9 − 6 = 0` · `22 + 5 − 24 = 3` · `50 + 5 − 20 − 6 = 29` · `92 + 11 − 60 − 30 = 13` ✓.

> Las columnas Pedido y Traspaso de estas filas se leyeron de la imagen del PDF. Antes de fijar el caso dorado, hay que confirmarlas con el Excel original del cliente. La identidad cuadra en ambos casos porque las dos columnas suman.

Totales de la planilla: Contado 3,075.40 · Crédito 1,224.60 · Cobranzas 0 · **Total Ventas 4,300.00** · **Total Efectivo 3,075.40** ✓. El detalle de notas suma 270.00 + 1,224.60 + 375.00 + 2,430.40 = 4,300.00 ✓.

> En F3 algunos P/U son promedios calculados (0.8111, 6.8333, 4.4286). El sistema muestra el precio base del catálogo y los Bs reales cobrados; si hubo precios editados, `Bs ≠ Q × P/U`, y eso es correcto.

---

## 4 — Devoluciones

| CONCEPTO | FÓRMULA / REGLA |
|---|---|
| Máximo devolvible por producto | `vendido en la nota − Σ ya devuelto de la nota` |
| Importe | `round(Σ (cantidad × precio_aplicado) × (1 − descuento_pct/100), 2)`, con el precio y el descuento **de la nota original** |
| Abono a cuenta | Solo notas a crédito; `importe ≤ saldo pendiente actual` de la nota |
| Reembolso en nota contado | Siempre posible dentro del máximo devolvible |
| Reembolso en nota a crédito | `importe ≤ Σ cobranzas vigentes − Σ reembolsos previos` de la nota (no se devuelve dinero que no se cobró) |
| Efecto | Stock: almacén `+q` hoy. Caja: reembolso → resta en Total Efectivo de hoy. CxC: abono → resta en el saldo de la nota |

---

## 5 — Cuentas por cobrar

| CONCEPTO | FÓRMULA |
|---|---|
| Documentos por cobrar | Notas `emitida` con `condicion_tipo = 'credito'` + filas de `cxc_saldo_inicial` |
| Saldo de una nota a crédito | `total − Σ cobranzas vigentes − Σ importe de devoluciones con abono_cuenta` |
| Saldo de un saldo inicial | `importe − Σ cobranzas vigentes` |
| Saldo a la fecha de corte *C* | Lo mismo, contando solo documentos, cobranzas y devoluciones con fecha ≤ *C* |
| Vencido | `fecha_vencimiento < C` y saldo > 0 |
| Días de mora | `C − fecha_vencimiento` (si está vencido) |

Las notas al contado no generan cuenta por cobrar y no admiten cobranzas.

---

## 6 — EECC consolidado (⚠ SUP-26, SUP-27)

`eecc_consolidado(p_fecha_corte, p_regional_id = null, p_categoria = null)` (solo nacional):
1. Toma los documentos por cobrar con fecha ≤ *C* y saldo a *C* > 0.
2. Asigna a cada documento una **columna de origen**:
   - si `año(fecha_documento) < año(C)` → columna **"año anterior"** (etiqueta `año(C) − 1`, acumula todos los años previos, como el "2025" de F4/F5);
   - si no → columna del **mes** de `fecha_documento` (enero … mes de *C*).
3. Por cliente: suma el saldo en cada columna, el TOTAL, el **Vencido** y los **Máx. días de mora**. VENDEDOR = el vendedor asignado al cliente.
4. Agrupa regional → categoría → cliente, con subtotales por grupo y la fila final **SALDO ACTUAL** por columna.
5. KPIs de cabecera:
   - saldo pendiente total;
   - vencido total;
   - clientes con saldo;
   - clientes en mora (con al menos un documento vencido).

**Verificación:** con la cartera inicial de F4 cargada al 11/06/2026, LP supermercados da TOTAL 201,015.92 y el SALDO ACTUAL general da 703,749.52 (CP-12.2).

---

## 7 — Vendedores

### 7.1 — Saldo en poder de vendedores (RF38), período [*desde*, *hasta*]
Por vendedor y producto (movimientos con `vendedor_id = v`):

| COLUMNA | FÓRMULA |
|---|---|
| Saldo inicial | `Σ cantidad` con `fecha < desde` |
| Entregado | `Σ cantidad` con `tipo = 'salida'` en el período (lado vendedor, positivo) |
| Vendido | `−Σ cantidad` con `tipo in ('venta','anulacion')` en el período |
| Retornado | `−Σ cantidad` con `tipo = 'retorno'` en el período (lado vendedor) |
| Saldo final | `Saldo inicial + Entregado − Vendido − Retornado` (= `Σ cantidad` con `fecha ≤ hasta`) |
| Valorizado (Bs) | `Saldo final × precio_base` (informativo) |

### 7.2 — Ingresos por vendedor (RF19, ⚠ SUP-34), período [*desde*, *hasta*]
| COLUMNA | FÓRMULA |
|---|---|
| Ventas contado | `Σ total` de las notas contado del vendedor con fecha en el período |
| Cobranzas | `Σ importe` de las cobranzas vigentes del período imputadas a notas del vendedor; las de cartera inicial se atribuyen al vendedor del cliente |
| Reembolsos | `Σ importe` de las devoluciones con reembolso del período sobre notas del vendedor |
| **Ingreso** | `Ventas contado + Cobranzas − Reembolsos` |
| Ventas crédito (informativo) | `Σ total` de las notas a crédito del período |
| N° de notas | conteo de notas emitidas |

---

### 7.3 — ● Hoja de carga por vendedor (RF42, ⚠ SUP-53), fecha *D*
Notas emitidas de la regional con `fecha = D` y `vendedor_id = v` (o todos los vendedores, una hoja por vendedor):

| BLOQUE | CONTENIDO |
|---|---|
| Productos | Por producto (orden de línea y producto): `Σ item.cantidad` y `Σ item.subtotal` |
| Notas | N° de nota, cliente, zona, condición, total neto |
| Totales | Unidades, Bs bruto, descuentos, Bs neto (= Σ total de las notas) |

Las anuladas no cuentan. El origen de la nota (almacén o vendedor) no cambia la hoja.

## 8 — Presupuesto (⚠ SUP-33)

| CONCEPTO | FÓRMULA |
|---|---|
| Real | `Σ total` de las notas emitidas del mes − `Σ importe` de las devoluciones del mes, filtrando por regional y, si la meta lo indica, por `nota.vendedor_id` y/o `cliente.categoria` |
| Cumplimiento % | `real / meta × 100` |
| Días transcurridos | mes en curso: `día(hoy)`; mes pasado: días del mes; mes futuro: 0 |
| Proyección de cierre | `real / días transcurridos × días del mes` (si días transcurridos > 0) |
| Estado (mes en curso) | `cumplido` si real ≥ meta · `en_camino` si proyección ≥ meta · `en_riesgo` si proyección ≥ 90 % de la meta · `bajo` en otro caso |
| Estado (mes cerrado) | `cumplido` / `no_cumplido` |

---

## 9 — Reportes comerciales (RF28)

**Ventas netas** de un conjunto de notas = `Σ total` de las notas emitidas en el período − `Σ importe` de las devoluciones del período sobre esas notas.

| REPORTE | CÁLCULO |
|---|---|
| Top clientes | Ventas netas por cliente, descendente (por defecto, top 10) |
| Productos más vendidos | Unidades netas = `Σ item.cantidad − Σ devolucion_item.cantidad`; Bs netos = `Σ round(subtotal × (1 − desc/100), 2) −` devoluciones de ese producto |
| Rotación (⚠ SUP-35) | `unidades vendidas / stock promedio`, con `stock promedio = (stock regional al inicio + stock regional al final) / 2`; días de inventario = `días del período / rotación` (vacío si el promedio es 0) |
| Ventas por regional | Ventas netas por regional y por mes |
| ● Resumen de movimiento por período (⚠ SUP-54) | Las columnas de §3.1 con el rango [*desde*, *hasta*] en lugar de un día: SI = stock regional a `desde − 1`; Pedido, Traspaso, Devolución, Ajuste, Contado y Crédito = sumas del rango; SF = stock a `hasta`. Cada columna de cantidad tiene además su valor en Bs: ventas a lo cobrado (bruto) y el resto a `precio_base` vigente. Al pie: descuentos, cobranzas y reembolsos del rango |

---

## 10 — Dashboard (RF31)

| KPI | CÁLCULO | VISIBLE PARA |
|---|---|---|
| Ventas de hoy | Ventas netas con fecha = hoy | todos |
| Ventas del mes (o del período) | Ventas netas del mes en curso, con su variación contra el mismo tramo del mes anterior (del día 1 al día de hoy). Con el filtro de período del dashboard (⚙ DT-23): ventas netas de [desde, hasta], con su variación contra los N días inmediatamente anteriores (N = días del rango) | todos |
| Cumplimiento de presupuesto | Σ real / Σ meta de las metas por regional del mes | todos |
| Bajo stock mínimo | Cantidad de (almacén, producto) bajo mínimo | todos |
| Días pendientes de cierre | Liquidaciones `abierta` con fecha < hoy | todos |
| Notas pendientes de factura | Notas emitidas sin N° de factura | todos |
| Cuentas por cobrar | Saldo total y vencido a hoy | **solo nacional** (Q2) |

Todos se filtran por la regional activa ("Todas" para el nacional).

● **Origen de cada KPI:**
- Bajo mínimo, días pendientes y notas sin factura vienen de `avisos_shell`, el mismo request del menú.
- El cumplimiento de presupuesto se deriva de las filas de `cumplimiento_presupuesto` (Σ real / Σ meta de las metas por regional).
- `dashboard_kpis` trae solo ventas de hoy, ventas del período (por defecto, el mes en curso), variación, la serie diaria del período (`serie`: ventas netas de cada día, con el mismo criterio; ⚙ DT-21, DT-23) y cuentas por cobrar. Ventas de hoy, cuentas por cobrar y el cumplimiento de presupuesto (del mes) no dependen del filtro.

Así ningún número se pide dos veces ([Contrato §6](Contrato_API.md)).

---

## 11 — Fecha de operación (⚠ SUP-19, SUP-20)

`app.asegurar_dia_abierto(r, D)` se ejecuta al comienzo de toda RPC de escritura:
1. `D ≤ app.hoy()`; si no → `FECHA_INVALIDA`.
2. `D > ultimo_cierre(r)` (máxima fecha con liquidación `cerrada` de *r*); si no → `DIA_CERRADO`.
3. Crea la fila `liquidacion(r, D, 'abierta')` si no existía y la bloquea (`FOR UPDATE`), para que un cierre concurrente espere.

`cerrar_liquidacion(r, D)` exige además:
- que no exista una `liquidacion(r, D' < D, 'abierta')` → si no, `DIA_ANTERIOR_ABIERTO`;
- que no haya notas emitidas de *(r, D)* sin factura → si no, `FACTURA_PENDIENTE`.

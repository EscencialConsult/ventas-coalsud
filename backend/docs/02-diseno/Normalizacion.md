ESENCIAL CONSULTORA · DISEÑO DEL SISTEMA

# Normalización del Modelo de Datos — COALSUD S.R.L.
**v1.1 — Por qué las tablas quedan así**

Esencial Consultora — El Alto / La Paz, Bolivia

Este documento justifica el diseño de las tablas. No repite qué guarda cada una (eso está en el [Modelo de Datos](Modelo_de_Datos.md)): explica **por qué** está partida así y dónde nos apartamos de la teoría a sabiendas.

> *La normalización elimina dependencias entre atributos que originen anomalías de actualización y da una estructura más regular.*

**Resultado:** ● las 24 tablas quedan en **tercera forma normal (3FN)**.
- Los totales, el saldo por cobrar, el arqueo de un día abierto y el EECC se calculan; no se almacenan.
- El stock se lleva como movimientos.
- Hay **cuatro desviaciones conscientes**, documentadas en §4:
  - el snapshot de liquidación;
  - la auditoría sin FK rígida;
  - ● la tabla de saldos de stock mantenida por trigger;
  - ● el `regional_id` repetido en inventario.

**● Cambios v1.1:**
- `devolucion.cliente_id` se elimina: dependía de la nota (dependencia transitiva).
- `cobranza.cliente_id` y `cobranza.numero_factura` se eliminan: dependían del documento imputado.
- `inventario.regional_id` desaparece junto con la tabla `inventario`.
- Se documentan las desviaciones §4.3 y §4.4.

---

## 1 — Los tres conceptos

| FORMA | EXIGE |
|---|---|
| 1FN | Sin grupos repetitivos: cada atributo toma un único valor |
| 2FN | Todo atributo no principal depende de **toda** la clave |
| 3FN | Todo atributo no principal depende **directamente** de la clave, sin pasar por otro |

---

## 2 — Las decisiones que tomamos

### 2.1 — El total y el saldo no se guardan: se calculan
La nota tiene ítems. La tentación es guardar el `total` en la nota y el `saldo` del día.
```
nota_venta.id ──► Σ subtotales (de nota_venta_item)
total = Σ subtotales × (1 − descuento)   ← se deriva, no depende solo de la clave
```
**Anomalía:** si se agrega un ítem y no se actualiza el total guardado, la nota muestra un número y la suma de los ítems otro.

**Decisión — APLICADA.** No se almacenan; se calculan en el momento (vista o función):
- el total de la nota;
- ● el saldo por cobrar de cada documento;
- los totales de un día **abierto**;
- el EECC.

● **Columnas generadas.** `nota_venta_item.subtotal` (`cantidad × precio_aplicado`) y `nota_venta.fecha_vencimiento` (`fecha + dias_credito`) son columnas `GENERATED ALWAYS … STORED`. Dependen solo de atributos de **su misma fila**: la base las recalcula sola y no pueden divergir. Por eso no generan anomalías y se usan para indexar y simplificar consultas.

### 2.2 — El stock no es un número editable: es un libro mayor
```
movimiento_inventario (ingreso/salida/retorno/traspaso/venta/anulación/devolución/ajuste)  ← cada cambio, una fila
saldo real (almacén o vendedor) = Σ movimientos de ese producto en esa ubicación
```
**Anomalía:** si el saldo se edita sin asentar el movimiento, el inventario dice una cosa, la liquidación descontó otra y no se puede reconstruir.

**Decisión — APLICADA.** El stock se mueve solo con filas de `movimiento_inventario`.
- Un **traspaso** genera dos movimientos (salida en el origen, entrada en el destino).
- ● Una **salida al vendedor** también genera dos: almacén −, vendedor +.
- La cantidad nunca viaja duplicada.

### 2.3 — precio_base y precio_aplicado son dos cosas distintas
| ATRIBUTO | QUÉ ES |
|---|---|
| `precio_base` | Valor del catálogo al momento de cargar la nota |
| `precio_aplicado` | Lo que efectivamente se cobró (puede diferir si el admin lo editó) |
| `auditoria` (cambio_precio) | El registro de ese cambio: anterior, nuevo y quién lo hizo |

**Decisión — APLICADA.** No son el mismo dato: uno es referencia y el otro es el hecho. Guardar solo uno perdería, o bien la referencia, o bien lo cobrado.

### 2.4 — ● Lo que depende de otro registro se lee de ahí
| ATRIBUTO ELIMINADO | DEPENDÍA DE | SE OBTIENE |
|---|---|---|
| `devolucion.cliente_id` | `nota_venta.cliente_id` | join con la nota original |
| `cobranza.cliente_id` | el documento imputado | join con la nota o con `cxc_saldo_inicial` |
| `cobranza.numero_factura` | `nota_venta.numero_factura` | join con la nota |
| `cliente.dias_credito` | `condicion_pago.dias` | join con la condición |
| `devolucion.afecta_caja` | `tipo_reverso` | `tipo_reverso = 'reembolso'` |

---

## 3 — Lo que NO es redundante, aunque lo parezca

Algunos datos parecen derivados pero son **fotos históricas**: deben quedar congelados aunque el origen cambie después.
- **`precio_base` y `precio_aplicado` del ítem.** Si mañana sube el precio de lista, lo cobrado en una nota vieja no cambia.
- **● `condicion_tipo` y `dias_credito` de la nota.** Si la condición del cliente cambia, el vencimiento de las notas ya emitidas no se mueve.
- **● `devolucion_item.precio_aplicado`.** Es el precio de la nota al momento de devolver; no se recalcula.
- **`numero` de la nota.** Continúa una numeración por regional; no se recalcula.
- **`numero_factura`.** Es el dato que asignó Contabilidad; se guarda tal cual.
- **El snapshot `liquidacion_linea`** (incluye `producto_nombre` y `linea_nombre`). Al cerrar el día se congela: aunque después se corrija un maestro, el día cerrado no cambia.

La regla: un atributo derivado se recalcula igual siempre; una foto histórica cambiaría si se recalculara más tarde, y por eso se guarda.

---

## 4 — Cuatro desviaciones conscientes

### 4.1 — La liquidación se congela en un snapshot
Mientras el día está `abierta`, las líneas se calculan en vivo desde `movimiento_inventario` + `nota_venta`. Al **cerrar**, se materializan en `liquidacion_linea` y los totales en `liquidacion`.

Es una desviación deliberada del "no almacenar derivados": el día cerrado debe ser **inmutable y auditable** aunque los maestros cambien luego.

### 4.2 — La auditoría no lleva clave foránea a la entidad auditada
`auditoria` identifica lo auditado con `entidad + entidad_id` (texto + uuid), no con una FK por cada tabla. Una FK rígida obligaría a una columna (y una política) por tabla trazable, y la auditoría debe poder registrar cualquier cosa sin romperse.

Se gana generalidad a cambio de no validar la FK. Se compensa con que la tabla solo admite agregados y la escribe el propio sistema.

### 4.3 — ● `stock_saldo`: saldo vigente mantenido por trigger
`stock_saldo.cantidad` es, por definición, Σ movimientos de esa ubicación. Guardarlo es un derivado almacenado, y se hace a sabiendas por dos razones:
1. **Concurrencia.** Para impedir la sobreventa (RNF-02), la RPC bloquea la fila del saldo (`SELECT … FOR UPDATE`) antes de descontar. Sin una fila que bloquear, dos ventas simultáneas podrían pasar el control a la vez.
2. **Rendimiento.** La pantalla de stock y las alertas leen un saldo, no suman todo el historial.

**Cómo se evita la anomalía:**
- La escribe **solo** el trigger `app.tg_mov_actualiza_saldo` (los clientes no tienen permiso de escritura).
- Un `CHECK (cantidad >= 0)` impide saldos negativos.
- La función `app.verificar_stock()` compara cada saldo con Σ movimientos; se corre en las pruebas y periódicamente (⚙ DT-04).

### 4.4 — ● `regional_id` repetido en `movimiento_inventario` y `documento_inventario`
Se deduce del almacén (`almacen.regional_id`), así que es una dependencia transitiva. Se guarda porque **todas** las políticas RLS y el trigger de bloqueo de día filtran por regional; sin la columna, cada fila exigiría un join (⚙ DT-05).

**Cómo se evita la anomalía:** lo completa un trigger `BEFORE INSERT` a partir del almacén y no se puede modificar (las tablas no admiten `UPDATE` de clientes).

---

## 5 — El modelo resultante

| | VALOR |
|---|---|
| Tablas (3FN) | ● 24 (+ vistas `v_nota_venta`, `v_saldo_documento`, `v_stock`) |
| Dependencias transitivas no documentadas | 0 |
| Relaciones redundantes | 0 |
| Derivados almacenados | ● 2 justificados (`stock_saldo`, snapshot de liquidación) + columnas generadas de la misma fila |
| Desviaciones conscientes documentadas | ● 4 |

Lo que se gana no es elegancia: es que cada dato viva en un solo lugar. El saldo sale de los movimientos, los totales de los ítems y las cobranzas, y lo que importa para la rendición de cuentas queda en `auditoria`, que nadie puede pisar.

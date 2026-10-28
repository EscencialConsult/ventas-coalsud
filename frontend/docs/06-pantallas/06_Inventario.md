# Pantallas · 06 — Inventario (`/inventario`)

**Propósito:** CU-05 · RF07–RF11, RF34, RF37, RF38 · ⚠ SUP-07, SUP-15, SUP-29, SUP-36, SUP-37.

Pantalla con pestañas: **Stock** · **Movimientos** · **Documentos** · **Vendedores**. Botones del encabezado (solo regional):
- `+ Ingreso`
- `+ Traspaso`
- `+ Ajuste`
- menú `⋯` con `Salida a vendedor` y `Retorno de vendedor` (modalidad "mercadería en poder del vendedor", ⚠ SUP-07)

## 1 · Stock
```
 [Línea ▾] [Buscar…] [ ] Solo bajo mínimo
 ┌────────────┬──────────────────────────┬─────────┬──────────────┬─────────┬────────┬──────────────┐
 │ Línea      │ Producto                 │ Almacén │ En vendedores│ Total   │ Mínimo │              │
 │ COMRURAL   │ QUINUA TRICOLOR 1 KG     │ 15      │ 0            │ 15      │ 30     │ ⚠ Bajo mínimo │
 └────────────┴──────────────────────────┴─────────┴──────────────┴─────────┴────────┴──────────────┘
 ⓘ El stock no se edita: cambia solo con ingresos, ventas, traspasos y ajustes.
```
- **Datos:** `v_stock` agrupado por producto (almacén / vendedor / total).
- Clic en una fila → kardex del producto (modal `xl`, `rpc('kardex')`: fecha, tipo, documento, cantidad, saldo anterior, saldo nuevo, usuario).
- **Nacional** con "Todas": columnas por regional (LP · CBBA · SCZ · Total).

## 2 · Movimientos
- `v_movimiento` paginado.
- Filtros: fechas, tipo, producto, documento.
- Columnas: fecha, tipo (badge), documento (enlace a la nota, documento o devolución), producto, ubicación (Almacén / vendedor X), cantidad (+ verde / − rojo), usuario.

## 3 · Documentos
- `documento_inventario` (ingresos, salidas, retornos, traspasos, ajustes).
- Columnas: N° (`NI-LP-0001`…), tipo, fecha, almacén/destino/vendedor, referencia/motivo, ítems, usuario.
- Detalle en `/inventario/documentos/:id`. Los traspasos recibidos de otra regional se ven en la regional destino con el badge "Recibido de SCZ".

## 4 · Vendedores (saldo en poder)
```
 Período [01/06/2026] – [11/06/2026]     [Imprimir]  [Excel]
 ┌───────────┬──────────────────────┬────────┬───────────┬─────────┬───────────┬────────┬───────────┐
 │ Vendedor  │ Producto             │ S. ini │ Entregado │ Vendido │ Retornado │ Saldo  │ Valoriz.  │
 │ Flavia    │ FIFITOS 360GR        │ 0      │ 20        │ 14      │ 4         │ 2      │ Bs 14.00  │
 └───────────┴──────────────────────┴────────┴───────────┴─────────┴───────────┴────────┴───────────┘
```
- **Datos:** `rpc('saldo_vendedores')` ([Reglas §7.1](../../../backend/docs/03-especificacion/Reglas_de_Calculo.md)).
- En preventa pura (sin salidas), queda vacía con el `EmptyState` "No hay mercadería en poder de vendedores".

## 5 · Documento nuevo (`/inventario/nuevo/:tipo`)
```
 Nuevo traspaso                                     Fecha [11/06/2026]
 ORIGEN  Almacén La Paz (fijo)        DESTINO * [Almacén Santa Cruz ▾]
 REFERENCIA [__________]
 ┌────────────────────────────────┬────────────┬──────────┬────┐
 │ Producto                       │ Disponible │ Cantidad │    │
 │ [Buscar producto…]             │ 120        │ [ 30 ]   │ 🗑 │
 └────────────────────────────────┴────────────┴──────────┴────┘
 [+ Agregar producto]                                   [Cancelar] [Registrar traspaso]
```

| TIPO | CAMPOS PROPIOS | VALIDACIONES DE UX | RPC |
|---|---|---|---|
| Ingreso | referencia (remito/proveedor) | cantidad > 0 | `registrar_ingreso` |
| Salida a vendedor | vendedor * | cantidad ≤ disponible en el almacén | `registrar_salida` |
| Retorno de vendedor | vendedor * (se precargan sus saldos) | cantidad ≤ saldo del vendedor | `registrar_retorno` |
| Traspaso | almacén destino * (otra regional) | cantidad ≤ disponible; aviso: "Se sumará en Santa Cruz con la misma fecha" | `registrar_traspaso` |
| Ajuste | motivo * (lista: inventario inicial, conteo físico, merma, vencimiento, rotura, otro + texto) | cantidad ≠ 0 (+ o −); el resultado no puede quedar negativo | `registrar_ajuste` |

Reglas comunes:
- Un producto por fila.
- "Disponible" se lee de `v_stock` al agregar la fila. Es informativo; la base revalida.
- Al registrar:
  - toast "Traspaso TR-LP-0007 registrado";
  - vuelve a Documentos;
  - invalida el stock, la liquidación del día y el dashboard.

**Errores:**

| CÓDIGO | PRESENTACIÓN |
|---|---|
| `STOCK_INSUFICIENTE` | Marca la fila con "Disponible: N" (CP-05.4, CP-05.8) |
| `DIA_CERRADO` | Banner; en un traspaso: "El día dd/mm de Santa Cruz está cerrado" (CP-05.10) |
| `VALIDACION` (motivo) | Marca el motivo (CP-05.9) |

**Implementación (FE-10 a FE-12):**
- Cada pestaña es una subruta (`/inventario/stock`, `/movimientos`, `/documentos`, `/vendedores`); `/inventario` lleva a Stock.
- Stock: `v_stock` entero de la regional (lista corta), filtrado y paginado en pantalla. La línea va debajo del nombre y "Bajo mínimo" junto al producto, para no sumar columnas. Con "Todas" no hay columnas Almacén/En vendedores: una por regional + Total.
- Kardex: modal con ubicación (almacén o vendedor que tenga el producto) y período (últimos 30 días por defecto).
- Documento nuevo:
  - Si la regional tiene un solo almacén, el origen se muestra fijo.
  - En el retorno, al elegir el vendedor se precarga todo lo que tiene (retorno total; se puede corregir o quitar filas).
  - El motivo del ajuste se guarda legible: "Merma: 3 bolsas rotas" (con "Otro", solo el detalle).
  - Salir con datos cargados pide "¿Descartar el documento?".
  - Al registrar, se invalidan stock (incluye kardex, saldo de vendedores y stock del catálogo), movimientos, documentos, liquidación y avisos.
- Vendedores: un bloque por vendedor con su total valorizado; período por defecto, el mes en curso. Imprimir/Excel quedan para FE-20.

**E2E:** CP-05.1, CP-05.2, CP-05.4, CP-05.5, CP-05.7, CP-05.9, CP-05.11.

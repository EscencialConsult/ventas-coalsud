# Pantallas · 07 — Notas de venta, devoluciones y hoja de carga

**Propósito:** CU-06 · RF12–RF17, RF42 · ⚠ SUP-01, SUP-06, SUP-07, SUP-14, SUP-17, SUP-18, SUP-41, SUP-45, SUP-47, SUP-48, SUP-53.

Circuito del día (F2): pedidos por WhatsApp → **notas** → **hoja de carga** por vendedor → entrega. Si el cliente no estaba → **anular**.

## 1 · Historial (`/notas`)
```
 Notas de Venta · La Paz                                    [Hoja de carga]  [+ Nueva nota]
 [Fecha desde]–[hasta] [Estado ▾] [Vendedor ▾] [Condición ▾] [ ] Sin factura  [Buscar N°, factura o cliente…]
 ┌────────────┬──────────┬──────────┬───────────────────┬──────────┬──────────┬─────────────┬──────────────┬──────────────────┬────┐
 │ Fecha      │ N° Nota  │ Factura  │ Cliente           │ Vendedor │ Condición│ Total       │ Saldo        │ Estado           │    │
 │ 11/06/2026 │ LP-0415  │ —        │ Hipermaxi LP      │ Flavia   │ Créd. 30 │ Bs 1,224.60 │ Bs 1,224.60  │ Emitida·Sin fact.│ 👁 🖨│
 │ 11/06/2026 │ LP-0414  │ F-1462   │ Tienda Rosita     │ Arturo   │ Contado  │ Bs 270.00   │ —            │ Emitida          │ 👁 🖨│
 │ 10/06/2026 │ LP-0409  │ F-1450   │ ~~Mi Super~~      │ Flavia   │ Contado  │ ~~Bs 90.00~~│ —            │ Anulada          │ 👁 🖨│
 └────────────┴──────────┴──────────┴───────────────────┴──────────┴──────────┴─────────────┴──────────────┴──────────────────┴────┘
```
- **Datos:** `v_nota_venta` paginado. Columnas como en la demo F1 (fecha, N°, cliente, regional, vendedor, total, condición, estado), más Factura y Saldo.

## 2 · Nueva nota (`/notas/nueva`) — página completa
```
 Nueva Nota de Venta · La Paz                         N° se asigna al registrar
 FECHA * [11/06/2026]        CLIENTE * [Buscar cliente…            ]  NIT 1234567 · Zona Sur
 VENDEDOR * [Flavia Rivera ▾]   CANAL * [Supermercado ▾]   CONDICIÓN * [Crédito 30 días ▾]
 DESCUENTO (%) [ 0 ]    ORIGEN DEL STOCK  (•) Almacén (preventa)  ( ) Saldo del vendedor
 N° FACTURA (opcional) [________]   OBSERVACIONES [______________________]
 ┌──────────────────────────────┬──────────┬────────────┬──────────┬─────────────┬─────────────┬────┐
 │ Producto                     │ Línea    │ Disponible │ Cantidad │ P/Unit      │ Subtotal    │    │
 │ QUINUA TRICOLOR 1 KG         │ COMRURAL │ 120        │ [ 10 ]   │ [ 40.00 ] ✎ │ Bs 400.00   │ 🗑 │
 │   ↳ precio de lista 44.00 · modificado (queda registrado)                                     │
 └──────────────────────────────┴──────────┴────────────┴──────────┴─────────────┴─────────────┴────┘
 [+ Agregar producto]
                                             Subtotal Bs 400.00 · Descuento Bs 0.00 · TOTAL Bs 400.00
                                                       [Cancelar]  [Registrar nota]  [Registrar e imprimir]
```

| CAMPO | REGLA |
|---|---|
| Fecha * | `SelectorFecha` (máx. hoy; mín. último cierre + 1) (⚠ SUP-19) |
| Cliente * | `BuscadorCliente` (activos de la regional). Al elegirlo se proponen su vendedor, canal y condición (editables) |
| Vendedor * | activos de la regional (CP-06.2) |
| Canal *, Condición * | combos; la condición determina contado/crédito y los días (foto en la nota) |
| Descuento % | 0–100; si es > 0, aviso "Queda registrado" (⚠ SUP-48) |
| Origen del stock | por defecto **Almacén** (preventa, ⚠ SUP-07/14). Si el vendedor tiene mercadería en su poder, se habilita "Saldo del vendedor" y se sugiere cuando cubre todos los ítems |
| N° de factura | opcional; puede cargarse después (⚠ SUP-06) |
| Ítems * | ≥ 1; un producto por fila (⚠ SUP-47); cantidad > 0; precio ≥ 0 (editable, con la marca "modificado" si difiere del de lista) |
| Disponible | de `v_stock`, según el origen elegido; solo informativo |
| Totales | se calculan en vivo con la fórmula de [Reglas §1](../../../backend/docs/03-especificacion/Reglas_de_Calculo.md), **solo para mostrar**; el total oficial es el que devuelve la RPC |

- **Acción:** `rpc('emitir_nota_venta', …)` → toast "Nota LP-0416 emitida" → detalle (o impresión, si se eligió "Registrar e imprimir").
- **Errores:**
  - `STOCK_INSUFICIENTE` → marca el ítem con el disponible (CP-06.10);
  - `REGISTRO_INACTIVO` → marca el campo;
  - `DIA_CERRADO` / `FECHA_INVALIDA` → marca la fecha (CP-06.16).

## 3 · Detalle (`/notas/:id`)
```
 LP-0415  [Emitida] [Sin factura]                      [🖨 Imprimir] [Cobrar] [Anular] [Devolver]
 11/06/2026 · La Paz · Hipermaxi LP (NIT …) · Vendedor Flavia · Supermercado · Crédito 30 días (vence 11/07/2026)
 ┌Factura ────────────────────────────────────────────┐ ┌Cuenta ─────────────────────────────┐
 │ N° FACTURA [________]  PDF [Elegir archivo…]       │ │ Total      Bs 1,224.60              │
 │ [Guardar factura]                                  │ │ Cobrado    Bs 0.00                  │
 │ ⓘ Se puede cargar aunque el día esté cerrado.      │ │ Abonos     Bs 0.00                  │
 └────────────────────────────────────────────────────┘ │ Saldo      Bs 1,224.60              │
                                                        └─────────────────────────────────────┘
 Ítems (tabla: producto, línea, cant., P/U lista, P/U aplicado, subtotal) · Descuento · Total
 Cobranzas de la nota · Devoluciones de la nota · Historial (auditoría de esta nota, solo nacional)
```

| ACCIÓN | VISIBLE / HABILITADA | LLAMADA | CONFIRMACIÓN |
|---|---|---|---|
| Guardar factura | regional; nota emitida (aun con el día cerrado) | `storage.upload` (si hay PDF ≤ 10 MB) → `rpc('registrar_factura_nota')`; si `advertencia_duplicado`: "Esa factura ya está en otra nota" (⚠ SUP-41) | — |
| Ver PDF | si hay ruta | `createSignedUrl(path, 60)` → pestaña nueva | — |
| Imprimir | siempre (las anuladas, con marca de agua) | `/imprimir/nota/:id` | — |
| Cobrar | regional; crédito con saldo > 0 | `/cobranzas/nueva?nota=:id` | — |
| **Anular** | regional; día abierto; **sin cobranzas vigentes**; emitida | `rpc('anular_nota_venta')` | "Se repondrá el stock de N productos al {almacén/vendedor}. La nota queda anulada y no se puede deshacer. Motivo (opcional)". Si había factura: "Avise a Contabilidad que anule la factura F-…" |
| **Devolver** | regional; **día de la nota cerrado**; emitida | modal de devolución (§4) | — |

Si una acción está deshabilitada, el tooltip explica por qué ("El día está cerrado: use Devolver"; "Tiene cobranzas vigentes: anúlelas primero") (⚠ SUP-18, CP-06.12, CP-06.13).

## 4 · Modal de devolución (`lg`)
```
 Devolución de LP-0388 (05/06/2026 · cerrado) — fecha de la devolución: HOY 11/06/2026
 ┌───────────────────────┬─────────┬───────────┬────────┬──────────┬───────────┐
 │ Producto              │ Vendido │ Devuelto  │ Máximo │ Devolver │ Importe   │
 │ FIFITOS 360GR         │ 10      │ 3         │ 7      │ [ 3 ]    │ Bs 21.00  │
 └───────────────────────┴─────────┴───────────┴────────┴──────────┴───────────┘
 TIPO *  (•) Reembolso — sale de la caja de HOY   ( ) Abono a cuenta — baja la deuda (solo crédito, saldo Bs 440.00)
 MOTIVO * [_____________________]                               Importe total Bs 21.00
 ⓘ Repone 3 u. en el almacén hoy. El 05/06 no se modifica. Contabilidad deberá emitir la nota de crédito.
                                                                    [Cancelar] [Registrar devolución]
```
- **Datos:** `rpc('max_devolvible', { p_nota_id })`.
- **Acción:** `rpc('registrar_devolucion')`.
- **Errores:** `DEVOLUCION_EXCEDE`, `ABONO_NO_PERMITIDO`, `REEMBOLSO_EXCEDE_COBRADO`, `DIA_CERRADO` (hoy cerrado) (CP-06.9, CP-06.14, CP-06.15).

## 5 · Devoluciones (`/devoluciones`)
- `v_devolucion`.
- Columnas: fecha, N° `DEV-LP-…`, nota original, cliente, tipo, importe, N° NC contable (editable con `rpc('registrar_nc_contable')`), usuario.

## 6 · Hoja de carga (`/notas/hoja-carga`) (RF42, ⚠ SUP-53)
```
 Hoja de carga · La Paz · Fecha [11/06/2026]   Vendedor [Todos ▾]        [🖨 Imprimir]
 ┌ Flavia Rivera — 6 notas — 84 u. — Bs 3,120.00 ─────────────────────────────────────────┐
 │ Producto                         Línea      Cantidad    Bs                              │
 │ QUINUA TRICOLOR 1 KG             COMRURAL   15          660.00                          │
 │ …                                                                                       │
 │ Notas: LP-0410 Hipermaxi LP (Sur) · LP-0411 Tienda Rosita (Sur) · …                     │
 └─────────────────────────────────────────────────────────────────────────────────────────┘
```
- **Datos:** `rpc('hoja_carga')`. Las anuladas no cuentan.
- Impresión: una hoja por vendedor ([Impresión §3](../07-Impresion_y_Exportacion.md)).
- Si se anula una nota después de imprimir, la pantalla avisa "Hay cambios desde la última impresión" (marca local por fecha y vendedor).

**Implementación (FE-13 a FE-15):**
- Historial: para no saturar la tabla, la fecha va debajo del N° y el vendedor debajo del cliente; la impresión es la acción de la fila y el clic abre el detalle.
- Nueva nota:
  - La fecha mínima es el día abierto más antiguo de la regional (sale de los avisos del shell, sin otro request).
  - "Origen del stock" aparece solo si el vendedor elegido tiene mercadería en su poder; si cubre todos los ítems, se ofrece "usar su saldo".
  - Salir con datos cargados pide "¿Descartar la nota?".
- Detalle:
  - Anular deshabilitado explica por qué en un tooltip ("El día está cerrado: use Devolver", "Tiene cobranzas vigentes…"). El día cerrado lo informa la vista (⚙ DT-26).
  - "Devolver" (§4) y las secciones de cobranzas y devoluciones de la nota llegan con el Sprint 5; el historial de auditoría, con FE-24.
- Devoluciones (FE-16):
  - "Devolver" aparece solo con el día de la nota cerrado; "Abono a cuenta" solo en notas a crédito con saldo. El tope del reembolso en crédito (lo cobrado neto) se muestra junto al tipo.
  - El detalle de la nota suma las secciones Cobranzas (notas a crédito) y Devoluciones (si tiene); cada una se pide solo si corresponde.
  - `/devoluciones`: filtros por fechas y tipo; la NC contable se carga o corrige con un modal chico.
- Hoja de carga: fecha de un solo día (hoy por defecto) y vendedor en la URL; la marca de la última impresión se guarda en el navegador.

**E2E:** CP-06.1, CP-06.2, CP-06.4, CP-06.5, CP-06.6 (visual), CP-06.7, CP-06.9, CP-06.10, CP-06.19.

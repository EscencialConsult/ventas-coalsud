# Pantallas · 09 — Liquidación / Reporte diario  ← el corazón

**Propósito:** CU-08 · RF20–RF25, RF33 · ⚠ SUP-04, SUP-06, SUP-08 a SUP-13, SUP-20, SUP-21, SUP-46, SUP-51.

Replica la planilla física "RESUMEN DE REPORTE DE VENTAS" (F3, `Desktop/Coalsud/REPORTE DE VENTAS.pdf`) (RNF-24). La **impresión y el Excel** la copian tal cual: caja de arqueo arriba a la derecha, matriz por línea, descuentos y totales al pie, y debajo los bloques de créditos/detalle y cobranzas. En **pantalla** se ordena para leer y operar (27/10/2026):
- la caja de arqueo es una franja sobre la matriz;
- la matriz tiene anchos fijos, cabecera en bloques de color con títulos centrados, encabezado congelado y filas cebra, en el orden de columnas de F3;
- debajo, los bloques de créditos/detalle, cobranzas y devoluciones, como en la planilla.

## 1 · Encabezado (`/liquidacion/:fecha`)
```
 Liquidación Diaria de Ventas · La Paz                  Fecha [◀ 11/06/2026 ▶]   [Abierta]
 Consolida a todos los vendedores                        [🖨 Imprimir] [⬇ Excel] [✔ Cerrar el día]
 Pestañas:  [ Reporte del día ]  [ Cobranzas (2) ]  [ ] Catálogo completo        (nacional: [↺ Reabrir])
```
- `/liquidacion` redirige a `/liquidacion/<hoy>`.
- El nacional con "Todas" ve un selector "Elija una regional" (el reporte es por regional).
- **Datos:** `rpc('reporte_liquidacion', { p_regional_id, p_fecha })`. Se refresca al volver a la pestaña (`refetchOnWindowFocus`) y tras cualquier mutación del día.

## 2 · Pestaña "Reporte del día"
```
 CONTADO     CRÉDITO     COBRANZAS   (REEMBOLSOS)   TOTAL VENTAS   TOTAL EFECTIVO   ← (reembolsos solo si > 0)
 3,075.40    1,224.60    0.00                       4,300.00       3,075.40
 Efectivo 0.00 · QR 0.00 (desglose de cobranzas, ⚠ SUP-12)
 ─────────────────────────────────────────────────────────────────────────────────────────────
 Columnas extra: Devolución / Ajuste (solo si hay valores)
 ┌──────────────────────────┬───────┬───────┬────────┬─────────┬──────────────┬──────────────┬───────┬──────────────┐
 │ ITEMS                    │P/UNIT │ SALDO │ PEDIDO │TRASPASO │ VENTA CONTADO│ VENTA CRÉDITO│ SALDO │ TOTAL VENTAS │
 │                          │       │INICIAL│        │         │  Q   │  Bs   │  Q   │  Bs   │ FINAL │  Q   │  Bs   │
 ├──────────────────────────┴───────┴───────┴────────┴─────────┴──────┴───────┴──────┴───────┴───────┴──────┴───────┤
 │ COMRURAL                                                                                                         │
 │ QUINUA TRICOLOR 1 KG      44.00    15                            9   396.00    6   264.00     0    15   660.00   │
 │ QUINUA BLANCA 1KG         44.00    22      5                    24 1,056.00                   3    24 1,056.00   │
 │ …                                                                                                                │
 │ ▸ Sin movimiento (112 productos)                                                                                 │
 ├──────────────────────────────────────────────────────────────────────┬──────────────┬──────────────┬──────────────┤
 │ TOTAL VENTAS                                                          │     3,075.40 │     1,224.60 │     4,300.00 │
 │ DESCUENTOS                                                            │         0.00 │         0.00 │         0.00 │
 │ TOTALES                                                               │     3,075.40 │     1,224.60 │     4,300.00 │
 └──────────────────────────────────────────────────────────────────────┴──────────────┴──────────────┴──────────────┘
 ┌ CRÉDITOS / DETALLE DE NOTAS ─────────────────────────────────┐ ┌ COBRANZAS ──────────────────────────────┐
 │ Factura  Nota     Cliente             Vendedor  Cond.   Bs   │ │ N°        Cliente   Documento  Forma  Bs│
 │ F-1462   LP-0412  Flavia Rivera       Arturo    Contado 270  │ │ (sin cobranzas)                         │
 │ F-1463   LP-0413  Martha Canedo       Flavia  ▌Crédito 1,224.60│ │                                         │
 │ …                                                            │ │                                         │
 │ ~~—      LP-0409  Mi Super  … Anulada~~                      │ │                                         │
 │ Contado 3,075.40 · Crédito 1,224.60 · TOTAL Bs 4,300.00 (4)  │ │ TOTAL COBRANZAS                    0.00 │
 └──────────────────────────────────────────────────────────────┘ └─────────────────────────────────────────┘
 (si hay) DEVOLUCIONES DEL DÍA: DEV-LP-0002 · LP-0380 · cliente · reembolso · 120.00
```

**Reglas de presentación:**

| ELEMENTO | REGLA |
|---|---|
| Agrupación y orden | Por línea (encabezado de línea como en la planilla), en el orden del catálogo |
| Pantalla | Primero los productos con movimiento; el bloque plegable "Sin movimiento" al final de cada línea; interruptor "Catálogo completo" en la barra, junto a las pestañas (solo en "Reporte del día", ⚠ SUP-04) |
| Columnas Devolución / Ajuste | Solo si `columnas_extra` lo indica (⚠ SUP-10) |
| Traspaso | Con signo: `+5` verde, `−30` rojo (⚠ SUP-09) |
| Ceros | Se muestran vacíos (como la planilla); `−` cuando la planilla muestra guion en Bs |
| Paneles fijos (escritorio) | Como "Inmovilizar paneles" de Excel: la matriz tiene alto máximo (75 % de la pantalla) y scroll propio; quedan fijas la fila de encabezados y la columna ITEMS, y el nombre de la línea no se va al scrollear de costado. Encabezados con los colores de la planilla en tono suave ([Impresión §4](../07-Impresion_y_Exportacion.md)) |
| Cabecera (escritorio) | Anchos fijos por columna (`table-fixed` + `colgroup`: ITEMS ancho, Q angosta, Bs ancha), para que cada grupo (VENTA CONTADO, VENTA CRÉDITO, TOTAL VENTAS) quede justo sobre su Q / Bs. Sin grilla de Excel: bloques con los colores de la planilla separados por un filo blanco, títulos `text-chico` en negrita y color de texto principal, centrados en su celda (horizontal y vertical); Q / Bs en semibold. El congelado fija el `thead` entero (no cada fila), para que las dos filas de títulos no se pisen al scrollear. Las filas de datos llevan línea horizontal y una división vertical muy tenue (`border-l-borde/40`). La impresión mantiene su propio formato |
| Filas | Cebra (blanco / `fondo-3`) y resaltado de la fila bajo el mouse (`rojo-tenue-solido`, opaco para que la columna fija no transparente). Mientras se scrollea, el resaltado se apaga (`useDesplazandose`: `data-desplazando` en el contenedor, sin re-render) y el contenedor tiene fondo opaco para que el navegador scrollee en GPU. La impresión no lleva cebra |
| Móvil (< 768 px) | Sin scroll horizontal: cada producto es una card con el nombre como título y las columnas con valor como pares etiqueta: valor. La caja de arqueo va arriba y los bloques de detalle, como listas |
| Detalle de notas | Todas las del día, con crédito resaltado, anuladas tachadas y sin sumar, y filtro visual por vendedor (⚠ SUP-13, SUP-46). Clic → detalle de la nota |
| Caja de arqueo | Fórmulas de [Reglas §3.3](../../../backend/docs/03-especificacion/Reglas_de_Calculo.md); debajo, el desglose de cobranzas por forma de pago (⚠ SUP-12). En pantalla, franja (`CajaArqueo variante="franja"`); en la impresión, el recuadro de la planilla |
| Día cerrado | Banner verde "Cerrado por Vanessa el 11/06/2026 21:14"; todo en solo lectura; el reporte sale del snapshot |

## 3 · Pestaña "Cobranzas"
- Lista de las cobranzas del día ([08_Cobranzas §2](08_Cobranzas.md)) y el botón **"+ Registrar cobro"** (solo regional y día abierto), que abre el modal de cobro con la fecha del reporte (⚠ SUP-51).

## 4 · Cerrar el día
1. Botón "✔ Cerrar el día": solo regional y día abierto. Se deshabilita con tooltip si `validaciones_cierre` trae algo.
2. Si `notas_sin_factura` no está vacío → modal "Faltan facturas" con la lista y la acción "Cargar factura" en línea (N° + PDF) por nota (⚠ SUP-06, CP-06.5).
3. Si `dias_anteriores_abiertos` no está vacío → modal "Primero cierre: 10/06/2026" con enlaces (⚠ SUP-20, CP-08.11).
4. `Confirmacion` con:
   - el resumen del arqueo (Total Ventas, Total Efectivo, cantidad de notas, cobranzas);
   - "Después de cerrar no se podrán crear ni modificar notas, cobranzas ni movimientos de este día. Solo el nivel nacional puede reabrirlo".
5. `rpc('cerrar_liquidacion')` → toast "Día 11/06/2026 cerrado" → recarga en modo snapshot.

## 5 · Reabrir (nacional)
- Botón "↺ Reabrir": solo nacional, día cerrado y **último día cerrado** de la regional (si no, deshabilitado: "Solo se puede reabrir el 12/06/2026") (⚠ SUP-21).
- `Confirmacion` con **motivo obligatorio** → `rpc('reabrir_liquidacion')`.

## 6 · Historial (`/liquidacion/historial`)
- `v_liquidacion`: fecha, regional, estado, total ventas, contado, crédito, cobranzas, total efectivo, cerrado por/en.
- Arriba, los **días pendientes de cierre** (`rpc('dias_pendientes_cierre')`).

**Implementación (FE-18 a FE-20):**
- Navegación por día con ◀ ▶ y calendario (no se va a fechas futuras); la regional viaja en `?regional=` desde los avisos, la campana y el historial. Con "Todas", el nacional elige la regional en la barra (no cambia el topbar).
- Las pestañas van en la URL (`?pestana=cobranzas`). La de Cobranzas se pide al abrirla; su "Registrar cobro" abre la página de cobro con la fecha del reporte y vuelve a la pestaña.
- Cerrar el día revisa en orden: días anteriores abiertos (modal con enlaces), facturas faltantes (carga en línea; al completarlas se habilita "Continuar") y la confirmación con el arqueo. Si la base rechaza por alguna de las dos, se vuelve al paso que corresponde.
- Reabrir se deshabilita con tooltip si el día no es el último cerrado (⚙ DT-28: `ultimo_cerrado` en el reporte).
- Los encabezados usan tokens `planilla-*` (colores de F3 en tono suave); el Excel usa los colores de F3 tal cual.

**E2E:** CP-08.1, CP-08.4, CP-08.5, CP-08.6, CP-08.7, CP-08.13, CP-06.5.

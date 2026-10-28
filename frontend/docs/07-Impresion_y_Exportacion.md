ESENCIAL CONSULTORA · FRONTEND

# Impresión y Exportación — COALSUD
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

RF15, RF29, RF42 · RNF-20, RNF-24 · ⚠ SUP-01, SUP-45, SUP-53, SUP-55 · ⚙ DT-09, DT-10.

---

## 1 · Mecanismo de impresión

- Cada impresión es una **ruta sin shell** (`/imprimir/...`) que se abre en una pestaña nueva (`window.open`).
- La ruta carga sus datos con los mismos hooks y espera `document.fonts.ready`. Luego llama a `window.print()`, y en `afterprint` ofrece "Cerrar pestaña".
- `shared/print/PrintLayout.tsx` + `print.css`: sin sombras ni colores de fondo de la UI, texto negro, `font-sans` a 9–10 pt, montos en `font-mono`.
- Se imprime lo que devuelve la base: totales, número, factura. El frontend solo arma el total **en letras** (`numeroALetras`).
- Implementado en `shared/print/PrintLayout.tsx` + `print.css` (FE-15). Los tamaños de papel van en mm con clases (`w-[210mm]`, `h-[148.5mm]`); la línea de corte se superpone para no sumar alto a la hoja.
- Navegadores objetivo: Chrome y Edge (RNF-19). Instrucción al usuario: en el diálogo, "Márgenes: ninguno" y "Gráficos de fondo: activado" (lo indica un texto en la pestaña de impresión).

---

## 2 · Nota de venta — A5 duplicada en A4 (`/imprimir/nota/:id`)

```
┌────────────────────────── A4 vertical (210 × 297 mm) ──────────────────────────┐
│ [logo] COALSUD S.R.L.                     NOTA DE VENTA        COPIA CLIENTE  │
│ Distribuidora de Alimentos               N° LP-0415                           │
│ NIT 314280024 · Z. Kenko Av. Estructurante N°25 · El Alto    Fecha 11/06/2026 │
│ ───────────────────────────────────────────────────────────────────────────── │
│ Cliente  Hipermaxi La Paz (NIT …)        Regional  La Paz                      │
│ Vendedor Flavia Rivera                   Factura   F-1463                      │
│ ┌───┬──────────────────────────────┬──────────┬──────┬─────────┬───────────┐  │
│ │ # │ Producto                     │ Línea    │ Cant.│ P. Unit.│ Subtotal  │  │
│ │ 1 │ QUINUA TRICOLOR 1 KG         │ COMRURAL │ 10   │ 40.00   │ 400.00    │  │
│ └───┴──────────────────────────────┴──────────┴──────┴─────────┴───────────┘  │
│                                           Descuento 0 %:        Bs 0.00        │
│                                           TOTAL:                Bs 400.00      │
│ Son: Cuatrocientos 00/100 Bolivianos                                           │
│                                                                                │
│   ____________________                    ____________________                 │
│   Firma vendedor                          Firma cliente / Sello                │
├ ✂ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ ← 148.5 mm
│ (misma nota)                                    COPIA VENDEDOR / CONTROL       │
│ … igual que arriba, más:  Condición de pago: Crédito 30 días · Vence 11/07/2026│
└────────────────────────────────────────────────────────────────────────────────┘
```

| REGLA | DETALLE |
|---|---|
| Página | `@page { size: A4 portrait; margin: 0 }`; dos bloques `.mitad` de `210mm × 148.5mm`, con padding de 8 mm y línea de corte punteada en el medio |
| Diseño | El de la demo F1, que el cliente aprobó en F2 (⚠ SUP-01). Si llega la plantilla actual del cliente, se ajusta solo este componente |
| Copias | Arriba "COPIA CLIENTE", abajo "COPIA VENDEDOR / CONTROL" (⚠ SUP-45) |
| Condición de pago | **Solo** en la copia de control (Q10, CP-06.6) |
| N° de factura | Si existe; si no, el campo no aparece |
| Ítems | Hasta **12** caben en media hoja. Con más, cada copia ocupa una A4 entera (2 páginas) y se avisa antes de imprimir |
| Anulada | Marca de agua diagonal "ANULADA" en ambas copias + fecha y motivo de la anulación |
| Reimpresión | Siempre permitida; no cambia nada en la base |

---

## 3 · Hoja de carga por vendedor (`/imprimir/hoja-carga/:fecha?vendedor=`) (RF42, ⚠ SUP-53)

- A4 vertical, **una página por vendedor** (`break-after: page`).
- Encabezado: COALSUD · HOJA DE CARGA · regional · fecha · vendedor.
- Tabla de productos agrupados por línea (producto, cantidad, Bs), con totales de unidades y Bs.
- Lista de notas: N°, cliente, zona, condición y total.
- Firmas: "Entregué (almacén)" / "Recibí conforme (vendedor)".

## 4 · Reporte diario

### 4.1 — Impresión (`/imprimir/liquidacion/:fecha`)
- A4 **horizontal**, catálogo completo por línea (igual que el Excel), con el arqueo arriba a la derecha y los bloques de detalle al final.
- Encabezado repetido en cada página (`thead { display: table-header-group }`).
- Implementado con una página con nombre (`@page horizontal` en `print.css`, `page: horizontal` en el contenedor) para que solo esta impresión sea horizontal, con 8 mm de margen.

### 4.2 — Excel con formato de planilla (`features/liquidacion/liquidacion.excel.ts`)
Replica F3 ("RESUMEN DE REPORTE DE VENTAS"):

| ZONA | CONTENIDO | FORMATO |
|---|---|---|
| Filas 1–5 | Título "RESUMEN DE REPORTE DE VENTAS" (combinado), "REGIONAL: LA PAZ — CONSOLIDADO", "FECHA: 11/06/2026"; a la derecha, la caja CONTADO / CRÉDITO / COBRANZAS / (REEMBOLSOS) / TOTAL VENTAS / TOTAL EFECTIVO | negrita; bordes en la caja |
| Encabezado (2 filas) | ITEMS · P/UNIT · SALDO INICIAL · PEDIDO · TRASPASO · [DEVOLUCIÓN] · [AJUSTE] · VENTA CONTADO (Q, BS) · VENTA CRÉDITO (Q, BS) · SALDO FINAL · TOTAL VENTAS (Q, BS) | celdas combinadas; relleno por columna, aproximando los colores de F3: ITEMS salmón `#F8CBAD`, SALDO INICIAL azul claro `#DDEBF7`, PEDIDO amarillo `#FFF2CC`, TRASPASO gris `#D9D9D9`, VENTA CRÉDITO verde `#C6E0B4`, SALDO FINAL azul `#9BC2E6`. **A ajustar con el Excel original del cliente** |
| Cuerpo | Por línea: fila con el nombre de la línea (centrado, negrita, subrayado) y sus productos en el orden del catálogo; **catálogo completo** | Q: `#,##0.##`; Bs: `#,##0.00;-#,##0.00;"-"` (guion en cero, como F3) |
| Pie | TOTAL VENTAS / DESCUENTOS / TOTALES en las columnas Bs de contado, crédito y total | negrita |
| Bloques inferiores | CRÉDITOS (DETALLE \| BS): todas las notas del día con factura/nota y cliente, la de crédito resaltada, y "TOTAL BS.-". COBRANZAS (DETALLE \| BS): "TOTAL COBRANZAS". DEVOLUCIONES, si hay | como F3 |
| Hoja | Paneles inmovilizados en la columna ITEMS y el encabezado; impresión horizontal, ajustada a 1 página de ancho | |
| Nombre | `Liquidacion_LP_2026-06-11.xlsx` | |

## 5 · EECC (`features/eecc/eecc.excel.ts`; impresión `/imprimir/eecc`)
Replica F4/F5:
- Encabezado: "COALSUD S.R.L.", "NIT: 314280024", "DIR.: Z. KENKO - AV. ESTRUCTURANTE N°25", "EL ALTO - BOLIVIA".
- Título "ESTADO DE CUENTAS POR COBRAR - {CATEGORÍA}" (o "CONSOLIDADO"), "AL {dd} DE {MES} {aaaa}" y "(Expresado en Bolivianos)".
- Un bloque por regional (y categoría): fila de encabezado `{REGIONAL} | {año anterior} | ENERO … {mes de corte} | TOTAL | VENDEDOR`, los clientes, la fila TOTAL y, al final, **SALDO ACTUAL**.
- Los ceros se muestran como `-`. Hay columnas extra "VENCIDO" y "MÁX. DÍAS MORA", que se pueden ocultar con un checkbox antes de exportar (⚠ SUP-26).
- Nombre: `EECC_2026-06-11.xlsx`.

## 6 · Rendimiento por vendedor (`/imprimir/rendimiento?desde&hasta&vendedor=`) (⚠ SUP-55)
- A4 vertical, una página por vendedor.
- Resumen (notas, ventas contado, ventas crédito, cobranzas, reembolsos, ingreso) y el detalle de sus notas del período (fecha, N°, cliente, condición, total, estado).

## 7 · Export genérico de tablas (`shared/export/excelTabla.ts` + `BotonExcel`; impresión de reportes `/imprimir/reporte/:clave`)
Para cualquier listado o reporte:
- encabezado en negrita con autofiltro;
- anchos automáticos;
- números con formato;
- fechas como fecha de Excel;
- una fila de título con el filtro aplicado ("Notas de venta · La Paz · 01/06/2026–11/06/2026").

Nombre: `<Reporte>_<Regional|Todas>_<desde>_<hasta>.xlsx`. Se exporta lo que la RLS ya filtró (Arquitectura §4) y se respeta el filtro de la pantalla, no solo la página visible: se pide todo el rango en lotes de 1000.

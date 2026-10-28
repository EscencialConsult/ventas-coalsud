# Pantallas · 11 — Reportes y EECC

**Propósito:** CU-10 · RF19, RF28, RF29, RF30 · ⚠ SUP-24, SUP-26, SUP-27, SUP-34, SUP-35, SUP-54, SUP-55.

## 1 · Reportes (`/reportes/:reporte`)
Menú lateral interno o pestañas. Todos llevan:
- filtros: período y regional (según el selector); vendedor, línea y categoría, si aplican;
- botones **Imprimir** y **Excel** (RF29, Q16).

| REPORTE | RUTA | RPC | COLUMNAS |
|---|---|---|---|
| Top clientes | `/reportes/clientes` | `reporte_top_clientes` | #, cliente, regional, categoría, notas, ventas netas |
| Productos más vendidos | `/reportes/productos` | `reporte_productos_vendidos` | #, producto, línea, unidades, Bs netos |
| Rotación de inventario | `/reportes/rotacion` | `reporte_rotacion` | producto, línea, vendidas, stock inicial/final/promedio, rotación, días de inventario (⚠ SUP-35) |
| Ventas por regional | `/reportes/regionales` | `reporte_ventas_regional` | regional × mes (solo las 3, F2) |
| Rendimiento por vendedor | `/reportes/vendedores` | `ingresos_vendedores` | ver [08_Cobranzas §3](08_Cobranzas.md) (⚠ SUP-34, SUP-55) |
| Movimiento por período | `/reportes/movimiento` | `reporte_movimiento_periodo` | mismas columnas que la liquidación, acumuladas, en Q **y Bs**, para el cuadre de fin de mes (⚠ SUP-54) |

## 2 · EECC consolidado (`/eecc`) · solo nacional
```
 Estado de Cuentas por Cobrar                     Al [11/06/2026]  Regional [Todas ▾]  Categoría [Todas ▾]
 (Expresado en Bolivianos)                                                        [🖨 Imprimir] [⬇ Excel]
 ┌SALDO PENDIENTE──┐┌VENCIDO──────┐┌CLIENTES CON SALDO┐┌CLIENTES EN MORA┐
 │ Bs 703,749.52   ││ Bs …        ││ 23               ││ 7              │
 └─────────────────┘└─────────────┘└──────────────────┘└────────────────┘
 ┌ LA PAZ · SUPERMERCADOS ─────────────────────────────────────────────────────────────────────────────────┐
 │ Cliente          │ 2025 │ ENERO │ FEB │ MAR │ ABR │ MAYO   │ JUNIO     │ TOTAL      │ Vencido │ Mora │ Vend.│
 │ HIPERMAXI LP     │  -   │   -   │  -  │  -  │  -  │   -    │ 17,552.52 │ 17,552.52  │  -      │  -   │ …    │
 │ ANDYS            │  -   │   -   │  -  │  -  │  -  │ 591.20 │    -      │    591.20  │ 591.20  │ 11 d │ …    │
 │ TOTAL            │ 0.00 │ 0.00  │0.00 │0.00 │0.00 │ 591.20 │200,424.72 │ 201,015.92 │         │      │      │
 └─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 … (CBBA, SCZ; institucionales)                       SALDO ACTUAL  5,671.80 · 9,911.60 · … · 703,749.52
```
- **Datos:** `rpc('eecc_consolidado', { p_fecha_corte, p_regional_id, p_categoria })`. La forma está en el [Contrato §6.2](../../../backend/docs/03-especificacion/Contrato_API.md) y las fórmulas en [Reglas §6](../../../backend/docs/03-especificacion/Reglas_de_Calculo.md).
- Columnas dinámicas: "año anterior" + los meses del año hasta el mes de corte (⚠ SUP-26).
- Clic en un cliente → drawer con sus documentos (`v_saldo_documento`): N°, factura, fecha, vence, importe, cobrado, abonos, saldo, días de mora.
- Si un regional entra por URL, `RolGuard` lo redirige; si se fuerza la RPC, responde `SOLO_NACIONAL` (CP-10.3).
- **Excel:** formato de las planillas F4/F5, con encabezado COALSUD, NIT y dirección, "AL dd DE MES aaaa" y "(Expresado en Bolivianos)" ([Impresión §5](../07-Impresion_y_Exportacion.md)).

**Implementación (FE-21, FE-22):**
- Reportes en pestañas (subrutas). Los genéricos comparten una definición (`reportes.definiciones.ts`) que arma la tabla, el Excel y la impresión (`/imprimir/reporte/:clave`). Período por defecto: el mes en curso.
- Rotación y movimiento por período se calculan por regional: con "Todas" se pide elegir una en el selector.
- Movimiento por período reutiliza la matriz de la liquidación acumulada en el rango (ventas en Q y Bs); el Excel trae todas las columnas.
- EECC: el "drawer" de documentos es un modal; el Excel F4/F5 trae vencido y mora si está marcada la casilla. En la demo, el saldo de cada documento es el de hoy (la base lo calcula a la fecha de corte).

**E2E:** CP-10.1, CP-10.2, CP-10.3, CP-10.4.

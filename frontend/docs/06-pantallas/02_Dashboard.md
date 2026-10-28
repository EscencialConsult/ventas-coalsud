# Pantallas · 02 — Dashboard (`/`)

**Propósito:** CU-10 · RF31 (simplificado, Q2) · RNF-16 ("cada rol entra y ve directamente lo suyo").

```
 Dashboard                                         [Todas ▾]
 COALSUD SRL — Vista consolidada · Octubre 2026

 ┌VENTAS DE HOY──┐┌VENTAS DEL MES─┐┌PRESUPUESTO────┐┌BAJO MÍNIMO───┐┌SIN CERRAR────┐┌SIN FACTURA──┐┌CXC (nacional)─┐
 │ Bs 12,450.00  ││ Bs 198,420.00 ││ 72 %          ││ 4 productos  ││ 1 día        ││ 3 notas      ││ Bs 492,997.92 │
 │               ││ ▲ 17.6 % vs   ││ proy. 96 %    ││ [ver]        ││ [cerrar]     ││ [cargar]     ││ vencido 41,200│
 └───────────────┘└───────────────┘└───────────────┘└──────────────┘└──────────────┘└──────────────┘└───────────────┘

 ┌Ventas por regional (mes) ───────────────────┐ ┌Cumplimiento de presupuesto ────────────────────┐
 │ La Paz      ███████████████  Bs 98,200      │ │ Regional  Meta     Real     %    Proy.  Estado │
 │ Cochabamba  ████████         Bs 52,100      │ │ La Paz    120,000  98,200   82%  108%  en_camino│
 │ Santa Cruz  ██████           Bs 48,120      │ │ …                                              │
 └─────────────────────────────────────────────┘ └────────────────────────────────────────────────┘
 ┌Últimas notas ──────────────────────────────────────────────────────────────────────────────┐
 │ 11/06  LP-0415  Hipermaxi LP   Flavia   Crédito   Bs 1,224.60   Sin factura                 │
 └────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Datos:**
  - `rpc('dashboard_kpis', { p_regional_id: regionalActiva, p_desde, p_hasta })` (sin filtro, desde/hasta en null = mes en curso), con `serie` para el mini gráfico (⚙ DT-21, DT-23);
  - `rpc('reporte_ventas_regional', { mes en curso })`;
  - `rpc('cumplimiento_presupuesto', { p_periodo: mes actual })`;
  - `v_nota_venta` (últimas 10).
- Cada KPI lleva a su pantalla: bajo mínimo → `/inventario?bajo_minimo=1`; sin cerrar → `/liquidacion/:fecha`; sin factura → `/notas?pendiente_factura=1`.
- **Cuentas por cobrar:** solo si `rol = nacional` y la RPC devuelve `cxc`. Nunca en la vista de sucursal (Q2, CP-10.5).
- Gráficos SVG propios, sin librería (⚙ DT-16): sparkline en "Ventas del mes", anillo en "Presupuesto del mes", barras horizontales con participación en "Ventas por regional" y barra de avance por fila en "Cumplimiento". Los valores siempre están también en texto.
- Disposición (Sistema de Diseño v1.2, ⚙ DT-20): fila de KPIs principales (ventas de hoy, ventas del mes, presupuesto y CxC para el nacional) y debajo una fila de contadores compactos (bajo mínimo, días sin cerrar, sin factura). Sin botones de alta en el encabezado: "Nueva nota de venta" y las demás altas están en el `+ Nuevo` del topbar.
- **Filtro de período (⚙ DT-23):** botón de ajustes junto a la fecha del topbar (solo en esta pantalla) → modal con atajos (hoy, ayer, últimos 7 y 30 días, mes anterior, este año) y rango personalizado (calendario propio, hasta 366 días). Con filtro: "Ventas del mes" pasa a "Ventas del período" (variación vs los N días anteriores), y ventas por regional y últimas notas usan el rango; ventas de hoy, presupuesto del mes y CxC no cambian. El filtro se ve resaltado en el topbar (pastilla roja con ✕) y en el encabezado ("Filtro de fecha activo" + Quitar filtro). Vive en memoria: se borra al recargar.
- Poco texto (⚙ DT-22): los KPI muestran solo etiqueta, cifra (montos enteros) y un dato extra si aporta (variación, vencido, proyección general = Σ proyección / Σ meta por regional, derivada de las filas de cumplimiento). Los contadores compactos, solo etiqueta y cifra.
- **Cumplimiento:** control segmentado *Regionales / Vendedores* sobre las mismas filas (no pide nada). Columnas: nombre · avance (barra + %; meta y real en el tooltip y, en móvil, debajo) · proyección · estado.
- **Últimas notas:** 4 columnas con celdas de dos líneas: nota (fecha · factura debajo) · cliente (vendedor debajo) · total (condición debajo) · estado (una emitida sin factura muestra solo "Sin factura").
- Fórmulas en [Reglas de Cálculo §10](../../../backend/docs/03-especificacion/Reglas_de_Calculo.md).

**E2E:** CP-10.5.

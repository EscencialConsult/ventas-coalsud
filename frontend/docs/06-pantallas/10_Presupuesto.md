# Pantallas · 10 — Presupuesto (`/presupuesto`)

**Propósito:** CU-09 · RF26, RF27 · ⚠ SUP-33, **SUP-52** (falta confirmar si "presupuesto" significa metas o cotizaciones; se construye como metas, igual que la demo).

```
 Presupuesto y Seguimiento Comercial                 Período [Octubre 2026 ▾]   [+ Cargar meta]
 Carga de metas · seguimiento · proyección de cierre
 ┌──────────┬────────────┬───────────┬──────────────┬─────────────┬─────────────┬───────┬────────────┬───────────┬────┐
 │ Período  │ Regional   │ Vendedor  │ Categoría    │ Meta        │ Real        │ %     │ Proyección │ Estado    │    │
 │ 2026-10  │ La Paz     │ —         │ —            │ 120,000.00  │ 98,200.00   │ 82 %  │ 108 %      │ En camino │ ✎  │
 │ 2026-10  │ La Paz     │ Flavia    │ —            │ 30,000.00   │ 21,400.00   │ 71 %  │ 94 %       │ En riesgo │ ✎  │
 └──────────┴────────────┴───────────┴──────────────┴─────────────┴─────────────┴───────┴────────────┴───────────┴────┘
 Proyección de cierre (barras CSS: meta vs real vs proyección por regional)
```

- **Datos:** `rpc('cumplimiento_presupuesto', { p_periodo, p_regional_id })`. Fórmulas en [Reglas §8](../../../backend/docs/03-especificacion/Reglas_de_Calculo.md).
- **Modal de meta:**
  - período * (`YYYY-MM`) y regional * (nacional: cualquiera; regional: las suyas);
  - vendedor (de esa regional) y categoría de cliente, opcionales;
  - meta Bs * (> 0) y observaciones.
- **Acción:** `presupuesto` insert/update (RLS). `DUPLICADO` → "Ya existe una meta para esa combinación; edítela" (CP-09.3).

**Implementación (FE-23):** el período es un selector de meses (los últimos 6 y los próximos 3). La meta de la regional va primero; la de un vendedor o categoría muestra la regional debajo. La edición necesita los ids de la meta (⚙ DT-29). En fixtures, el dashboard toma las mismas metas.

**E2E:** CP-09.1, CP-09.2.

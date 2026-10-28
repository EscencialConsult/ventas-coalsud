# Pantallas · 04 — Clientes y Vendedores

**Propósito:** CU-03 · RF03, RF04, RF35 · ⚠ SUP-32, SUP-49.

## 1 · Clientes (`/clientes`)
```
 Clientes                                                        [+ Nuevo cliente]
 Gestión de cartera · La Paz
 [Buscar nombre, empresa o NIT…] [Categoría ▾] [Canal ▾] [Vendedor ▾] [Activos ▾]
 ┌───────────────────┬──────────────┬──────────────┬─────────┬────────┬──────────┬──────────────┬────────┬────┐
 │ Nombre            │ Empresa      │ Categoría    │ Canal   │ Zona   │ Vendedor │ Condición    │ Estado │    │
 │ Hipermaxi La Paz  │ Hipermaxi SA │ Supermercado │ Super   │ Sur    │ Flavia   │ Crédito 30 d │ Activo │ ✎  │
 └───────────────────┴──────────────┴──────────────┴─────────┴────────┴──────────┴──────────────┴────────┴────┘
```
- **Nacional:** columna Regional y filtro por regional; sin "+ Nuevo" ni ✎ (solo lectura).
- **Detalle** (`/clientes/:id`): ficha + pestañas "Notas" (`v_nota_venta?cliente_id`) y "Saldo" (`v_saldo_documento?cliente_id`, visible para la regional: lo necesita para cobrar; el EECC consolidado sigue siendo solo del nacional).

### Alta / edición (modal `lg`)
| CAMPO | VALIDACIÓN |
|---|---|
| Nombre * | requerido |
| Razón social · NIT | opcionales (⚠ SUP-49) |
| Categoría * | supermercado / mayorista / minorista / institucional |
| Canal * | supermercado / ruta / institucional (se sugiere a partir de la categoría) |
| Regional * | solo las del usuario (CP-03.3); fija si tiene una sola |
| Vendedor | vendedores activos **de la regional elegida** (CP-03.4) |
| Condición de pago * | `condicion_pago` activas; por defecto, Contado |
| Zona · Teléfono · Email · Dirección | opcionales; email con formato |
| Activo | switch (solo al editar) |

- **Datos:** `cliente` insert/update directo (RLS patrón B). Los errores `42501` se presentan como `NO_AUTORIZADO`.

## 2 · Vendedores (`/vendedores`)
```
 Vendedores · La Paz                                             [+ Nuevo vendedor]
 ┌────────────────────┬────────────┬──────────────────────┬────────┬────┐
 │ Nombre             │ Teléfono   │ Mercadería en poder  │ Estado │    │
 │ Flavia Rivera      │ 7xxxxxxx   │ 12 u. · Bs 480.00    │ Activo │ ✎  │
 └────────────────────┴────────────┴──────────────────────┴────────┴────┘
```
- Modal: nombre *, teléfono, activo.
- "Mercadería en poder" sale de `v_stock` con `ubicacion = 'vendedor'`. Solo aplica a la modalidad del mismo nombre (⚠ SUP-07).
- Desactivar con saldo → `VENDEDOR_CON_SALDO` → modal con los productos y el botón "Registrar retorno" (lleva a `/inventario/nuevo/retorno?vendedor=`) (CP-03.6).

**Implementación (FE-07, FE-08):**
- El filtro por regional es el selector del topbar; con "Todas" (nacional) se suma la columna Regional.
- Para no saturar la tabla, Empresa/NIT van debajo del nombre y el canal debajo de la categoría (celdas de dos líneas).
- El estado activo se cambia con el interruptor de la fila (optimista con rollback); en el modal de edición también.
- La pestaña elegida del detalle va en la URL (`?pestana=saldo`).
- Mercadería en poder valorizada con `precio_base` de `v_stock` (⚙ DT-24). Si la lista ya muestra mercadería, el aviso de VENDEDOR_CON_SALDO se abre sin llamar a la base.

**E2E:** CP-03.1, CP-03.2, CP-03.3, CP-03.5.

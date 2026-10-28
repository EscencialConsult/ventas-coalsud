# Pantallas · 08 — Cobranzas

**Propósito:** CU-07 · RF18, RF19, RF40 · ⚠ SUP-22, SUP-23, SUP-34, SUP-42, SUP-51, SUP-55.

> En F2 la clienta pidió quitar el módulo "Rendición y cobranzas" de la sucursal. Por eso no hay ítem de menú "Cobranzas" para el regional. Los cobros del día se registran desde la **Liquidación** (pestaña Cobranzas) o desde el **detalle de la nota** ("Cobrar"). El "ingreso por vendedor" sí se mantiene y está en Reportes (⚠ SUP-51).

## 1 · Registrar cobro (`/cobranzas/nueva?cliente=&nota=`) — modal `xl` o página
```
 Registrar cobro · La Paz                                    Fecha [11/06/2026]
 CLIENTE * [Hipermaxi LP                ]
 Documentos con saldo
 ┌───┬─────────────┬──────────┬────────────┬─────────────┬─────────────┬───────────┬──────────────┐
 │ ☑ │ Documento   │ Factura  │ Fecha      │ Vence       │ Saldo       │ Mora      │ Importe      │
 │ ☑ │ LP-0388     │ F-1401   │ 05/06/2026 │ 05/07/2026  │ Bs 440.00   │ —         │ [ 200.00 ]   │
 │ ☐ │ SALDO-2026-05│ —       │ 01/05/2026 │ 31/05/2026  │ Bs 1,879.80 │ 11 días   │ [        ]   │
 └───┴─────────────┴──────────┴────────────┴─────────────┴─────────────┴───────────┴──────────────┘
 FORMA DE PAGO * [Efectivo ▾]  REFERENCIA [N° transferencia/cheque]  OBSERVACIONES [________]
                                                          Total a registrar Bs 200.00
                                                          [Cancelar] [Registrar cobro]
```
- **Datos:** `v_saldo_documento?cliente_id&saldo>0`. Si viene `?nota=`, esa nota queda marcada con su saldo completo.
- **Validaciones:** al menos un documento; `0 < importe ≤ saldo` (CP-07.4); forma de pago (efectivo, transferencia, QR, cheque, depósito, otro, ⚠ SUP-42).
- **Acción:** `rpc('registrar_cobranzas')`, una cobranza por documento (⚠ SUP-22) → toast "3 cobros registrados (CB-LP-0031 a 0033)" (CP-07.6).
- **Errores:** `IMPORTE_EXCEDE_SALDO` (marca la fila), `DIA_CERRADO` (CP-07.3), `DOCUMENTO_CONTADO`.

## 2 · Cobranzas del día (pestaña dentro de Liquidación)
Ver [09_Liquidacion §3](09_Liquidacion.md). Columnas:
- N° CB y cliente;
- documento (nota / factura / saldo inicial);
- forma de pago, referencia e importe;
- estado;
- acción **Anular**: día abierto, motivo obligatorio, `rpc('anular_cobranza')` (CP-07.7).

## 3 · Ingresos y rendimiento por vendedor (`/reportes/vendedores`)
```
 Rendimiento por vendedor · La Paz · [01/06/2026]–[11/06/2026]        [🖨 Imprimir] [Excel]
 ┌───────────┬───────┬───────────────┬───────────────┬─────────────┬────────────┬──────────────┐
 │ Vendedor  │ Notas │ Ventas contado│ Ventas crédito│ Cobranzas   │ Reembolsos │ INGRESO      │
 │ Flavia    │ 42    │ Bs 8,200.00   │ Bs 5,100.00   │ Bs 2,300.00 │ Bs 0.00    │ Bs 10,500.00 │
 └───────────┴───────┴───────────────┴───────────────┴─────────────┴────────────┴──────────────┘
```
- **Datos:** `rpc('ingresos_vendedores')` ([Reglas §7.2](../../../backend/docs/03-especificacion/Reglas_de_Calculo.md)).
- **Imprimir:** una hoja por vendedor con su detalle de notas, para "explicárselo a ellos" (⚠ SUP-55).

**Implementación (FE-17):**
- Registrar cobro es una página. El cliente se busca en el servidor; sus documentos con saldo se marcan con casillas y, al marcarlos, se propone el saldo completo como importe.
- Al terminar vuelve a la nota (si vino de "Cobrar") o a la pestaña Saldo del cliente.
- Las cobranzas de una nota se ven y se anulan en su detalle (hasta que exista la pestaña de Liquidación, Sprint 6). Si el día del cobro está cerrado, el botón explica por qué.
- Rendimiento por vendedor: período por defecto, el mes en curso. Se accede desde Vendedores ("Rendimiento") hasta que exista el índice de Reportes (FE-22). Imprime todos o un vendedor; cada hoja trae el detalle de sus notas (⚙ DT-27).
- Cartera inicial (Configuración, nacional): CSV de la plantilla con vista previa y validación por fila (regional, cliente por nombre exacto, N° repetido, fechas AAAA-MM-DD o DD/MM/AAAA, importe). Solo se carga si todas las filas están bien; una llamada por regional.

**E2E:** CP-07.1, CP-07.2, CP-07.4, CP-07.6, CP-07.7.

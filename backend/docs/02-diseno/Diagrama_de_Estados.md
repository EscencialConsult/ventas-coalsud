ESENCIAL CONSULTORA · DISEÑO DEL SISTEMA

# Diagrama de Estados — COALSUD S.R.L.
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

Muestra el ciclo de vida de los elementos que cambian de situación con el tiempo. Cada estado es una situación y cada flecha, una transición con su evento.

Se modelan cuatro elementos:
- la **nota de venta**;
- ● la **cobranza**;
- la **liquidación del día**;
- el **movimiento de inventario**.

**● Cambios v1.1:**
- "Facturada" y "Con devolución" dejan de ser estados almacenados: son **indicadores derivados**. En la base, `estado` solo vale `emitida` o `anulada`.
- Se agregan el estado de la cobranza y las reglas de cierre secuencial y de reapertura del último día.

---

## 1 — La nota de venta

```
          emitir nota (admin regional, día abierto)
                    │
                    ▼
            ┌────────────┐   anular (día abierto y sin    ┌───────────┐
            │  Emitida   │   cobranzas vigentes) ───────► │  Anulada  │
            └────────────┘   repone stock + traza         └───────────┘
              │   indicadores derivados (no son estados almacenados):
              │   · pendiente de factura  ⇄  facturada   (numero_factura nulo / cargado)
              │   · saldo por cobrar > 0  ⇄  cancelada   (solo notas a crédito)
              │   · con devolución                       (existe ≥1 devolución ligada)
              │
       día cerrado  │  devolver (parcial o total)
                    ▼
            ┌──────────────┐
            │  Devolución  │ (entidad nueva, fecha hoy; la nota sigue «Emitida»)
            └──────────────┘
```

| ESTADO / INDICADOR | QUÉ SIGNIFICA | CÓMO CAMBIA |
|---|---|---|
| **Emitida** (estado) | Nota válida, stock descontado | Se anula (día abierto, sin cobranzas) |
| **Anulada** (estado) | Sin efecto; stock repuesto; trazada | — (fuera de circuito; se reimprime con marca de agua) |
| Pendiente de factura (indicador) ● | `numero_factura` nulo; bloquea el cierre del día (⚠ SUP-06) | Al registrar el N° (se permite aun con el día cerrado) |
| Facturada (indicador) | Cruzada con el N° de factura legal | Se puede corregir el N° (auditado) |
| Con saldo / Cancelada (indicador) ● | Solo crédito: saldo = total − cobranzas − abonos | Con cada cobranza, anulación de cobranza o abono |
| Con devolución (indicador) | Se revirtió todo o parte en un día posterior | Cada devolución nueva |

> **No existe el estado "Editada":** una nota emitida no se edita. Se anula (día abierto) o se devuelve (día cerrado). Lo único que se completa después es el N° de factura y su PDF.

---

## 2 — ● La cobranza

```
   registrar cobranza (día abierto, importe ≤ saldo)
                    │
                    ▼
            ┌────────────┐   anular (día abierto, motivo)   ┌───────────┐
            │  Vigente   │ ───────────────────────────────► │  Anulada  │
            └────────────┘   el saldo del documento vuelve  └───────────┘
```

| ESTADO | QUÉ SIGNIFICA | CÓMO SALE DE AHÍ |
|---|---|---|
| Vigente | Suma al arqueo del día y reduce el saldo del documento | Se anula mientras su día esté abierto (⚠ SUP-23) |
| Anulada | No suma en ningún lado; queda trazada | — |

---

## 3 — La liquidación del día

```
     primera operación con esa fecha (cualquier RPC de la regional)
                    │   crea la fila «abierta» si no existía
                    ▼
            ┌────────────┐   cerrar (admin regional)        ┌────────────┐
            │  Abierta   │ ───────────────────────────────► │  Cerrada   │
            └────────────┘   validaciones:                  └────────────┘
                    ▲        · sin notas pendientes de factura      │
                    │        · sin días anteriores abiertos         │
                    │        congela snapshot + totales             │
                    └──────── reabrir (solo nacional, solo el ──────┘
                              ÚLTIMO día cerrado, motivo obligatorio)
                              el snapshot anterior pasa a auditoría
```

| ESTADO | QUÉ SIGNIFICA | CÓMO SALE DE AHÍ |
|---|---|---|
| (sin fila) | Día sin ninguna operación: no hace falta cerrarlo | Primera operación con esa fecha |
| Abierta | Se pueden cargar notas, cobranzas y movimientos de esa fecha | El regional la cierra (si pasa las validaciones) |
| Cerrada | Inmutable; snapshot congelado; la base bloquea escrituras de esa fecha y regional | Solo el nacional la reabre, si es la última cerrada (auditado) |

**Reglas:**
- Mientras está **Abierta**, los totales se calculan en vivo.
- Al **cerrar**, se materializa `liquidacion_linea` y se activa el bloqueo (RF33).
- ● No se pueden crear operaciones con fecha **anterior o igual al último día cerrado** de la regional, aunque ese día no tenga fila (⚠ SUP-19).
- Una corrección posterior a un día cerrado no reabre por defecto: se hace por **devolución** o **ajuste** con fecha de hoy.

---

## 4 — El movimiento de inventario (salida, retorno, traspaso y devolución)

```
   ● Salida al vendedor (solo modalidad «mercadería en poder del vendedor»; interna a la regional):
   ┌──────────────┐  dos movimientos  ┌──────────────────┐
   │ Almacén (−)  │ ────────────────► │ Vendedor (+)     │   stock total regional: sin cambio
   └──────────────┘                   └──────────────────┘

   ● Retorno del vendedor:
   ┌──────────────────┐               ┌──────────────┐
   │ Vendedor (−)     │ ────────────► │ Almacén (+)  │       stock total regional: sin cambio
   └──────────────────┘               └──────────────┘

   Traspaso entre regionales:
   ┌──────────────┐  genera dos movimientos espejo  ┌──────────────┐
   │ Salida origen│ ──────────────────────────────► │ Entrada dest.│
   └──────────────┘  (−) en origen · (+) en destino └──────────────┘
                     columna Traspaso: −q en origen, +q en destino

   Venta / Anulación:
   venta: almacén (−) en preventa (por defecto) · vendedor (−) si vende desde su saldo
   anulación: (+) al mismo origen, con la MISMA fecha de la nota → el día neto queda en cero

   Devolución:
   registrar devolución (día de la nota cerrado)
   ┌──────────────────────┐   repone stock HOY en el almacén (+)
   │ Devolución registrada│   + reembolso (egresa caja hoy) o abono a cuenta (reduce CxC)
   └──────────────────────┘
```

- El **traspaso** nunca deja la mercadería en dos lados: sale del origen y entra en el destino en la misma transacción.
- La **devolución** es un movimiento nuevo con fecha de hoy que no toca el día cerrado donde ocurrió la venta.
- Un movimiento, una vez insertado, **no cambia de estado**: no se edita ni se borra. Para corregirlo, se asienta otro movimiento.

ESENCIAL CONSULTORA · SISTEMA COMERCIAL PARA COALSUD S.R.L.

# Cómo va a funcionar cada operación — Diagramas de Flujo
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

Muestran el camino de cada tarea del negocio paso a paso, con las preguntas que el sistema se hace en el medio. Están para revisarse **antes** de construir: cambiar algo en esta hoja lleva minutos; con el sistema andando, semanas.

**Cómo se leen:**
- Óvalo `( … )` = inicio/fin.
- Rectángulo = acción.
- Rombo `¿…?` = pregunta con dos salidas (Sí/No).
- `/texto/` = algo que se imprime o emite.

**● Cambios v1.1:**
- Las cuatro preguntas de la v1.0 se resolvieron con propuestas (⚠ SUP-06, SUP-18, SUP-20/21, SUP-01).
- Se agrega el flujo de **salida y retorno del vendedor** (§5) y el de **cobranza** (§6).

---

## 1 — La nota de venta

```
( Inicio )
Elegir fecha (por defecto hoy, hora de Bolivia)
¿El día está cerrado, es futuro o es anterior al último cierre?  Sí ─► Avisar ─► ( Fin )
        │ No
        ▼
Seleccionar cliente  (propone vendedor, canal y condición del cliente)
¿Faltan cliente o vendedor?  Sí ─► Avisar y no guardar ─► ( Fin )
        │ No
        ▼
¿El vendedor lleva la mercadería en su poder?  (por defecto No → preventa: sale del ALMACÉN)
        │ Sí ─► la nota descuenta del saldo del vendedor
        ▼
Agregar productos  (precio del catálogo, editable)
¿Alcanza el saldo del origen?  No ─► Avisar «disponible: N» (ajustar cantidad o registrar salida)
        │ Sí
        ▼
Calcular total (Σ subtotales × (1 − descuento)) · numerar por regional (LP-00xx)
N° de factura: ¿ya lo tiene?  Sí ─► cargarlo (+ PDF)   No ─► queda «Pendiente de factura»
        ▼
Guardar nota (descuenta el saldo del origen; audita cambios de precio y descuento)
        ▼
/Imprimir A5 duplicada en A4/  (copia del cliente sin condición de pago)
        ▼
¿Terminó de cargar los pedidos del vendedor?  Sí ─► /Hoja de carga del vendedor/ (consolidado de sus notas) ─► almacén
        ▼
( Fin )
```
**Momentos donde el camino se abre:**
- ● circuito de preventa (F2): pedido por WhatsApp → nota → hoja de carga/salida → entrega; si el cliente no estaba, se anula (§2);
- sin cliente o vendedor, no guarda;
- el precio es editable y el cambio queda registrado;
- ● el N° de factura se puede cargar después, pero **sin él no se cierra el día** (⚠ SUP-06).

---

## 2 — Anular vs Devolver (la decisión clave)

```
( Inicio )  Hay que corregir una nota
¿El día de la venta está cerrado?
        │ No  (día abierto)                     │ Sí (día cerrado)
        ▼                                        ▼
   ¿Tiene cobranzas vigentes?                DEVOLVER (Nota de Crédito)
     │ Sí ─► anular primero las cobranzas    · elegir productos y cantidades (≤ vendido − devuelto)
     │ No                                    · crea devolución con FECHA DE HOY
     ▼                                       · repone el stock HOY en el almacén
   ANULAR                                    · ¿tipo de reverso?
   · marca la nota «anulada»                    │ Reembolso ─► egresa de la CAJA DE HOY
   · repone el stock al origen                  │ Abono a cuenta (solo crédito) ─► baja la deuda
   · registra quién/cuándo (motivo opcional)    ▼
   · NO toca caja                            Ligar a la nota original (parcial o total)
   · ¿tenía factura? ─► aviso a Contabilidad Marcar para nota de crédito contable
        ▼                                        ▼
   Generar nota nueva (número nuevo)         ( Fin )
        ▼
   ( Fin )
```
**La regla:** el día original **nunca** se toca. Antes del cierre se corrige por anulación; después del cierre, por devolución con fecha de hoy. *(Q8, Q19, Q20, ⚠ SUP-17, SUP-18)*

---

## 3 — El cierre del día (liquidación)

```
( Inicio )
Abrir el reporte del día de la regional
El sistema arma la matriz por producto (todos los vendedores)
  saldo inicial · pedido · traspaso(±) · [devolución] · [ajuste] · contado(Q+Bs) · crédito(Q+Bs) · saldo final · total
Calcular arqueo:  Total Ventas = Contado neto + Crédito neto
                  Total Efectivo = Contado neto + Cobranzas − Reembolsos
Mostrar detalle de Notas del día · detalle de Cobranzas · [detalle de Devoluciones]
¿Cuadra el arqueo?  No ─► Revisar notas/cobranzas (el día sigue abierto)
        │ Sí
        ▼
Pulsar «Cerrar el día»
¿Hay días anteriores abiertos?            Sí ─► Avisar cuáles (cerrarlos primero) ─► ( Fin )
¿Hay notas emitidas sin N° de factura?    Sí ─► Listarlas (cargar las facturas)   ─► ( Fin )
        │ No
        ▼
/Congelar snapshot + totales/  ──►  Bloquear la fecha y la regional
        ▼
( Fin )
¿Hace falta corregir después?  ─► Solo el NACIONAL reabre, solo el ÚLTIMO día cerrado, con motivo
```
**Momentos donde el camino se abre:**
- si el arqueo no cuadra, el día sigue abierto para revisar;
- ● el cierre es secuencial y exige las facturas;
- una vez cerrado el día, es inmutable y solo el nacional reabre. *(Q5, Q20, ⚠ SUP-06, SUP-20, SUP-21)*

---

## 4 — El traspaso entre regionales

```
( Inicio )
Elegir productos, cantidades, regional destino y fecha
¿Hay stock en el almacén de origen?  No ─► Rechazar (no alcanza)
¿El día del destino está abierto?    No ─► Rechazar (día cerrado en destino)
        │ Sí
        ▼
Generar movimiento de SALIDA en origen (−)
Generar movimiento de ENTRADA en destino (+)
        ▼
Reflejar en la columna «Traspaso» del reporte diario: −q en origen, +q en destino
        ▼
( Fin )
```
**La regla:** la cantidad no se duplica; sale de un lado y entra en el otro en la misma operación. *(Q6, ⚠ SUP-09, SUP-37)*

---

## 5 — ● Salida y retorno del vendedor

Hay dos modalidades (⚠ SUP-07):
- **Preventa (por defecto).** No hay salida manual: la "salida" es la **hoja de carga**, que se genera desde las notas del vendedor (§1). El stock ya lo descontaron las notas.
- **Mercadería en poder del vendedor.** Es este flujo:

```
( Inicio )  Mañana: el vendedor sale a la ruta con mercadería (sin pedidos previos)
Elegir vendedor, productos y cantidades
¿Hay stock en el almacén?  No ─► Rechazar
        │ Sí
        ▼
/Nota de salida NS-LP-xxxx/  ── almacén (−) · vendedor (+)
        ▼
Durante el día: cada nota de venta (origen «saldo del vendedor») descuenta de su saldo
        ▼
Tarde: ¿el vendedor devuelve sobrante?
        │ Sí ─► /Nota de retorno RT-LP-xxxx/ ── vendedor (−) · almacén (+)
        │ No ─► el saldo queda en su poder para el día siguiente (⚠ SUP-15)
        ▼
«Saldo en poder de vendedores»: entregado − vendido − retornado = saldo
        ▼
( Fin )
```
**La regla:** salida y retorno no cambian el stock total de la regional; por eso no aparecen en la matriz del reporte diario, sino en el control por vendedor. *(Q13, ⚠ SUP-07, SUP-08)*

---

## 6 — ● La cobranza

Se entra desde la Liquidación del día o desde el detalle de una nota. No hay módulo de "Rendición" en la sucursal (⚠ SUP-51).

```
( Inicio )
Buscar cliente  ─► ver sus documentos con saldo (notas a crédito + cartera inicial)
Marcar uno o varios documentos e indicar el importe de cada uno
¿Algún importe supera el saldo del documento?  Sí ─► Avisar ─► corregir
        │ No
        ▼
Forma de pago · referencia · fecha (día abierto)
        ▼
Guardar ─► una cobranza CB-LP-xxxx por documento
        ▼
Suma al bloque «Cobranzas» y al Total Efectivo del día
        ▼
( Fin )
```

---

## Decisiones tomadas sobre las preguntas de la v1.0

| PREGUNTA v1.0 | PROPUESTA ADOPTADA | SUPUESTO |
|---|---|---|
| 1. ¿El N° de factura es obligatorio para guardar? | No para guardar; sí para **cerrar el día**. Se puede cargar después, incluso con el día cerrado. | ⚠ SUP-06 |
| 2. ¿La frontera anular/devolver es el cierre? | Sí. Además, para anular no puede haber cobranzas vigentes. | ⚠ SUP-18 |
| 3. ¿Quién cierra y quién reabre? | Cada regional cierra la suya, en orden; el nacional reabre solo el último día cerrado. | ⚠ SUP-20, SUP-21 |
| 4. ¿El formato A5 duplicado coincide con la nota actual? | Diseño propuesto; ajustar cuando llegue la plantilla del cliente. | ⚠ SUP-01 |

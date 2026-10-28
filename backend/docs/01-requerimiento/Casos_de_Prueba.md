ESENCIAL CONSULTORA · CASOS DE PRUEBA

# Casos de Prueba — Sistema Comercial para COALSUD S.R.L.
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

**Versiones:**
- **v1.1 — 26/10/2026** ●: agrega casos para las reglas nuevas (factura al cierre, cierre secuencial, reapertura del último día, retorno, ajuste, imputación y anulación de cobranzas, concurrencia, datos iniciales) y un **caso dorado** que reproduce la planilla real del 11/06/2026 (CP-08.10). **●** = nuevo o modificado.
- **v1.0 — 21/10/2026**: casos iniciales derivados de CU-01 a CU-11.

Cada caso nace de un paso del curso normal o de una alternativa de su caso de uso.

**Cómo leer:**
- **ID** (CP-CU.n) · escenario y datos de entrada · resultado esperado · tipo (Normal / Alternativa).
- **Capa** indica dónde se automatiza:
  - **BD**: pgTAP en `backend/supabase/tests`;
  - **E2E**: Playwright en `frontend/e2e`;
  - **BD+E2E**: en ambas.

**Datos de prueba base** (seed de pruebas, [Datos Iniciales §5](../04-ejecucion/Datos_Iniciales.md)):
- Regionales: LP, CBBA y SCZ.
- Usuarios:
  - `irene@coalsud.demo` (nacional);
  - `vanessa@coalsud.demo` (LP + CBBA);
  - `fernando@coalsud.demo` (SCZ).
- Vendedores: `Flavia` (LP), `Arturo` (LP) y `Mario` (SCZ).
- Productos:
  - "Quinua Tricolor 1 kg" (COMRURAL, Bs 44, mínimo 30);
  - "Fifitos 360gr" (LA Y SAA, Bs 7).
- Cliente: "Hipermaxi La Paz" (supermercado, Crédito 30 días).

---

## CU-01 · Administrando usuarios y accesos
Precondición común: Administrador Nacional autenticado.

| ID | ESCENARIO Y DATOS DE ENTRADA | RESULTADO ESPERADO | TIPO | CAPA |
|---|---|---|---|---|
| CP-01.1 | Alta de usuario regional "Vanessa" con regionales La Paz **y** Cochabamba. | Se crea con ambas regionales; al entrar opera LP y CBBA. | Normal | E2E |
| CP-01.2 | Alta de usuario nacional "Irene" sin regionales. | Se crea; ve las tres regionales (solo lectura en lo transaccional). | Alternativa | E2E |
| CP-01.3 | Intentar desactivar al único usuario nacional activo. | Rechazado (ULTIMO_NACIONAL): debe quedar al menos un nacional activo. | Alternativa | BD+E2E |
| CP-01.4 | Alta con un correo que ya existe. | Rechazado (DUPLICADO): avisa y no duplica. | Alternativa | E2E |
| ● CP-01.5 | Alta de un regional sin regionales asignadas. | No guarda: el regional requiere al menos una regional. | Alternativa | BD+E2E |
| ● CP-01.6 | Un regional llama a la Edge Function `admin-usuarios`. | Rechazado (SOLO_NACIONAL). | Alternativa | BD |
| ● CP-01.7 | Resetear la contraseña de Fernando. | Fernando debe cambiarla en su próximo ingreso; queda auditado. | Normal | E2E |

## CU-02 · Iniciando sesión por rol/regional
Precondición común: cuenta activa.

| ID | ESCENARIO Y DATOS DE ENTRADA | RESULTADO ESPERADO | TIPO | CAPA |
|---|---|---|---|---|
| CP-02.1 | Login válido de Vanessa (LP + CBBA). | Entra y ve el selector de regional activa con La Paz y Cochabamba. | Normal | E2E |
| CP-02.2 | Login con credenciales inválidas. | Rechazado sin indicar cuál dato falló. | Alternativa | E2E |
| CP-02.3 | Fernando (SCZ) arma a mano una consulta a datos de La Paz. | Rechazado por la base (RLS): no ve datos de otra regional. | Alternativa | BD |
| CP-02.4 | El admin nacional abre una nota y busca "anular". | Puede consultar; las acciones de escritura no aparecen, y si se fuerzan por API, la base las rechaza. | Alternativa | BD+E2E |
| CP-02.5 | Sesión inactiva durante 30 minutos. | Aviso al minuto 29; al 30, el sistema cierra la sesión. | Alternativa | E2E |
| ● CP-02.6 | Primer ingreso con contraseña temporal. | Redirige a «Cambiar contraseña»; no deja navegar hasta cambiarla. | Normal | E2E |
| ● CP-02.7 | Usuario desactivado con una sesión ya abierta intenta emitir una nota. | Rechazado por la base (NO_AUTORIZADO). | Alternativa | BD |

## CU-03 · Gestionando clientes y vendedores
Precondición común: Administrador Regional autenticado.

| ID | ESCENARIO Y DATOS DE ENTRADA | RESULTADO ESPERADO | TIPO | CAPA |
|---|---|---|---|---|
| CP-03.1 | Alta de cliente "Hipermaxi La Paz" (supermercado, canal supermercado, La Paz, vendedor Flavia, Crédito 30 días). | Queda registrado y disponible para notas. | Normal | E2E |
| CP-03.2 | Búsqueda/filtrado por categoría "Institucional". | Lista solo los institucionales de las regionales del usuario. | Normal | E2E |
| CP-03.3 | Fernando intenta asignar un cliente a la regional La Paz. | Solo puede elegir sus regionales (Santa Cruz); por API, lo rechaza la RLS. | Alternativa | BD+E2E |
| ● CP-03.4 | Asignar a un cliente de LP el vendedor Mario (SCZ). | Rechazado: el vendedor debe ser de la misma regional. | Alternativa | BD |
| ● CP-03.5 | Alta del vendedor "Martha" en LP. | Queda disponible para salidas y notas de LP. | Normal | E2E |
| ● CP-03.6 | Desactivar a Flavia teniendo 5 u. en su poder. | Rechazado (VENDEDOR_CON_SALDO): primero debe retornar la mercadería. | Alternativa | BD |

## CU-04 · Gestionando catálogo y configuración
Precondición común: usuario con permiso sobre el catálogo (nacional).

| ID | ESCENARIO Y DATOS DE ENTRADA | RESULTADO ESPERADO | TIPO | CAPA |
|---|---|---|---|---|
| CP-04.1 | Alta de producto "Quinua Tricolor 1kg" (línea COMRURAL, precio 44, mínimo 30). | Queda en el catálogo, disponible para vender. | Normal | E2E |
| CP-04.2 | Alta de una línea comercial nueva. | Disponible para agrupar productos y el reporte diario. | Normal | E2E |
| CP-04.3 | Un regional intenta editar el precio del catálogo maestro. | Rechazado por la RLS (catálogo solo del nacional, ⚠ SUP-02). | Alternativa | BD |
| ● CP-04.4 | Cambiar el precio base de 44 a 46. | Queda auditado (antes/después); las notas ya emitidas conservan su precio. | Normal | BD |
| ● CP-04.5 | Alta de la condición de pago "Crédito 45 días". | Disponible en clientes y notas. | Normal | E2E |

## CU-05 · Moviendo inventario
Precondición común: producto en catálogo; A2 autenticado; día abierto.

| ID | ESCENARIO Y DATOS DE ENTRADA | RESULTADO ESPERADO | TIPO | CAPA |
|---|---|---|---|---|
| CP-05.1 | Ingreso de 50 u. de un producto al almacén La Paz. | Suma 50 al stock del almacén, con fecha, referencia y número `NI-LP-…`. | Normal | BD+E2E |
| CP-05.2 | Nota de salida de 20 u. a Flavia. | Almacén −20, saldo de Flavia +20; el stock total de LP no cambia. | Normal | BD+E2E |
| CP-05.3 | Traspaso de 30 u. de La Paz a Santa Cruz. | Genera salida en La Paz (−30) y entrada en Santa Cruz (+30), con el mismo `TR-LP-…`. | Normal | BD |
| CP-05.4 | Intentar una salida mayor al stock disponible. | Rechazado (STOCK_INSUFICIENTE): el stock físico no puede quedar negativo. | Alternativa | BD+E2E |
| CP-05.5 | Un producto baja de su mínimo. | Aparece la alerta de reposición. | Alternativa | E2E |
| CP-05.6 | Intentar editar el saldo de stock directamente (update a `stock_saldo`). | Rechazado: el stock solo cambia por movimientos. | Alternativa | BD |
| ● CP-05.7 | Retorno de 4 u. de Flavia (tiene 20). | Flavia 16, almacén +4. | Normal | BD+E2E |
| ● CP-05.8 | Retorno de 25 u. de Flavia (tiene 16). | Rechazado (STOCK_INSUFICIENTE). | Alternativa | BD |
| ● CP-05.9 | Ajuste −3 u. por merma sin motivo. | No guarda: el motivo es obligatorio. | Alternativa | BD+E2E |
| ● CP-05.10 | Traspaso LP → SCZ cuando el día de SCZ está cerrado. | Rechazado (DIA_CERRADO, regional destino). | Alternativa | BD |
| ● CP-05.11 | Consultar el saldo en poder de vendedores. | Por vendedor y producto: entregado, vendido, retornado y saldo, que cuadra con los movimientos. | Normal | E2E |
| ● CP-05.12 | Dos salidas simultáneas de 10 u. con stock 15. | Una se registra; la otra se rechaza con STOCK_INSUFICIENTE (sin stock negativo). | Alternativa | BD |

## CU-06 · Emitiendo notas de venta (anular / devolver)
Precondición común: cliente y productos existentes; stock en el almacén (preventa) o en poder del vendedor.

| ID | ESCENARIO Y DATOS DE ENTRADA | RESULTADO ESPERADO | TIPO | CAPA |
|---|---|---|---|---|
| CP-06.1 | ● Nota de venta (preventa) a Hipermaxi LP con 3 productos, contado. | Numera `LP-00xx`, calcula el total y descuenta el **almacén**. | Normal | BD+E2E |
| CP-06.2 | Guardar una nota sin cliente o sin vendedor. | No guarda: avisa que son obligatorios. | Alternativa | BD+E2E |
| CP-06.3 | Editar el precio de un producto en la nota (de 44 a 40). | Aplica 40 y registra el cambio (quién y cuándo). | Alternativa | BD |
| CP-06.4 | Cargar el N° de factura y adjuntar el PDF. | La nota queda cruzada con la factura; el PDF es accesible solo para la regional y el nacional. | Normal | BD+E2E |
| ● CP-06.5 | Cerrar el día con una nota emitida sin N° de factura. | Rechazado (FACTURA_PENDIENTE), listando la nota (⚠ SUP-06). | Alternativa | BD+E2E |
| CP-06.6 | Imprimir la nota. | Sale A5 duplicada en una A4; la copia del cliente no muestra la condición de pago. | Normal | E2E (visual) |
| CP-06.7 | Anular una nota del **día abierto** (el cliente pidió 8 y se facturó 10). | Marca `anulada`, repone el stock al origen y registra quién y cuándo; permite una nota nueva. | Normal | BD+E2E |
| CP-06.8 | Intentar **editar** una nota ya emitida (update directo). | Rechazado: una nota emitida no se edita. | Alternativa | BD |
| CP-06.9 | **Devolución** de 3 de 10 u. de una venta del viernes (día cerrado), con reembolso. | Devolución `DEV-LP-…` con fecha de hoy: repone 3 u. en el almacén hoy y egresa de la caja de hoy; el viernes queda intacto. | Alternativa | BD+E2E |
| ● CP-06.10 | Venta «desde el saldo del vendedor» de 25 u. cuando el vendedor tiene 20. | Rechazado (STOCK_INSUFICIENTE, disponible 20). | Alternativa | BD+E2E |
| ● CP-06.11 | Venta «desde el saldo del vendedor» de 5 u. (tiene 20). | Descuenta el saldo del vendedor (queda 15), no el almacén (⚠ SUP-14). | Normal | BD |
| ● CP-06.12 | Anular una nota que tiene una cobranza vigente. | Rechazado (NOTA_NO_ANULABLE): primero anular la cobranza. | Alternativa | BD |
| ● CP-06.13 | Devolver una nota de un día **abierto**. | Rechazado (DEVOLUCION_DIA_ABIERTO): usar anulación. | Alternativa | BD |
| ● CP-06.14 | Devolver 8 u. de una nota de 10 que ya tiene 3 devueltas. | Rechazado (DEVOLUCION_EXCEDE, máximo 7). | Alternativa | BD |
| ● CP-06.15 | Devolución con abono a cuenta de una nota a crédito (saldo Bs 440). | El saldo por cobrar baja en el importe devuelto; no toca la caja de hoy. | Normal | BD |
| ● CP-06.16 | Emitir con fecha de mañana, o de un día ya cerrado. | Rechazado (FECHA_INVALIDA / DIA_CERRADO). | Alternativa | BD |
| ● CP-06.17 | Registrar el N° de factura de una nota de un día **cerrado**. | Se permite y queda auditado (⚠ SUP-06). | Normal | BD |
| ● CP-06.18 | Nota con descuento 10 % sobre ítems por Bs 690. | Total Bs 621.00; descuento Bs 69.00 auditado. | Normal | BD |
| ● CP-06.19 | Hoja de carga de Flavia del día con 3 notas emitidas y 1 anulada. | Consolida por producto las cantidades y los Bs de las 3 emitidas (la anulada no cuenta); se imprime (⚠ SUP-53). | Normal | BD+E2E |

## CU-07 · Registrando cobranzas
Precondición común: existe la nota a crédito o un saldo de cartera inicial.

| ID | ESCENARIO Y DATOS DE ENTRADA | RESULTADO ESPERADO | TIPO | CAPA |
|---|---|---|---|---|
| CP-07.1 | Registrar un cobro en efectivo imputado a una nota. | Queda registrado (`CB-LP-…`) y se suma al bloque de Cobranzas del día. | Normal | BD+E2E |
| CP-07.2 | Consultar el ingreso por vendedor del período. | Muestra por vendedor: ventas contado/crédito, N° de notas e ingreso (contado neto + cobranzas − reembolsos); se puede imprimir. | Normal | E2E |
| CP-07.3 | Registrar un cobro con fecha de un día ya cerrado. | Rechazado por la base (DIA_CERRADO). | Alternativa | BD |
| ● CP-07.4 | Cobro de Bs 500 a una nota con saldo Bs 440. | Rechazado (IMPORTE_EXCEDE_SALDO). | Alternativa | BD+E2E |
| ● CP-07.5 | Pago parcial de Bs 200 sobre un saldo de Bs 440. | Saldo pendiente Bs 240. | Normal | BD |
| ● CP-07.6 | Cobrar 3 notas del mismo cliente en una operación. | Se crean 3 cobranzas, una por nota. | Normal | E2E |
| ● CP-07.7 | Anular una cobranza del día abierto con motivo. | Queda `anulada`, el saldo de la nota vuelve y sale del arqueo del día. | Normal | BD+E2E |
| ● CP-07.8 | Cobro sobre un saldo de cartera inicial. | Reduce ese saldo y aparece en el EECC. | Normal | BD |

## CU-08 · Liquidando el día
Precondición común: movimientos, notas y cobranzas del día cargados.

| ID | ESCENARIO Y DATOS DE ENTRADA | RESULTADO ESPERADO | TIPO | CAPA |
|---|---|---|---|---|
| CP-08.1 | Generar el reporte del día para La Paz. | Matriz por producto con saldo inicial, pedido, traspaso, contado (Q+Bs), crédito (Q+Bs), saldo final y total (Q+Bs), consolidando todos los vendedores. | Normal | BD+E2E |
| ● CP-08.2 | Verificar el saldo final de un producto. | `Saldo Final = Saldo Inicial + Pedido ± Traspaso + Devolución ± Ajuste − Contado − Crédito`, igual a la suma de movimientos hasta ese día. | Normal | BD |
| ● CP-08.3 | Verificar el arqueo. | `Total Ventas = Contado neto + Crédito neto`; `Total Efectivo = Contado neto + Cobranzas − Reembolsos`. | Normal | BD |
| ● CP-08.4 | Ver el detalle de notas y el de cobranzas. | Dos bloques distintos con su total; el de notas suma Total Ventas y marca las de crédito; las anuladas aparecen tachadas y no suman. | Normal | E2E |
| CP-08.5 | Ver el reporte en pantalla. | Primero los productos con movimiento; los que no tienen, al final y plegados. | Alternativa | E2E |
| CP-08.6 | Exportar el reporte. | Excel con el catálogo completo agrupado por línea (formato de la planilla física). | Alternativa | E2E |
| CP-08.7 | Cerrar el día. | Se congela el snapshot y el día queda bloqueado. | Normal | BD+E2E |
| CP-08.8 | Tras cerrar, intentar crear una nota de esa fecha. | Rechazado por la base (DIA_CERRADO). | Alternativa | BD |
| CP-08.9 | Un regional intenta reabrir un día cerrado. | Rechazado (SOLO_NACIONAL); queda registrado. | Alternativa | BD |
| ● CP-08.10 | **Caso dorado F3.** Cargar los movimientos y notas que producen la planilla del 11/06/2026 (LP). Saldos iniciales: Quinua Tricolor 15; Quinua Blanca 1 kg 22 + pedido 5; Jugo de Durazno 50 + traspaso 5… | El reporte reproduce la planilla: Contado 3,075.40; Crédito 1,224.60; Total Ventas 4,300.00; Total Efectivo 3,075.40; detalle de 4 notas que suman 4,300.00. | Normal | BD |
| ● CP-08.11 | Cerrar el día 12 con el día 11 abierto (con movimientos). | Rechazado (DIA_ANTERIOR_ABIERTO). | Alternativa | BD |
| ● CP-08.12 | El nacional reabre el día 11 estando cerrado el 12. | Rechazado (REAPERTURA_NO_PERMITIDA): solo el último día cerrado. | Alternativa | BD |
| ● CP-08.13 | El nacional reabre el último día cerrado con motivo. | Estado `abierta`; el snapshot anterior queda en la auditoría; el regional puede volver a cerrar. | Normal | BD+E2E |
| ● CP-08.14 | Día con una devolución con reembolso de Bs 120. | Aparece la columna Devolución, «Reembolsos 120.00» y el Total Efectivo baja 120. | Normal | BD |
| ● CP-08.15 | Reporte de una regional que recibió un traspaso de 30 u. | Columna Traspaso +30 en el destino y −30 en el origen. | Normal | BD |
| ● CP-08.16 | Generar el reporte de una regional con ~150 productos y 200 notas. | Responde en ≤ 5 s (RNF-01). | Normal | BD |

## CU-09 · Cargando presupuesto
Precondición común: usuario autenticado.

| ID | ESCENARIO Y DATOS DE ENTRADA | RESULTADO ESPERADO | TIPO | CAPA |
|---|---|---|---|---|
| CP-09.1 | Cargar una meta mensual por regional. | Queda cargada y comparable con el real. | Normal | E2E |
| CP-09.2 | Consultar el cumplimiento. | Muestra real vs meta y la proyección de cierre (lineal). | Normal | BD+E2E |
| ● CP-09.3 | Cargar dos veces la meta de octubre para LP. | Rechazado (DUPLICADO): se edita la existente. | Alternativa | BD |
| ● CP-09.4 | Fernando carga una meta para LP. | Rechazado por la RLS. | Alternativa | BD |

## CU-10 · Reportes, EECC y dashboard
Precondición común: usuario autenticado.

| ID | ESCENARIO Y DATOS DE ENTRADA | RESULTADO ESPERADO | TIPO | CAPA |
|---|---|---|---|---|
| CP-10.1 | Consultar top clientes y productos más vendidos. | Listados correctos, filtrados por las regionales del usuario. | Normal | BD+E2E |
| ● CP-10.2 | A1 consulta el EECC consolidado al 11/06/2026. | Se arma desde notas a crédito + cartera inicial + cobranzas + abonos, con columnas por mes de origen y mora. | Normal | BD+E2E |
| CP-10.3 | A2 intenta ver el EECC (pantalla o RPC). | No visible en la vista de sucursal; la RPC responde SOLO_NACIONAL. | Alternativa | BD+E2E |
| CP-10.4 | Exportar un reporte a Excel. | Genera el archivo con los datos filtrados. | Normal | E2E |
| ● CP-10.5 | El dashboard de un regional. | Sin KPI de cuentas por cobrar. | Alternativa | E2E |

## CU-11 · Trazabilidad y bloqueo de día
Precondición común: usuario autenticado.

| ID | ESCENARIO Y DATOS DE ENTRADA | RESULTADO ESPERADO | TIPO | CAPA |
|---|---|---|---|---|
| CP-11.1 | Anular una nota y luego revisar la auditoría. | El evento queda con usuario, hora y datos. | Normal | BD+E2E |
| CP-11.2 | Intentar editar o borrar un registro de auditoría. | Rechazado: la auditoría solo se agrega. | Alternativa | BD |
| CP-11.3 | Un regional abre la auditoría. | No visible: la auditoría es para el nivel nacional. | Alternativa | BD+E2E |

## CU-12 · Cargando datos iniciales ●
Precondición común: regionales, almacenes, líneas y usuarios creados.

| ID | ESCENARIO Y DATOS DE ENTRADA | RESULTADO ESPERADO | TIPO | CAPA |
|---|---|---|---|---|
| ● CP-12.1 | Ajuste «inventario inicial» de LP con la planilla de stock del cliente. | El saldo inicial del primer día operativo coincide con la planilla. | Normal | BD |
| ● CP-12.2 | Cargar la cartera inicial de F4 (supermercados LP). | El EECC a la fecha de corte totaliza 201,015.92 en LP. | Normal | BD |

---

## Cobertura

| CASO DE USO | CASOS DE PRUEBA | CANTIDAD |
|---|---|---|
| CU-01 | CP-01.1 a CP-01.7 | 7 |
| CU-02 | CP-02.1 a CP-02.7 | 7 |
| CU-03 | CP-03.1 a CP-03.6 | 6 |
| CU-04 | CP-04.1 a CP-04.5 | 5 |
| CU-05 | CP-05.1 a CP-05.12 | 12 |
| CU-06 | CP-06.1 a CP-06.19 | 19 |
| CU-07 | CP-07.1 a CP-07.8 | 8 |
| CU-08 | CP-08.1 a CP-08.16 | 16 |
| CU-09 | CP-09.1 a CP-09.4 | 4 |
| CU-10 | CP-10.1 a CP-10.5 | 5 |
| CU-11 | CP-11.1 a CP-11.3 | 3 |
| CU-12 | CP-12.1 a CP-12.2 | 2 |

● **94 casos de prueba** cubren los 12 casos de uso, con al menos un caso Normal y las Alternativas de cada flujo.

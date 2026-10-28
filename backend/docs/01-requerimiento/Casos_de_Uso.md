ESENCIAL CONSULTORA · MODELADO DE CASOS DE USO

# Casos de Uso — Sistema Comercial para COALSUD S.R.L.
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

Modela el comportamiento esperado del sistema: actores, precondición y postcondición, curso normal y alternativas, y relaciones. Se referencian los requerimientos del [SRS v1.1](SRS.md).

**Control de versiones:**
- **v1.1 — 26/10/2026** ●: se agrega CU-12 (datos iniciales). CU-03, CU-04 y CU-05 suman vendedores, configuración, retorno, ajuste y saldo de vendedores. CU-06, CU-07 y CU-08 se alinean con las reglas de factura, anulación, imputación y cierre secuencial. **●** = nuevo o modificado. **⚠ SUP-xx** = supuesto no confirmado ([Registro](Registro_de_Supuestos.md)).
- **v1.0 — 21/10/2026**: versión inicial.

La numeración de los casos de uso es continua.

---

## 1 — Diagrama de casos de uso

```
┌───────────────────── Sistema Comercial COALSUD ──────────────────────┐
│                                                                      │
│  Admin Nacional (A1) ───○ CU-01 Administrando usuarios y accesos     │
│                     ───○ CU-04 Gestionando catálogo y configuración ●│
│                     ───○ CU-09 Cargando presupuesto                  │
│                     ───○ CU-12 Cargando datos iniciales ●            │
│                     ·····○ CU-10 Reportes, EECC y dashboard (lee todo)│
│                     ·····○ CU-08 Reabrir día                         │
│                                                                      │
│  (Todos) ──────────────○ CU-02 Iniciando sesión por rol/regional     │
│                                                                      │
│  Admin Regional (A2) ──○ CU-03 Gestionando clientes y vendedores ●   │
│                     ───○ CU-05 Moviendo inventario (ingreso/salida/  │
│                     │          retorno/traspaso/ajuste) ●            │
│                     ───○ CU-06 Emitiendo notas de venta (anular/     │
│                     │          devolver) ──«usa»──▶ CU-05            │
│                     ───○ CU-07 Registrando cobranzas                 │
│                     ───○ CU-08 Liquidando el día ──«usa»──▶ CU-05..07│
│                     ───○ CU-09 Cargando presupuesto (sus regionales) │
│                     ·····○ CU-04 Consulta el catálogo                │
│                                                                      │
│  Contabilidad (A4) ····· provee N° de factura (CU-06)                │
│  Supabase Auth (A5) ···· respalda CU-02                              │
│  (Todos) ──────────────○ CU-11 Trazabilidad y bloqueo de día (T)     │
└──────────────────────────────────────────────────────────────────────┘
```

**Referencias.**
- El Administrador Nacional (A1) administra las cuentas (CU-01), el catálogo y la configuración (CU-04) y el presupuesto (CU-09). También consulta de forma consolidada (CU-10) y reabre días (CU-08). ● No carga datos transaccionales (⚠ SUP-31).
- El Administrador Regional (A2) centraliza toda la operación de sus regionales: clientes, vendedores, inventario, notas de venta y cobranzas. También cierra la liquidación del día.
- Contabilidad (A4) aporta el número de factura que se registra en la nota.

---

## 2 — Especificación de los casos de uso

### CU-01 — Administrando usuarios y accesos ●
| CAMPO | DETALLE |
|---|---|
| Actor primario | Administrador Nacional (A1) |
| Propósito | Dar de alta, modificar, desactivar/reactivar cuentas y resetear contraseñas, asignando rol y una o varias regionales. |
| Precondición | A1 autenticado. |
| Postcondición | La cuenta queda creada/actualizada con su perfil de permisos; queda auditado. |
| RF asociados | RF01, RF02, RF41 ● |

| CURSO NORMAL | ALTERNATIVAS |
|---|---|
| 1) A1 elige «Usuarios» y «Nuevo usuario». | |
| 2) El sistema presenta el formulario (nombre, correo, rol, regionales, contraseña temporal ●). | 2.1 Si el rol es nacional, no se asignan regionales (ve todas). 2.2 ● Si el rol es regional y no elige ninguna regional, no guarda. |
| 3) A1 confirma. | 3.1 Si intenta desactivar (o pasar a regional) al único usuario nacional activo, el sistema lo impide. |
| 4) El sistema crea la cuenta y su perfil; el usuario deberá cambiar la contraseña al primer ingreso (⚠ SUP-30). | 4.1 Si el correo ya existe, avisa y no duplica. |
| 5) ● A1 puede resetear la contraseña de un usuario existente. | 5.1 El usuario queda obligado a cambiarla en su próximo ingreso. |

Relaciones: base de CU-02. **Fundamento.** Vanessa maneja La Paz y Cochabamba; Fernando, Santa Cruz; Irene, todo (F2).

---

### CU-02 — Iniciando sesión por rol/regional ●
| CAMPO | DETALLE |
|---|---|
| Actor primario | Todos los roles (A1, A2) |
| Actor secundario | Supabase Auth (A5): valida las credenciales |
| Propósito | Autenticar al usuario y habilitar solo los datos y acciones de su rol y regionales. |
| Precondición | Cuenta activa (CU-01). |
| Postcondición | El usuario queda autenticado y ve su alcance. |
| RF asociados | RF02, RF41 ● |

| CURSO NORMAL | ALTERNATIVAS |
|---|---|
| 1) El usuario ingresa sus credenciales. | 1.1 Si son inválidas, se rechazan sin indicar cuál dato falló. 1.2 ● Si la cuenta está desactivada, se rechaza con "Usuario inactivo". |
| 2) El sistema valida con Supabase Auth. | 2.1 ● Si tiene la contraseña temporal, lo lleva a «Cambiar contraseña» antes de cualquier otra pantalla. |
| 3) Carga el alcance del usuario (rol + regionales). | 3.1 Si intenta acceder a datos de otra regional, la base lo rechaza (RLS). |
| 4) Si el usuario tiene varias regionales, muestra el selector de regional activa. | 4.1 Si tiene una sola, queda fija. 4.2 Nacional: selector «Todas» + cada regional (solo lectura). |
| 5) ● Tras 30 minutos sin actividad, cierra la sesión (⚠ SUP-38). | 5.1 Un minuto antes avisa y permite continuar. |

Relaciones: usa CU-01; transversal a todos. (RNF-14, RNF-18)

---

### CU-03 — Gestionando clientes y vendedores ●
| CAMPO | DETALLE |
|---|---|
| Actor primario | Administrador Regional (A2) |
| Propósito | Dar de alta y actualizar clientes y vendedores, y buscarlos/filtrarlos. |
| Precondición | A2 autenticado. |
| Postcondición | La ficha queda creada/actualizada. |
| RF asociados | RF03, RF04, RF35 ● |

| CURSO NORMAL | ALTERNATIVAS |
|---|---|
| 1) A2 busca el cliente por nombre/empresa/NIT o filtra por categoría, canal o vendedor. | 1.1 Si no existe, lo da de alta. |
| 2) Carga o edita categoría, canal, regional, vendedor, condición de pago, zona, NIT y razón social (⚠ SUP-49). | 2.1 La regional se limita a las del usuario (RLS). 2.2 ● El vendedor debe ser de la misma regional. |
| 3) El sistema guarda. | 3.1 ● Para dar de baja, se desactiva (no se borra). |
| 4) ● A2 administra sus vendedores (alta, edición, desactivación) (⚠ SUP-32). | 4.1 ● No se desactiva un vendedor con mercadería en su poder. |

Relaciones: usado por CU-05, CU-06, CU-07, CU-10.

---

### CU-04 — Gestionando catálogo y configuración ●
| CAMPO | DETALLE |
|---|---|
| Actor primario | Administrador Nacional (A1): mantiene el maestro (⚠ SUP-02). A2 consulta |
| Propósito | Mantener el catálogo (producto, línea, orden, precio base, stock mínimo) y la configuración (regionales, almacenes, condiciones de pago). |
| Precondición | A1 autenticado. |
| Postcondición | El producto queda disponible para notas y reporte. |
| RF asociados | RF05, RF06, RF36 ● |

| CURSO NORMAL | ALTERNATIVAS |
|---|---|
| 1) Alta o edición de un producto con su línea, orden, precio base y stock mínimo. | 1.1 El precio es editable al vender (CU-06). 1.2 ● Un cambio de precio base queda auditado. 1.3 ● Un producto con movimientos solo se desactiva. |
| 2) Mantenimiento de las líneas comerciales y de su orden. | |
| 3) ● Mantenimiento de las condiciones de pago, las regionales y los almacenes. | 3.1 ● El prefijo de numeración de una regional no se cambia si ya tiene documentos emitidos. |

Relaciones: usado por CU-06, CU-08.

---

### CU-05 — Moviendo inventario ●
| CAMPO | DETALLE |
|---|---|
| Actor primario | Administrador Regional (A2) |
| Propósito | Registrar ingresos al almacén, salidas al vendedor, ● retornos del vendedor, traspasos entre regionales y ● ajustes; consultar el stock, el kardex, ● el saldo en poder de vendedores y las alertas. |
| Precondición | A2 autenticado; producto en catálogo; ● el día de la fecha elegida está abierto (⚠ SUP-19). |
| Postcondición | El stock queda actualizado por movimientos; si corresponde, se genera una alerta de mínimo. |
| RF asociados | RF07, RF08, RF09, RF10, RF11, RF34 ●, RF37 ●, RF38 ● |

| CURSO NORMAL | ALTERNATIVAS |
|---|---|
| 1) Registra el ingreso de mercadería al almacén (suma stock; columna «Pedido» del reporte). | |
| 2) ● Solo en la modalidad «mercadería en poder del vendedor»: emite una nota de salida al vendedor (descuenta el almacén, suma al saldo del vendedor). En preventa, la salida es la hoja de carga de CU-06 (⚠ SUP-07). | 2.1 El stock físico no puede quedar negativo. |
| 3) ● Registra el retorno del sobrante del vendedor al almacén. | 3.1 ● No se retorna más de lo que el vendedor tiene. |
| 4) Registra un traspaso a otra regional. | 4.1 Genera dos movimientos: salida en el origen y entrada en el destino. 4.2 ● Si el día del destino está cerrado, se rechaza. |
| 5) ● Registra un ajuste (motivo obligatorio). | 5.1 ● La carga del inventario inicial es un ajuste con motivo «inventario inicial» (⚠ SUP-36). |
| 6) Consulta el stock (almacén / vendedores / total) y el kardex. | 6.1 Al bajar del mínimo, aparece la alerta de reposición. |
| 7) ● Consulta el saldo en poder de cada vendedor (entregado, vendido, retornado, saldo). | |

Relaciones: usado por CU-06, CU-08. **Fundamento.** «El inventario tiene que cuadrarme con las salidas, en dinero y en cantidad» (F2).

---

### CU-06 — Emitiendo notas de venta (anular / devolver) ●
| CAMPO | DETALLE |
|---|---|
| Actor primario | Administrador Regional (A2) |
| Actor secundario | Contabilidad (A4): provee el N° de factura |
| Propósito | Emitir la nota de venta, imprimirla, registrar su factura y corregir por anulación (día abierto) o devolución (día cerrado). |
| Precondición | Cliente, vendedor y productos existentes y activos. Hay stock en el almacén (preventa, por defecto) o en el saldo del vendedor, si se elige esa opción (⚠ SUP-07, SUP-14). El día de la fecha está abierto. |
| Postcondición | La nota queda emitida (o anulada/devuelta); el stock del origen, actualizado. |
| RF asociados | RF12, RF13, RF14, RF15, RF16, RF17, RF42 ● |

| CURSO NORMAL | ALTERNATIVAS |
|---|---|
| 1) A2 selecciona cliente, vendedor, canal, condición de pago y fecha (por defecto hoy). El sistema propone el vendedor, el canal y la condición del cliente. | 1.1 Sin cliente o sin vendedor, no guarda (RNF-17). 1.2 ● Fecha futura, del día cerrado o anterior al último cierre: rechazada. |
| 2) Agrega productos; puede editar el precio base. | 2.1 El cambio de precio queda registrado (RF16). 2.2 ● Si el stock del origen no alcanza, avisa con el disponible (STOCK_INSUFICIENTE). 2.3 ● Si el vendedor tiene mercadería en su poder, puede elegir «desde el saldo del vendedor». |
| 3) El sistema numera por regional, calcula el total y descuenta del almacén (o del saldo del vendedor). | 3.1 Numeración `LP-0001`, `CBBA-0001`, `SCZ-0001`. |
| 4) Registra el N° de factura y adjunta el PDF, al emitir o después. | 4.1 La nota puede emitirse antes y completarse al llegar la factura. 4.2 ● Es obligatorio para cerrar el día (⚠ SUP-06). 4.3 ● Se puede cargar aunque el día esté cerrado. |
| 5) Imprime la nota A5 duplicada en A4. | 5.1 La copia del cliente no muestra la condición de pago. |
| ● 5b) Terminadas las notas del día, imprime la **hoja de carga** de cada vendedor (productos consolidados de sus notas) para almacén (⚠ SUP-53). | 5b.1 Las notas anuladas no cuentan; si se anula una nota después de imprimir, se reimprime la hoja. |
| 6a) **Anulación** (día abierto): marca `anulada`, repone el stock al origen y registra quién y cuándo; luego se genera una nota nueva. | 6a.1 Motivo opcional. No se edita la nota. 6a.2 ● Con cobranzas vigentes no se anula (primero se anulan las cobranzas, CU-07). 6a.3 ● Si tenía factura, avisa que Contabilidad debe anularla. |
| 6b) **Devolución** (día cerrado): movimiento nuevo con fecha de hoy que repone el stock en el almacén; según el tipo, egresa de la caja de hoy (reembolso) o reduce la deuda (abono a cuenta). Queda ligada a la nota original y puede ser parcial. | 6b.1 Queda marcada para que Contabilidad emita la nota de crédito. 6b.2 ● No se devuelve más de lo vendido menos lo ya devuelto. 6b.3 ● El abono a cuenta solo aplica a notas a crédito y hasta el saldo pendiente (⚠ SUP-17). |

Relaciones: usa CU-03, CU-04, CU-05; auditado por CU-11. **Fundamento.** «Se anula y se vuelve a generar una nota… queda la trazabilidad y el stock se repone» (F2). ● «¿Usted hace la nota de venta y después hace la salida?» → «Sí, exacto» (Vanessa, F2).

---

### CU-07 — Registrando cobranzas ●
| CAMPO | DETALLE |
|---|---|
| Actor primario | Administrador Regional (A2) |
| Propósito | Registrar el dinero cobrado (rendición), anular una cobranza mal cargada y consultar el ingreso por vendedor. |
| Precondición | Existe la nota a crédito (o saldo de cartera inicial) con saldo pendiente. |
| Postcondición | La cobranza queda registrada, reduce el saldo del documento y alimenta el arqueo del día. |
| RF asociados | RF18, RF19, RF40 ● |

| CURSO NORMAL | ALTERNATIVAS |
|---|---|
| 1) A2 busca el cliente y ve sus documentos con saldo pendiente. ● Entra desde la Liquidación del día («+ Registrar cobro») o desde el detalle de una nota; no hay módulo de «Rendición» (⚠ SUP-51). | |
| 2) Registra el cobro (fecha, forma de pago, referencia, importe) sobre uno o varios documentos. | 2.1 ● Pago parcial permitido. 2.2 ● El importe no puede superar el saldo pendiente (IMPORTE_EXCEDE_SALDO). 2.3 ● Varios documentos generan una cobranza por documento (⚠ SUP-22). |
| 3) El sistema lo imputa al bloque de Cobranzas del día. | 3.1 Alimenta `Total Efectivo` (CU-08). |
| 4) ● A2 anula una cobranza mal cargada (motivo obligatorio). | 4.1 ● Solo con el día de la cobranza abierto (⚠ SUP-23). |
| 5) A2 consulta el ingreso y el rendimiento por vendedor del período (⚠ SUP-34) y los imprime para cada vendedor (⚠ SUP-55). | |

Relaciones: alimenta CU-08 y CU-10.

---

### CU-08 — Liquidando el día ●
| CAMPO | DETALLE |
|---|---|
| Actor primario | Administrador Regional (A2) |
| Actor secundario | Administrador Nacional (A1): reabre un día cerrado |
| Propósito | Generar el reporte/liquidación diaria por regional, verificar el arqueo y cerrar el día. |
| Precondición | Movimientos, notas y cobranzas del día cargados. |
| Postcondición | El día queda cerrado (inmutable) con su snapshot, o reabierto por A1. |
| RF asociados | RF20, RF21, RF22, RF23, RF24, RF25, RF33 |

| CURSO NORMAL | ALTERNATIVAS |
|---|---|
| 1) A2 abre el reporte del día para su regional. | 1.1 Consolida a todos los vendedores. 1.2 ● Puede filtrar el detalle de notas por vendedor o canal (solo visual). |
| 2) El sistema arma la matriz por producto: saldo inicial, pedido, traspaso, (devolución, ajuste), contado Q+Bs, crédito Q+Bs, saldo final y total Q+Bs. | 2.1 Pantalla: primero lo movido y después lo que no tiene movimiento. Export: catálogo completo. |
| 3) Calcula el arqueo: Contado, Crédito, Descuentos, Cobranzas, Reembolsos, Total Ventas y Total Efectivo. | 3.1 ● `Total Efectivo = Contado neto + Cobranzas − Reembolsos` (⚠ SUP-12). |
| 4) Muestra el detalle de notas del día y, aparte, el detalle de cobranzas (y de devoluciones, si hubo). | |
| 5) A2 cierra el día: se congela el snapshot y la fecha queda bloqueada. | 5.1 Tras el cierre, la base rechaza crear o editar notas de esa fecha (CU-11). 5.2 ● Si hay notas sin N° de factura, no cierra y las lista (⚠ SUP-06). 5.3 ● Si hay días anteriores abiertos, no cierra e indica cuáles (⚠ SUP-20). |
| 6) Si hace falta corregir, A1 reabre el día con un motivo (queda registrado). | 6.1 Solo el nacional puede reabrir. 6.2 ● Solo el último día cerrado de la regional (⚠ SUP-21). |

Relaciones: usa CU-05, CU-06, CU-07; auditado por CU-11. **Fundamento.** «Hacemos por día los reportes… arriba el importe total, abajo el detalle de qué notas suman» (F2, F3).

---

### CU-09 — Cargando presupuesto ●
| CAMPO | DETALLE |
|---|---|
| Actor primario | Administrador Nacional (A1) o Regional (A2, en sus regionales) (⚠ SUP-33) |
| Propósito | Cargar metas y seguir el cumplimiento. |
| Precondición | Usuario autenticado. |
| Postcondición | La meta queda cargada y comparable contra el real. |
| RF asociados | RF26, RF27 |

| CURSO NORMAL | ALTERNATIVAS |
|---|---|
| 1) Carga una meta (Bs) por período, regional y, opcionalmente, vendedor o categoría. | 1.1 ● Si ya existe una meta para esa combinación, se edita (no se duplica). |
| 2) El sistema compara el real con la meta y proyecta el cierre. | |

Relaciones: usa CU-06.

---

### CU-10 — Reportes, EECC y dashboard
| CAMPO | DETALLE |
|---|---|
| Actor primario | Administrador Nacional (A1); A2 ve lo suyo |
| Propósito | Consultar los reportes comerciales, el EECC consolidado y el dashboard; exportar a Excel. |
| Precondición | Usuario autenticado. |
| Postcondición | Reportes disponibles y exportables, filtrados por permisos. |
| RF asociados | RF28, RF29, RF30, RF31 |

| CURSO NORMAL | ALTERNATIVAS |
|---|---|
| 1) Consulta top clientes, productos más vendidos, rotación y ventas por regional. | 1.1 A2 ve solo sus regionales. |
| 2) A1 consulta el EECC consolidado a una fecha de corte (autogenerado, con arrastre y mora). | 2.1 No es visible en la vista de sucursal. |
| 3) Exporta cualquier reporte a Excel. | |
| 4) Consulta el dashboard simplificado. | 4.1 Sin KPI de cuentas por cobrar en la sucursal. |

Relaciones: usa CU-06, CU-07, CU-08.

---

### CU-11 — Trazabilidad y bloqueo de día (transversal)
| CAMPO | DETALLE |
|---|---|
| Actor primario | Todos los roles (A1, A2) |
| Propósito | Registrar quién hizo qué y cuándo en las operaciones sensibles, e impedir tocar un día cerrado. |
| Precondición | Usuario autenticado. |
| Postcondición | Cada operación sensible queda trazada; un día cerrado es inmutable. |
| RF asociados | RF32, RF33 |

| CURSO NORMAL | ALTERNATIVAS |
|---|---|
| 1) En cada operación sensible (lista en RF32) se registra el usuario, la hora y los datos. | 1.1 El registro solo se agrega: no se edita ni se borra. |
| 2) Al intentar crear o editar una nota, cobranza, devolución o movimiento de un día cerrado, la base lo rechaza. | 2.1 Solo el nacional reabre (CU-08). 2.2 ● Excepción: N° de factura y PDF (CU-06 4.3). |
| 3) La auditoría es visible para el nivel nacional, filtrable por usuario, acción, entidad, regional y fechas. | |

Relaciones: transversal a todos los casos.

---

### CU-12 — Cargando datos iniciales (puesta en marcha) ● *(nuevo)*
| CAMPO | DETALLE |
|---|---|
| Actor primario | Administrador Nacional (A1), con apoyo de Esencial |
| Actor secundario | Administrador Regional (A2): inventario inicial de su almacén |
| Propósito | Dejar el sistema listo para operar: catálogo con precios, clientes, vendedores, inventario inicial y cartera por cobrar previa. |
| Precondición | Regionales, almacenes, líneas y usuarios creados. |
| Postcondición | El primer reporte diario arranca con el saldo inicial correcto y el EECC con la cartera previa. |
| RF asociados | RF05, RF03, RF35, RF37, RF39 |

| CURSO NORMAL | ALTERNATIVAS |
|---|---|
| 1) Se carga el catálogo (líneas, productos, precios y mínimos) desde la lista del cliente. | 1.1 Carga por script con revisión del cliente ([Datos Iniciales](../04-ejecucion/Datos_Iniciales.md)). |
| 2) Se cargan los clientes y los vendedores por regional. | |
| 3) Cada regional registra el **inventario inicial** como ajuste con motivo «inventario inicial», con fecha del día anterior al arranque. | 3.1 También puede cargarse por script, quedando auditado a nombre de quien lo hizo. |
| 4) A1 carga la **cartera inicial**: documentos pendientes por cliente, tomados del EECC vigente (⚠ SUP-24). | 4.1 El total cargado debe coincidir con el «Saldo actual» de las planillas F4/F5 a la fecha de corte. |
| 5) Se cierra el día de carga para que el primer día operativo arranque con el saldo inicial congelado. | |

Relaciones: precede a todos los casos operativos.

---

## 3 — Trazabilidad (CU → RF)

| CU | CASO DE USO | ACTOR | RF CUBIERTOS |
|---|---|---|---|
| CU-01 | Administrando usuarios y accesos | A1 | RF01, RF02, RF41 |
| CU-02 | Iniciando sesión por rol/regional | A1, A2 | RF02, RF41 |
| CU-03 | Gestionando clientes y vendedores | A2 | RF03, RF04, RF35 |
| CU-04 | Gestionando catálogo y configuración | A1 (A2 consulta) | RF05, RF06, RF36 |
| CU-05 | Moviendo inventario | A2 | RF07–RF11, RF34, RF37, RF38 |
| CU-06 | Emitiendo notas de venta (anular/devolver) | A2, A4 | RF12–RF17, RF42 |
| CU-07 | Registrando cobranzas | A2 | RF18, RF19, RF40 |
| CU-08 | Liquidando el día | A2, A1 | RF20–RF25, RF33 |
| CU-09 | Cargando presupuesto | A1, A2 | RF26, RF27 |
| CU-10 | Reportes, EECC y dashboard | A1, A2 | RF28–RF31 |
| CU-11 | Trazabilidad y bloqueo de día | Todos | RF32, RF33 |
| CU-12 | Cargando datos iniciales | A1, A2 | RF03, RF05, RF35, RF37, RF39 |

● 12 casos de uso cubren los 42 RF del SRS v1.1.

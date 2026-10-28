ESENCIAL CONSULTORA · DOCUMENTO DE ESPECIFICACIÓN DE REQUISITOS

# SRS — Sistema Comercial para COALSUD S.R.L.
**v1.1 · Especificación de Requerimientos de Software**

Esencial Consultora — El Alto / La Paz, Bolivia

---

## Control de cambios

**Versión 1.1 — 26 de octubre de 2026.** ● Revisión de consistencia previa al desarrollo:
- Se corrigen contradicciones de v1.0: factura obligatoria vs "se completa después", fórmula del traspaso, arqueo sin devoluciones, escrituras del nacional y saldo del vendedor sin modelo.
- Se contrasta el reporte diario contra la planilla real (F3). Resultado: el traspaso **suma**, los descuentos van al pie y el bloque de detalle lista todas las notas.
- Se agregan RF34 a RF42 (retorno del vendedor, vendedores, configuración, ajuste de inventario, saldo en poder de vendedores, cartera inicial, anulación de cobranza, gestión de contraseña y hoja de carga por vendedor) y RNF-29 a RNF-30.
- Se incorpora la transcripción **con oradores** de la reunión del 14/10/2026. Lo que cambia:
  - el circuito real es **preventa**: primero la nota y después la salida;
  - la sucursal no lleva el módulo de "Rendición y cobranzas" ni el EECC;
  - se aprobó el diseño de la nota de la demo.
- Todo lo que no está confirmado por el cliente se marca **⚠ SUP-xx** y se detalla en el [Registro de Supuestos](Registro_de_Supuestos.md).

**Glifo de esta versión:** **●** marca lo nuevo o modificado en v1.1.

**Versión 1.0 — 21 de octubre de 2026.** Versión inicial, elaborada a partir de:
- la demo conceptual (prototipo `index (2).html`, "ONE Comercial para COALSUD");
- la segunda reunión de relevamiento con Irene, Vanessa y Fabiana;
- los reportes operativos reales: Estado de Cuentas Supermercados, Estado de Cuentas Institucional y Reporte de Ventas Diarias.

---

## 1 — Introducción

**Propósito.** Especificar qué debe hacer el Sistema Comercial de COALSUD: un sistema centralizado, multi-regional y por roles que reemplaza la operación actual en **WhatsApp + Excel** por un circuito digital único, desde la toma del pedido hasta la liquidación diaria de ventas.

**Alcance.** El sistema cubre:
- la gestión de clientes, vendedores y catálogo;
- el inventario multi-almacén con saldo en poder de cada vendedor (ingresos, salidas, retornos, traspasos, ajustes y alertas de mínimo);
- la emisión de notas de venta, con anulación trazable, impresión A5 duplicada en A4 y cruce con el número de factura legal;
- las devoluciones y la cobranza/rendición;
- la **liquidación/reporte diario por regional**, el arqueo que es el corazón operativo;
- el estado de cuentas consolidado, el presupuesto y los reportes.

Queda **fuera del alcance** la facturación legal: la hace Contabilidad en otro sistema, y nuestra nota de venta solo registra el número de factura y adjunta su PDF. También queda fuera la contabilidad.

**Operación real.** Los vendedores **no usan el sistema**: pasan los pedidos por WhatsApp (grupo general por regional) a un administrador, que centraliza y carga todo.
- Supermercados es planificado: los pedidos se toman el lunes y se entregan el martes.
- Las rutas se arman por día: preventa por zona (cliente, zona, cantidad y precio).
- ● El circuito descrito por la clienta es: pedido por WhatsApp → **nota de venta** por cliente → consolidado del pedido por vendedor → **salida** de almacén → entrega. Si el cliente no estaba o rechaza, la nota se anula (F2, ⚠ SUP-07).

**Glosario.**
- **Regional / Sucursal.** La Paz, Cochabamba y Santa Cruz; operan de forma independiente. Cada una tiene su almacén. Prefijos: `LP`, `CBBA`, `SCZ`.
- **Stock de la regional.** ● Lo que hay en el almacén más lo que está **en poder de los vendedores** de esa regional (⚠ SUP-07).
- **Hoja de carga / salida por vendedor.** ● Consolidado imprimible de los productos de las notas del día de un vendedor, para que almacén prepare la carga. No mueve stock; ya lo movieron las notas (⚠ SUP-53).
- **Nota de Salida.** ● Solo en la modalidad "mercadería en poder del vendedor": pasa mercadería del almacén al vendedor, descontando el stock físico y sumando al saldo del vendedor. No cambia el stock total de la regional.
- **Nota de Retorno.** ● Devuelve al almacén el sobrante que tiene el vendedor (⚠ SUP-15).
- **Nota de Venta.** Documento interno que se emite e imprime al cliente. ● Descuenta del **almacén** (preventa, por defecto) o del saldo del vendedor si este tiene la mercadería en su poder (⚠ SUP-14). Lleva número por regional (`LP-0001`). No es la factura legal.
- **Factura.** Comprobante fiscal que emite Contabilidad en otro sistema. Su número se registra en la nota de venta (y su PDF se adjunta) para el cruce.
- **Liquidación / Reporte Diario.** El arqueo del día por regional. Por cada producto: saldo inicial, pedido, traspaso, venta contado (Q+Bs), venta crédito (Q+Bs), saldo final y total. Al pie: descuentos, el detalle de las notas del día, el detalle de cobranzas y los totales de caja.
- **Anulación.** Dejar sin efecto una nota del **día abierto**: repone el stock y queda trazada; la nota nunca se borra ni se edita.
- **Devolución / Nota de Crédito.** Reverso de una venta de un **día ya cerrado**. Es un movimiento nuevo con fecha de hoy que repone el stock y, según el tipo, egresa de la caja de hoy o reduce la deuda del cliente (⚠ SUP-17). Nunca toca el día cerrado.
- **Traspaso.** Movimiento espejo de mercadería entre regionales: resta en el origen y suma en el destino.
- **Ajuste.** ● Corrección del stock por conteo físico, merma o inventario inicial, con motivo obligatorio (⚠ SUP-36).
- **Cartera inicial.** ● Saldos por cobrar anteriores al sistema, cargados una vez para que el EECC arrastre los meses previos (⚠ SUP-24).
- **EECC (Estado de Cuentas).** Cuentas por cobrar consolidadas por cliente/regional/categoría, con arrastre mes a mes y mora. Se genera automáticamente y solo es visible a nivel nacional.

---

## 2 — Elicitación (fuentes y técnicas)

| CÓDIGO | FUENTE | TÉCNICA |
|---|---|---|
| F1 | Demo conceptual `index (2).html` — "ONE Comercial COALSUD" | Prototipo navegable |
| F2 | Segunda reunión, 14/10/2026 (Irene, Vanessa + Fabiana, Marcela y Renzo de Esencial). ● Dos transcripciones del mismo audio, ambas cortadas a los 30 min: `Reunion 2 - coalsud.pdf` y `GMT20261014-183039 Recording.txt` (con oradores; Orador 2 = Vanessa) | Entrevista grabada + transcripción |
| F3 | Reporte de Ventas Diarias (planilla "RESUMEN DE REPORTE DE VENTAS", 11/06/2026) | Análisis documental ● (re-analizado en v1.1 fila por fila) |
| F4 | Estado de Cuentas Supermercados 2026 (al 11/06/2026) | Análisis documental |
| F5 | Estado de Cuentas Institucional 2026 — Santa Cruz (al 22/07/2026) | Análisis documental |
| F6 | Decisiones cerradas con el cliente (Q1–Q22) | Validación dirigida |

Los originales están en `Desktop/Coalsud/` (PDF y prototipo) y la versión 1.0 de esta documentación en `Desktop/Coalsud/docs/`.

---

## 3 — Catálogo de actores

### 3.1 — Primarios
- **A1 · Administrador Nacional (Irene / Gerencia; también "el ingeniero", ⚠ SUP-50).** Ve las tres regionales de forma consolidada. ● Administra:
  - usuarios;
  - el catálogo maestro y la configuración;
  - el presupuesto;
  - la reapertura de días cerrados.

  **No carga datos transaccionales** (notas, salidas, cobranzas, devoluciones ni cierres) (⚠ SUP-31). Ve el EECC consolidado y la auditoría.
- **A2 · Administrador Regional (Vanessa = La Paz + Cochabamba; Fernando = Santa Cruz).** CRUD completo dentro de **sus** regionales (puede tener más de una). Carga clientes, vendedores, inventario, notas de venta, cobranzas y devoluciones, y cierra la liquidación del día.

### 3.2 — De interfaz / externos
- **A3 · Vendedor (externo).** Pasa los pedidos por WhatsApp (cliente, zona, cantidad, precio). **No usa el sistema**; existe como dato (RF35).
- **A4 · Contabilidad (externo).** Emite la factura legal en otro sistema y devuelve el número que el administrador registra en la nota.
- **A5 · Supabase Auth (externo).** Servicio de autenticación que respalda las cuentas de usuario.

---

## 4 — Agrupamientos funcionales

- **G1** — Usuarios, roles y accesos
- **G2** — Clientes y vendedores ●
- **G3** — Productos, catálogo y configuración ●
- **G4** — Inventario y almacenes
- **G5** — Notas de venta
- **G6** — Devoluciones
- **G7** — Cobranzas / Rendición
- **G8** — Liquidación / Reporte diario
- **G9** — Presupuesto
- **G10** — Reportes y análisis
- **(T)** — Transversal (trazabilidad y auditoría)

---

## 5 — Requerimientos Funcionales

### G1 — Usuarios y accesos

**RF01 — Administrar Usuarios** ●
- Atributos: Funcional · Alta · Origen F2, F6 · Dep. — · Riesgo Bajo · Dificultad Media ●
- Descripción: El Administrador Nacional da de alta, modifica, desactiva y reactiva cuentas, asignando rol (nacional/regional) y **una o varias regionales**.
- Reglas:
  - (a) Un usuario regional lleva al menos una regional; un nacional no se ata a ninguna (ve todas).
  - (b) Debe quedar siempre al menos un usuario nacional activo.
  - (c) Los vendedores no son usuarios.
  - (d) ● El alta define una contraseña temporal; no se envían correos (⚠ SUP-30).
  - (e) ● El correo es único.
- Relaciones: Base de RF02 y RF41. Auditado por RF32. CU-01.

**RF02 — Autenticar y Autorizar por Rol y Regional** ●
- Atributos: Funcional · Alta · Origen Seguridad, F2 · Dep. RF01 · Riesgo Medio · Dificultad Media
- Descripción: El sistema autentica al usuario y habilita únicamente los datos y acciones de su rol y sus regionales.
- Reglas:
  - (a) El 100 % de las funciones queda bajo autenticación.
  - (b) ● El nacional lee todo y escribe solo lo indicado en ⚠ SUP-31 (usuarios, catálogo, configuración, presupuesto, reapertura); nunca datos transaccionales.
  - (c) El regional solo ve y opera sus regionales.
  - (d) La autorización se hace cumplir en la base (Row Level Security), no solo en la interfaz.
  - (e) ● Un usuario desactivado no puede operar aunque tenga una sesión abierta.
- Relaciones: Transversal a todos los RF. CU-02.

**RF41 — Gestionar Contraseña** ● *(nuevo)*
- Atributos: Funcional · Media · Origen Seguridad · Dep. RF01 · Riesgo Bajo · Dificultad Baja
- Descripción: En el primer ingreso (o tras un reseteo) el usuario debe cambiar su contraseña antes de operar. El nacional puede resetear la contraseña de cualquier usuario.
- Reglas: (a) Mínimo 8 caracteres. (b) El reseteo queda auditado. (⚠ SUP-30)
- Relaciones: Usa RF01. CU-02.

### G2 — Clientes y vendedores

**RF03 — Administrar Clientes** ●
- Atributos: Funcional · Alta · Origen F1, F2 · Dep. RF35 ● · Riesgo Bajo · Dificultad Baja
- Descripción: Alta y edición de clientes con:
  - categoría (supermercado / mayorista / minorista / institucional);
  - **canal** (supermercado / ruta / institucional);
  - regional y vendedor asignado;
  - condición de pago por defecto;
  - ● zona, NIT y razón social (opcionales, ⚠ SUP-49).
- Reglas:
  - (a) El cliente pertenece a una regional.
  - (b) El canal condiciona la cadencia (supermercado planificado vs ruta diaria).
  - (c) ● No se borra: se desactiva.
- Relaciones: Usado por RF12, RF18, RF30. CU-03.

**RF04 — Buscar y Filtrar Clientes**
- Atributos: Funcional · Media · Origen F1 · Dep. RF03 · Riesgo Bajo · Dificultad Baja
- Descripción: Búsqueda por nombre/empresa/NIT y filtrado por regional, categoría, canal, vendedor y estado.
- Relaciones: Usa RF03. CU-03.

**RF35 — Administrar Vendedores** ● *(nuevo)*
- Atributos: Funcional · Alta · Origen F2 · Dep. — · Riesgo Bajo · Dificultad Baja
- Descripción: El regional da de alta, edita y desactiva los vendedores de sus regionales (nombre, teléfono). Los vendedores no son usuarios del sistema (⚠ SUP-32).
- Reglas: Un vendedor con saldo de mercadería en su poder no se puede desactivar hasta devolverlo (RF34).
- Relaciones: Usado por RF03, RF08, RF12, RF19. CU-03.

### G3 — Productos, catálogo y configuración

**RF05 — Administrar Catálogo de Productos** ●
- Atributos: Funcional · Alta · Origen F1, F3 · Dep. RF06 · Riesgo Bajo · Dificultad Baja
- Descripción: Alta y edición de productos con línea comercial, orden dentro de la línea (el de la planilla), precio base y **stock mínimo** (⚠ SUP-29).
- Reglas:
  - (a) El precio base es editable en la nota (RF16).
  - (b) ● El catálogo maestro lo mantiene el nivel nacional (⚠ SUP-02).
  - (c) ● Precio único por producto (⚠ SUP-03).
  - (d) ● Un producto con movimientos no se borra: se desactiva.
- Relaciones: Usado por RF12, RF20. CU-04.

**RF06 — Administrar Líneas Comerciales**
- Atributos: Funcional · Media · Origen F3 · Dep. — · Riesgo Bajo · Dificultad Baja
- Descripción: Mantener las líneas que agrupan el catálogo y el reporte diario, con su orden de aparición. Lista inicial: COMRURAL, ASOVITA, LA Y SAA, IPEL, SULINO, ALCAFOOD, PLASTIOLED, KADO, COMRURAL GRANEL, HUGGIES, BITS CREAM y CONGELADOS (● ⚠ SUP-43).
- Relaciones: Usado por RF05, RF20. CU-04.

**RF36 — Configurar Regionales, Almacenes y Condiciones de Pago** ● *(nuevo)*
- Atributos: Funcional · Baja · Origen F1 · Dep. — · Riesgo Bajo · Dificultad Baja
- Descripción: El nacional mantiene:
  - las regionales (nombre, prefijo de numeración);
  - sus almacenes;
  - las condiciones de pago (nombre, contado/crédito, días), ⚠ SUP-25.
- Reglas: Las tres regionales y sus almacenes se cargan en la puesta en marcha; la pantalla es de mantenimiento ocasional.
- Relaciones: Usado por RF03, RF07, RF12. CU-04.

### G4 — Inventario y almacenes

**RF07 — Registrar Ingreso de Mercadería**
- Atributos: Funcional · Alta · Origen F1 · Dep. RF05 · Riesgo Medio · Dificultad Media
- Descripción: Alta de mercadería que entra al almacén de una regional, con referencia y fecha; suma al stock. ● Es lo que el reporte diario muestra en la columna **Pedido** (⚠ SUP-08).
- Relaciones: Usa RF05; mueve RF10. CU-05.

**RF08 — Registrar Nota de Salida al Vendedor (mercadería en su poder)** ●
- Atributos: Funcional · ● Media · Origen F1, Q13 · Dep. RF07 · Riesgo Alto · Dificultad Alta
- Descripción: Para la modalidad en que el vendedor sale con mercadería (autoventa/consignación, ⚠ SUP-07), se emite una salida del almacén a ese vendedor. Descuenta el **stock físico** del almacén y **suma al saldo en poder del vendedor**.
- Reglas:
  - (a) ● Es un movimiento interno de la regional: no cambia el stock total ni aparece en la matriz del reporte diario. Se controla en RF38.
  - (b) El stock físico no puede quedar negativo.
  - (c) ● En preventa (modalidad por defecto) no se usa: la "salida" es la hoja de carga generada desde las notas (RF42).
- Relaciones: Precede a RF12 cuando la nota descuenta del vendedor. CU-05.

**RF42 — Generar Hoja de Carga / Salida por Vendedor** ● *(nuevo)*
- Atributos: Funcional · Alta · Origen F2 · Dep. RF12 · Riesgo Bajo · Dificultad Baja
- Descripción: Para una fecha y un vendedor (o todos), el sistema consolida los productos y las cantidades de sus notas emitidas e imprime la hoja para que almacén prepare la carga. Lleva:
  - la lista de notas;
  - los clientes;
  - el total en Bs.
- Reglas:
  - (a) No mueve stock: ya lo movieron las notas.
  - (b) Las notas anuladas no cuentan.
  - (c) Cuadra por construcción con las notas, en cantidad y en dinero ("el inventario tiene que cuadrarme con las salidas", F2) (⚠ SUP-53).
- Relaciones: Usa RF12. CU-06.

**RF34 — Registrar Retorno de Mercadería del Vendedor** ● *(nuevo)*
- Atributos: Funcional · Alta · Origen F1, consistencia de RF08 · Dep. RF08 · Riesgo Medio · Dificultad Baja
- Descripción: El vendedor devuelve al almacén mercadería que no vendió: resta de su saldo y suma al almacén.
- Reglas: (a) No puede devolver más de lo que tiene. (b) Es opcional: el saldo puede quedar con el vendedor de un día para otro (⚠ SUP-15).
- Relaciones: Usa RF08; consulta RF38. CU-05.

**RF09 — Registrar Traspaso entre Regionales** ●
- Atributos: Funcional · Media · Origen F2, F6 · Dep. RF07 · Riesgo Medio · Dificultad Media
- Descripción: Movimiento de mercadería del almacén de una regional al de otra que genera **dos movimientos espejo**: salida en el origen y entrada en el destino.
- Reglas:
  - (a) La cantidad no se duplica: se descuenta de un lado y se acredita del otro.
  - (b) ● Figura en la columna Traspaso del reporte diario de **ambas** regionales, **con signo**: + en el destino, − en el origen (⚠ SUP-09).
  - (c) ● Lo registra el regional de origen, en un solo paso, y exige que el día del destino esté abierto (⚠ SUP-37).
- Relaciones: Usa RF10. CU-05. (Decisión Q6)

**RF37 — Registrar Ajuste de Inventario** ● *(nuevo)*
- Atributos: Funcional · Media · Origen consistencia de RF10 · Dep. RF05 · Riesgo Medio · Dificultad Baja
- Descripción: Corrección del stock de un almacén (más o menos) por conteo físico, merma, vencimiento o rotura. La carga del **inventario inicial** de la puesta en marcha es un ajuste con motivo `inventario_inicial`.
- Reglas: (a) Motivo obligatorio. (b) No puede dejar stock negativo. (c) Queda auditado y aparece en la columna "Ajuste" del reporte (⚠ SUP-10, SUP-36).
- Relaciones: Mueve RF10; auditado por RF32. CU-05.

**RF10 — Consultar Stock por Almacén/Regional** ●
- Atributos: Funcional · Alta · Origen F2 · Dep. RF07 · Riesgo Bajo · Dificultad Media
- Descripción: Visualización del stock por producto: en almacén, en poder de vendedores y total de la regional. El regional ve el suyo; el nacional ve todos. ● Incluye el kardex (historial de movimientos con saldo anterior y nuevo).
- Reglas: El stock nunca se edita a mano: es la suma de los movimientos (libro mayor).
- Relaciones: Usado por RF12, RF20. CU-05.

**RF38 — Consultar Saldo en Poder de Vendedores** ● *(nuevo)*
- Atributos: Funcional · Alta · Origen F1 ("saldo en poder del vendedor") · Dep. RF08 · Riesgo Bajo · Dificultad Media
- Descripción: Por vendedor y producto: lo entregado (salidas), lo vendido desde su saldo, lo retornado y el saldo actual, en un período. Es el control "entregado vs vendido" de la demo.
- Relaciones: Usa RF08, RF12, RF34. CU-05.

**RF11 — Alertar Stock Bajo Mínimo** ●
- Atributos: Funcional · Media · Origen F1 · Dep. RF10 · Riesgo Bajo · Dificultad Baja
- Descripción: Aviso dentro del sistema (badge en el menú + listado) cuando el stock físico de un producto en un almacén baja de su mínimo (⚠ SUP-29, SUP-44).
- Relaciones: Usa RF10. CU-05.

### G5 — Notas de venta

**RF12 — Emitir Nota de Venta** ●
- Atributos: Funcional · Alta · Origen F1, F2 · Dep. RF03, RF07 (● RF08 solo si vende desde el saldo del vendedor) · Riesgo Alto · Dificultad Alta
- Descripción: El administrador registra la nota con:
  - cliente y vendedor;
  - canal y condición de pago;
  - descuento;
  - fecha (⚠ SUP-19);
  - origen del stock (⚠ SUP-14);
  - los productos.

  El sistema numera por regional, calcula el total y descuenta del almacén (por defecto, preventa) o del saldo del vendedor.
- Reglas:
  - (a) Numeración por regional (`LP-0001`, `CBBA-0001`, `SCZ-0001`), continua y sin huecos (⚠ SUP-28).
  - (b) ● Total = Σ subtotales × (1 − descuento %), redondeado a 2 decimales (⚠ SUP-48).
  - (c) La nota se puede imprimir e identificar en el historial.
  - (d) ● La condición de pago y los días de crédito se copian a la nota; el vencimiento = fecha + días (⚠ SUP-25).
  - (e) ● No hay stock negativo ni en el almacén ni en el saldo del vendedor.
  - (f) ● Un producto aparece una sola vez por nota (⚠ SUP-47).
- Relaciones: Usa RF03, RF05, RF10; precede a RF13, RF20. CU-06. (Q7, Q17)

**RF13 — Registrar N° de Factura y Adjuntar PDF** ●
- Atributos: Funcional · Alta · Origen F2 · Dep. RF12 · Riesgo Medio · Dificultad Media
- Descripción: Campo para tipear el número de factura legal y posibilidad de adjuntar su PDF (máx. 10 MB), para el cruce nota ↔ factura.
- Reglas:
  - (a) La factura la emite Contabilidad en otro sistema.
  - (b) La nota puede emitirse antes y completarse con la factura cuando llega.
  - (c) ● El N° de factura es **obligatorio para cerrar el día** (RF24) (⚠ SUP-06).
  - (d) ● Se puede registrar o corregir aun con el día cerrado; cada cambio queda auditado.
  - (e) ● Si el N° ya existe en otra nota vigente, el sistema advierte (no bloquea) (⚠ SUP-41).
- Relaciones: Alimenta RF22, RF30. CU-06. (Q7)

**RF14 — Anular Nota de Venta** ●
- Atributos: Funcional · Alta · Origen F2 · Dep. RF12 · Riesgo Alto · Dificultad Media
- Descripción: Dejar sin efecto una nota del **día abierto**: repone el stock automáticamente (al mismo origen del que salió), la marca `anulada` (nunca se borra ni edita) y permite generar una nota nueva con número nuevo.
- Reglas:
  - (a) Motivo opcional; usuario y fecha **siempre** registrados.
  - (b) No se edita una nota emitida.
  - (c) Si el día ya cerró, se usa Devolución (RF17).
  - (d) ● No se anula una nota con cobranzas vigentes: primero se anulan las cobranzas (RF40) (⚠ SUP-18).
  - (e) ● Si tenía N° de factura, se avisa que Contabilidad debe anular esa factura.
- Relaciones: Revierte RF12; auditado por RF32. CU-06. (Q8)

**RF15 — Imprimir Nota de Venta (A5 duplicada en A4)** ●
- Atributos: Funcional · Alta · Origen F2 · Dep. RF12 · Riesgo Bajo · Dificultad Media
- Descripción: La impresión sale **duplicada en una misma hoja A4**: media hoja para el cliente y media para el control interno, para ahorrar papel.
- Reglas:
  - (a) La copia del cliente **no** muestra la condición de pago.
  - (b) ● Diseño propuesto en ⚠ SUP-01, a ajustar con la plantilla actual del cliente.
  - (c) ● Dos copias, no tres (⚠ SUP-45).
  - (d) ● Una nota anulada se reimprime con la marca de agua "ANULADA".
- Relaciones: Usa RF12. CU-06. (Q9, Q10)

**RF16 — Editar Precio en la Nota (con registro)**
- Atributos: Funcional · Media · Origen F2, F6 · Dep. RF05, RF12 · Riesgo Medio · Dificultad Baja
- Descripción: El administrador puede sobrescribir el precio base del producto al cargar la nota; el cambio queda registrado.
- Reglas: Se guardan el precio base (referencia) y el precio aplicado (hecho); la diferencia se audita.
- Relaciones: Usa RF05; auditado por RF32. CU-06. (Q11)

### G6 — Devoluciones

**RF17 — Registrar Devolución / Nota de Crédito** ●
- Atributos: Funcional · Media · Origen F2 (Q19) · Dep. RF12 · Riesgo Alto · Dificultad Media
- Descripción: Reverso de una venta cuyo día ya cerró. Es un movimiento nuevo con **fecha de hoy** que repone el stock hoy en el **almacén** (⚠ SUP-16). Queda ligado a la nota original y puede ser **parcial**.
- Reglas:
  - (a) El día original queda intacto.
  - (b) Queda marcada para que Contabilidad emita la nota de crédito contable; su número se puede registrar después.
  - (c) ● Hay dos tipos (⚠ SUP-17):
    - **reembolso**: egresa de la caja de hoy;
    - **abono a cuenta**: solo en notas a crédito; reduce el saldo por cobrar.
  - (d) ● No se devuelve más de lo vendido menos lo ya devuelto.
  - (e) ● Si el día de la nota está abierto, se rechaza y se indica usar la anulación (⚠ SUP-18).
- Relaciones: Referencia RF12; afecta RF20, RF21, RF30. CU-06. (Q8, Q19)

### G7 — Cobranzas / Rendición

**RF18 — Registrar Cobranza / Rendición** ●
- Atributos: Funcional · Alta · Origen F2, F3 · Dep. RF12 · Riesgo Medio · Dificultad Media
- Descripción: Captura del dinero cobrado: fecha, forma de pago (⚠ SUP-42), referencia (N° de transferencia o cheque) e importe, imputado a **una nota a crédito o a un saldo de cartera inicial** (⚠ SUP-22).
- Reglas:
  - (a) Alimenta el bloque de Cobranzas y el arqueo (`Total Efectivo`) del reporte diario.
  - (b) ● Pagos parciales permitidos; el importe no supera el saldo pendiente.
  - (c) ● Cobrar varias notas de un cliente en una sola operación genera una cobranza por nota.
  - (d) ● No hay módulo de "Rendición" en la sucursal (se pidió quitarlo en F2). El cobro se registra desde la Liquidación del día o desde el detalle de la nota (⚠ SUP-51).
- Relaciones: Alimenta RF21, RF23, RF30. CU-07.

**RF40 — Anular Cobranza** ● *(nuevo)*
- Atributos: Funcional · Media · Origen principio "nada se borra" · Dep. RF18 · Riesgo Medio · Dificultad Baja
- Descripción: Dejar sin efecto una cobranza mal cargada, solo con el día abierto, con motivo obligatorio (⚠ SUP-23).
- Relaciones: Revierte RF18; auditado por RF32. CU-07.

**RF19 — Consultar Ingresos por Vendedor** ●
- Atributos: Funcional · Media · Origen F2 · Dep. RF18 · Riesgo Bajo · Dificultad Baja
- Descripción: Resumen del ingreso de cada vendedor en el período: ventas al contado netas de sus notas + cobranzas imputadas a sus notas − reembolsos de devoluciones (⚠ SUP-34). ● Muestra también sus ventas al contado y a crédito y la cantidad de notas, y se **imprime/exporta** para explicárselo al vendedor (⚠ SUP-55).
- Relaciones: Usa RF12, RF17, RF18. CU-07.

**RF39 — Cargar Cartera Inicial** ● *(nuevo)*
- Atributos: Funcional · Alta · Origen F4, F5 · Dep. RF03 · Riesgo Medio · Dificultad Media
- Descripción: Carga única, documento por documento, de los saldos por cobrar anteriores al sistema: cliente, N° de nota o factura, fecha, vencimiento e importe pendiente (⚠ SUP-24).
- Reglas: (a) Se hace en la puesta en marcha (por planilla o pantalla del nacional). (b) A estos saldos se les imputan cobranzas igual que a una nota.
- Relaciones: Alimenta RF30. CU-12.

### G8 — Liquidación / Reporte diario

**RF20 — Generar el Reporte / Liquidación Diaria** ●
- Atributos: Funcional · Alta · Origen F2, F3 · Dep. RF07, RF09, RF12, RF17, RF37 ● · Riesgo Alto · Dificultad Alta
- Descripción: Un único reporte **por día y por regional** que consolida a **todos los vendedores**. Es una matriz por producto, agrupada por línea, con estas columnas:
  - P/Unit;
  - Saldo Inicial;
  - Pedido;
  - Traspaso;
  - ● Devolución y Ajuste (solo si hay valores);
  - **Venta Contado (Q+Bs)** y **Venta Crédito (Q+Bs)**;
  - Saldo Final;
  - **Total Ventas (Q+Bs)**.

  El significado de cada columna está en ⚠ SUP-08 y el cálculo en [Reglas de Cálculo](../03-especificacion/Reglas_de_Calculo.md).
- Reglas:
  - (a) ● Identidades:
    - `Saldo Final = Saldo Inicial + Pedido ± Traspaso + Devolución ± Ajuste − Contado Q − Crédito Q` (⚠ SUP-09, SUP-10);
    - `Total Ventas = Contado + Crédito`.
  - (b) ● En pantalla van primero los productos con movimiento y después, plegados, los que no tienen (⚠ SUP-04).
  - (c) En export/impresión va el catálogo completo agrupado por línea, como la planilla física.
  - (d) ● La matriz va en bruto y los descuentos se restan al pie (⚠ SUP-11).
  - (e) ● Mientras el día está abierto se calcula en vivo; cerrado, se lee del snapshot.
- Relaciones: Usa RF07, RF09, RF12, RF17, RF18, RF37; precede a RF24. CU-08. (Q3, Q4, Q5)

**RF21 — Calcular el Arqueo del Día** ●
- Atributos: Funcional · Alta · Origen F3 · Dep. RF20 · Riesgo Medio · Dificultad Media
- Descripción: Caja resumen del día con estos importes:
  - Contado, Crédito y Descuentos;
  - Cobranzas;
  - ● Reembolsos;
  - **Total Ventas** y **Total Efectivo**.
- Reglas:
  - `Total Ventas = Contado neto + Crédito neto`;
  - ● `Total Efectivo = Contado neto + Cobranzas − Reembolsos` (⚠ SUP-12).
- Relaciones: Usa RF17, RF18, RF20. CU-08. (Q5)

**RF22 — Detallar las Notas del Día** ●
- Atributos: Funcional · Alta · Origen F2, F3 · Dep. RF20 · Riesgo Bajo · Dificultad Baja
- Descripción: Bloque al pie que lista **todas** las notas del día con N° de nota, N° de factura, cliente, condición e importe. Marca las de crédito y totaliza por condición y en total (= Total Ventas) (⚠ SUP-13).
- Reglas: Las anuladas se muestran tachadas y no suman (⚠ SUP-46).
- Relaciones: Usa RF12, RF13. CU-08.

**RF23 — Detallar las Cobranzas del Día**
- Atributos: Funcional · Media · Origen F3 · Dep. RF18 · Riesgo Bajo · Dificultad Baja
- Descripción: Bloque al pie, distinto del de notas, que lista lo cobrado hoy con su total. Lleva N° de cobranza, cliente, documento, forma de pago e importe; ● al lado va el bloque de devoluciones del día, si hubo.
- Relaciones: Usa RF17, RF18. CU-08.

**RF24 — Cerrar la Liquidación del Día** ●
- Atributos: Funcional · Alta · Origen F2, F6 · Dep. RF20 · Riesgo Alto · Dificultad Media
- Descripción: Al cerrar, se congela un snapshot de las líneas y de los totales, y el día queda **bloqueado** (inmutable).
- Reglas:
  - (a) Tras el cierre no se crean ni editan notas, cobranzas ni movimientos de esa fecha y regional (RF33). La única excepción es el N° de factura y su PDF (RF13 d).
  - (b) ● No se cierra si hay notas emitidas sin N° de factura (⚠ SUP-06).
  - (c) ● No se cierra si hay días anteriores con movimiento todavía abiertos (⚠ SUP-20).
  - (d) ● Lo cierra el regional, no el nacional.
- Relaciones: Usa RF20; habilita RF17. CU-08. (Q20)

**RF25 — Reabrir la Liquidación** ●
- Atributos: Funcional · Baja · Origen F6 · Dep. RF24 · Riesgo Medio · Dificultad Baja
- Descripción: Solo el nivel nacional puede reabrir un día cerrado; queda registrado.
- Reglas: (a) ● Solo el **último** día cerrado de la regional (⚠ SUP-21). (b) ● Motivo obligatorio. (c) ● El snapshot anterior se guarda en la auditoría.
- Relaciones: Revierte RF24; auditado por RF32. CU-08. (Q15, Q20)

### G9 — Presupuesto

**RF26 — Cargar Presupuesto** ●
- Atributos: Funcional · Media · Origen F1, F2 · Dep. — · Riesgo Bajo · Dificultad Baja
- Descripción: Metas en Bs por período (mes), por regional y, opcionalmente, por vendedor o categoría de cliente. ● La cargan el nacional (cualquier regional) y el regional (las suyas) (⚠ SUP-33). ● Está por confirmar si "presupuesto" significaba metas o cotizaciones a clientes (⚠ SUP-52).
- Reglas: ● Una sola meta por combinación período + regional + vendedor + categoría.
- Relaciones: Usado por RF27. CU-09.

**RF27 — Seguimiento de Cumplimiento** ●
- Atributos: Funcional · Media · Origen F1 · Dep. RF26, RF20 · Riesgo Bajo · Dificultad Media
- Descripción: Comparar el real contra la meta y proyectar el cierre. Real = ventas netas; proyección lineal por días calendario (⚠ SUP-33).
- Relaciones: Usa RF26, RF12, RF17. CU-09.

### G10 — Reportes y análisis

**RF28 — Reportes Comerciales** ●
- Atributos: Funcional · Media · Origen F1 · Dep. RF12 · Riesgo Bajo · Dificultad Media
- Descripción: Se pueden filtrar por período, regional, vendedor, línea y categoría:
  - top clientes por facturación;
  - productos más vendidos;
  - rotación de inventario (⚠ SUP-35);
  - ventas por regional (solo las 3);
  - ● **resumen de movimiento por período**: columnas del reporte diario acumuladas en Q y Bs, para el cuadre de fin de mes (⚠ SUP-54).
- Relaciones: Usa RF12, RF10. CU-10.

**RF29 — Exportar a Excel**
- Atributos: Funcional · Alta · Origen F2 · Dep. RF20, RF28 · Riesgo Bajo · Dificultad Media
- Descripción: Todo reporte se puede exportar a Excel para resguardo. El reporte diario y el EECC se exportan con el formato de las planillas del cliente.
- Relaciones: Transversal a G8, G10. CU-10. (Q16)

**RF30 — Generar el EECC Consolidado** ●
- Atributos: Funcional · Media · Origen F4, F5 (Q1) · Dep. RF12, RF13, RF17, RF18, RF39 ● · Riesgo Medio · Dificultad Alta
- Descripción: Estado de cuentas por cobrar **autogenerado** desde las notas a crédito, la cartera inicial, las cobranzas y los abonos por devolución, a una **fecha de corte**. Tiene arrastre por mes de origen y cálculo de mora, por cliente/regional/categoría. Formato en ⚠ SUP-26. Visible **solo a nivel nacional**.
- Reglas:
  - (a) No se mantiene a mano.
  - (b) No es visible en la vista de sucursal.
  - (c) ● Es una función con fecha de corte (⚠ SUP-27).
- Relaciones: Usa RF12, RF13, RF17, RF18, RF39. CU-10. (Q1)

**RF31 — Dashboard Ejecutivo (simplificado)**
- Atributos: Funcional · Baja · Origen F1 (Q2) · Dep. RF20, RF28 · Riesgo Bajo · Dificultad Baja
- Descripción: Tablero mínimo con los indicadores clave, filtrado por permisos:
  - ventas del día y del mes;
  - cumplimiento del presupuesto;
  - alertas de stock;
  - días pendientes de cierre.

  Sin KPI de cuentas por cobrar en la vista de sucursal.
- Relaciones: Usa RF20, RF27, RF28. CU-10. (Q2)

### (T) — Transversal

**RF32 — Registrar Trazabilidad / Auditoría** ●
- Atributos: Funcional · Alta · Origen F2, Seguridad · Dep. transversal · Riesgo Medio · Dificultad Media
- Descripción: Registra quién hizo qué y cuándo en las operaciones sensibles:
  - altas y cambios de maestros;
  - emisión y anulación de notas;
  - devoluciones;
  - ● cobranzas y su anulación;
  - ● ajustes y traspasos;
  - ● registro o cambio de factura;
  - cierres y reaperturas;
  - cambios de precio y ● descuentos;
  - ● altas y reseteos de usuarios.
- Reglas: Solo se agrega: no se modifica ni se borra. Visible para el nivel nacional.
- Relaciones: Transversal. CU-11. (Q22)

**RF33 — Bloquear el Día Cerrado** ●
- Atributos: Funcional · Alta · Origen F6 · Dep. RF24 · Riesgo Alto · Dificultad Media
- Descripción: Impedir, por disparador en la base, crear o modificar notas, cobranzas, devoluciones o movimientos de una fecha y regional ya cerrada. ● También impide operar con fecha anterior o igual al último día cerrado, o con fecha futura (⚠ SUP-19).
- Relaciones: Hace cumplir RF24. CU-08, CU-11. (Q20)

---

## 6 — Requerimientos No Funcionales

**Rendimiento y capacidad**
- RNF-01 — generar el reporte diario de una regional en ≤ 5 s.
- RNF-02 — soportar la operación concurrente de las tres regionales ● sin sobreventa (dos cargas simultáneas no pueden dejar stock negativo).
- RNF-03 — el listado y la búsqueda responden en ≤ 1 s.
- RNF-04 — exportar a Excel un reporte en ≤ 10 s.

**Disponibilidad y continuidad**
- RNF-05 — disponibilidad ≥ 99 % mensual del servicio central (Supabase).
- RNF-06 — respaldo diario de la base central (● requiere el plan Pro, ⚠ SUP-40).
- RNF-07 — el sistema opera **online**; la operación sin conexión queda como punto de extensión (⚠ SUP-05).

**Seguridad**
- RNF-08 — el 100 % de las funciones bajo autenticación y autorización por rol/regional.
- RNF-09 — credenciales cifradas y tráfico sobre HTTPS/TLS.
- RNF-10 — la autorización se hace cumplir en la base (Row Level Security), no solo en la interfaz.
- RNF-11 — auditoría inalterable (solo se agrega), con retención ≥ 12 meses.
- RNF-12 — las operaciones críticas van por funciones `security definer`, nunca por escritura directa del cliente. Son: emisión, anulación, devolución, ● ingreso, salida, retorno, traspaso, ajuste, cobranza y su anulación, registro de factura, cierre y reapertura.
- RNF-13 — la clave `service_role` jamás se expone en el frontend.
- RNF-14 — cierre de sesión por inactividad ● a los 30 minutos (⚠ SUP-38).

**Usabilidad**
- RNF-15 — toda la interfaz en castellano (es-BO), con el vocabulario del negocio (nota de venta, liquidación, traspaso, arqueo).
- RNF-16 — cada rol entra y ve directamente lo suyo.
- RNF-17 — el sistema valida los campos obligatorios (cliente, vendedor, productos) en pantalla **y** en la base.
- RNF-18 — selector de regional activa para el usuario con más de una (Vanessa).

**Compatibilidad e interfaces**
- RNF-19 — funciona en los equipos existentes (PC y notebook) con Chrome o Edge actuales.
- RNF-20 — impresión de la nota en formato A5 duplicada en A4.
- RNF-21 — adjuntar el PDF de la factura desde el equipo (Storage privado, máx. 10 MB).

**Interfaz de usuario**
- RNF-22 — estados del pedido/liquidación con color y etiqueta (emitida, anulada, abierta, cerrada, ● pendiente de factura).
- RNF-23 — diseño responsivo, tema claro.
- RNF-24 — el reporte diario replica la lógica de la planilla física: matriz + totales + detalle de notas y cobranzas.

**Mantenibilidad**
- RNF-25 — los precios viven en el sistema (catálogo), no "en una planilla suelta".
- RNF-26 — los vocabularios (categorías, estados, roles, líneas, condiciones de pago) se amplían sin migraciones complejas.
- RNF-27 — todo cambio de esquema, RLS o función va versionado como migración SQL.

**Restricciones**
- RNF-28 — el sistema **no** emite comprobante fiscal: la factura la hace Contabilidad en otro sistema y solo se cruza el número. Moneda única: Bolivianos (Bs., 2 decimales). Una nota emitida no se edita: se anula o se devuelve.
- ● RNF-29 — **zona horaria única America/La_Paz (UTC−4)**: "hoy", las fechas de operación y el cierre se calculan en la base con esa zona, nunca con el reloj del navegador.
- ● RNF-30 — formato de números y fechas como en las planillas del cliente: `Bs 1,234.56`, `dd/mm/aaaa` (⚠ SUP-39).

---

## 7 — Verificación

| REQUISITO | MÉTODO | CRITERIO DE ACEPTACIÓN |
|---|---|---|
| RF02 | A+I | Un regional no ve ni toca datos de otra regional; un acceso indebido lo rechaza la base (RLS). |
| RF08, RF09, RF34 ● | T | La salida descuenta el almacén y suma al vendedor; el retorno, al revés; el traspaso genera salida en origen y entrada en destino (dos movimientos). |
| RF12, RF16 | T | La nota numera por regional, calcula el total y descuenta su origen (almacén o saldo del vendedor); el precio editado queda registrado. |
| RF42 ● | T | La hoja de carga de un vendedor suma exactamente las cantidades y los Bs de sus notas emitidas del día. |
| RF14 vs RF17 | D+T | Día abierto: anular repone el stock y no toca caja. Día cerrado: devolución con fecha de hoy, que egresa de la caja de hoy (reembolso) o reduce la deuda (abono). |
| RF15 | I | La impresión sale A5 duplicada en A4; la copia del cliente no muestra la condición de pago. |
| RF20, RF21 ● | T | La identidad del saldo final cuadra en cada producto y es igual a la suma de movimientos; `Total Efectivo = Contado neto + Cobranzas − Reembolsos`; con los datos de F3 se reproduce la planilla del 11/06/2026. |
| RF24, RF33 | D+T | Con el día cerrado, crear o editar una nota de esa fecha lo rechaza la base; solo el nacional reabre. |
| RF30 ● | T | El EECC se arma desde notas + cartera inicial + cobranzas + abonos, con arrastre por mes; con la cartera de F4 se reproduce el total de la planilla. |
| RF32 | I | Cada operación sensible queda registrada con usuario y hora; el registro no se puede editar. |
| RNF-02 ● | T | Dos emisiones concurrentes sobre el último stock: una se rechaza con STOCK_INSUFICIENTE. |

Métodos: I = Inspección · A = Análisis · D = Demostración · T = Test.

---

## 8 — Matriz de trazabilidad (RF → CU)

| RF | NOMBRE | AGRUP. | ACTORES | CU |
|---|---|---|---|---|
| RF01, RF41 ● | Usuarios y contraseña | G1 | A1 | CU-01, CU-02 |
| RF02 | Autenticar y autorizar | G1 | Todos | CU-02 |
| RF03–RF04, RF35 ● | Clientes y vendedores | G2 | A2 | CU-03 |
| RF05–RF06, RF36 ● | Productos, líneas y configuración | G3 | A1 | CU-04 |
| RF07–RF11, RF34, RF37, RF38 ● | Inventario y almacenes | G4 | A2 | CU-05 |
| RF12–RF16, RF42 ● | Notas de venta y hoja de carga | G5 | A2 | CU-06 |
| RF17 | Devolución | G6 | A2 | CU-06 |
| RF18–RF19, RF40 ● | Cobranzas | G7 | A2 | CU-07 |
| RF39 ● | Cartera inicial | G7 | A1 | CU-12 |
| RF20–RF25 | Liquidación / reporte diario | G8 | A2, A1 | CU-08 |
| RF26–RF27 | Presupuesto | G9 | A1, A2 | CU-09 |
| RF28–RF31 | Reportes, EECC, dashboard | G10 | A1, A2 | CU-10 |
| RF32–RF33 | Trazabilidad y bloqueo | (T) | Todos | CU-11 |

● **42 requerimientos funcionales · 30 no funcionales · 12 casos de uso.**

---

## 9 — Supuestos y cuestiones abiertas

### 9.1 — Cerrados con el cliente (Q1–Q22)
| # | CUESTIÓN | CÓMO SE CERRÓ |
|---|---|---|
| Q1 | Estado de cuentas | Autogenerado desde notas + facturas + cobranzas, solo nivel nacional (RF30). |
| Q2 ● | Dashboard | Simplificado; sin KPI de cuentas por cobrar en la sucursal (RF31). *(Reconstruido desde la referencia en RF31.)* |
| Q3 | Liquidación vs reporte | Unificados en un solo reporte por día y regional (RF20). |
| Q4 ● | Vistas del reporte | Pantalla compacta y export con catálogo completo (RF20 b/c). *(Reconstruido desde la referencia en RF20.)* |
| Q5 | Arqueo | `Total Efectivo = Contado + Cobranzas`; `Total Ventas = Contado + Crédito` (RF21). ● Se extiende con reembolsos (⚠ SUP-12). |
| Q6 | Traspaso | Movimiento espejo (RF09). |
| Q7 | Factura | N° obligatorio en la nota (RF13). ● En qué momento es obligatorio: ⚠ SUP-06. |
| Q8 / Q19 | Anular vs devolver | Anular (día abierto) / Devolución (día cerrado) (RF14, RF17). |
| Q9 ● | Impresión | Duplicada en una hoja A4 (dos A5) (RF15). *(Reconstruido.)* |
| Q10 ● | Copia del cliente | Sin condición de pago (RF15 a). *(Reconstruido.)* |
| Q11 | Precio | Único y editable en la nota, con registro (RF16). |
| Q13 | Descuento de stock | La salida descuenta el stock físico; la nota, el saldo del vendedor (RF08, RF12). ● **En revisión:** la transcripción con oradores de F2 describe preventa (primero la nota, después la salida). v1.1 soporta las dos modalidades, con preventa por defecto (⚠ SUP-07). |
| Q14–Q15 | Usuarios | Nacional solo lee; regional CRUD en sus regionales (RF01, RF02). ● Precisado en ⚠ SUP-31. |
| Q16 ● | Excel | Todo reporte exportable a Excel para resguardo (RF29). *(Reconstruido.)* |
| Q17 | Numeración | Por regional, `LP-0001` (RF12). |
| Q20 | Cierre | Día cerrado inmutable; solo el nacional reabre (RF24, RF25, RF33). |
| Q22 | Auditoría | Visible para gerencia (RF32). |
| Q12, Q18, Q21 ● | — | **Sin registro en las fuentes disponibles.** Completar con el acta de decisiones de Esencial. |

### 9.2 — Abiertos
● Todos los puntos abiertos (incluidos S1'–S5' de v1.0, renumerados como SUP-01 a SUP-05) tienen una **propuesta adoptada** en el [Registro de Supuestos](Registro_de_Supuestos.md), con evidencia, alternativa e impacto. La sección 3 de ese registro tiene la lista de preguntas para la próxima reunión, ordenada por impacto.

---

## 10 — Cumplimiento de calidad (ISO 29148 / IEEE 830)

| CARACTERÍSTICA | CÓMO SE CUMPLE |
|---|---|
| Correcta | Cada RF nace de una fuente del relevamiento (F1–F6) citada en Origen. |
| No ambigua | Actor explícito, verbo en infinitivo, reglas con letras (a)(b)(c). ● Las ambigüedades restantes están aisladas como supuestos con ID. |
| Completa | Cubre el circuito de punta a punta (cliente → salida → nota → cobranza → liquidación → cierre) y lo transversal (auditoría). ● v1.1 agrega retorno, ajuste, vendedores, configuración, cartera inicial y anulación de cobranza. |
| Consistente | IDs únicos, vocabulario del glosario. ● v1.1 elimina las contradicciones detectadas en la revisión. |
| Priorizada | Cada RF lleva Prioridad y Dificultad. |
| Verificable | §7 define método y criterio de aceptación por requisito. |
| Modificable | Agrupación por G y marcas de versión; vocabularios ampliables (RNF-26). |
| Rastreable | Trazabilidad RF → CU (§8) y RF → supuesto (Registro de Supuestos). |

---

## 11 — Próximos pasos

1. ✅ Casos de uso (CU-01 a CU-12) y casos de prueba, actualizados a v1.1.
2. ✅ Diseño (modelo de datos, normalización, diagramas, arquitectura, RLS) actualizado a v1.1.
3. ✅ Especificación técnica: esquema de base, contrato de API y reglas de cálculo.
4. ✅ Planes de implementación de backend y frontend.
5. ● **Validar con el cliente** las preguntas del Registro de Supuestos §3 (primero las de impacto alto) antes de construir la liquidación (Sprint 6) y el EECC (Sprint 7).

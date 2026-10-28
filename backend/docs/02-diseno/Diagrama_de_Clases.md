ESENCIAL CONSULTORA · DISEÑO DEL SISTEMA

# Diagrama de Clases · UML — COALSUD S.R.L.
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

Modelo estático del sistema.

**Cómo se lee:**
- Caja de tres franjas = clase (nombre, atributos, operaciones).
- `−` atributo privado · `+` operación pública · `/` atributo derivado (se calcula) · `[0..1]` opcional.
- `◆` composición (la parte no vive sin el todo) · `«control»` servicio (no es tabla).
- Multiplicidad: `1` · `0..1` · `1..*` · `0..*`.

**● Cambios v1.1:**
- `NotaSalida` se generaliza en `DocumentoInventario`.
- `Inventario` pasa a `StockSaldo`, con ubicación almacén o vendedor.
- Se agregan `CondicionPago` y `CxcSaldoInicial`.
- `Cobranza` agrega estado e imputación; `Devolucion` agrega `tipoReverso`.
- Las clases de control reflejan las RPC del [Contrato de API](../03-especificacion/Contrato_API.md).

---

## 1 · Ventas

```
┌─ NotaVenta ───────────────────────────┐ 1   * ┌─ NotaVentaItem ─────────────────┐
│ − numero : string (LP-0001)           │◆─────►│ − producto : Producto           │
│ − fecha : date                        │       │ − cantidad : Decimal            │
│ − canal : {super, ruta, inst}         │       │ − precioBase : Money            │
│ − condicion : CondicionPago           │       │ − precioAplicado : Money        │
│ − condicionTipo : {contado, credito} ●│       │ − /subtotal : Money             │
│ − diasCredito : int ●                 │       └─────────────────────────────────┘
│ − /fechaVencimiento : date ●          │
│ − descuentoPct : Decimal              │          * │          * │
│ − origenStock : {vendedor, almacen} ● │            ▼ 1          ▼ 1
│ − numeroFactura : string [0..1] ●     │     ┌─ Cliente ───────┐  ┌─ Vendedor ─┐
│ − facturaPdfPath : string [0..1]      │     │ − nombre · nit  │  │ − nombre   │
│ − estado : {emitida, anulada}         │     │ − categoria     │  │ − regional │
├───────────────────────────────────────┤     │ − canal · zona  │  │ − activo   │
│ + total() : Money                     │     │ − condicion     │  └────────────┘
│ + saldoPendiente() : Money ●          │     │ − regional      │
│ + pendienteFactura() : bool ●         │     └─────────────────┘
│ + puedeAnularse() : bool              │
│ + anular(motivo, usuario) : void      │     ┌─ CondicionPago ● ──────────┐
└───────────────────────────────────────┘     │ − nombre · tipo · dias     │
                                               └────────────────────────────┘
```
`NotaVenta` es la clase central: lleva uno o más `NotaVentaItem` (composición) y conoce su cliente y su vendedor.
- `total()` y `saldoPendiente()` se calculan.
- `estado` recorre emitida → anulada.
- ● `puedeAnularse()` es verdadero solo si el día de la nota está abierto y no tiene cobranzas vigentes (⚠ SUP-18).
- ● `pendienteFactura()` es verdadero mientras `numeroFactura` sea nulo.

## 2 · Devoluciones

```
┌─ Devolucion ──────────────────────────┐ 1   * ┌─ DevolucionItem ───────────┐
│ − numero : string (DEV-LP-...)        │◆─────►│ − producto                 │
│ − fecha : date (hoy)                  │       │ − cantidad                 │
│ − tipoReverso : {reembolso,           │       │ − precioAplicado (foto) ●  │
│                  abono_cuenta} ●      │       └────────────────────────────┘
│ − motivo : string                     │
│ − ncContableNumero : string [0..1] ●  │  ── «referencia» ──▶ NotaVenta (día cerrado)
│ − /importe : Money                    │
├───────────────────────────────────────┤
│ + reponerStockHoy() : void            │
│ + egresarCajaHoy() : void  [reembolso]│
│ + abonarCuenta() : void  [abono] ●    │
└───────────────────────────────────────┘
```
`Devolucion` nace con fecha de hoy, se liga a la nota original y repone el stock hoy en el almacén (⚠ SUP-16). Según `tipoReverso` (⚠ SUP-17):
- **reembolso:** egresa de la caja de hoy;
- **abono a cuenta:** reduce el saldo por cobrar de la nota.

Puede ser parcial (varios `DevolucionItem`).

## 3 · Inventario

```
┌─ Producto ──────────────┐ 1   * ┌─ MovimientoInventario ──────────────┐
│ − nombre · codigo       │──────►│ − fecha : date                      │
│ − linea : LineaComercial│       │ − tipo : {ingreso, salida, retorno, │
│ − orden : int ●         │       │   traspaso_salida, traspaso_entrada,│
│ − precioBase : Money    │       │   venta, anulacion, devolucion,     │
│ − stockMinimo : Decimal●│       │   ajuste}                           │
└─────────────────────────┘       │ − almacen : Almacen                 │
        │ 1                       │ − vendedor : Vendedor [0..1] ●      │
        │ *                       │ − cantidad : Decimal (+/-)          │
        ▼                         │ − origen: Documento|Nota|Devolucion │
┌─ StockSaldo ● ──────────┐       │ − /saldoAnterior · /saldoNuevo      │
│ − almacen               │       └─────────────────────────────────────┘
│ − vendedor [0..1]       │                    ▲ 1..2 por ítem
│ − cantidad : Decimal≥0  │                    │
│ + bajoMinimo() : bool   │       ┌─ DocumentoInventario ● ─────────┐ 1  * ┌─ DocInvItem ─┐
└─────────────────────────┘       │ − numero · fecha · referencia    │◆────►│ − producto   │
  (lo mantiene un trigger)        │ − tipo : {ingreso, salida,       │      │ − cantidad   │
                                  │   retorno, traspaso, ajuste}     │      └──────────────┘
                                  │ − almacen / almacenDestino [0..1]│
                                  │ − vendedor [0..1] · motivo [0..1]│
                                  └──────────────────────────────────┘
```
- El saldo de `StockSaldo` es la suma de los `MovimientoInventario` de su ubicación: almacén, o almacén + vendedor.
- Cada ítem de un `DocumentoInventario` genera **uno o dos** movimientos:

| DOCUMENTO | MOVIMIENTOS QUE GENERA |
|---|---|
| ingreso | 1 (almacén +) |
| ajuste | 1 (almacén ±) |
| salida | 2 (almacén −, vendedor +) |
| retorno | 2 (vendedor −, almacén +) |
| traspaso | 2 (almacén origen −, almacén destino +) |

## 4 · Cobranzas, cartera y liquidación

```
┌─ Cobranza ──────────────────────┐        ┌─ Liquidacion ───────────────────────┐
│ − numero · fecha                │        │ − fecha : date                      │
│ − formaPago : FormaPago         │ ·······│ − estado : {abierta, cerrada}       │
│ − importe : Money               │ alimenta│ + totalContado() : Money           │
│ − estado : {vigente, anulada} ● │  caja   │ + totalCredito() : Money            │
│ − documento: NotaVenta |        │        │ + totalDescuentos() : Money ●       │
│     CxcSaldoInicial ●           │        │ + totalCobranzas() : Money          │
│ + anular(motivo) ●              │        │ + totalReembolsos() : Money ●       │
└─────────────────────────────────┘        │ + totalVentas() : Money             │
                                            │ + totalEfectivo() : Money           │
┌─ CxcSaldoInicial ● ─────────────┐        │ + cerrar(usuario) : void            │
│ − cliente · numeroDocumento     │        │ + reabrir(usuario, motivo) [nacional]│
│ − fechaDocumento · vencimiento  │        └─────────────────────────────────────┘
│ − importe                       │                    │ 1
│ + saldoPendiente() : Money      │                    ◆ *
└─────────────────────────────────┘  ┌─ LiquidacionLinea ───────────────────────┐
                                     │ − saldoInicial · pedido · traspaso(±) ·  │
                                     │   devolucion ● · ajuste ● · saldoFinal   │
                                     │ − ventaContadoQ · ventaContadoBs         │
                                     │ − ventaCreditoQ · ventaCreditoBs         │
                                     │ − totalVentasQ · totalVentasBs           │
                                     └──────────────────────────────────────────┘
                                        snapshot congelado al cerrar
```
`Liquidacion` es una por regional y día.
- Sus totales se calculan en vivo mientras está `abierta`.
- Al `cerrar()`, congela las `LiquidacionLinea` y los totales.
- `Cobranza` (solo las vigentes) alimenta `totalCobranzas()`; las devoluciones con reembolso alimentan `totalReembolsos()`.

## 5 · Clases de control (servicios)

```
┌─ «control» VentaService ─────────────┐  ┌─ «control» InventarioService ────────┐
│ + emitirNota(...)                    │  │ + registrarIngreso(...)              │
│ + registrarFactura(nota, n°, pdf) ●  │  │ + registrarSalida(...)               │
│ + anularNota(nota, motivo)           │  │ + registrarRetorno(...) ●            │
│ + registrarDevolucion(...)           │  │ + registrarTraspaso(...)             │
└──────────────────────────────────────┘  │ + registrarAjuste(...) ●             │
┌─ «control» CobranzaService ● ────────┐  └──────────────────────────────────────┘
│ + registrarCobranzas(...)            │  ┌─ «control» LiquidacionService ───────┐
│ + anularCobranza(cobranza, motivo)   │  │ + reporteDia(regional, fecha)        │
│ + ingresosPorVendedor(...)           │  │ + cerrarDia(...) / reabrir(...)      │
└──────────────────────────────────────┘  └──────────────────────────────────────┘
┌─ «control» ReporteService ● ─────────┐  ┌─ «control» PermisosService ──────────┐
│ + eecc(fechaCorte)  [nacional]       │  │ + puede(accion) : bool               │
│ + topClientes / masVendidos /        │  │ + miRol() : Rol                      │
│   rotacion / ventasPorRegional       │  │ + misRegionales() : Regional[*]      │
│ + cumplimientoPresupuesto(...)       │  └──────────────────────────────────────┘
└──────────────────────────────────────┘
```
En el sistema construido, estas clases son **funciones RPC** de Postgres (ver [Contrato de API](../03-especificacion/Contrato_API.md)). Las de escritura corren como `security definer` y validan rol y regional por dentro. `PermisosService` refleja en el frontend la matriz que la base hace cumplir con RLS.

---

## Correspondencia con el modelo de datos

| DIAGRAMA DE CLASES (UML) | MODELO ENTIDAD/RELACIÓN |
|---|---|
| Clase | Entidad / tabla |
| Atributo | Columna |
| Asociación con multiplicidad | Relación (1:N, N:M) |
| Composición (◆) | FK con `on delete cascade` (en la práctica nada se borra: las tablas transaccionales no admiten DELETE) |
| Atributo derivado (/) | Vista, función o columna generada |
| Clase «control» | Función RPC (no es tabla) |

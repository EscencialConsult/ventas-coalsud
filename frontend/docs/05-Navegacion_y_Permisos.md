ESENCIAL CONSULTORA · FRONTEND

# Navegación y Permisos — COALSUD
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

Qué ve cada rol en el menú, qué rutas existen y qué acciones se muestran. Esto **refleja** la [matriz de la base](../../backend/docs/02-diseno/Seguridad_RLS.md) (§11), no la reemplaza: si la UI se equivoca, la base rechaza.

---

## 1 · Menú por rol

Basado en el menú de la demo F1. Se aplican los cambios de F2: la sucursal no tiene "Estado de cuentas" ni "Rendición/Cobranza" (⚠ SUP-51); los cobros se registran dentro de la Liquidación.

| GRUPO | ÍTEM | RUTA | REGIONAL | NACIONAL |
|---|---|---|---|---|
| Principal | Dashboard | `/` | ✅ | ✅ |
| Gestión | Clientes | `/clientes` | ✅ (edita) | ✅ (lee) |
| Gestión | Vendedores | `/vendedores` | ✅ (edita) | ✅ (lee) |
| Gestión | Productos | `/catalogo/productos` | ✅ (lee) | ✅ (edita) |
| Gestión | Inventario | `/inventario` | ✅ (opera) | ✅ (lee) |
| Comercial | Notas de venta | `/notas` | ✅ (opera) | ✅ (lee) |
| Comercial | Hoja de carga | `/notas/hoja-carga` | ✅ | ✅ (lee) |
| Comercial | Liquidación diaria | `/liquidacion` | ✅ (cobros + cierra) | ✅ (lee + reabre) |
| Comercial | Devoluciones | `/devoluciones` | ✅ | ✅ (lee) |
| Comercial | Estado de cuentas | `/eecc` | ❌ | ✅ |
| Planificación | Presupuesto | `/presupuesto` | ✅ | ✅ |
| Análisis | Reportes | `/reportes` | ✅ (sus regionales) | ✅ |
| Administración | Usuarios | `/usuarios` | ❌ | ✅ |
| Administración | Configuración | `/configuracion` | ❌ | ✅ |
| Administración | Auditoría | `/auditoria` | ❌ | ✅ |

Badges en el menú:
- **Inventario**: cantidad de productos bajo mínimo (RF11, ⚠ SUP-44).
- **Liquidación diaria**: días pendientes de cierre.
- **Notas de venta**: notas sin factura.

---

## 2 · Rutas

| RUTA | PANTALLA | ROLES | REQUIERE REGIONAL CONCRETA | DOC |
|---|---|---|---|---|
| `/login` | Login | público | — | [01](06-pantallas/01_Login_y_Sesion.md) |
| `/cambiar-password` | Cambio de contraseña | sesión | — | [01](06-pantallas/01_Login_y_Sesion.md) |
| `/` | Dashboard | ambos | — | [02](06-pantallas/02_Dashboard.md) |
| `/usuarios` | Usuarios | nacional | — | [03](06-pantallas/03_Usuarios.md) |
| `/clientes`, `/clientes/:id` | Clientes | ambos | para crear | [04](06-pantallas/04_Clientes_y_Vendedores.md) |
| `/vendedores` | Vendedores | ambos | para crear | [04](06-pantallas/04_Clientes_y_Vendedores.md) |
| `/catalogo/productos`, `/catalogo/lineas`, `/catalogo/condiciones` | Catálogo | ambos (edita nacional) | — | [05](06-pantallas/05_Catalogo_y_Configuracion.md) |
| `/configuracion` | Regionales y almacenes | nacional | — | [05](06-pantallas/05_Catalogo_y_Configuracion.md) |
| `/inventario` (tabs: stock · movimientos · documentos · vendedores) | Inventario | ambos | para operar | [06](06-pantallas/06_Inventario.md) |
| `/inventario/nuevo/:tipo` (`ingreso`·`salida`·`retorno`·`traspaso`·`ajuste`) | Documento de inventario | regional | ✅ | [06](06-pantallas/06_Inventario.md) |
| `/inventario/documentos/:id` | Detalle del documento | ambos | — | [06](06-pantallas/06_Inventario.md) |
| `/notas` | Historial de notas | ambos | — | [07](06-pantallas/07_Notas_de_Venta.md) |
| `/notas/nueva` | Nueva nota | regional | ✅ | [07](06-pantallas/07_Notas_de_Venta.md) |
| `/notas/:id` | Detalle (factura, anular, devolver, imprimir, cobrar) | ambos | acciones: regional | [07](06-pantallas/07_Notas_de_Venta.md) |
| `/notas/hoja-carga` | Hoja de carga por vendedor | ambos | ✅ | [07](06-pantallas/07_Notas_de_Venta.md) |
| `/devoluciones`, `/devoluciones/:id` | Devoluciones | ambos | — | [07](06-pantallas/07_Notas_de_Venta.md) |
| `/liquidacion` → `/liquidacion/:fecha` (tabs: reporte · cobranzas) | Liquidación del día | ambos | ✅ (el nacional elige una regional) | [09](06-pantallas/09_Liquidacion.md) |
| `/liquidacion/historial` | Historial de liquidaciones | ambos | — | [09](06-pantallas/09_Liquidacion.md) |
| `/cobranzas/nueva?cliente=&nota=` | Registrar cobro | regional | ✅ | [08](06-pantallas/08_Cobranzas.md) |
| `/presupuesto` | Presupuesto | ambos | para cargar | [10](06-pantallas/10_Presupuesto.md) |
| `/reportes/:reporte` | Reportes | ambos | — | [11](06-pantallas/11_Reportes_y_EECC.md) |
| `/eecc` | EECC consolidado | nacional | — | [11](06-pantallas/11_Reportes_y_EECC.md) |
| `/auditoria` | Auditoría | nacional | — | [12](06-pantallas/12_Auditoria.md) |
| `/imprimir/nota/:id` · `/imprimir/hoja-carga/:fecha` · `/imprimir/rendimiento` · `/imprimir/liquidacion/:fecha` | Impresión (sin shell) | según la pantalla de origen | — | [07-Impresion](07-Impresion_y_Exportacion.md) |

---

## 3 · `core/auth/permisos.ts`

Un mapa de **acciones** → predicado. Los componentes preguntan `puede('nota.anular')`, nunca `rol === 'regional'`.

```ts
type Accion =
  | 'usuarios.administrar' | 'catalogo.editar' | 'configuracion.editar'
  | 'clientes.editar' | 'vendedores.editar' | 'presupuesto.editar'
  | 'inventario.operar' | 'nota.emitir' | 'nota.anular' | 'nota.factura' | 'nota.devolver'
  | 'cobranza.registrar' | 'cobranza.anular'
  | 'liquidacion.cerrar' | 'liquidacion.reabrir'
  | 'eecc.ver' | 'auditoria.ver' | 'cartera.cargar';

// regional: rol regional + la regional activa es una de las suyas
// nacional: rol nacional
const reglas: Record<Accion, (s: Sesion, regionalActiva: string | null) => boolean> = {
  'usuarios.administrar': esNacional,
  'catalogo.editar':      esNacional,           // ⚠ SUP-02
  'configuracion.editar': esNacional,
  'cartera.cargar':       esNacional,           // ⚠ SUP-24
  'eecc.ver':             esNacional,
  'auditoria.ver':        esNacional,
  'liquidacion.reabrir':  esNacional,           // ⚠ SUP-21 (además: solo el último día cerrado)
  'presupuesto.editar':   (s, r) => esNacional(s) || operaRegional(s, r),   // ⚠ SUP-33
  'clientes.editar':      operaRegional,
  'vendedores.editar':    operaRegional,
  'inventario.operar':    operaRegional,
  'nota.emitir':          operaRegional,
  'nota.anular':          operaRegional,        // + estado de la nota (día abierto, sin cobranzas)
  'nota.factura':         operaRegional,
  'nota.devolver':        operaRegional,        // + día de la nota cerrado
  'cobranza.registrar':   operaRegional,
  'cobranza.anular':      operaRegional,
  'liquidacion.cerrar':   operaRegional,
};
```

Las condiciones que dependen **del dato** (día abierto, cobranzas, último cierre) las expone la base en la fila (`v_nota_venta`, `reporte_liquidacion.validaciones_cierre`, `max_devolvible`). La UI deshabilita el botón y explica por qué (tooltip). Si igual se intenta, la base responde con el código.

---

## 4 · Reglas del selector de regional en cada pantalla

| PANTALLA | CON "TODAS" (NACIONAL) | CON UNA REGIONAL |
|---|---|---|
| Listados (clientes, notas, stock, movimientos) | consolidado, con columna Regional | filtrado |
| Formularios de escritura | no aplica (el nacional no escribe transaccional) | usa la regional activa; el selector se bloquea mientras hay un formulario con cambios sin guardar |
| Liquidación | pide elegir una regional ("El reporte diario es por regional") | reporte de esa regional |
| Hoja de carga | pide elegir una regional | por la regional activa |
| Reportes / dashboard | consolidado | filtrado |
| EECC | filtro propio de regional dentro de la pantalla | — |

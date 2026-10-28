ESENCIAL CONSULTORA · ESPECIFICACIÓN TÉCNICA

# Contrato de API — COALSUD S.R.L.
**v1.1 · 26/10/2026**

Esencial Consultora — El Alto / La Paz, Bolivia

Este documento es el **acuerdo entre frontend y backend**: qué se lee, qué RPC existen, qué reciben y devuelven, y qué errores pueden dar. El backend no cambia una firma sin actualizar esta hoja. El frontend no llama nada que no esté aquí.

Todas las llamadas van por `supabase-js` (PostgREST) con la sesión del usuario. Los tipos TypeScript de tablas, vistas y argumentos de RPC se generan con `supabase gen types` (⚙ DT-13). Los resultados `jsonb` se tipan a mano en el frontend, con las formas de esta hoja.

---

## 1 — Convenciones

| TEMA | REGLA |
|---|---|
| Lecturas simples | `supabase.from('<tabla o vista>').select(...)`, filtradas por la RLS |
| Escrituras de maestros | `insert` / `update` directo sobre `cliente`, `vendedor`, `producto`, `linea_comercial`, `condicion_pago`, `regional`, `almacen`, `presupuesto` |
| Escrituras transaccionales | **solo** `supabase.rpc('<nombre>', { p_… })` |
| Argumentos | con nombre y prefijo `p_`; las listas (ítems, aplicaciones) van como `jsonb` |
| Fechas | `'YYYY-MM-DD'` (date); instantes en ISO-8601 UTC |
| Montos y cantidades | `number` en JSON (numeric de Postgres); el frontend no redondea por su cuenta |
| Lecturas con regional opcional | `p_regional_id = null` → todas las regionales que el usuario puede leer |
| Paginación de listados | `.range(desde, hasta)` + `count: 'exact'`; 50 filas por defecto |

---

## 2 — Errores

### 2.1 — Forma
Una regla de negocio rechazada llega a `supabase-js` como `error`, con esta forma:
```json
{ "code": "P0001", "message": "El día 11/06/2026 de La Paz está cerrado.",
  "hint": "DIA_CERRADO", "details": "{\"regional\":\"LP\",\"fecha\":\"2026-06-11\"}" }
```
- `hint`: el **código** estable, por el que se programa.
- `message`: el texto en castellano para el usuario, apto para mostrar tal cual.
- `details`: JSON en texto con datos para la UI.

### 2.2 — Catálogo de códigos
| CÓDIGO (`hint`) | CUÁNDO | `details` | ACCIÓN SUGERIDA EN LA UI |
|---|---|---|---|
| `NO_AUTORIZADO` | Sin permiso de escritura sobre la regional, o el nacional intenta una operación transaccional | `{regional_id}` | Toast de error; no reintentar |
| `SOLO_NACIONAL` | Acción reservada al nacional | — | Toast; ocultar la acción |
| `USUARIO_INACTIVO` | Cuenta desactivada | — | Cerrar sesión, mensaje en el login |
| `VALIDACION` | Dato obligatorio faltante o inválido | `{campo, motivo}` | Marcar el campo |
| `NO_ENCONTRADO` | Id inexistente o no visible | `{entidad, id}` | Volver al listado |
| `REGISTRO_INACTIVO` | Cliente, vendedor o producto inactivo | `{entidad, id, nombre}` | Marcar el campo |
| `FECHA_INVALIDA` | Fecha futura | `{fecha, hoy}` | Marcar la fecha |
| `DIA_CERRADO` | Fecha ≤ último cierre o día cerrado (también en la regional destino de un traspaso) | `{regional, fecha, ultimo_cierre}` | Banner "Día cerrado" |
| `DIA_ANTERIOR_ABIERTO` | Cierre con días previos abiertos | `{fechas: [...]}` | Lista con enlaces a esos días |
| `FACTURA_PENDIENTE` | Cierre con notas sin N° de factura | `{notas: [{id, numero, cliente}]}` | Lista con acción "Cargar factura" |
| `REAPERTURA_NO_PERMITIDA` | No es el último día cerrado | `{ultimo_cierre}` | Toast |
| `STOCK_INSUFICIENTE` | No alcanza el stock del origen | `{producto_id, producto, disponible, solicitado, ubicacion}` | Marcar el ítem con el disponible |
| `NOTA_ANULADA` | Operación sobre una nota anulada | `{numero}` | Toast |
| `NOTA_NO_ANULABLE` | Día de la nota cerrado o con cobranzas vigentes | `{motivo: 'dia_cerrado'|'tiene_cobranzas', cobranzas?: [...]}` | Ofrecer devolución o ir a cobranzas |
| `DEVOLUCION_DIA_ABIERTO` | Devolución con el día de la nota abierto | `{fecha_nota}` | Ofrecer anulación |
| `DEVOLUCION_EXCEDE` | Cantidad > vendido − ya devuelto | `{producto_id, maximo}` | Marcar el ítem |
| `ABONO_NO_PERMITIDO` | Abono sobre una nota contado o mayor al saldo | `{saldo}` | Sugerir reembolso |
| `REEMBOLSO_EXCEDE_COBRADO` | Reembolso en una nota a crédito mayor a lo cobrado | `{cobrado_neto}` | Sugerir abono |
| `DOCUMENTO_CONTADO` | Cobranza sobre una nota contado | — | Toast |
| `IMPORTE_EXCEDE_SALDO` | Cobranza mayor al saldo del documento | `{documento, saldo}` | Marcar el importe |
| `COBRANZA_NO_ANULABLE` | Cobranza anulada o de un día cerrado | — | Toast |
| `DUPLICADO` | Unicidad (correo, meta, N° de documento) | `{campo}` | Marcar el campo |
| `ULTIMO_NACIONAL` | Dejar 0 nacionales activos | — | Toast |
| `VENDEDOR_CON_SALDO` | Desactivar un vendedor con mercadería | `{productos: [...]}` | Ofrecer "Registrar retorno" |
| `INMUTABLE` | Intento de editar algo que no se edita | — | Error técnico (no debería ocurrir desde la UI) |

Errores nativos que también hay que traducir:
- `23505` (unique) → `DUPLICADO`;
- `23514` (check) → `VALIDACION`;
- `42501` (permiso o RLS) → `NO_AUTORIZADO`;
- `PGRST301` (JWT vencido) → volver a autenticar.

---

## 3 — Sesión y perfil

| LLAMADA | DESCRIPCIÓN |
|---|---|
| `supabase.auth.signInWithPassword({ email, password })` | Login. El error se muestra genérico ("Correo o contraseña incorrectos") |
| `rpc('mi_perfil')` → `{ id, nombre, email, rol, activo, debe_cambiar_password, regionales: [{id, codigo, nombre}] }` | Una vez tras el login y al restaurar la sesión. Un usuario desactivado recibe su perfil con `activo = false` (y `regionales: []`): el frontend cierra la sesión y muestra `USUARIO_INACTIVO`. Una cuenta de auth sin perfil → `NO_AUTORIZADO`. El nacional recibe **todas** las regionales activas; el orden es por nombre |
| `supabase.auth.updateUser({ password })` + `rpc('marcar_password_cambiado')` | Cambio de contraseña (obligatorio si `debe_cambiar_password`) |
| `rpc('hoy')` → `'YYYY-MM-DD'` | Fecha de hoy en Bolivia, según la base (para defaults de formularios) |
| `supabase.auth.signOut()` | Logout (manual o por inactividad) |

---

## 4 — Lecturas (tablas y vistas)

| RECURSO | FILTROS TÍPICOS | PANTALLA |
|---|---|---|
| `regional`, `almacen`, `linea_comercial`, `condicion_pago` | `activo` | combos, configuración |
| `producto` (+ `linea_comercial(nombre)`) | `activo`, `linea_id`, `nombre ilike` | catálogo, ítems de la nota |
| `cliente` (+ `vendedor(nombre)`, `condicion_pago(nombre,tipo,dias)`) | `regional_id`, `categoria`, `canal`, `vendedor_id`, `activo`, `or(nombre.ilike,razon_social.ilike,nit.ilike)` | clientes, selector de la nota |
| `vendedor` | `regional_id`, `activo` | vendedores, combos |
| `v_stock` | `regional_id`, `ubicacion`, `bajo_minimo`, `linea` | stock, alertas |
| `v_movimiento` | `regional_id`, `fecha` entre, `tipo`, `producto_id` | historial de movimientos |
| `v_documento_inventario` (⚙ DT-25) + `documento_inventario_item` | `or(regional_id, regional_destino_id)`, `tipo`, `fecha` | documentos de inventario (incluye los traspasos recibidos) |
| `v_nota_venta` (+ `dia_cerrado`, `usuario_nombre`, ⚙ DT-26) | `regional_id`, `fecha` entre, `estado`, `cliente_id`, `vendedor_id`, `pendiente_factura`, `numero ilike`, `numero_factura ilike` | historial de notas |
| `nota_venta_item` (+ `producto(nombre, linea_comercial(nombre))`) | `nota_venta_id` | detalle, impresión |
| `v_devolucion` / `devolucion_item` | `regional_id`, `fecha`, `nota_venta_id` | devoluciones |
| `v_saldo_documento` | `cliente_id`, `regional_id`, `saldo > 0` | cobranza |
| `v_cobranza` | `regional_id`, `fecha`, `estado`, `documento` | cobranzas |
| `v_liquidacion` | `regional_id`, `estado`, `fecha` | historial de liquidaciones |
| `presupuesto` | `periodo`, `regional_id` | presupuesto |
| `auditoria` (vista `v_auditoria`: + `usuario_nombre`, `regional_codigo`, `registro`, ⚙ DT-29) | `created_at` entre, `usuario_id`, `accion`, `entidad`, `regional_id` (solo nacional) | auditoría |
| `usuario` (+ `usuario_regional(regional_id)`) | — (solo nacional) | usuarios |

---

## 5 — RPC de escritura

Todas son `security definer`, validan rol y regional, usan `app.asegurar_dia_abierto` cuando corresponde y escriben la auditoría. Ninguna confía en datos derivados enviados por el cliente (totales, precio base, regional de un documento existente).

### 5.1 — Inventario

Las cinco devuelven un objeto `{ id, numero }` (`jsonb`, no un arreglo). Validan además: vendedor de la regional del almacén y activo (salida/retorno), y destino de un traspaso en otra regional (`VALIDACION`).

**`registrar_ingreso(p_almacen_id uuid, p_fecha date, p_referencia text, p_items jsonb)`** → `{ id, numero }`
- `p_items`: `[{ "producto_id": "…", "cantidad": 50 }]` (cantidad > 0, sin productos repetidos).
- Efecto: documento `ingreso` (`NI-LP-0001`) + movimiento almacén `+q` por ítem.
- Errores: `NO_AUTORIZADO`, `VALIDACION`, `FECHA_INVALIDA`, `DIA_CERRADO`, `REGISTRO_INACTIVO`.

**`registrar_salida(p_almacen_id uuid, p_vendedor_id uuid, p_fecha date, p_referencia text, p_items jsonb)`** → `{ id, numero }`
- Solo para la modalidad "mercadería en poder del vendedor" (⚠ SUP-07).
- Efecto: `NS-LP-…`; por ítem, almacén `−q` y vendedor `+q`.
- Errores: los de ingreso + `STOCK_INSUFICIENTE`.

**`registrar_retorno(p_almacen_id uuid, p_vendedor_id uuid, p_fecha date, p_referencia text, p_items jsonb)`** → `{ id, numero }`
- Efecto: `RT-LP-…`; vendedor `−q` y almacén `+q`.
- Errores: ídem + `STOCK_INSUFICIENTE` (saldo del vendedor).

**`registrar_traspaso(p_almacen_origen_id uuid, p_almacen_destino_id uuid, p_fecha date, p_referencia text, p_items jsonb)`** → `{ id, numero }`
- Valida: escritura sobre la regional de origen; destino en **otra** regional; día abierto en **ambas**.
- Efecto: `TR-LP-…`; `traspaso_salida −q` (origen) y `traspaso_entrada +q` (destino).
- Errores: ídem + `STOCK_INSUFICIENTE`, `DIA_CERRADO` (con `details.regional` = destino).

**`registrar_ajuste(p_almacen_id uuid, p_fecha date, p_motivo text, p_items jsonb)`** → `{ id, numero }`
- `p_items[].cantidad` con signo, ≠ 0. `p_motivo` obligatorio (p. ej. `inventario_inicial`, `conteo_fisico`, `merma`, `vencimiento`, `rotura` + texto).
- Efecto: `AJ-LP-…`; movimiento `±q` en el almacén.
- Errores: ídem + `STOCK_INSUFICIENTE` (si deja un saldo negativo).

### 5.2 — Ventas

**`emitir_nota_venta(p_regional_id uuid, p_fecha date, p_cliente_id uuid, p_vendedor_id uuid, p_canal text, p_condicion_pago_id uuid, p_descuento_pct numeric, p_origen_stock text, p_numero_factura text, p_observaciones text, p_items jsonb)`** → `{ id, numero, bruto, descuento_bs, total }`
- `p_items`: `[{ "producto_id": "…", "cantidad": 10, "precio_aplicado": 40.00 }]`.
- Valida:
  - escritura sobre la regional y día abierto;
  - cliente y vendedor activos y de la regional;
  - productos activos, sin repetidos, cantidad > 0, precio ≥ 0;
  - descuento entre 0 y 100;
  - `p_origen_stock` en (`almacen`, `vendedor`), con `almacen` por defecto.
- Efecto:
  - numera `LP-0001`;
  - copia `precio_base` del catálogo y `condicion_tipo`/`dias_credito` de la condición;
  - movimientos `venta` (almacén o vendedor);
  - auditoría `emitir_nota`, más `cambio_precio` por ítem con `precio_aplicado ≠ precio_base` y `descuento` si es > 0.
- Errores: `NO_AUTORIZADO`, `VALIDACION`, `REGISTRO_INACTIVO`, `FECHA_INVALIDA`, `DIA_CERRADO`, `STOCK_INSUFICIENTE`.
- Implementación (BE-13):
  - devuelve un objeto (`jsonb`);
  - sin `p_canal` o sin `p_condicion_pago_id`, usa los del cliente;
  - descuenta del almacén principal de la regional (el activo más antiguo). Si el origen es el vendedor, usa el almacén donde ese vendedor tiene el producto;
  - si viene `p_numero_factura`, la nota se guarda con `factura_registrada_en`;
  - una emisión rechazada no consume número.

**`registrar_factura_nota(p_nota_id uuid, p_numero_factura text, p_factura_pdf_path text)`** → `{ id, numero_factura, factura_pdf_path, advertencia_duplicado: boolean }`
- Se permite **con el día cerrado** (⚠ SUP-06). `p_factura_pdf_path` es la ruta ya subida a Storage (§7) o `null` para no cambiarla.
- Si el N° ya existe en otra nota emitida de la regional → `advertencia_duplicado = true` (⚠ SUP-41).
- Auditoría `registrar_factura` (antes/después).
- La ruta del PDF tiene que estar en la carpeta de la regional de la nota (`VALIDACION`).
- Errores: `NO_AUTORIZADO`, `NOTA_ANULADA`, `VALIDACION`.

**`anular_nota_venta(p_nota_id uuid, p_motivo text)`** → `{ id, estado, aviso_factura: text|null }`
- Valida: día de la nota abierto, sin cobranzas vigentes, no anulada.
- Efecto: movimientos `anulacion +q` en el mismo origen, **con la fecha de la nota**. Si tenía factura, `aviso_factura` = "Avisar a Contabilidad que anule la factura N° …".
- Errores: `NO_AUTORIZADO`, `NOTA_ANULADA`, `NOTA_NO_ANULABLE`, `VALIDACION` (motivo obligatorio). Bloquea el día de la nota contra un cierre concurrente y repone cada movimiento de venta en su mismo origen (almacén o vendedor).

**`registrar_devolucion(p_nota_id uuid, p_tipo_reverso text, p_motivo text, p_items jsonb)`** → `{ id, numero, importe }`
- `p_items`: `[{ "producto_id": "…", "cantidad": 3 }]`.
- Fecha = `app.hoy()` (día de hoy abierto en la regional de la nota).
- Valida:
  - nota emitida;
  - día de la nota **cerrado**;
  - máximo devolvible por producto;
  - reglas de abono y reembolso ([Reglas §4](Reglas_de_Calculo.md)).
- Efecto: `DEV-LP-…`; movimiento `devolucion +q` en el almacén; auditoría.
- Errores: `DEVOLUCION_DIA_ABIERTO`, `DEVOLUCION_EXCEDE`, `ABONO_NO_PERMITIDO`, `REEMBOLSO_EXCEDE_COBRADO`, `DIA_CERRADO` (hoy cerrado), `NOTA_ANULADA`, `NO_AUTORIZADO`.

**`registrar_nc_contable(p_devolucion_id uuid, p_numero text)`** → `{ id, nc_contable_numero }`
- Registra el N° de la nota de crédito que emitió Contabilidad; se permite con el día cerrado; auditado.

Implementación (BE-16): los ítems de una devolución tienen que estar en la nota (`VALIDACION`), y se acepta un producto que hoy está inactivo. El stock vuelve al almacén principal de la regional.

### 5.3 — Cobranzas y cartera

**`registrar_cobranzas(p_regional_id uuid, p_fecha date, p_forma_pago text, p_referencia_pago text, p_observaciones text, p_aplicaciones jsonb)`** → `[{ id, numero, documento_id, importe }]`
- `p_aplicaciones`: `[{ "tipo_doc": "nota" | "saldo_inicial", "documento_id": "…", "importe": 200.00 }]`.
- Efecto: una cobranza `CB-LP-…` por aplicación (⚠ SUP-22), todas en una transacción.
- Valida: documento de la regional, a crédito (si es nota), saldo suficiente; cada documento una sola vez por cobro. Bloquea el documento, así dos cobros simultáneos no exceden el saldo. Devuelve el arreglo de cobranzas creadas.
- Errores: `DOCUMENTO_CONTADO`, `IMPORTE_EXCEDE_SALDO`, `NOTA_ANULADA`, `DIA_CERRADO`, `FECHA_INVALIDA`, `NO_AUTORIZADO`, `VALIDACION`.

**`anular_cobranza(p_cobranza_id uuid, p_motivo text)`** → `{ id, estado }`
- Valida: vigente, día de la cobranza abierto, motivo obligatorio.
- Errores: `COBRANZA_NO_ANULABLE`, `DIA_CERRADO`, `VALIDACION`. Tampoco se anula si dejaría a la nota con reembolsos mayores que lo cobrado (`COBRANZA_NO_ANULABLE`).

**`cargar_cartera_inicial(p_regional_id uuid, p_documentos jsonb)`** → `{ insertados: int }`
- **Solo nacional** (⚠ SUP-24).
- `p_documentos`: `[{ "cliente_id": "…", "numero_documento": "F-1463", "fecha_documento": "2026-05-20", "fecha_vencimiento": "2026-06-19", "importe": 1224.60, "observaciones": null }]`.
- Errores: `SOLO_NACIONAL`, `DUPLICADO`, `VALIDACION`.

### 5.4 — Liquidación

**`cerrar_liquidacion(p_regional_id uuid, p_fecha date)`** → `{ id, estado: 'cerrada', totales: {…} }`
- Valida:
  - escritura (regional);
  - fecha ≤ hoy;
  - sin días anteriores abiertos (`DIA_ANTERIOR_ABIERTO`);
  - sin notas pendientes de factura (`FACTURA_PENDIENTE`).
- Si el día no tiene fila (sin movimiento), la crea y la cierra igual (útil para el día de carga inicial).
- Efecto: snapshot en `liquidacion_linea` + totales; auditoría `cerrar_dia`.
- Implementación (BE-19): primero bloquea el día (`asegurar_dia_abierto`), así los movimientos en curso terminan antes. Después valida, en este orden, `DIA_ANTERIOR_ABIERTO` (`{fechas}`) y `FACTURA_PENDIENTE` (`{notas: [{id, numero, cliente}]}`). `totales` tiene la forma de `pie` (§6.1).

**`reabrir_liquidacion(p_regional_id uuid, p_fecha date, p_motivo text)`** → `{ id, estado: 'abierta' }`
- **Solo nacional**; solo el último día cerrado (`REAPERTURA_NO_PERMITIDA`); motivo obligatorio.
- Efecto: guarda el snapshot y los totales en la auditoría (`reabrir_dia`), borra las líneas y limpia los totales (y `cerrada_por`/`cerrada_en`).

---

## 6 — RPC de lectura (calculadas)

Son `security invoker` (respetan la RLS) o validan el rol por dentro cuando son exclusivas del nacional.

| RPC | ARGUMENTOS | DEVUELVE |
|---|---|---|
| `reporte_liquidacion` | `p_regional_id, p_fecha` | `jsonb` (forma en §6.1) |
| `dias_pendientes_cierre` | `p_regional_id` (null = todas) | `[{regional_id, fecha, notas_sin_factura}]` |
| `hoja_carga` | `p_regional_id, p_fecha, p_vendedor_id` (null = todos; un arreglo `jsonb`, una hoja por vendedor ordenada por nombre; `bs` por producto = bruto, `neto` = Σ total de las notas) | `[{vendedor_id, vendedor, productos: [{producto_id, producto, linea, cantidad, bs}], notas: [{id, numero, cliente, zona, condicion, total}], totales: {unidades, bruto, descuento, neto}}]` |
| `max_devolvible` | `p_nota_id` | `{items: [{producto_id, producto, vendido, devuelto, maximo, precio_aplicado}], dia_cerrado, saldo, cobrado_neto}` (⚙ DT-27) |
| `kardex` | `p_almacen_id, p_vendedor_id` (null = almacén), `p_producto_id, p_desde, p_hasta` | `[{id (movimiento, ⚙ DT-25), fecha, tipo, documento, cantidad, saldo_anterior, saldo_nuevo, usuario}]` |
| `saldo_vendedores` | `p_regional_id, p_desde, p_hasta` | `[{vendedor_id, vendedor, producto_id, producto, saldo_inicial, entregado, vendido, retornado, saldo_final, valorizado}]` |
| `ingresos_vendedores` | `p_regional_id, p_desde, p_hasta, p_detalle` (⚙ DT-27) | `[{vendedor_id, vendedor, notas, ventas_contado, ventas_credito, cobranzas, reembolsos, ingreso, detalle?}]` (con `p_detalle`: las notas del período de cada vendedor) |
| `eecc_consolidado` | `p_fecha_corte, p_regional_id, p_categoria` | `jsonb` (§6.2) — **solo nacional** |
| `reporte_top_clientes` | `p_desde, p_hasta, p_regional_id, p_vendedor_id, p_categoria, p_limite` | `[{cliente_id, cliente, regional, categoria, ventas_netas, notas}]` |
| `reporte_productos_vendidos` | `p_desde, p_hasta, p_regional_id, p_linea_id, p_vendedor_id, p_limite` | `[{producto_id, producto, linea, unidades, bs_netos}]` |
| `reporte_rotacion` | `p_regional_id, p_desde, p_hasta` | `[{producto_id, producto, linea, vendidas, stock_inicial, stock_final, stock_promedio, rotacion, dias_inventario}]` |
| `reporte_ventas_regional` | `p_desde, p_hasta` | `[{regional_id, regional, mes, ventas_netas}]` |
| `reporte_movimiento_periodo` | `p_regional_id, p_desde, p_hasta` | `{regional, desde, hasta, columnas_extra, lineas, pie}`: la matriz de `reporte_liquidacion` con cada cantidad también en Bs (`saldo_inicial_bs`, `pedido_bs`, `traspaso_bs`, `devolucion_bs`, `ajuste_bs`, `saldo_final_bs`; ventas en Bs cobrados) y `pie` + `cobranzas`, `reembolsos` del rango (⚠ SUP-54, ⚙ DT-32) |
| `cumplimiento_presupuesto` | `p_periodo, p_regional_id` | `[{presupuesto_id, periodo, regional, vendedor, categoria, meta, real, cumplimiento_pct, proyeccion, estado, regional_id, vendedor_id, observaciones}]` (ids para editar la meta, ⚙ DT-29) |
| `dashboard_kpis` ● | `p_regional_id`, `p_desde?`, `p_hasta?` (⚙ DT-23; sin ellos, el mes en curso hasta hoy) | `{ventas_hoy, ventas_periodo, variacion_pct, serie: [{fecha, ventas}], cxc?: {saldo, vencido}}` (`cxc` solo para el nacional; `serie` = ventas netas por día del período, para el mini gráfico del KPI, ⚙ DT-21; `ventas_hoy` y `cxc` no dependen del período). Los contadores salen de `avisos_shell` y el % de presupuesto de `cumplimiento_presupuesto`: el frontend no los pide dos veces |
| `avisos_shell` ● | `p_regional_id` (null = todas las que puede leer) | `{bajo_minimo, notas_sin_factura, dias_pendientes: [{regional_id, fecha, notas_sin_factura}]}`. `dias_pendientes` = liquidaciones abiertas con fecha < hoy. **Un solo request** para los badges del menú, la campana, el BannerDia y los contadores del dashboard |

**Implementación (BE-20 a BE-22):**
- Ventas netas (top clientes, ventas por regional, presupuesto, dashboard) = notas emitidas del período − devoluciones **con fecha** en el período, atribuidas a la nota original (⚙ DT-31, `app.ventas_netas`).
- Alcance: `p_regional_id = null` → las regionales que el usuario lee. `reporte_ventas_regional` también (el regional ve solo las suyas, ⚙ DT-33). `eecc_consolidado` responde `SOLO_NACIONAL` a un regional; `reporte_movimiento_periodo`, igual que `reporte_liquidacion`, responde `NO_AUTORIZADO` con una regional ajena; el resto devuelve vacío.
- Las que recorren ítems (`reporte_productos_vendidos`, `app.ventas_netas`, `app.documentos_por_cobrar`) son `security definer` acotadas a `app.mis_regionales()`, por rendimiento (⚙ DT-39); el resto, `security invoker`.
- Rango invertido (`p_desde > p_hasta`) en `reporte_movimiento_periodo` y `dashboard_kpis` → `VALIDACION` (`{campo: 'desde', motivo: 'rango_invalido'}`).
- `p_limite` de los "top": 10 por defecto (el frontend pide 50). `reporte_top_clientes.regional` es el código (`LP`).
- `reporte_rotacion`: solo productos con algún valor en el período (⚙ DT-34).
- `cumplimiento_presupuesto`: `p_periodo` nulo → el mes en curso; `proyeccion` nula si no transcurrió ningún día; mes futuro y orden en ⚙ DT-35.
- `dashboard_kpis.variacion_pct` nula si el período anterior no tuvo ventas (⚙ DT-36). `cxc` sale de `app.documentos_por_cobrar` a hoy.
- `v_auditoria` (⚙ DT-37): `usuario_nombre = 'Sistema'` sin usuario; `id` es numérico (bigint).

### 6.1 — Forma de `reporte_liquidacion`

Implementación (BE-18):
- `security definer`, con control explícito de `puede_leer_regional` (`NO_AUTORIZADO`).
- Día abierto: se calcula en vivo. Día cerrado: lee el snapshot y los totales guardados.
- Los números salen con 2 decimales, también los ceros (`0.00`).
- `cobranzas` lista solo las vigentes; `documento` es `LP-0399 / F-1420`, o `Saldo inicial F-…` para la cartera inicial.
```json
{
  "regional": { "id": "…", "codigo": "LP", "nombre": "La Paz" },
  "fecha": "2026-06-11",
  "estado": "abierta",
  "cerrada_por": null, "cerrada_en": null, "ultimo_cerrado": "2026-06-10",
  "columnas_extra": { "devolucion": false, "ajuste": false },
  "lineas": [
    { "linea_id": "…", "linea": "COMRURAL", "orden_linea": 1,
      "productos": [
        { "producto_id": "…", "producto": "QUINUA TRICOLOR 1 KG", "orden": 2, "precio_unit": 44.00,
          "saldo_inicial": 15, "pedido": 0, "traspaso": 0, "devolucion": 0, "ajuste": 0,
          "venta_contado_q": 9, "venta_contado_bs": 396.00, "venta_credito_q": 6, "venta_credito_bs": 264.00,
          "total_ventas_q": 15, "total_ventas_bs": 660.00, "saldo_final": 0, "con_movimiento": true } ] } ],
  "pie": { "contado_bruto": 3075.40, "credito_bruto": 1224.60, "descuento_contado": 0, "descuento_credito": 0,
           "contado_neto": 3075.40, "credito_neto": 1224.60, "total_ventas": 4300.00 },
  "arqueo": { "contado": 3075.40, "credito": 1224.60, "cobranzas": 0, "reembolsos": 0,
              "total_ventas": 4300.00, "total_efectivo": 3075.40,
              "cobranzas_por_forma": [{ "forma_pago": "efectivo", "importe": 0 }] },
  "notas": [ { "id": "…", "numero": "LP-0412", "numero_factura": "F-1462", "cliente": "…", "vendedor": "…",
               "condicion": "contado", "total": 270.00, "estado": "emitida" } ],
  "subtotales_notas": { "contado": 3075.40, "credito": 1224.60, "total": 4300.00, "cantidad": 4 },
  "cobranzas": [ { "id": "…", "numero": "CB-LP-0031", "cliente": "…", "documento": "LP-0399 / F-1420",
                   "forma_pago": "transferencia", "referencia": "…", "importe": 500.00 } ],
  "devoluciones": [ { "id": "…", "numero": "DEV-LP-0002", "nota": "LP-0380", "cliente": "…",
                      "tipo_reverso": "reembolso", "importe": 120.00 } ],
  "validaciones_cierre": { "dias_anteriores_abiertos": [], "notas_sin_factura": [ { "id": "…", "numero": "LP-0410", "cliente": "…", "total": 412.50 } ] }
}
```

### 6.2 — Forma de `eecc_consolidado`
```json
{
  "fecha_corte": "2026-06-11",
  "columnas": [ { "clave": "anterior", "etiqueta": "2025" }, { "clave": "2026-01", "etiqueta": "ENERO" }, "…",
                { "clave": "2026-06", "etiqueta": "JUNIO" } ],
  "kpis": { "saldo_total": 703749.52, "vencido": 0, "clientes_con_saldo": 0, "clientes_en_mora": 0 },
  "grupos": [
    { "regional": "LA PAZ", "categoria": "supermercado",
      "clientes": [ { "cliente_id": "…", "cliente": "HIPERMAXI LP", "vendedor": "…",
                      "saldos": { "anterior": 0, "2026-01": 0, "…": 0, "2026-06": 17552.52 },
                      "total": 17552.52, "vencido": 0, "max_dias_mora": 0 } ],
      "subtotal": { "anterior": 0, "…": 0, "total": 201015.92 } } ],
  "total_general": { "anterior": 5671.80, "…": 0, "total": 703749.52 }
}
```

Implementación (BE-20, ⚙ DT-38): `p_fecha_corte` nula → hoy; `saldos` y `subtotal` traen todas las columnas (0.00 si no hay saldo); grupos por regional y categoría (supermercado, mayorista, minorista, institucional), clientes por nombre. Saldo, vencido y mora, a la fecha de corte (cobranzas y abonos con fecha ≤ corte, `app.documentos_por_cobrar`).

---

## 7 — Storage (PDF de factura)

| PASO | LLAMADA |
|---|---|
| Subir | `supabase.storage.from('facturas').upload(\`${regional_id}/${nota_id}.pdf\`, file, { upsert: true, contentType: 'application/pdf' })` |
| Vincular | `rpc('registrar_factura_nota', { p_nota_id, p_numero_factura, p_factura_pdf_path: \`${regional_id}/${nota_id}.pdf\` })` |
| Ver | `supabase.storage.from('facturas').createSignedUrl(path, 60)` |

- Límite: 10 MB, solo `application/pdf` (el bucket lo rechaza; la UI valida antes).
- Si `registrar_factura_nota` falla después de subir, el archivo queda en la ruta, pero la nota no lo referencia. Se puede reintentar sin problema, porque la ruta es la misma.

---

## 8 — Edge Function `admin-usuarios` (solo nacional)

`POST {SUPABASE_URL}/functions/v1/admin-usuarios`, con el header `Authorization: Bearer <JWT del usuario>` (lo pone `supabase.functions.invoke`).

| ACCIÓN | BODY | RESPUESTA 200 |
|---|---|---|
| `crear` | `{ "accion": "crear", "nombre": "Vanessa …", "email": "…", "rol": "regional", "regionales": ["<uuid LP>", "<uuid CBBA>"], "password_temporal": "…" }` | `{ "usuario": { id, nombre, email, rol, activo, regionales } }` |
| `actualizar` | `{ "accion": "actualizar", "id": "…", "nombre"?, "rol"?, "regionales"? }` | ídem |
| `desactivar` / `reactivar` | `{ "accion": "desactivar", "id": "…" }` | ídem |
| `resetear_password` | `{ "accion": "resetear_password", "id": "…", "password_temporal": "…" }` | `{ "ok": true }` (marca `debe_cambiar_password = true`) |

**Errores** (status + `{ "error": { "codigo", "mensaje" } }`):
- `401`: sin JWT o vencido (`SESION_VENCIDA`).
- `403`: `SOLO_NACIONAL`.
- `409`: `DUPLICADO` (correo) o `ULTIMO_NACIONAL`.
- `422`: `VALIDACION` (contraseña < 8 caracteres, regional sin regionales, nacional con regionales).

La respuesta de `usuario` incluye también `debe_cambiar_password`.

Desactivar también corta las sesiones del usuario. Se hace con un ban en auth (`ban_duration`): ya no puede ingresar ni renovar el token, y el JWT que todavía tenga vigente no lee nada por la RLS (`usuario_activo()`). Reactivar quita el ban. `auth.admin.signOut` no sirve para esto, porque pide el JWT del usuario y no su id.

---

## 9 — Qué actualizar después de cada escritura (TanStack Query)

● Regla general: se actualiza **solo lo que la operación cambió**.
- Si la RPC devuelve el objeto, se escribe en la caché (`setQueryData`) sin pedirlo otra vez.
- Si no, se invalida solo la consulta afectada.
- **Nunca** se recarga todo tras una mutación (patrón "ejecutar → recargar todo" prohibido).
- Lo que no está en pantalla se marca como viejo (`invalidateQueries` con `refetchType: 'none'`): se vuelve a pedir recién cuando se abre.

| DESPUÉS DE | ACTUALIZAR CON LA RESPUESTA | INVALIDAR (solo esas claves) |
|---|---|---|
| ingreso / salida / retorno / ajuste / traspaso | — | `['stock', regional]`, `['movimientos', regional]`, `['liquidacion', regional, fecha]` (en el traspaso, también la regional destino), `['avisos', regional]` |
| emitir nota | la nota nueva en la caché `['nota', id]` | `['notas', regional]` (página 1), `['stock', regional]`, `['liquidacion', regional, fecha]`, `['hoja-carga', regional, fecha]`, `['avisos', regional]` |
| anular nota | el estado en `['nota', id]` y en la fila de la página visible de `['notas', …]` | `['stock', regional]`, `['liquidacion', regional, fecha]`, `['hoja-carga', regional, fecha]` |
| factura / PDF | `numero_factura` y `factura_pdf_path` en `['nota', id]` y en la fila de la lista | `['avisos', regional]` (contador sin factura) |
| devolución | — | `['nota', id]`, `['devoluciones', regional]`, `['stock', regional]`, `['liquidacion', regional, hoy]`, `['saldos-cliente', cliente]` |
| cobranzas / anular cobranza | — | `['saldos-cliente', cliente]`, `['liquidacion', regional, fecha]`, `['nota', id]` de cada documento |
| cerrar / reabrir | el estado en `['liquidacion', regional, fecha]` | `['liquidaciones', regional]`, `['avisos', regional]` |
| maestros (alta/edición) | la fila en la lista visible | — |
| activar/desactivar (toggle) | **optimista** con rollback y toast si falla (p. ej. `VENDEDOR_CON_SALDO`) | — |

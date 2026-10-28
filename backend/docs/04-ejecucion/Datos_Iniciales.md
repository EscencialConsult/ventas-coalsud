ESENCIAL CONSULTORA · EJECUCIÓN DEL PROYECTO

# Datos Iniciales y Carga de Puesta en Marcha — COALSUD S.R.L.
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

Define:
1. los datos **semilla** que necesita cualquier entorno;
2. los datos **de prueba** (solo local/dev);
3. la **carga inicial real** de producción (CU-12, BE-23).

---

## 1 · Datos base (todos los entornos) — migración `datos_base`

### 1.1 — Regionales y almacenes
| CÓDIGO | REGIONAL | ALMACÉN |
|---|---|---|
| LP | La Paz | Almacén La Paz |
| CBBA | Cochabamba | Almacén Cochabamba |
| SCZ | Santa Cruz | Almacén Santa Cruz |

> Todo §1 (regionales, almacenes, condiciones y líneas) se inserta con la **migración de datos** `20261027194041_datos_base.sql`, en todos los entornos: llega a dev y prod con `db push` y el `codigo` de cada regional queda fijo desde el día 1. Son datos reales; ninguna migración lleva datos de prueba ([Estructura del Backend §2](Estructura_Backend.md)).

### 1.2 — Condiciones de pago (⚠ SUP-25)
| ORDEN | NOMBRE | TIPO | DÍAS |
|---|---|---|---|
| 1 | Contado | contado | 0 |
| 2 | Crédito 15 días | credito | 15 |
| 3 | Crédito 30 días | credito | 30 |
| 4 | Crédito 60 días | credito | 60 |
| 5 | Crédito 90 días | credito | 90 |

### 1.3 — Líneas comerciales (⚠ SUP-43), en el orden de la planilla F3
| ORDEN | LÍNEA | PRODUCTOS EN F3 |
|---|---|---|
| 1 | COMRURAL | 29 |
| 2 | ASOVITA | 9 |
| 3 | LA Y SAA | 4 |
| 4 | IPEL | 22 |
| 5 | SULINO | 1 |
| 6 | ALCAFOOD | 15 |
| 7 | PLASTIOLED | 29 |
| 8 | KADO | 7 |
| 9 | COMRURAL GRANEL | 4 |
| 10 | HUGGIES | 4 |
| 11 | BITS CREAM | 0 (de RF06) |
| 12 | CONGELADOS | 0 (de RF06) |

---

## 2 · Catálogo de la planilla F3 (base para `seeds/10_catalogo_f3.sql` y para la carga real)

Nombres tal cual figuran en "Resumen de Reporte de Ventas" del 11/06/2026, en su orden.

> **Precios:** la planilla tiene precios promedio calculados, no de lista. En dev se usan como **precios de prueba**. Para producción, el nacional carga la **lista de precios vigente** del cliente (pregunta 12 del [Registro de Supuestos §3](../01-requerimiento/Registro_de_Supuestos.md)). Los únicos precios verificados con cantidad × precio = Bs en F3 son: Quinua Tricolor 1 kg = 44, Quinua Blanca 1 kg = 44, Quinua Blanca 400 gr = 18 y Barra de Chocolate 30 gr = 4.5.

**COMRURAL:** CHIA 200GR · QUINUA TRICOLOR 1 KG · QUINUA BLANCA 1KG · QUINUA BLANCA 400GR · QUINUA BLANCA 300GR · QUINUA ROJA 1KG · QUINUA ROJA 400GR · QUINUA ROJA 300GR · QUINUA NEGRA 1KG · QUINUA NEGRA 400GR · QUINUA NEGRA 300GR · POP DULCE 1 KG · POP DULCE 500GR · POP S/AZUCAR 250GR · POP DULCE 20GR · POP CHOCOLATE 30GR · HARINA -QUINUA 300GR · QUINUA INSTANTANEA 150GR · HOJUELA DE QUINUA 250GR · CARNE DE QUINUA 160GR · JUGO QUINUA MANZANA 300ML · JUGO DE DURAZNO 300ML · MEZCLA P/APANAR 80GR · BARRA DE CHOCOLATE 30GR · BARRA DE CHOCOLATE BLANCO 30GR · BARRA DE QUINUA CHOCOLATE PACK DE 4 · BARRA DE QUINUA CHOCOLATE BLANCO PACK DE 4 · BARRA DE QUINUA MIX PACK DE 4 · POP DE 20GR SIX PACK

**ASOVITA:** API MORADO 200GR · API AMARILLO 200GR · TOJORI · API MORADO DE 1KG · API AMARILLO DE 1KG · AJI AMARILLO 200GR · AJI AMARILLO DE 50GR · AJI ROJO DE 200GR · AJI ROJO DE 50GR

**LA Y SAA:** FIFITOS 360GR · FIFITOS 150GR · FRUTIQUINS 150GR · CHOCOQUINS 150GR

**IPEL:** NESS X 16R H-DOBLE · NESS X 12R H-DOBLE · NESS X 4R H-DOBLE · NESS X4R H-SIMPLE · NESS X 4R H-SIMPLE · QUALITE X 32R H-DOBLE · QUALITE X 16R H-DOBLE · QUALITE X 12R H-DOBLE · QUALITE X 4R H-DOBLE · NATURALEZA X 4R HSIMPLE · NOBBY 2R HDOBLE X60 · NATURALEZA 2R HOBLEX50 · NATURALEZA 6R HOBLEX50 · PAÑUELOS DESECHABLES NESS · SERV.NOBBY NG GRANDE PREMIUM · SERV.NOBBY NG PEQUEÑO PREMIUM · SERV.NOBBY RJ GRANDE SIMPLE · SERV.NOBBY RJ PEQUEÑO SIMPLE · TOALLA TRENDS · SUPER PEL · PH RENOVA 10X250 DH EXTRA LUJO · PAPEL TOALLA NOBBY FIT AZUL

**SULINO:** SULINO

**ALCAFOOD:** PURE DE PAPAS TRADICIONAL 1 KG · PURES DE PAPA TRADICIONAL 250 GR · PURE DE PAPAS TRADICIONAL 125 GR · PAPAS GRATINADAS 133 G · PURE SABOR CIBOULETTE 125 GR · PURE SABOR 4 QUESOS 125 GR · PURE SABOR MERKEN 125 GR · PURE SABOR MEDITERRANEO 125 GR · PURE PARA UNO TRADICIONAL C/CARNE 47,5 G · PURE PARA UNO TRADICIONAL C/POLLO 49.5G · PURE PARA UNO SABOR MERKEN C/POLLO 47,5GR · PURE PARA UNO 4 QUESOS 47.5GR · CAZUELA PARA UNO C/CARNE 47,5G · AVENA PARA UNO CON LECHE Y BERRIES · AVENA PARA UNO CON LECHE PASAS Y ALMENDRAS 66 G

**PLASTIOLED:** TOMATODO OLA KIDS PP 300CC · TOMATODO OLA MEDIANO 520 CC · TOMATODO SQUARE 72 COVER · HERMET. CUADRADO 1250CC · HERMET. REDONDO 800 CC · KIT N° 03: BOTELLA MEDIANA + 2 HER · HERMET. CUADRADO 4LT · HERMET. CUADRADO 2LT · HERMET. REDONDO 200CC · (74035) BOTELLA CHICA+HERMET · HERMETICO CUADRADO 970 CLEAR · TOMATODO GALAXIA · HERMETICO CUADRADO 850CC C/ALD · HERMETICO CUADRADO 6 LT · HERMETICO REDONDO 800 CC (CLEAR) · KIT FUNCIONAL + HER · COD 80023 DESPENSERO 1PISO · COD 71083 TOMATODO MAMILA · COD 71074 TOMATODO SPA · COD 71038 TOMATODO BOTELLA 300 CC · COD 74107 PORTA CUBIERTOS · COD 80041 TOMATODO CRISS 550 CON ASA · COD 80043 TOMATODO GOOGLE 340CC · COD 71003 TOMATODO 420CC · COD 74012 TAPER HERM CUADRADO 10 LITROS · COD 74058 HERM BARRIELITO · COD 80061 HERM.CESTO · COD 71004 HEAVENLY MEDIANA 500CC · COD 74061 HERM CUADRADO 850CC

**KADO:** EDULCORANTE KADO MIX 100ML · EDULCORANTE KADO MIX 250ML · EDULCORANTE KADO SUCRALOSA 100ML · EDULCORANTE KADO SUCRALOSA 250ML · EDULCORANTE KADO STEVIA+SUCRALOSA 100ML · EDULCORANTE KADO STEVIA+SUCRALOSA 250ML · EDULCORANTE KADO MIX DISPLAY 50 SOBRES

**COMRURAL GRANEL:** QUINUA BLANCA ORGANICA POR 1 KINTAL · QUINUA GRANEADA POR 1KG · HOJUELA DE QUINUA QUINTAL · POP SIN AZUCAR 10KG

**HUGGIES:** HUGGIES SHAMPOO MANZANILLA 200ML · HUGGIES SHAMPOO EXTRA SUAVE VERDE 200ML · HUGGIES SHAMPOO MANZANILLA 600ML · JAVONCILLO HUGGIES

`seeds/10_catalogo_f3.sql` carga estos 124 productos (precios de prueba con la misma fórmula que los fixtures del frontend; `NESS X 4R H-SIMPLE` inactivo, por duplicado). Como corre después de las migraciones, cada alta queda en `auditoria` como `crear` del sistema (`usuario_id` nulo), igual que en la carga inicial real.

Observaciones para el cliente:
- "NESS X 4R H-SIMPLE" y "NESS X4R H-SIMPLE" parecen el mismo producto, duplicado.
- Los productos de PLASTIOLED con "COD …" tienen código propio: se carga en `producto.codigo`.

---

## 3 · Datos de prueba (solo local/dev)

| ARCHIVO | CONTENIDO |
|---|---|
| `seeds/20_usuarios_prueba.sql` | `irene@coalsud.demo` (nacional), `ingeniero@coalsud.demo` (nacional), `vanessa@coalsud.demo` (regional LP + CBBA), `fernando@coalsud.demo` (regional SCZ). Contraseña `Prueba123!`, `debe_cambiar_password = false`. Cuenta de auth con login por email (`auth.users` + `auth.identities`) |
| `seeds/20_usuarios_prueba.sql` | Vendedores: LP → Flavia Rivera, Arturo Reynaga, Martha Canedo · CBBA → Jorge León · SCZ → Mario Condori, Sheila, Marcela (nombres de F1/F3/F5, ficticios para pruebas) |
| `seeds/20_usuarios_prueba.sql` | Clientes, los mismos de los fixtures del frontend: LP → Hipermaxi La Paz, Andys, Macro Abasto, Mi Super, Tienda Rosita · CBBA → Hipermaxi Cochabamba, Super America · SCZ → Fidalga S.A. SCZ, Clínica Foianini (con vendedor, condición, categoría y canal) |
| `seeds/30_escenario_f3.sql` | Caso dorado ([Estrategia de Pruebas §5](Estrategia_de_Pruebas.md)) |
| `scripts/volumen.sql` | Volumen para rendimiento (BE-22). Va **fuera** de `seeds/`, para que `db reset` no lo cargue siempre |

`db reset` carga todo `supabase/seeds/*.sql` en orden alfabético (`config.toml` → `[db.seed] sql_paths`), después de las migraciones.

---

## 4 · Carga inicial de producción (CU-12 · BE-23)

### 4.1 — Secuencia
| # | PASO | QUIÉN | CÓMO | CONTROL |
|---|---|---|---|---|
| 1 | Regionales, almacenes, condiciones y líneas | Esencial | Migración de datos | Lista §1 |
| 2 | Usuarios reales (Irene, ingeniero, Vanessa, Fernando) | Nacional | Pantalla Usuarios | Cada uno entra y cambia su contraseña |
| 3 | Productos con precio de lista y mínimo | Nacional (o Esencial por planilla) | `productos.csv` → `importar.mjs` | El nacional revisa el listado |
| 4 | Vendedores por regional | Regionales | Pantalla o `vendedores.csv` | |
| 5 | Clientes por regional | Regionales (o Esencial por planilla) | `clientes.csv` | Sin duplicados por nombre |
| 6 | Fecha de corte = día **D0** (el anterior al arranque) | Todos | Acuerdo con el cliente | |
| 7 | Inventario inicial al cierre de D0 (conteo físico por almacén; si hay vendedores con mercadería, también por vendedor) | Regionales | `inventario_inicial.csv` → ajuste `inventario_inicial` con fecha D0 | Coincide con el conteo |
| 8 | Cartera inicial a D0 (documentos pendientes por cliente) | Nacional | `cartera_inicial.csv` → `cargar_cartera_inicial` | Total = "Saldo actual" de los EECC a D0 |
| 9 | Cerrar D0 en cada regional | Regionales | Pantalla Liquidación | El reporte de D0+1 arranca con el saldo inicial = conteo |

### 4.2 — Plantillas CSV (UTF-8, separador `;`, decimales con punto)
| ARCHIVO | COLUMNAS (obligatorias en **negrita**) |
|---|---|
| `productos.csv` | **linea**, **nombre**, codigo, **precio_base**, stock_minimo, orden |
| `vendedores.csv` | **regional_codigo**, **nombre**, telefono |
| `clientes.csv` | **regional_codigo**, **nombre**, razon_social, nit, **categoria**, **canal**, vendedor_nombre, **condicion_pago**, zona, telefono, email, direccion |
| `inventario_inicial.csv` | **regional_codigo**, **producto_nombre**, vendedor_nombre (vacío = almacén), **cantidad** |
| `cartera_inicial.csv` | **regional_codigo**, **cliente_nombre**, **numero_documento**, **fecha_documento**, fecha_vencimiento, **importe**, observaciones |

`importar.mjs` valida todo el archivo antes de insertar: referencias existentes, categorías válidas, sin duplicados, importes > 0. Si hay un error, informa las filas y **no inserta nada**.

### 4.3 — Cartera inicial desde los EECC (F4, F5)
Los EECC del cliente traen el saldo por **mes de origen**, no por documento. Si el cliente no puede entregar el detalle por documento:
- se carga **un documento por cliente y mes** con `numero_documento = 'SALDO-<AAAA-MM>-<cliente>'` y `fecha_documento` = día 1 de ese mes;
- se mantiene así la columna de origen del EECC;
- la columna "2025" se carga con fecha 01/12/2025.

Queda registrado como ⚠ SUP-24.

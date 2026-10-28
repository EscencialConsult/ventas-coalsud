ESENCIAL CONSULTORA · FRONTEND

# Sistema de Diseño — COALSUD
**v1.2 · 27/10/2026**

Esencial Consultora — El Alto / La Paz, Bolivia

La identidad visual sale de la **demo aprobada por el cliente** (F1, `Desktop/Coalsud/index (2).html`, "ONE Comercial — COALSUD SRL") (⚙ DT-11). Se traduce a tokens de Tailwind 4 en `src/index.css`, con el mismo patrón `@theme` que usa la referencia `comrural/src/index.css`.

La **v1.2** (⚙ DT-20) mantiene la marca y la enriquece: escalas de color, lienzo gris cálido detrás de las cards, botones con relieve suave, densidad media, animaciones funcionales (⚙ DT-19) y gráficos SVG propios (⚙ DT-16). La tipografía pasa a **Inter con cifras tabulares** (⚙ DT-22).

- **Tema:** solo claro (RNF-23).
- **Tono:** sobrio y profesional. **Sin** neón, brillos, reflejos que barren el botón, degradados llamativos ni glow. La profundidad sale de sombras cortas y del relieve de los controles.
- **Densidad:** media. Herramienta de oficina con tablas largas: textos de 12–14 px, cifras grandes en los KPIs.
- **Poco texto:** cada dato se dice una vez (sin repetir título ni contexto entre topbar y página); sin textos que expliquen la etiqueta; lo secundario va debajo del dato al que acompaña, en gris; nada de referencias internas (SUP, DT, tareas) en pantalla.

---

## 1 · Tokens

```css
@theme {
  /* Marca */
  --color-rojo: #c8401a;          /* acción primaria, acentos, números destacados */
  --color-rojo-2: #d94b22;        /* hover de primaria, activo del sidebar */
  --color-rojo-3: #a8341a;        /* primaria presionada */
  --color-naranja: #d96518;
  --color-dorado: #c48a14;        /* detalle del logo, presupuesto */
  --color-rojo-tenue / --color-naranja-tenue / --color-dorado-tenue   /* fondos de chips */

  /* Superficies */
  --color-lienzo: #f3f3f1;        /* fondo de la app, detrás de las cards */
  --color-fondo: #ffffff;
  --color-fondo-2: #fafafa;       /* campos, cabecera de tabla, hover de fila */
  --color-fondo-3: #f4f4f4;
  --color-superficie: #ececec;    /* botón secundario, pistas de barras */
  --color-borde: #e4e4e2;
  --color-borde-2: #cfcfcc;
  --color-sidebar: #181818;  --color-sidebar-2: #222222;

  /* Texto */
  --color-texto: #141414;  --color-texto-2: #4f4f4f;  --color-texto-3: #767676;   /* el gris más claro con AA sobre blanco */

  /* Estados (texto / fondo tenue) — sin cambios desde v1.0 */
  --color-ok / -ok-fondo · --color-error / -error-fondo · --color-info / -info-fondo · --color-alerta / -alerta-fondo

  /* Tipografía */
  --font-sans: 'Inter';                 /* todo el texto; montos y cantidades con `tabular-nums` */
  --font-marca: 'Plus Jakarta Sans';    /* solo el logotipo y el titular del login (800) */
  --font-mono: ui-monospace…            /* solo el detalle técnico de errores */
  --text-micro: 10px;  --text-mini: 11px;  --text-chico: 12px;  --text-cuerpo: 13px;  --text-medio: 14px;
  --text-subtitulo: 15px;  --text-cifra: 20px;  --text-titulo: 22px;  --text-kpi: 24px;  --text-portada: 30px;

  /* Forma */
  --radius-card: 14px;  --radius-control: 9px;

  /* Profundidad */
  --shadow-card          /* cards: sombra corta y difusa */
  --shadow-elevado       /* desplegables, modales, toasts, hover de KPI */
  --shadow-relieve       /* botones al reposo: luz arriba-izquierda, sombra abajo-derecha */
  --shadow-relieve-alto  /* botones en hover */
  --shadow-hundido       /* botones presionados o con su panel abierto; campos y pistas (sombra interior) */
  --shadow-hundido-marca /* botones de color presionados; pista activa del interruptor */
  --shadow-pista         /* pista del interruptor (hundido chico) */
  --shadow-perilla       /* perilla del interruptor (relieve chico) */

  /* Layout */
  --spacing-sidebar: 248px;  --spacing-sidebar-mini: 72px;  --spacing-topbar: 60px;
}
```

Utilidades propias: `animar-entrada` (aparece 4 px hacia arriba), `scroll-fino` y `scroll-fino-oscuro` (barras de scroll finas).

Fuentes: Google Fonts, `Inter` (400–700) y `Plus Jakarta Sans` (solo 800), cargadas en `index.html` con `display=swap`.

**Por qué Inter y no una monoespaciada para los números (⚙ DT-22):** en una mono cada dígito, coma y punto ocupa lo mismo, y los montos se ven anchos y pesados. Inter con `tabular-nums` mantiene los números alineados en columna con un trazo más liviano.

---

## 2 · Tipografía

| USO | TOKEN / PESO | EJEMPLO |
|---|---|---|
| Título de página | `text-titulo` / 700, tracking ajustado | "Liquidación Diaria de Ventas" |
| Subtítulo de página | `text-cuerpo`, `texto-3` | "La Paz · Octubre 2026" |
| Título de card | `text-subtitulo` / 600 | "Historial de notas de venta" |
| Etiqueta de campo | `text-chico` / 600, `texto-2` (sin mayúsculas) | "Cliente *" |
| Texto de tabla | `text-cuerpo` / 400–500 | |
| Encabezado de tabla | `text-mini` / 600, mayúsculas, `texto-3` | |
| KPI | `text-kpi` / 600, `tabular-nums` (compacto: `text-cifra`); unidad (`Bs`, `%`) más chica y en gris; montos **redondeados a enteros** | `Bs 198,420` |
| Badges | `text-mini` / 600 | |
| Montos y números de documento | `tabular-nums`, a la derecha (montos); en tablas y documentos con 2 decimales y `Bs` en gris (`MontoBs`) | `LP-0412` · `Bs 1,224.60` |
| Dato secundario de una celda | `text-chico`, `texto-3`, debajo del principal (`DosLineas`) | `27/10/2026 · F-1465` |

---

## 3 · Layout

```
┌────────────────┬──────────────────────────────────────────────────────────────────────────────┐
│ COALSUD    [⇤] │ [📍 La Paz ▾ │ 📅 27/10/2026]                          [+ Nuevo ▾] [🔔] │ [VN ▾] │
├────────────────┼──────────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR 248px  │ BannerDia (si aplica)                                                        │
│ (72px          ├──────────────────────────────────────────────────────────────────────────────┤
│  compacto)     │ CONTENIDO sobre `lienzo` (padding 16–24 px, máx. 1600 px)                     │
│ #181818        │   page-head (título + contexto + acciones)                                   │
│                │   [KPIs]                                                                     │
│ Grupos         │   [Cards]   ← separación uniforme de 16 px (Pagina)                          │
│ (los de un     │                                                                              │
│  solo ítem sin │                                                                              │
│  título)       │                                                                              │
│ usuario  ⏻     │                                                                              │
└────────────────┴──────────────────────────────────────────────────────────────────────────────┘
```

**Topbar (60 px, blanco):**
- **Izquierda — contexto de operación** (`ContextoOperacion`): pista hundida con la regional activa (pastilla en relieve, elegible; su desplegable se ancla al bloque entero) y la fecha de operación del servidor (desde 768 px). En las rutas con `handle.filtroPeriodo` (hoy, solo el dashboard) suma el **filtro de período** (`FiltroPeriodo`, ⚙ DT-23): botón de ajustes que abre un modal con atajos y calendario; con un filtro aplicado, la fecha se reemplaza por una pastilla roja con el período y un ✕ para quitarlo. El modal tiene, de arriba abajo: atajos (`Segmentado` chips), los extremos *Desde → Hasta* con la cantidad de días (resaltado el que define el próximo clic) y el calendario de dos meses (uno en móvil); pie: Quitar filtro · Cancelar · Aplicar. Debajo de 1024 px va precedido por ☰ y, desde 640 px, por el logo.
- **Sin ruta ni título en el topbar:** el título está en la página (`Pagina`) y en la pestaña del navegador (`"Notas de venta — COALSUD"`, desde `handle.titulo` de la ruta).
- **`+ Nuevo`** (`AccionesRapidas`): nota de venta, registrar cobro, ingreso a almacén y traspaso, filtrados por permiso (`ACCIONES_RAPIDAS` en `navegacion.ts`). Si el usuario no puede ninguna, no aparece. En móvil, solo el ícono.
- **Avisos** (campana) y **avatar** (menú de usuario).
- Al bajar la página, el borde inferior se cambia por una sombra corta (`useDesplazado`).

**Sidebar:** arriba, el logo con un ícono chico para contraer (⇤). Contraído, el logo es el botón para expandir: al pasar el mouse o con el foco muestra el ícono de expandir.

Diseño **mobile-first**: las clases base son para móvil y se amplía con `sm:` / `md:` / `lg:`.

| ANCHO | COMPORTAMIENTO |
|---|---|
| ≥ 1280 px (PC/notebook, objetivo principal RNF-19) | Sidebar fijo + contenido; el usuario puede contraerlo a solo íconos con el botón junto al logo (se recuerda en el navegador, con tooltip en cada ítem) |
| 1024–1279 px | Igual. La liquidación y el EECC (tablas muy anchas) con scroll horizontal dentro de su card y la primera columna fija (`sticky left-0`) |
| < 1024 px | Sidebar como drawer animado (botón ☰ en el topbar; cierra con Esc, con el fondo o al navegar) |
| < 768 px | **Sin scroll horizontal:** cada fila de tabla colapsa a una card (`Tabla`); filtros a 100 % de ancho; formularios a 1 columna; los modales suben desde abajo; el selector de regional muestra el código (LP) y la fecha se oculta |

---

## 4 · Componentes (`shared/ui`)

| COMPONENTE | VARIANTES / PROPS | NOTAS |
|---|---|---|
| `Button` | `primario`, `secundario`, `peligro`, `exito`, `opcion` (tarjeta seleccionable); sin variante plana (todo botón va en relieve, §8); `tam="sm" \| "md" \| "lg"`; `cargando`; `icono` | **Tres estados** (regla 33): hover (fondo + relieve más marcado), pressed (**sombra interior + oscurecer**: el botón se hunde) y loading (`Spinner` centrado, texto invisible para no cambiar el ancho, `disabled`, `aria-busy`). Si `onClick` devuelve una promesa, el loading es automático (`useAccionAsync`) |
| `BotonEnlace` | Mismas variantes y tamaños que `Button` (salvo `opcion`); `a` | Navegación con aspecto de botón. Misma implementación de variantes (regla 13) |
| `BotonIcono` | `relieve` (por defecto; `tam="md" \| "lg"`, la campana es `lg`), `interno` (pastilla blanca dentro de un campo o pista hundida), `oscuro` (sidebar), `marca` (dentro de una pastilla roja); `etiqueta` obligatoria; `ladoTooltip`, `sinTooltip` | Mismos tres estados; se hunde también mientras su panel está abierto (`aria-expanded`). La `etiqueta` es el nombre accesible y el texto del tooltip propio (no el `title` nativo) |
| `Spinner` | `tam` | Aro que gira, toma el color del texto |
| `Input`, `Select`, `Textarea` | `label`, `error`, `requerido`, `ayuda`; `Input`: `icono` (izquierda), `sufijo` (botón `interno` a la derecha); `labelSoloMovil` (filas con encabezado: la etiqueta se ve solo en móvil); `Select`: `opciones`, `valor`, `alCambiar`, `placeholder` (con `useFormulario().seleccion(campo)`) | Campo hundido (`CAMPO` de `neumorfismo.ts`); foco: fondo blanco + borde de marca + anillo tenue; error con ícono. `Select` usa `Selector` (lista propia, nunca el `<select>` nativo) |
| `Selector` | `opciones`, `valor`, `alCambiar`, `etiqueta`, `placeholder`, `variante` (`campo` \| `filtro`), `buscable` (campo de búsqueda arriba de la lista, para productos), `alBuscar` + `buscando` + `etiquetaElegida` (búsqueda en el servidor, p. ej. `BuscadorCliente`), `destacado` | Lista propia (regla 37): botón `combobox` + `listbox` en un portal con posición calculada (no la recorta el scroll de un modal; se abre hacia arriba si abajo no entra). Teclado: flechas, Inicio/Fin, RePág/AvPág, Enter/Espacio, Esc (no cierra el modal), búsqueda por tipeo sin tildes. La opción elegida va en rojo con ✓ |
| `Datos` + `Dato` | `etiqueta`, `children` | Grilla de datos de un detalle (documento, nota): etiqueta chica gris y valor debajo |
| `ConMotivo` | `motivo` | Envuelve una acción deshabilitada y explica por qué con el tooltip propio (enfocable; el motivo también queda para lectores de pantalla) |
| `BotonExcel` + `exportarTabla` | `alExportar` / `titulo`, `nombre`, `columnas`, `filas` | Botón "Excel" con carga y aviso si falla; export genérico con título del filtro, autofiltro, anchos y formatos (07-Impresion §7) |
| `descargarArchivo` (`shared/export/descargar.ts`) | `contenido`, `nombre`, `tipo` | Descarga de archivos generados en el navegador (Excel, plantillas CSV) |
| `PrintLayout` + `HojaA4` | `titulo`, `listo`, `aviso` | Pestaña de impresión sin shell: espera las fuentes, abre el diálogo y ofrece cerrar la pestaña; `print.css` define `@page A4` sin márgenes |
| `CampoFecha` | `label`, `valor`, `alCambiar`, `min`, `max`, `error` | Campo hundido con ícono; abre el `Calendario` en modo `dia` en un `PanelFlotante`. Nunca `type="date"` (regla 12) |
| `FiltroFechas` | `desde`, `hasta`, `alCambiar`, `max`, `etiqueta`, `resaltar`, `modo` (`rango` \| `dia`) | Rango de fechas de las barras de filtro: botón en relieve que se pone en rojo cuando filtra (salvo `resaltar={false}`, para rangos por defecto) y abre el calendario en modo rango |
| `PanelFlotante` + `useAnclaje` | `anclaje`, `etiqueta` | Panel anclado a un control en un portal (posición calculada, se abre hacia arriba si abajo no entra). El foco entra al panel; Esc lo cierra sin cerrar el modal que lo contiene |
| `CampoCantidad` | `max` (disponible), `decimales` | muestra "disp. N" debajo; `tabular-nums` |
| `Badge` | `ok`, `error`, `alerta`, `info`, `marca`, `neutro`; `punto` | píldora con borde interior tenue |
| `EstadoBadge` | `estado` del dominio → variante (§5) | siempre con punto de color |
| `Card` | `titulo`, `subtitulo`, `acciones`, `icono` + `tono`, `sinPadding` | borde + sombra corta, radio 14 px. Sin margen propio: la separación la da `Pagina` |
| `ChipIcono` | `icono`, `tono`, `tam` | ícono en un cuadrado de fondo tenue (cards, KPIs, avisos) |
| `Avatar` | `nombre`, `tam` | iniciales sobre el rojo de marca |
| `KpiTile` | `etiqueta`, `valor: number \| null`, `formato`, `prefijo`/`sufijo` (unidad), `detalle`, `icono`, `tono`, `a`, `grafico`, `tam="compacto"` | La cifra cuenta hasta el valor (`NumeroAnimado`, sin re-render). `detalle` solo con un dato extra (variación, vencido, proyección), nunca una explicación de la etiqueta. Compacto: etiqueta + cifra, sin detalle. Con `a`, toda la tarjeta es un enlace |
| `MontoBs` | `valor`, `entero` | `Bs` más chico y en gris + cifra tabular; `entero` solo en resúmenes |
| `DosLineas` | `principal`, `secundario` | celda de dos líneas: menos columnas sin perder datos |
| `Segmentado` | `opciones`, `valor` (o `null`), `alCambiar`, `etiqueta`, `variante` | `pista`: pista hundida y opción elegida en relieve que se desliza (cambio de vista). `chips`: píldoras que envuelven de línea (atajos; la elegida en rojo tenue) |
| `Tabla` | `columnas` (`titulo`, `alinear`, `numerico`, `principalMovil`, `ocultarEnMovil`, `acciones`, `render`, `className`), `filas`, `claveFila`, `etiqueta`, `cargando`, `vacio`, `filaInactiva` (tachada), `filaApagada` (gris, p. ej. maestros inactivos), `alClicFila` | Escritorio: filas de 48 px (admiten dos líneas), hover `fondo-2`, entrada escalonada corta; la columna `acciones` va a la derecha y sus clics no disparan el de la fila. Filas clicables también con teclado (Enter/Espacio). Móvil: cada fila es una card (el título es el botón) con las acciones al pie |
| Listado con filtros | `BarraFiltros` + `CampoBusqueda` (debounce 300 ms) + `FiltroSelect` + `Tabla` + `Paginacion`, con `useFiltrosUrl` | Los filtros viven en la URL (se comparten y sobreviven a "atrás"); cambiar uno vuelve a la página 1. `FiltroSelect` (un `Selector` en relieve) se resalta en rojo cuando filtra. En móvil, cada control ocupa el 100 % |
| `SeccionConsulta` | `consulta`, `cargando`, `claseError`, `children(datos)` | Estado por sección (regla 27) |
| `Desplegable` + `ItemDesplegable` | `etiqueta`, `disparador(props, abierto)`, `children(cerrar)`, `alinear`, `anclaje` (`disparador` o `contenedor`: alinea el panel con el bloque que envuelve al botón); ítem: `a` o `onClick`, `icono`, `seleccionado`, `peligro` | Panel anclado (campana, menú de usuario, regional). Cierra con clic afuera, Esc (vuelve el foco al botón) o Tab; flechas ↑↓ recorren los ítems |
| `useTooltip` | `texto`, `lado`, `desactivado` | Tooltip visual (el disparador ya tiene su nombre accesible). Portal con posición fija |
| `Sparkline` | `valores`, `etiqueta`, `tono` | línea SVG que se dibuja al montar; `role="img"` + `aria-label` |
| `Anillo` | `pct`, `etiqueta`, `tono`, `centro` | anillo de progreso SVG |
| `BarrasHorizontales` | `items`, `formato`, `tono`, `conParticipacion` | valores en texto (accesibles) + barra que crece al montar |
| `BarraProgreso` | `valor`, `maximo`, `etiqueta`, `color` | sobre `<progress>`, para celdas de tabla |
| `Paginacion` | `pagina`, `total`, `porPagina` (50), `unidad`, `alCambiar` | Paginación de servidor: "1–50 de 312 clientes" + anterior/siguiente |
| `Interruptor` | `activo`, `alCambiar`, `etiqueta`, `texto` | Switch (`role="switch"`) en proporción 2:1 (adaptado de uiverse.io / Adir-SL): 18 × 36 px; pista hundida (`shadow-pista`; roja de la marca con `shadow-hundido-marca` cuando está activo) y perilla en relieve (`shadow-perilla`), gris apagada y blanca encendida, que se desliza en 200 ms con un leve rebote. En las tablas de maestros, cambio optimista con rollback (regla 15) |
| `Casilla` | `marcada`, `alCambiar`, `children` | Checkbox propio sobre un `input` real (p. ej. regionales del usuario) |
| `ModalFormulario` | `abierto`, `titulo`, `tam`, `sucio`, `guardando`, `textoGuardar`, `alGuardar`, `alCerrar` | Modal + `form` (Enter envía) + pie Cancelar/Guardar; si hay cambios, cerrar pide "¿Descartar los cambios?" (06-pantallas/00 §3) |
| `Pestanas` | `pestanas` (`etiqueta`, `a`), `etiqueta` | Pestañas de navegación entre subrutas (Catálogo), con subrayado que se desliza |
| `ListaReordenable` | `items`, `claveItem`, `nombreItem`, `alReordenar`, `render`, `soloLectura` | Arrastrar del asa (las demás filas se acomodan con animación) o flechas ↑↓ (teclado y móvil). Sin librería de drag |
| `Modal` | `tam="md"` (520) · `"lg"` (720) · `"xl"` (960) | overlay 40 % + blur 2 px; entra con resorte; en móvil, hoja inferior; foco al primer control; Esc cierra; `aria-labelledby` al título |
| `Confirmacion` | `titulo`, `consecuencias: string[]`, `campoMotivo?`, `textoConfirmar`, `peligro` | Para anular, cerrar, devolver, reabrir y desactivar |
| `Toaster` | `exito`, `error`, `info` | arriba a la derecha (móvil: ancho completo); entra y sale animado, los demás se reacomodan |
| `EmptyState` | `icono`, `titulo`, `detalle`, `accion` | ícono en un recuadro hundido |
| `Skeleton` / `SkeletonFilas` | | pulso suave mientras carga |
| `Alerta` | `ok`, `alerta`, `error`, `info`; `accion` | texto oscuro, ícono y borde del color del tipo |
| `Calendario` | `desde`, `hasta`, `alCambiar`, `min`, `max`, `meses` (1 o 2 lado a lado), `mostrar`, `etiqueta` | Calendario propio en modo rango (nunca `type="date"`): lunes primero, el rango como franja continua con los extremos en rojo, punto bajo el día de hoy, vista previa al pasar el mouse, días fuera de [min, max] bloqueados, teclado entre meses (flechas, RePág/AvPág, Enter). `mostrar` lleva la vista a una fecha (al elegir un atajo). Base del futuro `SelectorFecha` |
| `SelectorFecha` | `max = hoy` (del servidor), `min` | dd/mm/aaaa (sobre `Calendario`) |
| `SelectorPeriodo` | mes/año → `YYYY-MM` | presupuesto, EECC |
| `BuscadorCliente`, `BuscadorProducto` | búsqueda en el servidor (debounce 300 ms, cancela la anterior) | muestra NIT/zona o línea/precio/stock |

Hooks de interfaz (`shared/hooks`): `usePreferencia` (preferencias en `localStorage`, con respaldo en memoria), `useMediaQuery`, `useCerrarAlClicAfuera`, `useDesplazado`, `useDebounce`, `useFiltrosUrl` (filtros de listado en la URL) y `useFormulario` (valores, validación al salir del campo y al enviar, errores de la base por campo, `sucio`). Errores de formularios y toggles: `core/errores/errorFormulario.ts`. Caché tras mutar (reemplazar/agregar fila, optimista con rollback): `lib/cacheListas.ts`.

---

## 5 · Colores de estado (único mapeo, en `EstadoBadge`)

| ENTIDAD | ESTADO / INDICADOR | VARIANTE | TEXTO |
|---|---|---|---|
| Nota | emitida | `info` | Emitida |
| Nota | anulada | `neutro` + texto tachado en tablas | Anulada |
| Nota | pendiente de factura | `alerta` | Sin factura |
| Nota | crédito con saldo | `marca` | Saldo Bs … |
| Nota | crédito vencida | `error` | Vencida (N días) |
| Nota | cancelada (crédito sin saldo) | `ok` | Cancelada |
| Liquidación | abierta | `alerta` | Abierta |
| Liquidación | cerrada | `ok` | Cerrada |
| Cobranza | vigente / anulada | `ok` / `neutro` | |
| Stock | bajo mínimo | `error` | Bajo mínimo |
| Presupuesto | cumplido / en_camino / en_riesgo / bajo | `ok` / `info` / `alerta` / `error` | |
| Usuario | activo / inactivo | `ok` / `neutro` | |

Los **tonos** de chips, KPIs y gráficos (`rojo`, `naranja`, `dorado`, `ok`, `error`, `info`, `alerta`, `neutro`) salen de un solo mapa: `shared/ui/tonos.ts`.

---

## 6 · Patrones de pantalla

| PATRÓN | ESTRUCTURA |
|---|---|
| **Listado** | page-head (título + botón primario "+ Nuevo") → barra de filtros (buscador + selects + fechas; en la URL) → `TablaBuscador` → paginación |
| **Formulario de alta/edición** | Modal `md/lg` (maestros) o página (nota de venta, documentos de inventario) · grilla de 2–3 columnas · secciones con título · pie: Cancelar / Guardar |
| **Detalle** | Cabecera con número (mono, rojo), estado y acciones a la derecha · cards de datos · tabla de ítems · historial/auditoría del registro |
| **Reporte** | Filtros arriba (regional, fecha/período) · KPIs · tabla · botones "Imprimir" y "Excel" |
| **Acción irreversible** | `Confirmacion` con la lista de consecuencias ("Se repondrá el stock de 3 productos…") |
| **Pantallas sin sesión** | `LayoutAuth`: panel de marca oscuro a la izquierda (≥ 1024 px) y la tarjeta del formulario a la derecha |

---

## 7 · Accesibilidad y textos

- Contraste AA en texto sobre fondos (los colores de estado cumplen sobre su fondo tenue). `texto-3` es el gris más claro que cumple AA: la jerarquía se logra con tamaño, peso y menos texto, no aclarando más el gris. Los tonos `naranja` y `dorado` se usan en íconos y gráficos, no en texto chico.
- Mensajes en castellano y en el vocabulario del negocio (RNF-15): "Nota de venta", "Liquidación", "Traspaso", "Arqueo", "Cobranza".
- Los botones dicen qué hacen: "Cerrar el día", "Anular nota", nunca "Aceptar".
- Las fechas siempre en `dd/mm/aaaa` y los montos siempre con `Bs` (⚠ SUP-39).
- Gráficos: el valor siempre está también en texto o en `aria-label` (regla 32).

---

## 8 · Movimiento y profundidad (⚙ DT-19)

- **Librería:** `motion` (ex framer-motion) con `LazyMotion` + `strict`: solo componentes `m` (`import * as m from 'motion/react-m'`); las funciones de animación (`domMax`) se cargan aparte (`src/lib/animaciones.ts`).
- **`MotionConfig reducedMotion="user"`** y la media query `prefers-reduced-motion` del CSS: si el usuario pidió menos movimiento, no hay animaciones.
- **Qué se anima** (todo funcional, corto: 120–300 ms o resorte amortiguado): entrada de página, modales, drawer, desplegables, toasts, indicador del ítem activo del sidebar (se desliza), filas de tabla al montar, cifras de KPI, dibujo de gráficos. **Nada decorativo en bucle**, salvo el logo de la pantalla de carga.
- **Neumorfismo en todos los controles** (adaptado de uiverse.io / ke1221; referencia: la campana del topbar). Las clases viven en `shared/ui/neumorfismo.ts` y no se repiten en cada pantalla:
  - **Lo que se presiona va en relieve** (`RELIEVE`): fondo `superficie`, luz arriba-izquierda y sombra abajo-derecha. Al presionar, o mientras su panel está abierto (`aria-expanded`), se hunde (sombra interior). Aplica a botones, botones de ícono (incluidas las acciones de fila y el cerrar del modal), disparadores de filtros, avatar del usuario, asa de arrastre, chips y casillas sin marcar.
  - **Dentro de algo hundido va una pastilla blanca** (`RELIEVE_INTERNO`): ver contraseña, limpiar búsqueda, ajustes de la fecha, regional del topbar.
  - **Donde se escribe o se elige va hundido** (`CAMPO`/`HUNDIDO`): inputs, selects, textareas, buscador y pistas. Lo elegido de un grupo (chip activo, casilla marcada) también queda hundido.
  - Solo quedan planos los ítems dentro de un panel (opciones de un desplegable, días del calendario, pestañas) y el sidebar oscuro.
  - Sin brillos ni reflejos.
- **Excepciones a "sin `style` inline"** (reglas 8 y 36, las únicas): los valores animados que calcula `motion` y las posiciones calculadas en tiempo de ejecución (tooltips, popovers anclados), como variables CSS (`--x`/`--y`) consumidas por clases. Colores, tamaños y espacios siempre con tokens.

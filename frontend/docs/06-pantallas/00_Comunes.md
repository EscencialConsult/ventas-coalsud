# Pantallas · 00 — Elementos comunes

Aplica a todas las pantallas con shell. Componentes en [Sistema de Diseño](../04-Sistema_de_Diseno.md).

**Formato de cada especificación de pantalla:**

| SECCIÓN | QUÉ DICE |
|---|---|
| Propósito | CU/RF |
| Ruta y roles | |
| Maqueta | ASCII |
| Datos | lecturas y RPC del [Contrato de API](../../../backend/docs/03-especificacion/Contrato_API.md) |
| Campos y validaciones | |
| Acciones | |
| Estados y errores | |
| ⚠ Supuestos | |
| Casos de prueba E2E | |

---

## 1 · Shell (`AppShell`)

```
┌──────────────┬─────────────────────────────────────────────────────────────────────┐
│ [logo] COALSUD│ Notas de Venta                          [La Paz ▾]   🔔 3   (VN)    │
│ ONE Comercial │ Historial y emisión · La Paz · 11/06/2026                           │
│───────────────├─────────────────────────────────────────────────────────────────────┤
│ PRINCIPAL     │ ⚠ Hay 1 día sin cerrar en La Paz: 10/06/2026   [Ir a liquidación]   │
│  Dashboard    ├─────────────────────────────────────────────────────────────────────┤
│ GESTIÓN       │                                                                     │
│  Clientes     │                     (contenido de la ruta)                          │
│  Vendedores   │                                                                     │
│  Productos    │                                                                     │
│  Inventario ④ │                                                                     │
│ COMERCIAL     │                                                                     │
│ ▌Notas de venta③                                                                    │
│  Hoja de carga│                                                                     │
│  Liquidación ①│                                                                     │
│  Devoluciones │                                                                     │
│ PLANIFICACIÓN │                                                                     │
│  Presupuesto  │                                                                     │
│ ANÁLISIS      │                                                                     │
│  Reportes     │                                                                     │
│───────────────│                                                                     │
│ (VN) Vanessa  │                                                                     │
│ Regional LP+CBBA ⏻                                                                  │
└───────────────┴─────────────────────────────────────────────────────────────────────┘
```

- **Topbar:**
  - título y subtítulo de la ruta (área · regional activa · fecha de hoy del servidor);
  - `SelectorRegional` (ver [Navegación §4](../05-Navegacion_y_Permisos.md));
  - campana: alertas de stock + días sin cerrar + notas sin factura, con enlaces;
  - avatar con iniciales y un menú (Cambiar contraseña · Salir).
- **Sidebar:** grupos y badges según el rol ([Navegación §1](../05-Navegacion_y_Permisos.md)). El ítem activo lleva la franja roja a la izquierda (como en la demo).
- **Avisos:** los badges, la campana y el banner salen de **un solo** request (`avisos_shell`), compartido también con los contadores del dashboard. Si falla, la campana muestra el error con "Reintentar".
- **BannerDia:**
  - si `avisos_shell` trae días pendientes (fechas anteriores a hoy), banner `alerta` con enlace;
  - en una pantalla de escritura cuya fecha elegida está cerrada, banner `error` "El día dd/mm/aaaa está cerrado. Para corregir, use devolución o ajuste con fecha de hoy".

## 2 · Patrón de listado
- Filtros en la URL (se puede compartir el enlace y volver atrás sin perderlos).
- En móvil, los filtros envuelven de línea y ocupan el 100 % del ancho.
- Buscador con debounce de 300 ms; al cambiar el filtro se cancela la búsqueda anterior y no se muestran datos del filtro viejo mientras carga el nuevo.
- Paginación de servidor de 50 filas; la cantidad total se muestra a la derecha ("1–50 de 312").
- En pantallas chicas, la tabla se muestra como cards (`Tabla`), sin scroll horizontal.
- Estados:
  - `Skeleton` mientras carga;
  - `EmptyState` con acción si no hay filas;
  - `Alerta error` + "Reintentar" si falla.
- Columna de acciones a la derecha, con íconos que llevan `aria-label`.

## 3 · Patrón de formulario
- Asterisco en los obligatorios; validación al salir del campo y al enviar.
- Errores de la base:
  - `VALIDACION` con `details.campo` → marca ese campo;
  - el resto → toast.
- "Guardar" se deshabilita mientras se envía (`cargando`).
- Si hay cambios sin guardar y el usuario navega: confirmación "¿Descartar los cambios?".

## 4 · Fecha de operación
- `SelectorFecha` con `max = hoy` (servidor) y `min = último cierre + 1` (de `v_liquidacion`).
- Por defecto, hoy.
- Si el usuario elige un día pasado, la fecha se muestra resaltada ("Cargando con fecha 10/06/2026") (⚠ SUP-19).

## 5 · Mensajes estándar
| SITUACIÓN | TEXTO |
|---|---|
| Éxito de emisión | "Nota LP-0412 emitida. [Imprimir]" |
| Sin permiso | "No tiene permiso para esta acción." |
| Error desconocido | "No se pudo completar la operación. Intente de nuevo; si persiste, avise al administrador." |
| Sesión vencida | "Su sesión expiró. Ingrese nuevamente." |

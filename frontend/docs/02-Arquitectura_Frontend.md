ESENCIAL CONSULTORA · FRONTEND

# Arquitectura del Frontend — COALSUD
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

La arquitectura general (qué vive en la base y qué en el cliente) está en [Arquitectura del sistema](../../backend/docs/02-diseno/Arquitectura.md). Este documento explica cómo se organiza la app React por dentro.

---

## 1 · Capas

```
 Pantalla (features/<area>/*.tsx)          ← muestra, captura y llama hooks
        │ usa
        ▼
 Hooks de datos (<area>.queries.ts)        ← useQuery / useMutation, query keys, invalidación
        │ llama
        ▼
 Servicio (<area>.service.ts)              ← única capa que conoce tablas, vistas y RPC
        │ usa
        ▼
 lib/supabase.ts (cliente tipado)          ← createClient<Database>(url, anonKey)
        │ HTTPS + JWT
        ▼
 Supabase: RLS + RPC (la base decide)
```

| CAPA | PUEDE | NO PUEDE |
|---|---|---|
| Pantalla | Estado de UI, validación de UX, formateo | Importar `supabase`, calcular un importe "definitivo" |
| Hooks de datos | Definir query keys, `staleTime`, invalidaciones, `onError` → toast | Armar consultas SQL/PostgREST |
| Servicio | `from().select()`, `rpc()`, `storage`, `functions.invoke`; mapear `error` → `ErrorNegocio` | Tocar el DOM o el estado de React |

### 1.1 — Dos fuentes de datos (⚙ DT-17)
Cada servicio define su **interfaz** (tipada con `core/models`) y tiene dos implementaciones:
```
features/<area>/
├── <area>.service.ts            export const <area>Service = MODO_FIXTURES ? fixtures : supabase
├── <area>.service.fixtures.ts   datos en memoria (src/fixtures/), latencia simulada, mismos errores (ErrorNegocio)
└── <area>.service.supabase.ts   llamadas reales según el Contrato de API
```
- `MODO_FIXTURES` (`src/lib/config.ts`) sale de `VITE_MODO_DATOS`. Vite lo reemplaza en el build, así que la rama no usada se elimina.
- Si el servicio es chico (p. ej. `fecha`, `avisos`), las dos implementaciones pueden ir en el mismo archivo.
- Los fixtures lanzan los **mismos códigos de error** del contrato (p. ej. `STOCK_INSUFICIENTE`), para que la UI de errores se pruebe sin backend.
- Las pantallas y los hooks no saben qué fuente está activa.

---

## 2 · Sesión y perfil

- `core/auth/AuthProvider.tsx` sigue el mismo patrón que `comrural/src/context/AuthContext.jsx`.
- La sesión se restaura de forma asíncrona (`getSession` + `onAuthStateChange`). Tras el login se llama **una vez** a `rpc('mi_perfil')`, que devuelve rol, regionales y `debe_cambiar_password`.
- Estados: `cargando` → `sin_sesion` | `debe_cambiar_password` | `activa`.
- `USUARIO_INACTIVO` (o `activo = false`) → `signOut` + mensaje en el login.
- **Cambio de contraseña obligatorio:** mientras `debe_cambiar_password` sea `true`, el router solo deja entrar a `/cambiar-password` (CP-02.6).
- **Inactividad** (`core/auth/useInactividad.ts`):
  - escucha `pointerdown`, `keydown`, `wheel` y `visibilitychange`;
  - al minuto `VITE_INACTIVIDAD_MIN − 1` abre un aviso con "Seguir conectado";
  - al minuto `VITE_INACTIVIDAD_MIN`, `signOut` y el login con el mensaje "Sesión cerrada por inactividad" (⚠ SUP-38);
  - el contador se comparte entre pestañas con `BroadcastChannel`.
- **JWT vencido** (`PGRST301`) → reintento con refresh; si falla, `signOut`.

## 3 · Regional activa

`core/regional/RegionalActivaProvider.tsx` expone `{ regionalActiva, setRegionalActiva, opciones, puedeEscribir }`.

| USUARIO | OPCIONES | POR DEFECTO | `regionalActiva` |
|---|---|---|---|
| Nacional | "Todas" + LP + CBBA + SCZ | "Todas" | `null` = todas (solo lectura consolidada) |
| Regional con una | — (fija, sin selector) | su regional | su id |
| Regional con varias (Vanessa) | sus regionales | la última usada | id elegido |

- La última elección se guarda en `localStorage` (`coalsud.regional.<usuarioId>`), dentro de `try/catch`.
- **Todas las query keys incluyen `regionalActiva`**: cambiarla refresca las pantallas sin lógica extra.
- Las pantallas de escritura exigen una regional concreta y `puedeEscribir = rol === 'regional'`.

## 4 · Datos (TanStack Query)

| TEMA | REGLA |
|---|---|
| QueryClient | `staleTime` 30 s por defecto; maestros (productos, líneas, condiciones, vendedores) 5 min; `refetchOnWindowFocus: true` |
| Query keys | `[área, regionalActiva, ...params]`, p. ej. `['liquidacion', 'uuid-LP', '2026-06-11']`. Fábricas en cada `<area>.queries.ts` |
| Mutaciones | Una por RPC. `onSuccess` → **solo** lo que la operación cambió: la respuesta a la caché o la invalidación puntual del [Contrato de API §9](../../backend/docs/03-especificacion/Contrato_API.md), más un toast de éxito. Nunca "recargar todo" |
| Cancelación | Toda `queryFn` pasa `{ signal }` al servicio y el servicio lo pasa a supabase-js (`.abortSignal`). Los fixtures lo respetan igual |
| Duplicados | TanStack deduplica por clave; lo que no va por Query (restaurar sesión) usa `compartirPeticion` |
| Errores | Consultas: los muestra su sección (`SeccionConsulta`). Mutaciones: `onError` → toast, error de campo o modal según el código. Inesperados: manejador global (§5) |
| Listados | Paginación de servidor (`range`) de 50 filas; filtros en la URL (`useSearchParams`), como `useFiltrosEnUrl` de la referencia; búsqueda con debounce de 300 ms |
| Optimistic updates | **No** en operaciones de negocio (emitir, anular, cobrar, cerrar): siempre se espera la respuesta de la base. **Sí** en toggles frecuentes (activar/desactivar), con rollback y aviso si falla |

## 5 · Errores

`core/errores/mapearError.ts` convierte cualquier `PostgrestError`, `FunctionsHttpError` o `AuthError` en:
```ts
type ErrorNegocio = {
  codigo: CodigoError;        // 'DIA_CERRADO' | 'STOCK_INSUFICIENTE' | … (catálogo del contrato)
  mensaje: string;            // texto para el usuario (el de la base, o uno propio para errores nativos)
  detalle?: Record<string, unknown>; // details parseado
};
```
`core/errores/acciones.ts` define, por código, cómo se presenta:
- toast;
- error en un campo;
- banner;
- modal con lista (`FACTURA_PENDIENTE`, `DIA_ANTERIOR_ABIERTO`).

**Errores inesperados → manejador global único** (`core/errores`):
- `LimiteErrores` en la raíz y `ErrorRuta` como `errorElement` de las rutas raíz atrapan los errores de render y efectos, y muestran `PantallaError` en vez de una página en blanco.
- Los listeners `error` y `unhandledrejection` (instalados en `main.tsx`) atrapan clics, timers y promesas sin catch, y muestran `AvisoIncidentes` sin tumbar la pantalla.
- Los errores `DESCONOCIDO` de consultas y mutaciones también van ahí (`QueryCache` / `MutationCache`), y en los `catch` de la UI se usa `procesarError`.
- El aviso tiene dos niveles:
  - para el usuario, "Copie el detalle y envíeselo al administrador del sistema", con los botones Copiar y Recargar;
  - para el desarrollador, un detalle técnico desplegable con código `ERR-…`, fecha, usuario, pantalla, error, stack y componentes.
- Se ignoran las cancelaciones (`AbortError`, `CancelledError`) y el ruido del navegador y de las extensiones.

Una regla de negocio que llega sin catch no es inesperada: se muestra con su toast.

## 6 · Formularios

- Componentes controlados (`useState`/`useReducer`). La nota de venta, con ítems dinámicos, usa un `useReducer`.
- Validación en dos niveles:
  1. `<area>.validacion.ts`: funciones puras que devuelven `{ campo: mensaje }`; se corren al enviar y al salir de cada campo;
  2. la base, que valida todo otra vez y devuelve códigos.
- Los botones de envío se deshabilitan mientras la mutación está en curso (evita dobles envíos).
- Al confirmar operaciones irreversibles (anular, cerrar, devolver, reabrir) se usa `Confirmacion`, que muestra lo que va a pasar.

## 7 · Formatos (`shared/format`)

| FUNCIÓN | SALIDA | REGLA |
|---|---|---|
| `formatoBs(1234.5)` | `Bs 1,234.50` | `Intl.NumberFormat('en-US', { minimumFractionDigits: 2 })` (⚠ SUP-39) |
| `formatoCantidad(12)` | `12` · `12.50` | sin decimales si es entero |
| `formatoFecha('2026-06-11')` | `11/06/2026` | sin pasar por `Date` (evita el corrimiento de zona horaria) |
| `formatoFechaHora(iso)` | `11/06/2026 14:32` | `Intl` con `timeZone: 'America/La_Paz'` |
| `numeroALetras(621)` | `Seiscientos veintiuno 00/100 Bolivianos` | Solo para imprimir la nota |
| `formatoNumeroDoc` | tal cual viene de la base | Nunca se arma el número en el frontend |

## 8 · Ruteo

- `app/router.tsx` con `createBrowserRouter`, **lazy por área** (`lazy: () => import('@/features/…/…routes')`).
- Cada ruta declara `roles` y, si escribe, `requiereRegional`. `RolGuard` redirige a `/` con un toast "Sin acceso" ([Navegación y Permisos](05-Navegacion_y_Permisos.md)).
- Las rutas de impresión (`/imprimir/...`) usan un layout sin shell.

## 9 · Impresión y exportación

- **Impresión:** ruta dedicada (`/imprimir/nota/:id`, `/imprimir/hoja-carga/:fecha`, `/imprimir/rendimiento/...`), que se abre en una pestaña nueva; carga los datos, espera las fuentes (`document.fonts.ready`) y llama a `window.print()`. Detalle en [Impresión y Exportación](07-Impresion_y_Exportacion.md).
- **Excel:** `exceljs` con import dinámico (`await import('exceljs')`) para no inflar el bundle inicial. Los generadores viven en `shared/export/`.

## 10 · Rendimiento

- Bundle inicial: shell + login. Cada feature se carga con lazy.
- Las tablas largas (liquidación con ~150 productos) se renderizan agrupadas por línea, sin virtualización, que no hace falta a ese tamaño.
- Selectores de cliente y producto: búsqueda en el servidor con debounce de 300 ms (`useDebounce`, como en la referencia).

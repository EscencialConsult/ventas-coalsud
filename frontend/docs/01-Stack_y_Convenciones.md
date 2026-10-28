ESENCIAL CONSULTORA · FRONTEND

# Stack y Convenciones — Frontend COALSUD
**v1.1 · 26/10/2026**

Esencial Consultora — El Alto / La Paz, Bolivia

---

## 1 · Cómo se definió el stack

La regla acordada: **el mismo stack del proyecto de referencia `Desktop/frontend/comrural`**, salvo donde la documentación del proyecto especifica otra cosa. La documentación (Arquitectura v1.0) fija **TypeScript**, **TanStack Query**, React Router, Tailwind y Supabase, y por eso esas piezas se toman de ahí (⚙ DT-08). El resto sale de la referencia.

| PIEZA | ELECCIÓN | ORIGEN | NOTA |
|---|---|---|---|
| Framework | React **19** | referencia (`react ^19.2.7`) | |
| Build | Vite **8** + `@vitejs/plugin-react` 6 | referencia | |
| Lenguaje | **TypeScript** (modo `strict`) | **documentación** | La referencia usa JS; acá TS por la Arquitectura v1.0 |
| Estilos | Tailwind CSS **4** con `@tailwindcss/vite` y tokens en `@theme` | referencia + documentación | Igual que `comrural/src/index.css` |
| Ruteo | React Router **7** (`react-router-dom`) | referencia + documentación | |
| Datos / caché | **TanStack Query 5** | **documentación** | La referencia usa hooks propios; acá TanStack |
| Backend client | `@supabase/supabase-js` 2 | referencia + documentación | Un solo cliente (`src/lib/supabase.ts`) |
| Íconos | `lucide-react` | referencia | |
| Excel | **exceljs** | referencia (⚙ DT-09) | La documentación decía "SheetJS u similar" |
| Impresión | CSS `@media print` + `window.print()` | documentación (⚙ DT-10) | `jspdf` y `html2canvas-pro` de la referencia **no** se usan |
| Lint | **oxlint** (`react/rules-of-hooks`, `react/only-export-components`) | referencia | + `tsc --noEmit` como chequeo de tipos |
| Tests unitarios | Vitest + Testing Library | ⚙ DT-07 | La referencia del backend usa Vitest |
| E2E | Playwright | ⚙ DT-07 | |
| Gestor de paquetes | npm | referencia (⚙ DT-14) | |
| Tipografía | **Inter** con cifras tabulares; Plus Jakarta Sans solo en el logotipo (Google Fonts) | ⚙ DT-22 (antes DT-11) | La monoespaciada de la demo hacía pesados los montos |
| Formularios | Componentes controlados + funciones de validación propias | referencia | Sin react-hook-form ni zod, para no sumar librerías |
| Gráficos | Ninguna librería: SVG propios (`Sparkline`, `Anillo`, `BarrasHorizontales`) | ⚙ DT-16 | Recharts solo si hiciera falta un gráfico complejo |
| Animación | **motion** 14 (`LazyMotion` + componentes `m`) | ⚙ DT-19 | La referencia no anima; acá se pidió una interfaz que aproveche React. Respeta `prefers-reduced-motion` |

> **Si se prefiere JavaScript** (igual que la referencia), el cambio es de configuración y no afecta a la arquitectura. Pero se pierden los tipos generados desde la base, que en este proyecto protegen el contrato con las RPC (⚙ DT-13).

---

## 2 · `package.json` (scripts)

| SCRIPT | COMANDO |
|---|---|
| `dev` | `vite` |
| `build` | `tsc -b && vite build` |
| `preview` | `vite preview` |
| `lint` | `oxlint` |
| `typecheck` | `tsc --noEmit` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `e2e` | `playwright test` |

Dependencias de partida: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `@supabase/supabase-js`, `tailwindcss`, `@tailwindcss/vite`, `lucide-react`, `exceljs`.

Desarrollo: `typescript`, `@types/react`, `@types/react-dom`, `vite`, `@vitejs/plugin-react`, `oxlint`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@playwright/test`, `@tanstack/react-query-devtools`.

Las versiones exactas se fijan con `npm install` al crear el proyecto (FE-01), alineadas con la referencia.

---

## 3 · Variables de entorno

| VARIABLE | EJEMPLO | NOTA |
|---|---|---|
| `VITE_SUPABASE_URL` | `http://127.0.0.1:54321` (local) | Obligatoria: sin ella la app no arranca (mismo patrón que la referencia) |
| `VITE_SUPABASE_ANON_KEY` | `eyJ…` | Pública; la seguridad la da la RLS |
| `VITE_INACTIVIDAD_MIN` | `30` | ⚠ SUP-38 |
| `VITE_MODO_DATOS` | `fixtures` · `supabase` | ⚙ DT-17. Con `fixtures` no hacen falta las variables de Supabase |

`.env` va fuera del repo; el repo tiene `.env.example`. **Nunca** se pone la `service_role` en el frontend (RNF-13).

---

## 4 · Convenciones de código

### 4.1 — Nombres
| QUÉ | CONVENCIÓN | EJEMPLO |
|---|---|---|
| Carpetas | `kebab-case` | `features/notas-venta/` |
| Componentes | `PascalCase.tsx` | `NotaVentaForm.tsx` |
| Hooks | `useX.ts` | `useRegionalActiva.ts` |
| Servicios | `<area>.service.ts` | `notas-venta.service.ts` |
| Rutas | `<area>.routes.tsx` | `liquidacion.routes.tsx` |
| Consultas (query keys + hooks) | `<area>.queries.ts` | `inventario.queries.ts` |
| Validaciones | `<area>.validacion.ts` | `cobranzas.validacion.ts` |
| Tipos de dominio | `core/models/<entidad>.ts` | `nota-venta.ts` |
| Vocabulario | **del negocio y en castellano** | `liquidacion`, `traspaso`, `arqueo`, `notaVenta`, `cobranza` |

### 4.2 — Reglas
1. **Las pantallas no hablan con Supabase.** Pantalla → hook de `<area>.queries.ts` → `<area>.service.ts` → `lib/supabase.ts`.
2. **Ningún cálculo de negocio que se "confíe" al guardar.** El total de la nota se muestra en vivo con la misma fórmula, pero el valor válido es el que devuelve la RPC (Arquitectura §4).
3. **Ningún permiso decide solo en el frontend.** `core/auth/permisos.ts` decide qué se *muestra*; la base decide qué se *puede*.
4. **Errores por código, nunca por texto:** `mapearError(error)` lee `hint` ([Contrato de API §2](../../backend/docs/03-especificacion/Contrato_API.md)).
5. **Fechas de negocio como string `YYYY-MM-DD`**, sin `new Date()` para decidir "hoy": se usa `rpc('hoy')` (RNF-29).
6. **Montos como `number`** que vienen de la base; solo se formatean al mostrarlos (`formatoBs`).
7. **Comentarios como en la referencia:** pocos y explicando el *por qué*, en castellano.
8. **TypeScript estricto:** nada de `any` explícito. Los resultados `jsonb` de las RPC se tipan en `core/models` con la forma del contrato.
9. **Import alias** `@/` → `src/`.
10. **Accesibilidad mínima:** `label` en cada campo, foco visible, botones con texto o `aria-label`, tablas con `th` y `scope`.

### 4.3 — Reglas generales del frontend (pedidas por el usuario, `/frontend-rules-general`)
Se aplican a todo el código. La autorrevisión contra ellas es parte de la definición de terminado ([Plan FE](08-Plan_Implementacion_Frontend.md)).

| TEMA | REGLA | DÓNDE ESTÁ RESUELTO |
|---|---|---|
| Tipado | Sin `any`; props e interfaces explícitas | `tsconfig` estricto; modelos en `core/models` |
| Componentes | Chicos, de una sola responsabilidad; lo repetido va a un hook, servicio o util | `shared/ui`, `shared/hooks` |
| Estilos | Sin `style` inline; solo tokens del `@theme`. Excepción: valores calculados en tiempo de ejecución (animaciones de motion, posición del tooltip) | Barras con `BarraProgreso` (`<progress>`) o transformaciones de motion; [Sistema de Diseño §8](04-Sistema_de_Diseno.md) |
| Debug | Sin `console.log` ni código comentado | El detalle técnico va al manejador global |
| Diálogos | Nunca `alert`/`confirm`/`prompt` | `Modal`, `Confirmacion`, `toast` |
| Fechas | Nunca `type="date"`; selector propio | `SelectorFecha` (FE-11 / FE-13) |
| Variantes | Una sola implementación con prop de variante | `Button`, `BotonIcono`, `Badge` |
| Botones | Hover, pressed (sombra interior + oscurecer) y loading (spinner centrado, `disabled`, `aria-busy`, mismo ancho, sin doble envío). Si `onClick` devuelve una promesa, el loading es automático | `Button`, `BotonIcono` (`useAccionAsync`) |
| Tablas | Sin scroll horizontal en móvil: cada fila colapsa a card con los encabezados como etiquetas. Filtros que envuelven y ocupan el 100 % en móvil | `Tabla` |
| Requests tras mutar | Solo lo afectado; usar la respuesta si trae el objeto; nada de "recargar todo" | [Contrato §9](../../backend/docs/03-especificacion/Contrato_API.md) |
| Toggles frecuentes | Optimista con rollback y aviso | Al llegar los toggles de maestros (FE-07 a FE-09) |
| Catálogos | Cargar una vez y cachear (`staleTime` largo) | Maestros 5 min; `hoy` 1 h |
| Búsqueda | Debounce de **300 ms** | `useDebounce` (FE-07) |
| Cancelación | `AbortSignal` en cada request; al cambiar el filtro, la respuesta vieja se descarta | Servicios con `OpcionesPeticion`; claves con ids |
| Paralelo | Requests independientes con `Promise.all` | Servicios |
| Secciones | Cada sección carga y falla sola (skeleton / error con Reintentar) | `SeccionConsulta` |
| Duplicados | Compartir la petición en curso | TanStack Query (por clave) + `compartirPeticion` |
| Pedir lo visible | Pestañas, modales y desplegables piden al abrirse | Hooks con `enabled` |
| Tableros | Endpoints agregados, sin sumar listados en el cliente; lo derivable no se vuelve a pedir | `avisos_shell`, `dashboard_kpis` |
| Errores inesperados | Manejador global único: `LimiteErrores` + `ErrorRuta` + listeners `error`/`unhandledrejection`, con aviso de dos niveles (usuario: Copiar/Recargar; desarrollador: código, fecha, usuario, pantalla, stack, componentes). Ignora cancelaciones y extensiones | `core/errores` (`incidentes`, `procesarError`) |
| Errores esperados | Toast, alerta o campo, según el código del contrato | `mapearError` + pantalla |
| Verificación visual | No la hace el asistente: la hace el usuario | — |
| Git | Sin commit, checkout ni push sin pedido explícito | — |

### 4.4 — Git
- Ramas `feature/<area>-<tema>`, `fix/<tema>`.
- Commits en castellano e imperativo ("Agrega cierre del día").
- PR con: capturas de la pantalla, CP cubiertos y ⚠ SUP que toca.
- Antes de merge: `lint`, `typecheck`, `test` y `build` en verde.

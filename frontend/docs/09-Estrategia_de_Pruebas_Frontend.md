ESENCIAL CONSULTORA · FRONTEND

# Estrategia de Pruebas del Frontend — COALSUD
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

Las reglas de negocio se prueban en la base (pgTAP, ver la [estrategia del backend](../../backend/docs/04-ejecucion/Estrategia_de_Pruebas.md)). En el frontend se prueba que:
- la pantalla **muestre** bien lo que devuelve la base;
- **llame** a la RPC correcta;
- **traduzca** bien cada error.

---

## 1 · Niveles

| NIVEL | HERRAMIENTA | QUÉ | DÓNDE |
|---|---|---|---|
| Unitario | Vitest | Funciones puras: formatos, `numeroALetras`, `mapearError`, `permisos`, validaciones, cálculo del total "para mostrar", armado de filas del Excel | `src/**/*.test.ts` |
| Componente | Vitest + Testing Library | Formularios críticos (nota de venta, documento de inventario, cobro, devolución) con el servicio simulado: validaciones, estados, errores por código | `src/features/**/*.test.tsx` |
| E2E | Playwright | Los CP con capa E2E, contra Supabase local con seeds | `e2e/*.spec.ts` |
| Impresión | Playwright (`page.emulateMedia({ media: 'print' })` + `page.pdf`) | Nota A5 duplicada: dos copias, sin condición de pago en la del cliente | `e2e/impresion.spec.ts` |

---

## 2 · Unitarios obligatorios

| MÓDULO | CASOS |
|---|---|
| `formatoBs` | `1234.5 → "Bs 1,234.50"`, `0 → "Bs 0.00"`, negativos |
| `formatoFecha` | `'2026-06-11' → '11/06/2026'`, sin corrimiento de zona |
| `numeroALetras` | 0, 1, 15, 21, 100, 101, 1000, 1001, 1,000,000, con centavos (`621.50 → "Seiscientos veintiuno 50/100 Bolivianos"`) |
| `mapearError` | Cada código del catálogo; `23505`, `23514`, `42501`, `PGRST301`; un error de red; un error desconocido |
| `permisos` | Matriz completa: nacional / regional con una regional / regional con dos × cada acción × "Todas" vs una regional |
| total en vivo | Mismo resultado que [Reglas §1](../../backend/docs/03-especificacion/Reglas_de_Calculo.md) (CP-06.18: 690 con 10 % → 621.00) |
| `excelLiquidacion` | Filas del Excel a partir del JSON de ejemplo del contrato (orden de líneas, catálogo completo, pie, bloques) |

---

## 3 · E2E: mapa de specs

| SPEC | CP |
|---|---|
| `auth.spec.ts` | 02.1, 02.2, 02.5 (con un reloj simulado), 02.6 |
| `usuarios.spec.ts` | 01.1, 01.2, 01.3, 01.4, 01.7 |
| `permisos.spec.ts` | 02.4, 10.3, 10.5, 11.3 (rutas y acciones visibles por rol) |
| `clientes.spec.ts` | 03.1, 03.2, 03.3, 03.5 |
| `catalogo.spec.ts` | 04.1, 04.2, 04.5 |
| `inventario.spec.ts` | 05.1, 05.2, 05.4, 05.5, 05.7, 05.9, 05.11 |
| `notas.spec.ts` | 06.1, 06.2, 06.4, 06.5, 06.7, 06.9, 06.10, 06.19 |
| `impresion.spec.ts` | 06.6 |
| `cobranzas.spec.ts` | 07.1, 07.2, 07.4, 07.6, 07.7 |
| `liquidacion.spec.ts` | 08.1, 08.4, 08.5, 08.6 (descarga y lectura del xlsx), 08.7, 08.13 |
| `presupuesto.spec.ts` | 09.1, 09.2 |
| `reportes.spec.ts` | 10.1, 10.2, 10.4 |
| `auditoria.spec.ts` | 11.1 |

**Prioridad** (Plan, FE-25): notas → liquidación → inventario → permisos → el resto.

---

## 4 · Cómo corre el e2e

1. En `backend/`:
   - `npm run db:start`;
   - `npm run db:reset` (migraciones con los datos base + `seeds/*.sql`: catálogo y usuarios `@coalsud.demo`).
2. En `frontend/`, `.env.e2e` apunta a `http://127.0.0.1:54321`; `npx playwright test`.
3. `e2e/fixtures/auth.ts` inicia sesión **por API** (`signInWithPassword`) y guarda el `storageState` por rol (`irene`, `vanessa`, `fernando`), para no repetir el login en cada spec.
4. Cada spec crea sus propios datos con nombres únicos (`Cliente E2E <timestamp>`) y usa **fechas de un día abierto** propio de la prueba, para no chocar con otras specs. Las specs que cierran días usan la regional CBBA y fechas pasadas reservadas para eso.
5. La suite completa se corre antes de cada release; un subconjunto *smoke* (login + emitir nota + reporte del día), en cada PR si la CI levanta el backend.

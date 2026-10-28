# COALSUD — Sistema Comercial · Documentación del Frontend

**Esencial Consultora** · El Alto / La Paz, Bolivia · **v1.1 — 26/10/2026**

App web (React) del Sistema Comercial de **COALSUD S.R.L.** La usan los administradores de cada regional y el nivel nacional. Los vendedores no la usan.

**Stack:** React 19 + TypeScript + Vite 8 + Tailwind 4 + React Router 7 + TanStack Query 5 + supabase-js + exceljs + lucide-react + oxlint. Mismo stack que `Desktop/frontend/comrural`, salvo TypeScript y TanStack Query, que exige la documentación (⚙ DT-08).

---

## Documentación compartida (vive en el backend)

Las reglas de negocio tienen **una sola fuente**: `../../backend/docs/`. Está en otro repo (⚙ DT-12): estos enlaces funcionan con los dos repos clonados como carpetas hermanas, no en la web de GitHub.

| DOCUMENTO | PARA QUÉ LO NECESITA EL FRONTEND |
|---|---|
| [SRS](../../backend/docs/01-requerimiento/SRS.md) | Qué debe hacer el sistema (RF/RNF) |
| [Casos de Uso](../../backend/docs/01-requerimiento/Casos_de_Uso.md) | Flujos de cada pantalla |
| [Casos de Prueba](../../backend/docs/01-requerimiento/Casos_de_Prueba.md) | Los CP con capa **E2E** son los del frontend |
| [Registro de Supuestos](../../backend/docs/01-requerimiento/Registro_de_Supuestos.md) | **⚠ SUP-xx**: lo que todavía no confirmó el cliente |
| [Contrato de API](../../backend/docs/03-especificacion/Contrato_API.md) | Lecturas, RPC, errores, Storage, Edge Function, invalidación de caché |
| [Reglas de Cálculo](../../backend/docs/03-especificacion/Reglas_de_Calculo.md) | Qué significa cada número de la pantalla |
| [Seguridad RLS](../../backend/docs/02-diseno/Seguridad_RLS.md) | La matriz de permisos que la UI refleja |

## Documentación del frontend

| # | DOCUMENTO | CONTENIDO |
|---|---|---|
| 01 | [Stack y Convenciones](01-Stack_y_Convenciones.md) | De dónde sale cada pieza, scripts, variables, nombres, reglas |
| 02 | [Arquitectura del Frontend](02-Arquitectura_Frontend.md) | Capas, sesión, regional activa, TanStack Query, errores, formularios, formatos |
| 03 | [Estructura del Proyecto](03-Estructura_del_Proyecto.md) | Árbol `core/shared/features` |
| 04 | [Sistema de Diseño](04-Sistema_de_Diseno.md) | Tokens de la demo, componentes, colores de estado, patrones |
| 05 | [Navegación y Permisos](05-Navegacion_y_Permisos.md) | Menú por rol, rutas, `permisos.ts`, regla del selector de regional |
| 06 | [Pantallas](06-pantallas/) | Especificación de cada pantalla (00 a 12) |
| 07 | [Impresión y Exportación](07-Impresion_y_Exportacion.md) | Nota A5 duplicada, hoja de carga, Excel de la planilla y del EECC |
| 08 | [Plan de Implementación](08-Plan_Implementacion_Frontend.md) | FE-01 a FE-26 con dependencias del backend (~167 h) |
| 09 | [Estrategia de Pruebas](09-Estrategia_de_Pruebas_Frontend.md) | Vitest, Testing Library, Playwright, mapa de CP |

### Pantallas
[00 Comunes](06-pantallas/00_Comunes.md) · [01 Login y sesión](06-pantallas/01_Login_y_Sesion.md) · [02 Dashboard](06-pantallas/02_Dashboard.md) · [03 Usuarios](06-pantallas/03_Usuarios.md) · [04 Clientes y vendedores](06-pantallas/04_Clientes_y_Vendedores.md) · [05 Catálogo y configuración](06-pantallas/05_Catalogo_y_Configuracion.md) · [06 Inventario](06-pantallas/06_Inventario.md) · [07 Notas de venta](06-pantallas/07_Notas_de_Venta.md) · [08 Cobranzas](06-pantallas/08_Cobranzas.md) · [09 Liquidación](06-pantallas/09_Liquidacion.md) · [10 Presupuesto](06-pantallas/10_Presupuesto.md) · [11 Reportes y EECC](06-pantallas/11_Reportes_y_EECC.md) · [12 Auditoría](06-pantallas/12_Auditoria.md)

---

## Marcas
**●** nuevo/modificado en v1.1 · **⚠ SUP-xx** supuesto no confirmado por el cliente · **⚙ DT-xx** decisión técnica propuesta.

## Para empezar
[Plan §0](08-Plan_Implementacion_Frontend.md): FE-01 a FE-03 no dependen del backend. Desde el login, hace falta Supabase local con el esquema.

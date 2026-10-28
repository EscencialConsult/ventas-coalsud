# Pantallas · 05 — Catálogo y Configuración

**Propósito:** CU-04 · RF05, RF06, RF36 · ⚠ SUP-02, SUP-03, SUP-25, SUP-29, SUP-43.

Edita **solo el nacional**; el regional ve las mismas pantallas en modo lectura (sin botones de alta ni edición).

## 1 · Productos (`/catalogo/productos`)
```
 Catálogo de Productos                                           [+ Nuevo producto]
 Precios y stock · [Línea ▾] [Buscar…] [Activos ▾]
 ┌────────────┬──────────────────────────┬──────────┬────────┬──────────┬──────────────────────────┬────────┬────┐
 │ Línea      │ Producto                 │ Código   │ Precio │ Mínimo   │ Stock (regional activa)  │ Estado │    │
 │ COMRURAL   │ QUINUA TRICOLOR 1 KG     │          │ 44.00  │ 30       │ Alm 15 · Vend 0 · ⚠ bajo │ Activo │ ✎  │
 └────────────┴──────────────────────────┴──────────┴────────┴──────────┴──────────────────────────┴────────┴────┘
```
- La columna de stock sale de `v_stock` agregado por producto. En la demo, el catálogo mostraba "el stock y a qué almacén está" (F2).
- **Modal:** línea *, nombre *, código, orden (dentro de la línea), precio base * (≥ 0), stock mínimo (≥ 0), activo.
- Al cambiar el precio, aviso: "Las notas ya emitidas conservan su precio" (CP-04.4).
- **Datos:** `producto` insert/update (RLS patrón A).

## 2 · Líneas (`/catalogo/lineas`)
- Tabla con nombre y orden (flechas ↑↓ para reordenar: actualizan `orden`), activo.
- Ese orden define el del reporte diario y del Excel.

## 3 · Condiciones de pago (`/catalogo/condiciones`)
- Nombre *, tipo * (contado/crédito), días * (0 si es contado), orden, activo.
- Iniciales: Contado, Crédito 15, 30, 60 y 90 días.

## 4 · Configuración (`/configuracion`) · solo nacional
- **Regionales:** nombre y código (prefijo). El código se bloquea si ya hay documentos (el error viene de la base).
- **Almacenes:** por regional.
- **Cartera inicial** (puesta en marcha, ⚠ SUP-24):
  - botón "Cargar cartera inicial" → modal que importa un CSV con la plantilla `cartera_inicial.csv` ([Datos Iniciales §4.2](../../../backend/docs/04-ejecucion/Datos_Iniciales.md));
  - vista previa con validación por fila → `rpc('cargar_cartera_inicial')` por regional;
  - total cargado vs total esperado.
  - Implementado con FE-17 (modal `ModalCarteraInicial`; ver 08_Cobranzas).

**Implementación (FE-09):**
- Catálogo con pestañas de navegación (`/catalogo/productos`, `/lineas`, `/condiciones`); `/catalogo` lleva a productos.
- El estado activo de productos, líneas, condiciones, regionales y almacenes se cambia con el interruptor de la fila (optimista con rollback).
- Líneas: se reordenan arrastrando del asa o con ↑↓; solo viajan las líneas que cambiaron de lugar.
- Configuración: regionales y almacenes lado a lado, cada uno con su estado de carga.

**E2E:** CP-04.1, CP-04.2, CP-04.5.

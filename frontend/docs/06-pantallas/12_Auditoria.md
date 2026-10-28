# Pantallas · 12 — Auditoría (`/auditoria`) · solo nacional

**Propósito:** CU-11 · RF32 · Q22.

```
 Auditoría                                [Desde]–[Hasta] [Usuario ▾] [Acción ▾] [Entidad ▾] [Regional ▾]
 ┌──────────────────┬───────────┬──────────┬──────────────────┬─────────────┬─────────────────────────────────┐
 │ Fecha y hora     │ Usuario   │ Regional │ Acción           │ Registro    │ Detalle                         │
 │ 11/06/2026 21:14 │ Vanessa   │ LP       │ Cerrar día       │ 11/06/2026  │ Total ventas 4,300.00           │
 │ 11/06/2026 10:02 │ Vanessa   │ LP       │ Cambio de precio │ LP-0415     │ QUINUA TRICOLOR 44.00 → 40.00   │
 │ 11/06/2026 09:40 │ Vanessa   │ LP       │ Anular nota      │ LP-0409     │ Motivo: cliente no encontrado   │
 └──────────────────┴───────────┴──────────┴──────────────────┴─────────────┴─────────────────────────────────┘
```

- **Datos:** `auditoria` (RLS: solo el nacional), paginada de a 50 y ordenada por `created_at desc`.
- **Detalle:** cada acción tiene un "resumen legible" armado en el frontend a partir de `datos` (mapa `accion → plantilla`, en `features/auditoria/resumenes.ts`). El botón "Ver detalle" muestra los datos legibles: una tabla Campo | Antes | Después (lo que cambió, en negrita) y el resto como "Campo: valor", con nombres en castellano, montos en Bs y fechas dd/mm/aaaa (`features/auditoria/detalle.ts`). Nunca el JSON crudo.
- **Registro:** si la entidad tiene pantalla (nota, cliente, documento, liquidación), es un enlace.
- Solo lectura; no hay acciones de edición (CP-11.2 se prueba en BD).
- **Excel:** export del filtro actual.

**Implementación (FE-24):** se lee de `v_auditoria` (⚙ DT-29: nombre del usuario, código de la regional y `registro` legible). El Excel pide todo el filtro en lotes de 1000.

● **Acciones y entidades (⚙ DT-37):** las que escribe la base ([Seguridad RLS §8](../../../backend/docs/02-diseno/Seguridad_RLS.md)): notas, factura, cobranzas, cartera inicial (`cargar_cartera_inicial`), devoluciones y NC contable, los cinco documentos de inventario (`registrar_ingreso`, `registrar_salida`, `registrar_retorno`, `registrar_traspaso`, `registrar_ajuste`), cierre y reapertura, maestros (`crear`, `editar`, `desactivar`, `reactivar`, `cambio_precio_base`) y usuarios (`crear_usuario`, `editar_usuario`, `desactivar_usuario`, `reactivar_usuario`, `resetear_password`). Los filtros de acción y entidad listan todas. El resumen usa las claves reales de `datos`: `cerrar_dia.totales.total_ventas`, `cargar_cartera_inicial.{documentos, total}`, `registrar_<tipo>.items` (arreglo); en "Ver detalle" un objeto anidado (los totales del cierre) se muestra campo por campo y un arreglo como cantidad. Enlaces: nota, documento de inventario, devoluciones, liquidación, cliente, usuarios y presupuesto.

**E2E:** CP-11.1, CP-11.3.

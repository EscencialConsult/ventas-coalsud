# Sistema Comercial COALSUD S.R.L.

**Esencial Consultora** · El Alto / La Paz, Bolivia

ERP de ventas multi-regional (La Paz, Cochabamba, Santa Cruz) que reemplaza la operación en WhatsApp + Excel: clientes, inventario, notas de venta, cobranzas, liquidación diaria, EECC, presupuesto y reportes.

| CARPETA | QUÉ ES | DOCUMENTACIÓN |
|---|---|---|
| [`backend/`](backend/) | Proyecto Supabase: migraciones SQL, RLS, RPC, Edge Function, seeds, pruebas pgTAP | [`backend/docs/`](backend/docs/README.md): **fuente de verdad** de requerimientos, reglas de negocio, modelo de datos, seguridad y contrato de API |
| [`frontend/`](frontend/) | App React 19 + TypeScript + Vite + Tailwind 4 + TanStack Query | [`frontend/docs/`](frontend/docs/README.md): stack, arquitectura, diseño, pantallas, impresión/Excel, plan y pruebas |

- **Repo:** monorepo (⚙ DT-12): `backend/` y `frontend/` viven en un solo repositorio git. Este README es el índice de la raíz.
- **Documentación:** v1.1 (26/10/2026), actualizada a la entrega del 28/10/2026.
- **Estado (28/10/2026):** backend BE-01 a BE-22 aplicado en el proyecto Supabase `VENTAS-COALSUD` (dev, ⚙ DT-30) y frontend conectado a él (`VITE_MODO_DATOS=supabase`). Sin carga inicial real (BE-23, ⚙ DT-41). Detalle y pendientes: [Plan de Implementación](backend/docs/04-ejecucion/Plan_Implementacion.md).
- **Credenciales:** `CREDENCIALES.md` en la raíz, fuera de git.
- **Fuentes del relevamiento y documentación v1.0 original:** `Desktop/Coalsud/` (no se modifica).
- **Pendiente con el cliente:** [Registro de Supuestos §3](backend/docs/01-requerimiento/Registro_de_Supuestos.md).

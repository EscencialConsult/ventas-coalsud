ESENCIAL CONSULTORA · FRONTEND

# Estructura del Proyecto Frontend — COALSUD
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

Define cómo se organiza el código, para que cualquier programador encuentre las cosas en el mismo lugar.

**● Cambios v1.1 respecto de la Estructura v1.0:**
- La app vive en `frontend/` del monorepo (⚙ DT-12), hermana de `backend/`: de ahí llegan `src/types/database.ts` y los enlaces a `../../backend/docs/`.
- Se agregan `*.queries.ts`, `core/errores`, `shared/export`, `shared/print` y las áreas `vendedores`, `configuracion` y `eecc`.
- `supabase/` y `e2e/` se reparten: el esquema vive en `backend/` y las pruebas e2e en `frontend/e2e/`.

---

## 1 · Criterios de organización

1. Se agrupa por **área del negocio**, no por tipo de archivo.
2. Hay tres niveles: lo transversal (`core`), lo que se repite (`shared`) y cada área (`features`).
3. Las pantallas **no hablan con la base**: lo hacen a través de los hooks y el servicio de su área.
4. Cada área declara qué rol puede entrar (guard).
5. **Nada hardcodeado:** URLs, claves y parámetros en variables de entorno.
6. El vocabulario del código es el del negocio (nota, liquidación, traspaso, arqueo).

---

## 2 · Árbol

```
frontend/
├── docs/                          esta documentación
├── e2e/                           Playwright (casos de prueba con capa E2E)
│   ├── fixtures/                  usuarios de prueba, helpers de login por rol
│   └── *.spec.ts
├── public/                        logo COALSUD, favicon, _redirects (rewrite SPA de Netlify, ⚙ DT-18)
├── src/
│   ├── main.tsx                   monta <App/>
│   ├── index.css                  @import "tailwindcss" + @theme (tokens) + estilos de impresión base
│   ├── app/
│   │   ├── App.tsx                providers + RouterProvider
│   │   ├── providers.tsx          QueryClientProvider, AuthProvider, RegionalActivaProvider, Toaster
│   │   └── router.tsx             mapa de rutas + roles + lazy por área
│   ├── fixtures/                  datos de ejemplo del modo fixtures (⚙ DT-17)
│   ├── lib/
│   │   ├── config.ts              MODO_FIXTURES, INACTIVIDAD_MIN
│   │   ├── peticion.ts            OpcionesPeticion (signal) · compartirPeticion
│   │   └── supabase.ts            el único createClient<Database>() (perezoso) · dato()
│   ├── types/
│   │   └── database.ts            GENERADO desde el backend (no editar a mano)
│   ├── core/                      lo transversal
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx       sesión + perfil (mi_perfil)
│   │   │   ├── useSesion.ts           usuario actual + rol + regionales
│   │   │   ├── permisos.ts            qué puede hacer cada rol (refleja la RLS)
│   │   │   ├── RolGuard.tsx           corta el paso a rutas no permitidas
│   │   │   └── useInactividad.ts      cierre por inactividad (30 min)
│   │   ├── regional/
│   │   │   ├── RegionalActivaProvider.tsx
│   │   │   └── useRegionalActiva.ts
│   │   ├── avisos/                    avisos_shell: badges, campana, banner (un solo request)
│   │   ├── errores/
│   │   │   ├── codigos.ts             union type con el catálogo del contrato
│   │   │   ├── ErrorNegocio.ts        único tipo de error de la UI (codigo, detalle, causa)
│   │   │   ├── mapearError.ts         Supabase/Auth/red → ErrorNegocio
│   │   │   ├── procesarError.ts       para los catch: mapea y reporta si es inesperado
│   │   │   ├── incidentes.ts          manejador global: store, listeners, ruido ignorado
│   │   │   ├── LimiteErrores.tsx · ErrorRuta.tsx · PantallaError.tsx
│   │   │   └── AvisoIncidentes.tsx · DetalleIncidente.tsx   aviso de dos niveles
│   │   ├── fecha/
│   │   │   └── useHoy.ts              rpc('hoy') con caché de 1 min
│   │   └── models/                    tipos de dominio (formas de los jsonb del contrato)
│   │       regional.ts · usuario.ts · cliente.ts · producto.ts · inventario.ts
│   │       nota-venta.ts · devolucion.ts · cobranza.ts · liquidacion.ts · eecc.ts · reportes.ts
│   ├── shared/                    piezas que se repiten
│   │   ├── layout/
│   │   │   ├── AppShell.tsx           sidebar + topbar + <Outlet/>
│   │   │   ├── Sidebar.tsx            navegación; cambia según el rol
│   │   │   ├── Topbar.tsx             título, selector de regional, usuario
│   │   │   ├── SelectorRegional.tsx
│   │   │   └── BannerDia.tsx          "Día cerrado" / "Días pendientes de cierre"
│   │   ├── ui/
│   │   │   Button · BotonIcono · useAccionAsync · Campo (Input/Select/Textarea) · Badge · EstadoBadge
│   │   │   Card · KpiTile · Tabla (responsive) · SeccionConsulta · BarraProgreso · Pagina
│   │   │   Modal · Confirmacion · Toaster/toast · Estados (EmptyState/Skeleton/Alerta) · PantallaCarga
│   │   │   por venir: TablaBuscador · Paginacion · Switch · SelectorFecha · SelectorPeriodo
│   │   │              BuscadorCliente · BuscadorProducto · MontoBs · CampoCantidad
│   │   ├── format/
│   │   │   moneda.ts · cantidad.ts · fecha.ts · numeroALetras.ts
│   │   ├── export/
│   │   │   excelBase.ts · excelLiquidacion.ts · excelEecc.ts · excelTabla.ts
│   │   ├── print/
│   │   │   PrintLayout.tsx · print.css
│   │   └── hooks/
│   │       useDebounce.ts · useFiltrosEnUrl.ts
│   └── features/                  una carpeta por área funcional
│       ├── auth/            login, cambiar contraseña                           CU-02
│       ├── dashboard/       tablero simplificado                                CU-10
│       ├── usuarios/        alta de usuarios y regionales (nacional)            CU-01
│       ├── clientes/        cartera por regional                                CU-03
│       ├── vendedores/      vendedores por regional                             CU-03
│       ├── catalogo/        productos, líneas, condiciones de pago              CU-04
│       ├── configuracion/   regionales y almacenes (nacional)                   CU-04
│       ├── inventario/      stock, movimientos, documentos, saldo vendedores    CU-05
│       ├── notas-venta/     emisión, historial, factura, anulación, devolución,
│       │                    impresión, hoja de carga                            CU-06
│       ├── cobranzas/       registrar/anular cobro, ingresos por vendedor       CU-07
│       ├── liquidacion/     reporte/arqueo diario + cierre  ← el corazón        CU-08
│       ├── presupuesto/     metas y cumplimiento                                CU-09
│       ├── reportes/        top clientes, productos, rotación, regionales,
│       │                    movimiento por período                              CU-10
│       ├── eecc/            estado de cuentas consolidado (nacional)            CU-10
│       └── auditoria/       trazabilidad (nacional)                             CU-11
├── .env.example
├── .oxlintrc.json                 igual que la referencia
├── index.html · vite.config.ts · tsconfig.json · playwright.config.ts
├── package.json
└── README.md
```

### Dentro de cada área
```
features/notas-venta/
├── notas-venta.routes.tsx        rutas + roles
├── notas-venta.service.ts        habla con Supabase (vistas + RPC)
├── notas-venta.queries.ts        query keys, useQuery/useMutation, invalidaciones
├── notas-venta.validacion.ts     validaciones de UX
├── NotasVentaLista.tsx           historial
├── NotaVentaForm.tsx             nueva nota
├── NotaVentaDetalle.tsx          detalle + acciones (factura, anular, devolver, imprimir)
├── components/                   piezas propias del área (ItemsNota, PanelFactura, ModalDevolucion…)
└── print/
    ├── NotaVentaImpresion.tsx    A5 duplicada en A4
    └── HojaCargaImpresion.tsx
```

---

## 3 · Cómo se recorren las capas

| PASO | DÓNDE OCURRE |
|---|---|
| El usuario toca un botón | Pantalla (componente de la feature) |
| La pantalla pide datos o ejecuta una acción | Hook de `<area>.queries.ts` (TanStack Query) |
| El hook llama al servicio | `<area>.service.ts`: `from().select()` o `rpc()` |
| La base aplica permisos y reglas | RLS + RPC en Supabase (última línea de defensa) |
| El error vuelve con su código | `mapearError` → `acciones.ts` → toast, campo o modal |

---

## 4 · Convenciones

- Carpetas en `kebab-case`; componentes en `PascalCase`; hooks `useX` ([Stack §4](01-Stack_y_Convenciones.md)).
- Lazy loading por área (cada feature carga al entrar).
- `src/types/database.ts` se **genera** (`npm run types` en el backend) y no se edita.
- Todo en castellano, con palabras del negocio.
- **Ninguna regla de permiso ni de precio vive en el código del frontend:** el frontend pide, la base decide.

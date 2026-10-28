ESENCIAL CONSULTORA · EJECUCIÓN DEL PROYECTO

# Estructura del Proyecto Backend — COALSUD S.R.L.
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

Define cómo se organiza el repositorio `backend/`, para que cualquier programador encuentre las cosas en el mismo lugar. El backend es un **proyecto Supabase** (⚙ DT-01): migraciones SQL, Edge Functions, seeds y pruebas pgTAP. No hay servidor propio.

Vive en el mismo repo que `frontend/` (monorepo, ⚙ DT-12): `npm run types` escribe en `../frontend/`.

---

## 1 · Árbol

```
backend/
├── docs/                              esta documentación
├── supabase/
│   ├── config.toml                    configuración local (auth, storage, api: schemas = ["public"])
│   ├── migrations/                    ÚNICA fuente de verdad del esquema (orden en Esquema_BD §6)
│   │   └── 20261027000100_extensiones_y_esquemas.sql …
│   ├── seeds/                         SOLO datos de prueba; db reset carga seeds/*.sql (config.toml)
│   │   ├── 10_catalogo_f3.sql         catálogo de la planilla F3 (precios de prueba)
│   │   ├── 20_usuarios_prueba.sql     irene, ingeniero, vanessa, fernando @coalsud.demo (solo local/dev)
│   │   └── 30_escenario_f3.sql        movimientos y notas del caso dorado (CP-08.10)
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── cors.ts
│   │   │   ├── errores.ts             respuesta { error: { codigo, mensaje } }
│   │   │   └── clientes.ts            createClient(admin) / createClient(usuario)
│   │   └── admin-usuarios/
│   │       ├── deno.json              imports (supabase-js)
│   │       └── index.ts               crear · actualizar · desactivar · reactivar · resetear_password
│   └── tests/                         pgTAP (supabase test db)
│       ├── 00_setup.sql               helpers: crear usuarios de prueba, impersonar
│       ├── 10_rls.test.sql
│       ├── 12_maestros.test.sql        políticas de maestros y su auditoría
│       ├── 15_perfil_usuarios.test.sql  mi_perfil, hoy, RPC admin_*
│       ├── 20_inventario.test.sql
│       ├── 30_ventas.test.sql
│       ├── 40_cobranzas.test.sql
│       ├── 50_liquidacion.test.sql    incluye el caso dorado F3
│       ├── 60_eecc_reportes.test.sql
│       └── 70_integridad.test.sql     verificar_stock, inmutabilidad, auditoría
├── scripts/
│   ├── gen-types.mjs                  genera tipos y los copia a ../frontend/src/types/database.ts
│   ├── concurrencia.mjs               dos emisiones simultáneas sobre el último stock (RNF-02)
│   └── carga-inicial/
│       ├── plantillas/                productos.csv, clientes.csv, vendedores.csv, inventario_inicial.csv, cartera_inicial.csv
│       └── importar.mjs               valida y carga con service_role (solo desde la máquina de quien migra)
├── package.json                       scripts npm (§3)
├── .env.example                       variables de los scripts (nunca la service_role en el repo)
├── .gitignore                         node_modules, .env*, *.local, supabase/.temp, supabase/.branches, supabase/.env.keys
└── README.md                          cómo levantar, probar y desplegar
```

---

## 2 · Convenciones de SQL

1. **Una migración = un cambio con sentido.** Nunca se edita una migración ya aplicada en `dev` o `prod`: se crea otra.
   - Las migraciones llevan **solo estructura**, porque `db push` las aplica también en `prod`.
   - Los datos de prueba (usuarios `@coalsud.demo`, catálogo F3, clientes, escenario F3) van **solo** en `seeds/`. Esos archivos corren con `db:reset` en local y nunca llegan a `prod`.
   - La única excepción son los datos reales fijos desde el día 1, como las regionales y sus almacenes ([Datos Iniciales §1.1](Datos_Iniciales.md)).
2. **Nombres** según el [Esquema](../03-especificacion/Esquema_BD.md) §0. Las RPC públicas llevan verbo de negocio (`emitir_`, `registrar_`, `anular_`, `cerrar_`, `reabrir_`, `reporte_`); los helpers internos viven en `app.`.
3. **Plantilla de una RPC de escritura:**
   ```sql
   create or replace function public.anular_nota_venta(p_nota_id uuid, p_motivo text)
   returns table (id uuid, estado text, aviso_factura text)
   language plpgsql security definer set search_path = '' as $$
   declare v_nota public.nota_venta;
   begin
     select * into v_nota from public.nota_venta n where n.id = p_nota_id for update;
     if not found then perform app.error('NO_ENCONTRADO', 'La nota no existe.'); end if;
     perform app.exigir_escritura(v_nota.regional_id);          -- 1. permiso (desde la fila real)
     perform app.asegurar_dia_abierto(v_nota.regional_id, v_nota.fecha);   -- 2. día
     -- 3. reglas de negocio → app.error('CODIGO', 'mensaje', jsonb)
     -- 4. efecto (movimientos, updates)
     -- 5. app.auditar('anular_nota', 'nota_venta', p_nota_id::text, v_nota.regional_id, jsonb_build_object(...))
     return query select …;
   end $$;
   revoke all on function public.anular_nota_venta(uuid, text) from public, anon;
   grant execute on function public.anular_nota_venta(uuid, text) to authenticated;
   ```
4. **Mensajes** en castellano, en tono de usuario ("El día 11/06/2026 de La Paz está cerrado."). El código va en `hint`.
5. **Sin lógica en el panel de Supabase.** Todo cambio (incluidos bucket, políticas de Storage y configuración de Auth reproducible) se versiona.
6. **Cada RPC nueva trae sus pruebas pgTAP** en el mismo PR: un caso normal y una prueba por cada error del contrato.

## 3 · Scripts npm

| SCRIPT | COMANDO | USO |
|---|---|---|
| `db:start` | `supabase start` | levanta Postgres, Auth, Storage y Studio en Docker |
| `db:stop` | `supabase stop` | apaga los contenedores (conserva los datos) |
| `db:status` | `supabase status` | muestra URL y claves locales |
| `db:reset` | `supabase db reset` | recrea la base local: migraciones (con los datos base reales) + `seeds/*.sql` (datos de prueba) |
| `db:test` | `supabase test db` | corre pgTAP |
| `db:diff` | `supabase db diff -f <nombre>` | solo como ayuda: se revisa y se reescribe a mano |
| `db:push` | `supabase db push --linked` | aplica las migraciones al proyecto vinculado (dev/prod) |
| `types` | `node scripts/gen-types.mjs` | regenera los tipos del frontend |
| `fn:serve` | `supabase functions serve admin-usuarios` | prueba local con recarga en caliente (con `db:start` la función ya está servida; una función **nueva** aparece recién al reiniciar el stack) |
| `fn:deploy` | `supabase functions deploy admin-usuarios` | despliegue |
| `test:concurrencia` | `node scripts/concurrencia.mjs` | RNF-02 |

Cada script se agrega al `package.json` junto con la tarea que crea su archivo: `types` (BE-03), `fn:*` (BE-07), `test:concurrencia` (BE-22).

## 4 · Flujo de trabajo

1. Rama `feature/<area>-<tema>` desde `main`.
2. `supabase migration new <tema>` → escribir el SQL → `npm run db:reset` → `npm run db:test`.
3. Si cambió alguna firma: actualizar el [Contrato de API](../03-especificacion/Contrato_API.md) y correr `npm run types`. En el mismo PR (monorepo, ⚙ DT-12), commitear `../frontend/src/types/database.ts`.
4. PR con:
   - migración;
   - pruebas;
   - docs actualizados;
   - ⚠ SUP afectados, si los hay.
5. Merge → `db:push` a **dev** → prueba en el preview del frontend → `db:push` a **prod** en la ventana de despliegue ([Entornos](Entornos_y_Despliegue.md)).

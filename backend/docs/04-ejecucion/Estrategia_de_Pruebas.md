ESENCIAL CONSULTORA · EJECUCIÓN DEL PROYECTO

# Estrategia de Pruebas del Backend — COALSUD S.R.L.
**v1.1**

Esencial Consultora — El Alto / La Paz, Bolivia

En este sistema, la base de datos **es** el backend: la seguridad, los cálculos y las reglas viven en Postgres. Por eso las pruebas más importantes son las de la base. Las pruebas de pantalla (e2e) están en `frontend/docs/09-Estrategia_de_Pruebas_Frontend.md`.

---

## 1 · Niveles

| NIVEL | HERRAMIENTA | QUÉ CUBRE | CUÁNDO |
|---|---|---|---|
| Unitario de BD | **pgTAP** (`supabase test db`) | Cada RPC (camino normal + cada error del contrato), triggers, RLS, cálculos | En cada PR (CI) |
| Integridad | pgTAP + `app.verificar_stock()` | Invariantes globales (§4) | En cada PR y semanalmente en prod (solo lectura) |
| Concurrencia | `scripts/concurrencia.mjs` (dos conexiones) | Sin sobreventa ni números duplicados (RNF-02) | Antes de cada release |
| Rendimiento | `explain analyze` sobre un seed de volumen | RNF-01 (reporte ≤ 5 s), RNF-03 (listados ≤ 1 s) | Sprint 8 |
| Edge Function | `deno test` + llamada real en local | Permisos y validaciones de `admin-usuarios` | En cada PR que la toque |

---

## 2 · Cómo se impersona a un usuario en pgTAP

```sql
-- 00_setup.sql: crea los usuarios de prueba en auth.users + public.usuario + usuario_regional
create or replace function tests.como(p_email text) returns void language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
end $$;

-- en cada prueba
begin;
select plan(3);
select tests.como('fernando@coalsud.demo');
select is( (select count(*) from public.nota_venta n join public.regional r on r.id = n.regional_id
            where r.codigo = 'LP')::int, 0, 'Fernando no ve notas de La Paz (CP-02.3)');
select throws_ok( $$ select public.reabrir_liquidacion(…) $$, 'P0001', null, 'Regional no reabre (CP-08.9)');
…
select * from finish();
rollback;
```

Cada archivo corre dentro de una transacción con `rollback`: las pruebas no se contaminan entre sí. Para verificar el **código** de error (que viaja en `hint`), se usa un helper `tests.codigo_error($…$)`, que captura la excepción y devuelve el `hint` si es un error de negocio (`P0001`) o el SQLSTATE si no (`42501` = sin permiso). Solo `P0001`: desde PG17 los errores de permiso también traen un `hint`, que es texto.

**`00_setup.sql`** corre primero (orden alfabético) y **hace commit**: deja el esquema `tests` en la base local para los demás archivos. No es una migración: nunca llega a dev/prod, y `db reset` lo borra. Helpers:
- `como(email)`, `como_anon()` y `como_postgres()` para impersonar;
- `codigo_error(sql)` y `filas(sql)`. `filas` sirve porque un update que la RLS filtra no falla: afecta 0 filas;
- `vaciar()` al principio de cada archivo: deja la base vacía dentro de su transacción, así la prueba no depende de los datos base ni de los seeds (el rollback final los devuelve);
- `crear_regionales()` y `crear_usuario(email, rol, regionales[], activo)` para armar datos;
- `detalle_error(sql)`: el `detail` de un error como jsonb (p. ej. `DIA_CERRADO` → `regional`);
- `producto`, `items(nombre, cantidad)` y `saldo(almacen, vendedor, producto)` para inventario;
- `cliente`, `condicion`, `item_nota(producto, cantidad, precio)` y `emitir(regional, cliente, vendedor, items, …)` para ventas. `emitir` corre con el rol impersonado, así que los permisos se prueban de verdad;
- `id_de`, `regional`, `almacen` y `vendedor` para buscar ids. Son security definer y funcionan aunque la RLS del usuario impersonado oculte la fila.

---

## 3 · Mapa de pruebas (CP con capa BD)

| ARCHIVO | CASOS DE PRUEBA |
|---|---|
| `12_maestros.test.sql` | CP-04.3; políticas de maestros por patrón (A/B) y auditoría de maestros (Seguridad RLS §8) |
| `15_perfil_usuarios.test.sql` | CP-01.3, CP-01.5, CP-01.7, CP-02.6 (RPC de sesión y `admin_*`; la Edge Function se prueba contra el stack local) |
| `10_rls.test.sql` | CP-01.3, CP-01.5, CP-02.3, CP-02.4, CP-02.7, CP-03.3, CP-03.4, CP-04.3, CP-09.4, CP-10.3, CP-11.2, CP-11.3, y Seguridad RLS §9 (1–9) |
| `20_inventario.test.sql` | CP-05.1 a CP-05.10, CP-03.6 |
| `22_lecturas_inventario.test.sql` | `v_stock` (incluye faltantes en 0 bajo mínimo), `v_movimiento`, `v_documento_inventario`, `kardex`, `saldo_vendedores` (base de CP-05.5 y CP-05.11) |
| `30_ventas.test.sql` | CP-04.4, CP-06.1 a CP-06.19 (salvo la impresión) |
| `32_factura_anulacion.test.sql` | CP-06.4 (BD), CP-06.7, CP-06.12, CP-06.17, ⚠ SUP-06/41 y `v_nota_venta` (saldo = total − cobrado − abonado) |
| `34_hoja_carga.test.sql` | CP-06.19 (consolida emitidas, sin anuladas; totales netos) |
| `36_devoluciones.test.sql` | CP-06.9, CP-06.13, CP-06.14, CP-06.15, topes de abono y reembolso, N° NC contable con el día cerrado |
| `40_cobranzas.test.sql` | CP-07.1, CP-07.3 a CP-07.8 |
| `50_liquidacion.test.sql` | CP-08.1 a CP-08.4, CP-08.7 a CP-08.15, **CP-08.10 caso dorado F3** |
| `52_cierre.test.sql` | CP-06.5, CP-08.4, CP-08.7, CP-08.8, CP-08.9, CP-08.11, §9.6: cierre secuencial, facturas pendientes, snapshot congelado, reapertura del último día, día sin movimiento |
| `60_eecc_reportes.test.sql` | CP-09.2, CP-09.3, CP-10.1, CP-10.2, CP-12.1, CP-12.2 |
| `70_integridad.test.sql` | §4 de este documento |
| `scripts/concurrencia.mjs` | CP-05.12, RNF-02 |

---

## 4 · Invariantes que se verifican siempre

1. **Stock:** `app.verificar_stock()` devuelve 0 filas (saldo de la tabla = Σ movimientos).
2. **Saldo final:** para toda liquidación cerrada y todo producto, `saldo_final = Σ movimientos con fecha ≤ D` de la regional.
3. **Identidad del día:** `saldo_final = saldo_inicial + pedido + traspaso + devolucion + ajuste − total_ventas_q`.
4. **Arqueo:** `total_efectivo = contado_neto + cobranzas − reembolsos`; `total_ventas = contado_neto + credito_neto`.
5. **Traspaso espejo:** para todo documento `traspaso`, Σ cantidad de sus movimientos = 0 y hay exactamente dos por ítem.
6. **Salida/retorno:** Σ cantidad de sus movimientos = 0 por ítem.
7. **Numeración:** sin huecos ni duplicados por (regional, tipo): `max(n) = count(*)`.
8. **Anulación:** toda nota anulada tiene Σ movimientos = 0 y la fecha de la anulación = la de la nota.
9. **Saldos por cobrar** ≥ 0 en todos los documentos.
10. **RLS:** todas las tablas de `public` con `relrowsecurity = true`; ninguna política `INSERT/UPDATE/DELETE` sobre las tablas del patrón C; `anon` sin privilegios.
11. **Inmutabilidad:** cualquier `update/delete` sobre `auditoria`, `movimiento_inventario` o ítems falla.

---

## 5 · Caso dorado F3 (CP-08.10)

`supabase/seeds/30_escenario_f3.sql` arma, para La Paz:
- el día 10/06/2026, cerrado con los saldos iniciales de la planilla (ajuste `inventario_inicial`);
- el día 11/06/2026, con:
  - los ingresos (Pedido);
  - los traspasos (+);
  - las 4 notas (F-1462 a F-1465), con los productos, cantidades y precios que producen los Bs de la planilla.

La prueba verifica fila por fila las columnas de la planilla y los totales: Contado 3,075.40 · Crédito 1,224.60 · Total Ventas 4,300.00 · Total Efectivo 3,075.40.

**Implementado en `50_liquidacion.test.sql` (BE-18):**
- Las 4 filas verificadas se reproducen exactas.
- Para que cada nota (270.00 / 1,224.60 / 375.00 / 2,430.40) y los totales den lo de la planilla, el resto de los productos se reemplaza por un producto explícito, `NO VERIFICADO F3`.
- Verifica también el invariante Saldo Final = Σ movimientos en todas las filas.

> Para armar el escenario completo hace falta la planilla Excel original (los PDF no permiten leer con certeza todas las celdas, ver [Reglas §3.6](../03-especificacion/Reglas_de_Calculo.md)). Mientras tanto, se usan las 4 filas verificadas.

---

## 6 · Datos de volumen (rendimiento)

Seed `seeds/90_volumen.sql` (solo local):
- 3 regionales, ~150 productos y 300 clientes;
- 60 días con 200 notas por día y regional (~36.000 notas, ~180.000 ítems).

Objetivos:
- `reporte_liquidacion` < 5 s;
- listados paginados < 1 s;
- `eecc_consolidado` < 5 s.

Índices de soporte: [Esquema §1](../03-especificacion/Esquema_BD.md).

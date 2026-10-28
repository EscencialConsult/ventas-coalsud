// Prueba de concurrencia (Estrategia de Pruebas §1, CP-05.12, RNF-02): dos ventas simultáneas del
// mismo stock no lo sobrevenden, y N notas simultáneas no repiten ni saltean números.
// Arma una regional aislada (ZQC) con su usuario, corre sesiones psql en paralelo y al final borra
// todo lo que creó (con los triggers apagados: session_replication_role = replica). Nunca contra prod.
// Uso: SUPABASE_DB_URL=postgresql://… npm run db:concurrencia
import { spawn } from 'node:child_process'

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error('Falta SUPABASE_DB_URL (cadena de conexión de la base dev o local).')
  process.exit(1)
}

const EMAIL = 'concurrencia@coalsud.prueba'
const PRODUCTO = 'ZQC PRODUCTO CONCURRENCIA'
const R = `(select id from public.regional where codigo = 'ZQC')`
const U = `(select id from auth.users where email = '${EMAIL}')`
const P = `(select id from public.producto where nombre = '${PRODUCTO}')`

function psql(sql) {
  return new Promise((resolver) => {
    const p = spawn('psql', [url, '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1'])
    let salida = ''
    let error = ''
    p.stdout.on('data', (d) => (salida += d))
    p.stderr.on('data', (d) => (error += d))
    p.on('close', (codigo) => resolver({ codigo, salida: salida.trim(), error: error.trim() }))
    p.stdin.end(sql)
  })
}

// Impersonación como PostgREST (claims antes del rol: el rol corta el acceso a auth.users).
const como = `select set_config('request.jwt.claims', json_build_object('sub', ${U}, 'role', 'authenticated')::text, true), set_config('role', 'authenticated', true);`
const emitir = (cantidad) => `select public.emitir_nota_venta(${R}, public.hoy(),
  (select id from public.cliente where regional_id = ${R}), (select id from public.vendedor where regional_id = ${R}),
  null, null, 0, 'almacen', null, null, jsonb_build_array(jsonb_build_object('producto_id', ${P}, 'cantidad', ${cantidad}, 'precio_aplicado', 10)));`

const limpiar = `begin;
set local session_replication_role = replica;
create temporary table zq on commit drop as select ${R} as r, ${U} as u, ${P} as p;
delete from public.auditoria where regional_id = (select r from zq) or usuario_id = (select u from zq) or entidad_id = (select p::text from zq);
delete from public.movimiento_inventario where regional_id = (select r from zq);
delete from public.stock_saldo where regional_id = (select r from zq);
delete from public.nota_venta_item where nota_venta_id in (select id from public.nota_venta where regional_id = (select r from zq));
delete from public.nota_venta where regional_id = (select r from zq);
delete from public.documento_inventario_item where documento_id in (select id from public.documento_inventario where regional_id = (select r from zq));
delete from public.documento_inventario where regional_id = (select r from zq);
delete from public.liquidacion where regional_id = (select r from zq);
delete from public.correlativo where regional_id = (select r from zq);
delete from public.cliente where regional_id = (select r from zq);
delete from public.vendedor where regional_id = (select r from zq);
delete from public.almacen where regional_id = (select r from zq);
delete from public.usuario_regional where usuario_id = (select u from zq);
delete from public.usuario where id = (select u from zq);
delete from auth.users where id = (select u from zq);
delete from public.producto where id = (select p from zq);
delete from public.regional where id = (select r from zq);
commit;`

const preparar = `begin;
insert into public.regional (codigo, nombre) values ('ZQC', 'ZQ Concurrencia');
insert into public.almacen (regional_id, nombre) values (${R}, 'Almacén ZQC');
insert into auth.users (id, email) values (gen_random_uuid(), '${EMAIL}');
insert into public.usuario (id, nombre, email, rol, debe_cambiar_password) values (${U}, 'Concurrencia', '${EMAIL}', 'regional', false);
insert into public.usuario_regional (usuario_id, regional_id) values (${U}, ${R});
insert into public.vendedor (regional_id, nombre) values (${R}, 'Vendedor ZQC');
insert into public.producto (nombre, linea_id, precio_base) values ('${PRODUCTO}', (select id from public.linea_comercial order by orden, nombre limit 1), 10);
insert into public.cliente (regional_id, nombre, categoria, canal, condicion_pago_id)
  values (${R}, 'Cliente ZQC', 'mayorista', 'ruta', (select id from public.condicion_pago where tipo = 'contado' order by orden, nombre limit 1));
commit;
begin; ${como}
select public.registrar_ingreso((select id from public.almacen where regional_id = ${R}), public.hoy(), 'concurrencia',
  jsonb_build_array(jsonb_build_object('producto_id', ${P}, 'cantidad', 10)));
commit;`

const fallas = []
const verificar = (condicion, mensaje) => {
  console.log(`${condicion ? '✓' : '✗'} ${mensaje}`)
  if (!condicion) fallas.push(mensaje)
}

try {
  await psql(limpiar) // restos de una corrida anterior
  const prep = await psql(preparar)
  if (prep.codigo !== 0) throw new Error(`No se pudo preparar el escenario:\n${prep.error}`)

  // 1 · Sobreventa: stock 10, dos ventas de 8 a la vez. La primera retiene el bloqueo 1.5 s antes del commit.
  const venta = () => psql(`begin; ${como} ${emitir(8)} select pg_sleep(1.5); commit;`)
  const ventas = await Promise.all([venta(), venta()])
  const exitosas = ventas.filter((v) => v.codigo === 0).length
  const rechazadas = ventas.filter((v) => v.codigo !== 0 && /STOCK_INSUFICIENTE/.test(v.error)).length
  verificar(exitosas === 1 && rechazadas === 1, `Dos ventas de 8 con stock 10: ${exitosas} confirmada, ${rechazadas} rechazada por STOCK_INSUFICIENTE`)
  const stock = await psql(`select cantidad from public.stock_saldo where producto_id = ${P} and vendedor_id is null;`)
  verificar(stock.salida === '2.00', `Stock final del almacén: ${stock.salida} (esperado 2.00)`)

  // 2 · Numeración: 8 notas de 1 unidad en paralelo (reponiendo stock antes).
  await psql(`begin; ${como} select public.registrar_ingreso((select id from public.almacen where regional_id = ${R}), public.hoy(), 'concurrencia',
    jsonb_build_array(jsonb_build_object('producto_id', ${P}, 'cantidad', 20))); commit;`)
  const notas = await Promise.all(Array.from({ length: 8 }, () => psql(`begin; ${como} ${emitir(1)} commit;`)))
  verificar(notas.every((n) => n.codigo === 0), `8 notas simultáneas confirmadas (${notas.filter((n) => n.codigo === 0).length}/8)`)
  const numeros = await psql(`select count(*) || ' ' || count(distinct numero) || ' ' || max(substring(numero from '(\\d+)$')::int)
    from public.nota_venta where regional_id = ${R};`)
  verificar(numeros.salida === '9 9 9', `Notas: total, distintas y último número = ${numeros.salida} (esperado 9 9 9: sin huecos ni duplicados)`)

  const integridad = await psql(`select count(*) from app.verificar_stock();`)
  verificar(integridad.salida === '0', `verificar_stock: ${integridad.salida} diferencias`)
} catch (e) {
  fallas.push(e.message)
  console.error(e.message)
} finally {
  const fin = await psql(limpiar)
  console.log(fin.codigo === 0 ? '· Datos de la prueba borrados' : `✗ No se pudo limpiar:\n${fin.error}`)
}

console.log(fallas.length ? `\n${fallas.length} falla(s)` : '\nConcurrencia OK')
process.exit(fallas.length ? 1 : 0)

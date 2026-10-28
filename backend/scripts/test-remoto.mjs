// Corre las pruebas pgTAP contra una base remota (dev) sin Docker (⚙ DT-30).
// Cada archivo va en UNA transacción con los helpers de 00_setup.sql y termina en rollback:
// no deja datos, ni el esquema tests, ni la extensión pgtap. Nunca contra prod.
// Uso: SUPABASE_DB_URL=postgresql://… npm run db:test:remoto [-- 40_cobranzas]
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const tests = resolve(dirname(fileURLToPath(import.meta.url)), '../supabase/tests')
const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error('Falta SUPABASE_DB_URL (cadena de conexión de la base dev, ver .env.example).')
  process.exit(1)
}

// Sin las líneas de control de transacción ni el plan propio del setup.
const sinTransaccion = (sql) => sql.split(/\r?\n/).filter((l) => !/^(begin|commit|rollback);\s*$/i.test(l.trim())).join('\n')
const setup = sinTransaccion(readFileSync(resolve(tests, '00_setup.sql'), 'utf8').split(/^select plan\(1\);/m)[0])

const filtro = process.argv[2]
const archivos = readdirSync(tests)
  .filter((f) => f.endsWith('.test.sql') && (!filtro || f.includes(filtro)))
  .sort()

let fallidos = 0
for (const archivo of archivos) {
  const cuerpo = sinTransaccion(readFileSync(resolve(tests, archivo), 'utf8'))
  const script = `\\set ON_ERROR_STOP 1\nset client_min_messages = warning;\nbegin;\n${setup}\n${cuerpo}\nrollback;\n`
  const r = spawnSync('psql', [url, '-X', '-q', '-A', '-t'], { input: script, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
  const salida = `${r.stdout ?? ''}`
  const malos = salida.split(/\r?\n/).filter((l) => /^not ok/.test(l) || /^# Looks like/.test(l))
  const total = (salida.match(/^ok \d+/gm) ?? []).length
  if (r.status !== 0 || malos.length) {
    fallidos++
    console.log(`✗ ${archivo} (${total} ok)`)
    for (const l of salida.split(/\r?\n/).filter((x) => /^(not ok|#)/.test(x))) console.log(`    ${l}`)
    if (r.stderr?.trim()) console.log(`    ${r.stderr.trim().split(/\r?\n/).join('\n    ')}`)
  } else {
    console.log(`✓ ${archivo} (${total} ok)`)
  }
}
console.log(fallidos ? `\n${fallidos} archivo(s) con fallas` : `\nTodo en verde (${archivos.length} archivos)`)
process.exit(fallidos ? 1 : 0)

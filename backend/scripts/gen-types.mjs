// Genera los tipos TypeScript de la base local y los copia al frontend (⚙ DT-13).
// Requiere el stack levantado (npm run db:start) y la carpeta frontend/ hermana de backend/ (monorepo, ⚙ DT-12).
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const backend = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const frontend = resolve(backend, '../frontend')
const destino = resolve(frontend, 'src/types/database.ts')

if (!existsSync(resolve(frontend, 'package.json'))) {
  console.error(`No se encontró la carpeta frontend en ${frontend}. Debe estar al lado de backend (monorepo, ⚙ DT-12).`)
  process.exit(1)
}

const tipos = execSync('npx supabase gen types typescript --local --schema public', {
  cwd: backend,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
  stdio: ['ignore', 'pipe', 'ignore'],
})

// La CLI lo entrega sin formato; formateado, el diff del PR del frontend se puede revisar.
const formateado = execSync('npx oxfmt --stdin-filepath=database.ts', {
  cwd: backend,
  input: tipos,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
})

mkdirSync(dirname(destino), { recursive: true })
writeFileSync(destino, `// GENERADO por backend/scripts/gen-types.mjs (npm run types). No editar a mano.\n\n${formateado}`)
console.log(`Tipos escritos en ${destino}`)

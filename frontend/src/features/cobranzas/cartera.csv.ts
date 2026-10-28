// Plantilla `cartera_inicial.csv` (Datos Iniciales §4.2): UTF-8, separador
// `;`, decimales con punto. Lectura y validación de formato; las referencias
// (regional, cliente) las resuelve el modal.

export const COLUMNAS_CARTERA = ['regional_codigo', 'cliente_nombre', 'numero_documento', 'fecha_documento', 'fecha_vencimiento', 'importe', 'observaciones'] as const
const OBLIGATORIAS = ['regional_codigo', 'cliente_nombre', 'numero_documento', 'fecha_documento', 'importe']

export type FilaCsv = Record<(typeof COLUMNAS_CARTERA)[number], string> & { linea: number }

export const PLANTILLA_CARTERA = `${COLUMNAS_CARTERA.join(';')}\nLP;Hipermaxi La Paz;SALDO-2026-05-HIPERMAXI;2026-05-01;2026-05-31;1879.80;Saldo del EECC\n`

const limpiar = (valor: string) => valor.trim().replace(/^"(.*)"$/, '$1').trim()

export function leerCsvCartera(texto: string): { filas: FilaCsv[]; error: string | null } {
  const lineas = texto.replace(/^﻿/, '').split(/\r?\n/)
  const encabezado = (lineas[0] ?? '').split(';').map((c) => limpiar(c).toLowerCase())
  const faltan = OBLIGATORIAS.filter((c) => !encabezado.includes(c))
  if (faltan.length) return { filas: [], error: `Faltan columnas: ${faltan.join(', ')}. Use la plantilla.` }
  const filas: FilaCsv[] = []
  lineas.slice(1).forEach((linea, i) => {
    if (!linea.trim()) return
    const valores = linea.split(';').map(limpiar)
    const fila = { linea: i + 2 } as FilaCsv
    for (const columna of COLUMNAS_CARTERA) {
      const indice = encabezado.indexOf(columna)
      fila[columna] = indice >= 0 ? (valores[indice] ?? '') : ''
    }
    filas.push(fila)
  })
  return { filas, error: filas.length ? null : 'El archivo no tiene filas.' }
}

/** 'AAAA-MM-DD' o 'DD/MM/AAAA' → 'AAAA-MM-DD'; inválida → null. */
export function fechaIso(texto: string): string | null {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto)
  const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto)
  const [anio, mes, dia] = iso ? [iso[1], iso[2], iso[3]].map(Number) : local ? [local[3], local[2], local[1]].map(Number) : []
  if (!anio) return null
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  if (fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) return null
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

/** Importe con punto decimal, > 0 y hasta 2 decimales; si no, null. */
export function importeCsv(texto: string): number | null {
  return /^\d+(\.\d{1,2})?$/.test(texto) && Number(texto) > 0 ? Number(texto) : null
}

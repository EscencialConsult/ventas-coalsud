import { descargarArchivo } from './descargar'

export type FormatoCelda = 'texto' | 'monto' | 'cantidad' | 'pct' | 'fecha'

export interface ColumnaExcel<T> {
  titulo: string
  formato?: FormatoCelda
  valor: (fila: T) => string | number | null
}

const FORMATOS: Record<Exclude<FormatoCelda, 'texto'>, string> = {
  monto: '#,##0.00',
  cantidad: '#,##0.##',
  pct: '0.0"%"',
  fecha: 'dd/mm/yyyy',
}

/** 'AAAA-MM-DD' → fecha de Excel (sin corrimiento de zona horaria). */
const fechaExcel = (iso: string) => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))))

/**
 * Export genérico de tablas (07-Impresion §7): título con el filtro aplicado,
 * encabezado en negrita con autofiltro, anchos automáticos, números con formato
 * y fechas como fecha de Excel. exceljs se carga recién al exportar (regla 23).
 */
export async function exportarTabla<T>({ titulo, nombre, columnas, filas }: { titulo: string; nombre: string; columnas: ColumnaExcel<T>[]; filas: T[] }): Promise<void> {
  const { Workbook } = await import('exceljs')
  const libro = new Workbook()
  const hoja = libro.addWorksheet('Datos', { views: [{ state: 'frozen', ySplit: 3 }] })
  hoja.getCell(1, 1).value = titulo
  hoja.getCell(1, 1).font = { bold: true, size: 13 }
  const encabezado = hoja.getRow(3)
  columnas.forEach((c, i) => {
    const celda = encabezado.getCell(i + 1)
    celda.value = c.titulo
    celda.font = { bold: true }
  })
  filas.forEach((fila, f) => {
    const row = hoja.getRow(f + 4)
    columnas.forEach((c, i) => {
      const v = c.valor(fila)
      const celda = row.getCell(i + 1)
      if (v === null || v === '') return
      celda.value = c.formato === 'fecha' && typeof v === 'string' ? fechaExcel(v) : v
      if (c.formato && c.formato !== 'texto') celda.numFmt = FORMATOS[c.formato]
    })
  })
  hoja.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: columnas.length } }
  columnas.forEach((c, i) => {
    const largo = Math.max(c.titulo.length, ...filas.slice(0, 500).map((fila) => String(c.valor(fila) ?? '').length))
    hoja.getColumn(i + 1).width = Math.min(50, Math.max(10, largo + 2))
  })
  const contenido = await libro.xlsx.writeBuffer()
  descargarArchivo(contenido, `${nombre}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

/** Nombre de archivo de un reporte: `<Reporte>_<Regional|Todas>_<desde>_<hasta>`. */
export const nombreExport = (reporte: string, regional: string | null | undefined, desde?: string, hasta?: string) =>
  [reporte, regional ?? 'Todas', desde, hasta].filter(Boolean).join('_').replace(/\s+/g, '')

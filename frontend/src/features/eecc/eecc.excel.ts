import type { CategoriaCliente } from '@/core/models/maestros'
import { EMPRESA } from '@/core/empresa'
import { etiquetaCategoria } from '@/features/clientes/clientes.opciones'
import { descargarArchivo } from '@/shared/export/descargar'
import { nombreMes } from '@/shared/format/fecha'
import type { EeccConsolidado } from './eecc.service'

const FORMATO_BS = '#,##0.00;-#,##0.00;"-"'

/** "AL 11 DE JUNIO 2026" */
const alFecha = (iso: string) => `AL ${Number(iso.slice(8, 10))} DE ${nombreMes(Number(iso.slice(5, 7))).toUpperCase()} ${iso.slice(0, 4)}`

/**
 * Excel con el formato de las planillas F4/F5 (07-Impresion §5): encabezado de
 * COALSUD, un bloque por regional y categoría con su TOTAL y, al final, el
 * SALDO ACTUAL. Vencido y mora son opcionales (⚠ SUP-26).
 */
export async function exportarEecc(e: EeccConsolidado, categoria: CategoriaCliente | '', conMora: boolean): Promise<void> {
  const { Workbook } = await import('exceljs')
  const libro = new Workbook()
  const hoja = libro.addWorksheet('EECC', { pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } })
  const claves = [...e.columnas.map((c) => c.clave), 'total', ...(conMora ? ['vencido', 'mora'] : [])]
  const etiquetas = [...e.columnas.map((c) => c.etiqueta), 'TOTAL', ...(conMora ? ['VENCIDO', 'MÁX. DÍAS MORA'] : [])]
  const ancho = claves.length + 2

  const encabezado = [EMPRESA.razonSocial, `NIT: ${EMPRESA.nit}`, `DIR.: ${EMPRESA.direccion.split('·')[0].trim().toUpperCase()}`, 'EL ALTO - BOLIVIA']
  encabezado.forEach((texto, i) => {
    hoja.getCell(i + 1, 1).value = texto
    hoja.getCell(i + 1, 1).font = { bold: i === 0 }
  })
  const titulos = [`ESTADO DE CUENTAS POR COBRAR - ${categoria ? etiquetaCategoria(categoria).toUpperCase() : 'CONSOLIDADO'}`, alFecha(e.fecha_corte), '(Expresado en Bolivianos)']
  titulos.forEach((texto, i) => {
    hoja.mergeCells(i + 6, 1, i + 6, ancho)
    const c = hoja.getCell(i + 6, 1)
    c.value = texto
    c.font = { bold: i < 2 }
    c.alignment = { horizontal: 'center' }
  })

  let fila = 10
  const celdaMonto = (f: number, col: number, valor: number, negrita = false) => {
    const c = hoja.getCell(f, col)
    c.value = valor
    c.numFmt = FORMATO_BS
    if (negrita) c.font = { bold: true }
  }
  for (const g of e.grupos) {
    const cabecera = [`${g.regional} · ${etiquetaCategoria(g.categoria).toUpperCase()}`, ...etiquetas, 'VENDEDOR']
    cabecera.forEach((texto, i) => {
      const c = hoja.getCell(fila, i + 1)
      c.value = texto
      c.font = { bold: true }
      c.border = { bottom: { style: 'thin' } }
    })
    fila++
    for (const cl of g.clientes) {
      hoja.getCell(fila, 1).value = cl.cliente
      claves.forEach((k, i) => {
        if (k === 'mora') hoja.getCell(fila, i + 2).value = cl.max_dias_mora || '-'
        else celdaMonto(fila, i + 2, k === 'total' ? cl.total : k === 'vencido' ? cl.vencido : (cl.saldos[k] ?? 0))
      })
      hoja.getCell(fila, ancho).value = cl.vendedor ?? ''
      fila++
    }
    hoja.getCell(fila, 1).value = 'TOTAL'
    hoja.getCell(fila, 1).font = { bold: true }
    claves.forEach((k, i) => {
      if (k !== 'vencido' && k !== 'mora') celdaMonto(fila, i + 2, g.subtotal[k] ?? 0, true)
    })
    fila += 2
  }
  hoja.getCell(fila, 1).value = 'SALDO ACTUAL'
  hoja.getCell(fila, 1).font = { bold: true }
  claves.forEach((k, i) => {
    if (k !== 'vencido' && k !== 'mora') celdaMonto(fila, i + 2, e.total_general[k] ?? 0, true)
  })

  hoja.getColumn(1).width = 34
  for (let i = 2; i < ancho; i++) hoja.getColumn(i).width = 13
  hoja.getColumn(ancho).width = 20
  const contenido = await libro.xlsx.writeBuffer()
  descargarArchivo(contenido, `EECC_${e.fecha_corte}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

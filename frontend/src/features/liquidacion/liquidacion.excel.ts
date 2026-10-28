import type { Borders, Fill, Worksheet } from 'exceljs'
import type { ReporteLiquidacion } from '@/core/models/liquidacion'
import { descargarArchivo } from '@/shared/export/descargar'
import { formatoFecha } from '@/shared/format/fecha'
import { columnasMatriz } from './liquidacion.columnas'

// Excel con formato de planilla (07-Impresion §4.2): replica F3, "RESUMEN DE
// REPORTE DE VENTAS". Se carga solo al exportar (import dinámico, regla 23).
// Colores de F3 aproximados: a ajustar con el Excel original del cliente.

const COLOR: Record<string, string> = {
  items: 'F8CBAD',
  saldo_inicial: 'DDEBF7',
  pedido: 'FFF2CC',
  traspaso: 'D9D9D9',
  venta_credito: 'C6E0B4',
  saldo_final: '9BC2E6',
}
const FORMATO_Q = '#,##0.##'
const FORMATO_BS = '#,##0.00;-#,##0.00;"-"'
const BORDE: Partial<Borders> = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
const relleno = (color: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${color}` } })

function colorDe(clave: string): string | undefined {
  if (clave.startsWith('venta_credito')) return COLOR.venta_credito
  return COLOR[clave]
}

/** Bloque inferior "DETALLE | BS" como en F3. */
function bloque(hoja: Worksheet, fila: number, titulo: string, filas: { detalle: string; bs: number; resaltar?: boolean }[], total: string, ancho: number): number {
  hoja.getCell(fila, 1).value = titulo
  hoja.getCell(fila, 1).font = { bold: true }
  hoja.getCell(fila + 1, 1).value = 'DETALLE'
  hoja.getCell(fila + 1, ancho).value = 'BS'
  for (const c of [hoja.getCell(fila + 1, 1), hoja.getCell(fila + 1, ancho)]) c.font = { bold: true }
  let n = fila + 2
  for (const f of filas) {
    hoja.getCell(n, 1).value = f.detalle
    const bs = hoja.getCell(n, ancho)
    bs.value = f.bs
    bs.numFmt = FORMATO_BS
    if (f.resaltar) for (const c of [hoja.getCell(n, 1), bs]) c.fill = relleno(COLOR.venta_credito)
    n++
  }
  hoja.getCell(n, 1).value = total
  const suma = hoja.getCell(n, ancho)
  suma.value = filas.reduce((t, f) => t + f.bs, 0)
  suma.numFmt = FORMATO_BS
  for (const c of [hoja.getCell(n, 1), suma]) c.font = { bold: true }
  return n + 2
}

export async function exportarLiquidacion(r: ReporteLiquidacion): Promise<void> {
  const { Workbook } = await import('exceljs')
  const libro = new Workbook()
  const hoja = libro.addWorksheet('Liquidación', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '8:9' },
    views: [{ state: 'frozen', xSplit: 1, ySplit: 9 }],
  })
  const columnas = columnasMatriz(r.columnas_extra)
  const ancho = columnas.length + 1
  hoja.getColumn(1).width = 36
  for (let i = 2; i <= ancho; i++) hoja.getColumn(i).width = 11

  // Filas 1–5: título y, a la derecha, la caja de arqueo.
  hoja.mergeCells(1, 1, 1, ancho - 3)
  hoja.getCell(1, 1).value = 'RESUMEN DE REPORTE DE VENTAS'
  hoja.getCell(1, 1).font = { bold: true, size: 14 }
  hoja.getCell(2, 1).value = `REGIONAL: ${r.regional.nombre.toUpperCase()} — CONSOLIDADO`
  hoja.getCell(3, 1).value = `FECHA: ${formatoFecha(r.fecha)}`
  for (const fila of [2, 3]) hoja.getCell(fila, 1).font = { bold: true }
  const caja: [string, number][] = [
    ['CONTADO', r.arqueo.contado],
    ['CRÉDITO', r.arqueo.credito],
    ['COBRANZAS', r.arqueo.cobranzas],
    ...(r.arqueo.reembolsos > 0 ? [['(REEMBOLSOS)', -r.arqueo.reembolsos] as [string, number]] : []),
    ['TOTAL VENTAS', r.arqueo.total_ventas],
    ['TOTAL EFECTIVO', r.arqueo.total_efectivo],
  ]
  caja.forEach(([etiqueta, valor], i) => {
    hoja.mergeCells(i + 1, ancho - 2, i + 1, ancho - 1)
    const e = hoja.getCell(i + 1, ancho - 2)
    const v = hoja.getCell(i + 1, ancho)
    e.value = etiqueta
    v.value = valor
    v.numFmt = FORMATO_BS
    for (const c of [e, v]) {
      c.font = { bold: true }
      c.border = BORDE
    }
  })

  // Encabezado en dos filas (8 y 9), con celdas combinadas y los colores de F3.
  const cabecera = (fila: number, columna: number, texto: string, color?: string) => {
    const c = hoja.getCell(fila, columna)
    c.value = texto
    c.font = { bold: true }
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    c.border = BORDE
    if (color) c.fill = relleno(color)
  }
  hoja.mergeCells(8, 1, 9, 1)
  cabecera(8, 1, 'ITEMS', COLOR.items)
  columnas.forEach((c, i) => {
    const col = i + 2
    if (!c.grupo) {
      hoja.mergeCells(8, col, 9, col)
      cabecera(8, col, c.titulo, colorDe(c.clave))
    } else {
      if (columnas[i - 1]?.grupo !== c.grupo) {
        hoja.mergeCells(8, col, 8, col + 1)
        cabecera(8, col, c.grupo, colorDe(c.clave))
      }
      cabecera(9, col, c.titulo, colorDe(c.clave))
    }
  })

  // Cuerpo: catálogo completo por línea.
  let fila = 10
  for (const l of r.lineas) {
    hoja.mergeCells(fila, 1, fila, ancho)
    const titulo = hoja.getCell(fila, 1)
    titulo.value = l.linea
    titulo.font = { bold: true, underline: true }
    titulo.alignment = { horizontal: 'center' }
    fila++
    for (const p of l.productos) {
      hoja.getCell(fila, 1).value = p.producto
      columnas.forEach((c, i) => {
        const v = p[c.clave]
        const celda = hoja.getCell(fila, i + 2)
        // Cantidades en cero, vacías (como la planilla); los Bs en cero muestran "-".
        if (c.formato === 'monto') {
          celda.value = v
          celda.numFmt = FORMATO_BS
        } else if (v) {
          celda.value = v
          celda.numFmt = FORMATO_Q
        }
      })
      fila++
    }
  }

  // Pie: TOTAL VENTAS / DESCUENTOS / TOTALES en las columnas Bs.
  const columnaDe = (clave: string) => columnas.findIndex((c) => c.clave === clave) + 2
  const pie: [string, number, number, number][] = [
    ['TOTAL VENTAS', r.pie.contado_bruto, r.pie.credito_bruto, r.pie.contado_bruto + r.pie.credito_bruto],
    ['DESCUENTOS', r.pie.descuento_contado, r.pie.descuento_credito, r.pie.descuento_contado + r.pie.descuento_credito],
    ['TOTALES', r.pie.contado_neto, r.pie.credito_neto, r.pie.total_ventas],
  ]
  for (const [etiqueta, contado, credito, total] of pie) {
    hoja.getCell(fila, 1).value = etiqueta
    const celdas: [string, number][] = [
      ['venta_contado_bs', contado],
      ['venta_credito_bs', credito],
      ['total_ventas_bs', total],
    ]
    for (const [clave, valor] of celdas) {
      const c = hoja.getCell(fila, columnaDe(clave))
      c.value = valor
      c.numFmt = FORMATO_BS
      c.font = { bold: true }
    }
    hoja.getCell(fila, 1).font = { bold: true }
    fila++
  }

  // Bloques inferiores: créditos (todas las notas), cobranzas y devoluciones.
  fila += 2
  fila = bloque(
    hoja,
    fila,
    'CRÉDITOS',
    r.notas
      .filter((n) => n.estado === 'emitida')
      .map((n) => ({ detalle: `${n.numero_factura ?? 'PENDIENTE'} · ${n.numero} · ${n.cliente}`, bs: n.total, resaltar: n.condicion === 'credito' })),
    'TOTAL BS.-',
    ancho,
  )
  fila = bloque(hoja, fila, 'COBRANZAS', r.cobranzas.map((c) => ({ detalle: `${c.numero} · ${c.cliente} · ${c.documento}`, bs: c.importe })), 'TOTAL COBRANZAS', ancho)
  if (r.devoluciones.length) {
    bloque(hoja, fila, 'DEVOLUCIONES', r.devoluciones.map((d) => ({ detalle: `${d.numero} · ${d.nota} · ${d.cliente}`, bs: d.importe })), 'TOTAL DEVOLUCIONES', ancho)
  }

  const contenido = await libro.xlsx.writeBuffer()
  descargarArchivo(contenido, `Liquidacion_${r.regional.codigo}_${r.fecha}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}

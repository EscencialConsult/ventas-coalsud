import type { DocumentoDetalle, Movimiento, NuevoDocumento, TipoDocumento, TipoMovimiento } from '@/core/models/inventario'
import type { OrigenStock } from '@/core/models/nota-venta'
import { sumarDias } from '@/shared/format/fecha'
import { ALMACENES, estable, filaStock, LINEAS, nuevoId, PRODUCTOS, STOCK } from './maestros'
import { REGIONALES, usuarioDe, VENDEDORES } from './organizacion'
import { AYER, HOY, ITEMS_NOTA, LIQUIDACIONES_ABIERTAS, NOTAS } from './ventas'

// Documentos y movimientos de inventario de ejemplo. El historial se arma
// hacia atrás desde el stock actual (STOCK), así el kardex y el saldo en poder
// de los vendedores cuadran con lo que muestran Stock y Vendedores.

export const PREFIJO: Record<TipoDocumento, string> = { ingreso: 'NI', salida: 'NS', retorno: 'RT', traspaso: 'TR', ajuste: 'AJ' }

export const DOCUMENTOS: DocumentoDetalle[] = []
export const MOVIMIENTOS: Movimiento[] = []

const almacenDe = (id: string) => ALMACENES.find((a) => a.id === id)
const codigoDe = (regionalId: string) => REGIONALES.find((r) => r.id === regionalId)?.codigo ?? '?'

/**
 * Día cerrado (tg_bloqueo_dia): hasta hoy, todo día sin liquidación abierta.
 * Hoy arranca abierto; cerrar y reabrir mueven LIQUIDACIONES_ABIERTAS.
 */
export function diaCerrado(regionalId: string, fecha: string): boolean {
  return fecha <= HOY && !LIQUIDACIONES_ABIERTAS.some((l) => l.regional_id === regionalId && l.fecha === fecha)
}

/** Hora de Bolivia (UTC−4, sin horario de verano), en el mismo formato que el historial. */
export const ahoraBolivia = () => `${new Date(Date.now() - 4 * 3_600_000).toISOString().slice(0, 19)}-04:00`

const instante = (fecha: string, hora: number) => `${fecha}T${String(hora).padStart(2, '0')}:00:00-04:00`

interface Efecto {
  almacen_id: string
  vendedor_id: string | null
  producto_id: string
  cantidad: number
  tipo: TipoMovimiento
}

/** Movimientos que genera un documento (Contrato §5.1). */
export function efectosDe(doc: NuevoDocumento): Efecto[] {
  return doc.items.flatMap(({ producto_id, cantidad: q }): Efecto[] => {
    const base = { almacen_id: doc.almacen_id, producto_id }
    switch (doc.tipo) {
      case 'ingreso':
        return [{ ...base, vendedor_id: null, cantidad: q, tipo: 'ingreso' }]
      case 'ajuste':
        return [{ ...base, vendedor_id: null, cantidad: q, tipo: 'ajuste' }]
      case 'salida':
        return [
          { ...base, vendedor_id: null, cantidad: -q, tipo: 'salida' },
          { ...base, vendedor_id: doc.vendedor_id, cantidad: q, tipo: 'salida' },
        ]
      case 'retorno':
        return [
          { ...base, vendedor_id: doc.vendedor_id, cantidad: -q, tipo: 'retorno' },
          { ...base, vendedor_id: null, cantidad: q, tipo: 'retorno' },
        ]
      case 'traspaso':
        return [
          { ...base, vendedor_id: null, cantidad: -q, tipo: 'traspaso_salida' },
          { almacen_id: doc.almacen_destino_id ?? '', producto_id, vendedor_id: null, cantidad: q, tipo: 'traspaso_entrada' },
        ]
    }
  })
}

function agregarMovimiento(e: Efecto, fecha: string, origen: { documento_id?: string; nota_venta_id?: string; devolucion_id?: string; numero: string }, usuario: string, creado: string) {
  const almacen = almacenDe(e.almacen_id)
  const producto = PRODUCTOS.find((p) => p.id === e.producto_id)
  MOVIMIENTOS.push({
    id: nuevoId('mov'),
    fecha,
    tipo: e.tipo,
    regional_id: almacen?.regional_id ?? '',
    almacen_id: e.almacen_id,
    almacen_nombre: almacen?.nombre ?? '',
    vendedor_id: e.vendedor_id,
    vendedor_nombre: VENDEDORES.find((v) => v.id === e.vendedor_id)?.nombre ?? null,
    producto_id: e.producto_id,
    producto_nombre: producto?.nombre ?? '',
    cantidad: e.cantidad,
    documento_id: origen.documento_id ?? null,
    nota_venta_id: origen.nota_venta_id ?? null,
    devolucion_id: origen.devolucion_id ?? null,
    documento_numero: origen.numero,
    usuario_nombre: usuario,
    created_at: creado,
  })
}

/** Crea el documento y sus movimientos (no toca STOCK: eso lo hace quien registra). */
export function crearDocumento(doc: NuevoDocumento, usuario: string, creado: string): DocumentoDetalle {
  const almacen = almacenDe(doc.almacen_id)
  const destino = doc.almacen_destino_id ? almacenDe(doc.almacen_destino_id) : undefined
  const regionalId = almacen?.regional_id ?? ''
  const correlativo = DOCUMENTOS.filter((d) => d.regional_id === regionalId && d.tipo === doc.tipo).length + 1
  const nuevo: DocumentoDetalle = {
    id: nuevoId('doc'),
    numero: `${PREFIJO[doc.tipo]}-${codigoDe(regionalId)}-${String(correlativo).padStart(4, '0')}`,
    tipo: doc.tipo,
    regional_id: regionalId,
    almacen_id: doc.almacen_id,
    almacen_nombre: almacen?.nombre ?? '',
    almacen_destino_id: doc.almacen_destino_id,
    almacen_destino_nombre: destino?.nombre ?? null,
    regional_destino_id: destino?.regional_id ?? null,
    vendedor_id: doc.vendedor_id,
    vendedor_nombre: VENDEDORES.find((v) => v.id === doc.vendedor_id)?.nombre ?? null,
    fecha: doc.fecha,
    referencia: doc.referencia,
    motivo: doc.motivo,
    items: doc.items.length,
    usuario_nombre: usuario,
    created_at: creado,
    detalle: doc.items.map((i) => {
      const producto = PRODUCTOS.find((p) => p.id === i.producto_id)
      return { producto_id: i.producto_id, producto_nombre: producto?.nombre ?? '', linea_nombre: LINEAS.find((l) => l.id === producto?.linea_id)?.nombre ?? '', cantidad: i.cantidad }
    }),
  }
  DOCUMENTOS.push(nuevo)
  for (const e of efectosDe(doc)) agregarMovimiento(e, doc.fecha, { documento_id: nuevo.id, numero: nuevo.numero }, usuario, creado)
  return nuevo
}

/** Suma un efecto al saldo (stock_saldo vía tg_mov_actualiza_saldo). */
export function aplicarAlStock(e: Efecto): void {
  const fila = STOCK.find((s) => s.almacen_id === e.almacen_id && s.vendedor_id === e.vendedor_id && s.producto_id === e.producto_id)
  if (fila) {
    fila.cantidad += e.cantidad
    fila.bajo_minimo = !fila.vendedor_id && fila.stock_minimo > 0 && fila.cantidad < fila.stock_minimo
    return
  }
  const producto = PRODUCTOS.find((p) => p.id === e.producto_id)
  const regionalId = almacenDe(e.almacen_id)?.regional_id
  if (producto && regionalId) STOCK.push(filaStock(producto, regionalId, e.cantidad, e.vendedor_id))
}

/** Movimientos de una nota: venta al emitir, anulación (+q, mismo origen y fecha de la nota) al anular. */
export function moverStockNota(
  nota: { id: string; numero: string; fecha: string; regional_id: string; vendedor_id: string | null; origen_stock: OrigenStock },
  items: { producto_id: string; cantidad: number }[],
  tipo: 'venta' | 'anulacion',
  usuario: string,
  creado: string,
): void {
  const almacenId = ALMACENES.find((a) => a.regional_id === nota.regional_id)?.id ?? ''
  for (const i of items) {
    const e: Efecto = { almacen_id: almacenId, vendedor_id: nota.origen_stock === 'vendedor' ? nota.vendedor_id : null, producto_id: i.producto_id, cantidad: tipo === 'venta' ? -i.cantidad : i.cantidad, tipo }
    agregarMovimiento(e, nota.fecha, { nota_venta_id: nota.id, numero: nota.numero }, usuario, creado)
    aplicarAlStock(e)
  }
}

/** Devolución (Reglas §4): repone en el almacén, con la fecha de hoy. */
export function moverStockDevolucion(dev: { id: string; numero: string; regional_id: string; fecha: string }, items: { producto_id: string; cantidad: number }[], usuario: string, creado: string): void {
  const almacenId = ALMACENES.find((a) => a.regional_id === dev.regional_id)?.id ?? ''
  for (const i of items) {
    const e: Efecto = { almacen_id: almacenId, vendedor_id: null, producto_id: i.producto_id, cantidad: i.cantidad, tipo: 'devolucion' }
    agregarMovimiento(e, dev.fecha, { devolucion_id: dev.id, numero: dev.numero }, usuario, creado)
    aplicarAlStock(e)
  }
}

/** Saldo actual de una ubicación (0 si no hay fila). */
export function saldoDe(almacenId: string, vendedorId: string | null, productoId: string): number {
  return STOCK.find((s) => s.almacen_id === almacenId && s.vendedor_id === vendedorId && s.producto_id === productoId)?.cantidad ?? 0
}

// ── Historial de ejemplo ──

interface Plan {
  doc: NuevoDocumento
  hora: number
}

interface VentaPlan {
  nota: (typeof NOTAS)[number]
  almacen_id: string
  vendedor_id: string | null
  producto_id: string
  cantidad: number
}

const clave = (almacenId: string, vendedorId: string | null, productoId: string) => `${almacenId}|${vendedorId ?? ''}|${productoId}`
const activos = PRODUCTOS.filter((p) => p.activo)
const elegir = (semilla: string, cuantos: number) => activos.filter((p) => estable(`${semilla}-${p.id}`) < cuantos / activos.length)

function generarHistorial() {
  const planes: Plan[] = []
  const ventas: VentaPlan[] = []
  const inicio = sumarDias(HOY, -40)

  for (const almacen of ALMACENES) {
    const r = almacen.regional_id
    const base = { almacen_id: almacen.id, almacen_destino_id: null, vendedor_id: null, motivo: null }
    planes.push(
      { hora: 9, doc: { ...base, tipo: 'ingreso', fecha: sumarDias(HOY, -25), referencia: 'Remito 4512 · Planta El Alto', items: elegir(`i1-${r}`, 8).map((p) => ({ producto_id: p.id, cantidad: 10 * (2 + Math.floor(estable(`q1-${r}-${p.id}`) * 6)) })) } },
      { hora: 10, doc: { ...base, tipo: 'ingreso', fecha: sumarDias(HOY, -10), referencia: 'Remito 4630 · Planta El Alto', items: elegir(`i2-${r}`, 6).map((p) => ({ producto_id: p.id, cantidad: 10 * (2 + Math.floor(estable(`q2-${r}-${p.id}`) * 6)) })) } },
    )
    // Ventas desde el almacén: los ítems de las notas (preventa).
    for (const nota of NOTAS.filter((n) => n.regional_id === r && n.origen_stock === 'almacen')) {
      for (const i of ITEMS_NOTA.get(nota.id) ?? []) ventas.push({ nota, almacen_id: almacen.id, vendedor_id: null, producto_id: i.producto_id, cantidad: i.cantidad })
    }
  }

  // Un traspaso La Paz → Santa Cruz (en Santa Cruz se ve "Recibido de LP").
  const lp = ALMACENES.find((a) => a.regional_id === 'reg-lp')
  const scz = ALMACENES.find((a) => a.regional_id === 'reg-scz')
  if (lp && scz) {
    planes.push({ hora: 11, doc: { tipo: 'traspaso', almacen_id: lp.id, almacen_destino_id: scz.id, vendedor_id: null, fecha: sumarDias(HOY, -6), referencia: 'Reposición Santa Cruz', motivo: null, items: elegir('tr', 2).slice(0, 2).map((p) => ({ producto_id: p.id, cantidad: 12 })) } })
  }

  // Mercadería en poder de los vendedores: salida, ventas y retorno que dejan el saldo actual.
  for (const vendedor of VENDEDORES) {
    const filas = STOCK.filter((s) => s.vendedor_id === vendedor.id && s.cantidad > 0)
    if (!filas.length) continue
    const almacenId = filas[0].almacen_id
    // Lo vendido sale de sus notas con origen "saldo del vendedor".
    const notas = NOTAS.filter((n) => n.vendedor_id === vendedor.id && n.origen_stock === 'vendedor')
    const vendidos = notas.filter((n) => n.estado === 'emitida').flatMap((n) => ITEMS_NOTA.get(n.id) ?? [])
    const flujo = filas.map((s) => {
      const vendido = vendidos.filter((i) => i.producto_id === s.producto_id).reduce((t, i) => t + i.cantidad, 0)
      const retornado = Math.floor(estable(`vr-${s.producto_id}`) * 3)
      return { producto_id: s.producto_id, vendido, retornado, entregado: s.cantidad + vendido + retornado }
    })
    const base = { almacen_id: almacenId, almacen_destino_id: null, vendedor_id: vendedor.id, motivo: null }
    planes.push({ hora: 8, doc: { ...base, tipo: 'salida', fecha: sumarDias(HOY, -2), referencia: 'Carga de ruta', items: flujo.map((f) => ({ producto_id: f.producto_id, cantidad: f.entregado })) } })
    const retornos = flujo.filter((f) => f.retornado > 0)
    if (retornos.length) planes.push({ hora: 18, doc: { ...base, tipo: 'retorno', fecha: AYER, referencia: 'Cierre de ruta', items: retornos.map((f) => ({ producto_id: f.producto_id, cantidad: f.retornado })) } })
    for (const nota of notas) for (const i of ITEMS_NOTA.get(nota.id) ?? []) ventas.push({ nota, almacen_id: almacenId, vendedor_id: vendedor.id, producto_id: i.producto_id, cantidad: i.cantidad })
  }

  // Cronología de efectos por ubicación, para calcular el inventario inicial.
  const cronologia = new Map<string, { orden: string; cantidad: number }[]>()
  const anotar = (k: string, orden: string, cantidad: number) => cronologia.set(k, [...(cronologia.get(k) ?? []), { orden, cantidad }])
  for (const { doc, hora } of planes) for (const e of efectosDe(doc)) anotar(clave(e.almacen_id, e.vendedor_id, e.producto_id), instante(doc.fecha, hora), e.cantidad)
  for (const v of ventas) {
    anotar(clave(v.almacen_id, v.vendedor_id, v.producto_id), instante(v.nota.fecha, 12), -v.cantidad)
    if (v.nota.estado === 'anulada') anotar(clave(v.almacen_id, v.vendedor_id, v.producto_id), instante(v.nota.fecha, 15), v.cantidad)
  }

  // Inicial = saldo actual − lo que pasó después. Si en algún momento el saldo
  // quedara negativo, se sube el inicial y un conteo físico de ayer lo compensa.
  const iniciales = new Map<string, { producto_id: string; cantidad: number }[]>()
  const conteos = new Map<string, { producto_id: string; cantidad: number }[]>()
  for (const s of STOCK.filter((f) => f.ubicacion === 'almacen')) {
    const efectos = (cronologia.get(clave(s.almacen_id, null, s.producto_id)) ?? []).sort((a, b) => a.orden.localeCompare(b.orden))
    let inicial = s.cantidad - efectos.reduce((t, e) => t + e.cantidad, 0)
    let saldo = inicial
    let minimo = inicial
    for (const e of efectos) {
      saldo += e.cantidad
      minimo = Math.min(minimo, saldo)
    }
    if (minimo < 0) {
      inicial -= minimo
      conteos.set(s.almacen_id, [...(conteos.get(s.almacen_id) ?? []), { producto_id: s.producto_id, cantidad: minimo }])
    }
    if (inicial > 0) iniciales.set(s.almacen_id, [...(iniciales.get(s.almacen_id) ?? []), { producto_id: s.producto_id, cantidad: inicial }])
  }
  for (const almacen of ALMACENES) {
    const base = { almacen_id: almacen.id, almacen_destino_id: null, vendedor_id: null, referencia: null }
    const items = iniciales.get(almacen.id)
    if (items) planes.push({ hora: 7, doc: { ...base, tipo: 'ajuste', fecha: inicio, motivo: 'Inventario inicial', items } })
    const ajuste = conteos.get(almacen.id)
    if (ajuste) planes.push({ hora: 19, doc: { ...base, tipo: 'ajuste', fecha: AYER, motivo: 'Conteo físico', items: ajuste } })
  }

  // Se crean en orden cronológico para que la numeración siga las fechas.
  for (const { doc, hora } of planes.filter((p) => p.doc.items.length).sort((a, b) => instante(a.doc.fecha, a.hora).localeCompare(instante(b.doc.fecha, b.hora)))) {
    crearDocumento(doc, usuarioDe(almacenDe(doc.almacen_id)?.regional_id ?? ''), instante(doc.fecha, hora))
  }
  for (const v of ventas) {
    const efecto = { almacen_id: v.almacen_id, vendedor_id: v.vendedor_id, producto_id: v.producto_id }
    const origen = { nota_venta_id: v.nota.id, numero: v.nota.numero }
    agregarMovimiento({ ...efecto, cantidad: -v.cantidad, tipo: 'venta' }, v.nota.fecha, origen, usuarioDe(v.nota.regional_id), instante(v.nota.fecha, 12))
    if (v.nota.estado === 'anulada') agregarMovimiento({ ...efecto, cantidad: v.cantidad, tipo: 'anulacion' }, v.nota.fecha, origen, usuarioDe(v.nota.regional_id), instante(v.nota.fecha, 15))
  }
}

generarHistorial()

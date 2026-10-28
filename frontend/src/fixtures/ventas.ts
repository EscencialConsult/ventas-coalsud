import type { Producto, SaldoDocumento } from '@/core/models/maestros'
import type { ItemNota, NotaVenta, NotaVentaResumen, OrigenStock } from '@/core/models/nota-venta'
import { diaSemana, diasEntre, hoyBolivia, inicioDeMes, sumarDias } from '@/shared/format/fecha'
import { redondear } from '@/shared/format/moneda'
import { CLIENTES, CONDICIONES, estable, idCliente, LINEAS, PRODUCTOS, STOCK } from './maestros'
import { usuarioDe, VENDEDORES } from './organizacion'

// Notas y totales de ejemplo, relativos a "hoy" para que la demo siempre tenga
// un día en curso y un día anterior sin cerrar. Las cuatro notas de hoy en LP
// reproducen los totales de la planilla F3: contado 3,075.40 · crédito 1,224.60.

export const HOY = hoyBolivia()
export const AYER = sumarDias(HOY, -1)

type NotaBase = Omit<NotaVentaResumen, 'regional_codigo' | 'pendiente_factura' | 'saldo' | 'cliente_id' | 'vendedor_id'> & { cobrado?: number; origen?: OrigenStock }

/** v_nota_venta sin `dia_cerrado`, que depende de las liquidaciones y se calcula al leer. */
export type NotaFila = Omit<NotaVenta, 'dia_cerrado'>

const CODIGOS: Record<string, string> = { 'reg-lp': 'LP', 'reg-cbba': 'CBBA', 'reg-scz': 'SCZ' }

/** Ítems de cada nota (nota_venta_item). */
export const ITEMS_NOTA = new Map<string, ItemNota[]>()

export function itemNota(producto: Producto, cantidad: number, precio: number): ItemNota {
  return {
    producto_id: producto.id,
    producto_nombre: producto.nombre,
    linea_nombre: LINEAS.find((l) => l.id === producto.linea_id)?.nombre ?? '',
    cantidad,
    precio_base: producto.precio_base,
    precio_aplicado: precio,
    subtotal: redondear(cantidad * precio),
  }
}

// Ítems que suman exacto el total de la nota: los primeros a precio de lista y
// el último con la cantidad y el producto cuyo precio (en centavos exactos)
// queda más cerca del de lista; si difiere, se ve como precio "modificado".
function armarItems(semilla: string, total: number, candidatos: Producto[]): ItemNota[] {
  const orden = candidatos.filter((p) => p.precio_base > 0).sort((a, b) => estable(`${semilla}-${a.id}`) - estable(`${semilla}-${b.id}`))
  const cuantos = Math.min(orden.length, 2 + Math.floor(estable(`${semilla}-n`) * 3))
  const items: ItemNota[] = []
  let resto = total
  for (const p of orden.slice(0, cuantos - 1)) {
    const q = Math.max(1, Math.round(resto / (cuantos - items.length) / p.precio_base))
    if (q * p.precio_base >= resto * 0.8) continue
    items.push(itemNota(p, q, p.precio_base))
    resto = redondear(resto - q * p.precio_base)
  }
  const centavos = Math.round(resto * 100)
  const libres = orden.filter((p) => !items.some((i) => i.producto_id === p.id))
  let mejor = { producto: libres[0] ?? orden[0], cantidad: 1, desvio: Infinity }
  for (let q = 1; q <= 60; q++) {
    if (centavos % q) continue
    for (const p of libres) {
      const desvio = Math.abs(centavos / q / 100 - p.precio_base) / p.precio_base
      if (desvio < mejor.desvio) mejor = { producto: p, cantidad: q, desvio }
    }
  }
  if (mejor.producto) items.push(itemNota(mejor.producto, mejor.cantidad, centavos / mejor.cantidad / 100))
  return items
}

function nota(n: NotaBase, indice: number): NotaFila {
  const cliente = CLIENTES.find((c) => c.id === idCliente(n.cliente_nombre))
  const condicion = CONDICIONES.find((c) => c.nombre === n.condicion_nombre) ?? CONDICIONES[0]
  const vendedorId = VENDEDORES.find((v) => v.nombre === n.vendedor_nombre)?.id ?? null
  const origen = n.origen ?? 'almacen'
  const cobrado = n.cobrado ?? 0
  const saldo = n.estado === 'emitida' && n.condicion_tipo === 'credito' ? redondear(n.total - cobrado) : 0
  // Las notas del saldo del vendedor salen de lo que tiene en su poder.
  const candidatos = origen === 'vendedor' ? PRODUCTOS.filter((p) => STOCK.some((s) => s.vendedor_id === vendedorId && s.producto_id === p.id)) : PRODUCTOS.filter((p) => p.activo)
  ITEMS_NOTA.set(n.id, armarItems(n.id, n.total, candidatos))
  return {
    ...n,
    cliente_id: cliente?.id ?? idCliente(n.cliente_nombre),
    cliente_nit: cliente?.nit ?? null,
    vendedor_id: vendedorId,
    regional_codigo: CODIGOS[n.regional_id],
    pendiente_factura: n.estado === 'emitida' && !n.numero_factura,
    saldo,
    canal: cliente?.canal ?? 'supermercado',
    condicion_pago_id: condicion.id,
    dias_credito: condicion.dias,
    fecha_vencimiento: sumarDias(n.fecha, condicion.dias),
    descuento_pct: 0,
    origen_stock: origen,
    factura_pdf_path: null,
    motivo_anulacion: n.estado === 'anulada' ? 'El cliente no estaba' : null,
    anulada_en: n.estado === 'anulada' ? `${n.fecha}T17:30:00-04:00` : null,
    observaciones: null,
    bruto: n.total,
    descuento_bs: 0,
    cobrado,
    abonado: 0,
    tiene_devolucion: false,
    usuario_nombre: usuarioDe(n.regional_id),
    created_at: `${n.fecha}T${String(9 + (indice % 8)).padStart(2, '0')}:${String((indice * 7) % 60).padStart(2, '0')}:00-04:00`,
  }
}

export const NOTAS: NotaFila[] = (
  [
  { id: 'nv-lp-0415', numero: 'LP-0415', regional_id: 'reg-lp', fecha: HOY, cliente_nombre: 'Macro Abasto', vendedor_nombre: 'Arturo Reynaga', condicion_tipo: 'contado', condicion_nombre: 'Contado', numero_factura: 'F-1465', total: 2430.4, estado: 'emitida' },
  { id: 'nv-lp-0414', numero: 'LP-0414', regional_id: 'reg-lp', fecha: HOY, cliente_nombre: 'Mi Super', vendedor_nombre: 'Martha Canedo', condicion_tipo: 'contado', condicion_nombre: 'Contado', numero_factura: 'F-1464', total: 375, estado: 'emitida' },
  { id: 'nv-lp-0413', numero: 'LP-0413', regional_id: 'reg-lp', fecha: HOY, cliente_nombre: 'Hipermaxi La Paz', vendedor_nombre: 'Flavia Rivera', condicion_tipo: 'credito', condicion_nombre: 'Crédito 30 días', numero_factura: 'F-1463', total: 1224.6, estado: 'emitida', cobrado: 500 },
  { id: 'nv-lp-0412', numero: 'LP-0412', regional_id: 'reg-lp', fecha: HOY, cliente_nombre: 'Tienda Rosita', vendedor_nombre: 'Arturo Reynaga', condicion_tipo: 'contado', condicion_nombre: 'Contado', numero_factura: 'F-1462', total: 270, estado: 'emitida' },
  { id: 'nv-scz-0208', numero: 'SCZ-0208', regional_id: 'reg-scz', fecha: HOY, cliente_nombre: 'Fidalga S.A. SCZ', vendedor_nombre: 'Mario Condori', condicion_tipo: 'credito', condicion_nombre: 'Crédito 60 días', numero_factura: null, total: 2930, estado: 'emitida' },
  { id: 'nv-cbba-0131', numero: 'CBBA-0131', regional_id: 'reg-cbba', fecha: HOY, cliente_nombre: 'Hipermaxi Cochabamba', vendedor_nombre: 'Jorge León', condicion_tipo: 'credito', condicion_nombre: 'Crédito 30 días', numero_factura: 'F-2210', total: 1850.5, estado: 'emitida' },
  { id: 'nv-lp-0411', numero: 'LP-0411', regional_id: 'reg-lp', fecha: AYER, cliente_nombre: 'Andys', vendedor_nombre: 'Flavia Rivera', condicion_tipo: 'credito', condicion_nombre: 'Crédito 15 días', numero_factura: null, total: 860, estado: 'emitida', origen: 'vendedor' },
  { id: 'nv-lp-0410', numero: 'LP-0410', regional_id: 'reg-lp', fecha: AYER, cliente_nombre: 'Tienda Rosita', vendedor_nombre: 'Martha Canedo', condicion_tipo: 'contado', condicion_nombre: 'Contado', numero_factura: null, total: 412.5, estado: 'emitida' },
  { id: 'nv-lp-0409', numero: 'LP-0409', regional_id: 'reg-lp', fecha: AYER, cliente_nombre: 'Mi Super', vendedor_nombre: 'Flavia Rivera', condicion_tipo: 'contado', condicion_nombre: 'Contado', numero_factura: 'F-1450', total: 90, estado: 'anulada' },
  { id: 'nv-cbba-0130', numero: 'CBBA-0130', regional_id: 'reg-cbba', fecha: AYER, cliente_nombre: 'Super America', vendedor_nombre: 'Jorge León', condicion_tipo: 'contado', condicion_nombre: 'Contado', numero_factura: 'F-2209', total: 540, estado: 'emitida' },
  // Días ya cerrados en La Paz: sobre estas se prueba "Devolver" (y LP-0405 tiene un cobro de un día cerrado).
  { id: 'nv-lp-0405', numero: 'LP-0405', regional_id: 'reg-lp', fecha: sumarDias(HOY, -4), cliente_nombre: 'Hipermaxi La Paz', vendedor_nombre: 'Flavia Rivera', condicion_tipo: 'credito', condicion_nombre: 'Crédito 30 días', numero_factura: 'F-1440', total: 1650, estado: 'emitida', cobrado: 600 },
  { id: 'nv-lp-0404', numero: 'LP-0404', regional_id: 'reg-lp', fecha: sumarDias(HOY, -4), cliente_nombre: 'Tienda Rosita', vendedor_nombre: 'Arturo Reynaga', condicion_tipo: 'contado', condicion_nombre: 'Contado', numero_factura: 'F-1439', total: 520, estado: 'emitida' },
  ] satisfies NotaBase[]
).map(nota)

// Ventas netas diarias de ejemplo por regional: un patrón fijo (la misma fecha
// da siempre el mismo valor), con menos venta el fin de semana. Hoy son las
// notas emitidas de hoy, para que cuadre con "Ventas de hoy". Así cualquier
// período del filtro del dashboard tiene datos coherentes entre sí.
const BASE_DIARIA: Record<string, number> = { 'reg-lp': 4300, 'reg-cbba': 2350, 'reg-scz': 2150 }
const FACTOR_DIA = [1, 1.05, 0.95, 1.1, 1.2, 0.75, 0.25] // lunes … domingo

export function ventasDelDia(regionalId: string, fecha: string): number {
  if (fecha > HOY) return 0
  if (fecha === HOY) {
    return NOTAS.filter((n) => n.regional_id === regionalId && n.fecha === HOY && n.estado === 'emitida').reduce((s, n) => s + n.total, 0)
  }
  const base = BASE_DIARIA[regionalId] ?? 0
  return Math.round(base * FACTOR_DIA[diaSemana(fecha)] * (0.7 + 0.6 * estable(regionalId + fecha)) * 100) / 100
}

export function ventasEnRango(regionalId: string, desde: string, hasta: string): number {
  let total = 0
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) total += ventasDelDia(regionalId, f)
  return Math.round(total * 100) / 100
}

/** Indicadores por regional para el dashboard (las ventas del mes salen del generador diario). */
export const INDICADORES_REGIONAL: Record<string, { ventas_mes: number; meta_mes: number; cxc_saldo: number; cxc_vencido: number }> = {
  'reg-lp': { ventas_mes: ventasEnRango('reg-lp', inicioDeMes(HOY), HOY), meta_mes: 120000, cxc_saldo: 201015.92, cxc_vencido: 591.2 },
  'reg-cbba': { ventas_mes: ventasEnRango('reg-cbba', inicioDeMes(HOY), HOY), meta_mes: 70000, cxc_saldo: 141651.8, cxc_vencido: 16318 },
  'reg-scz': { ventas_mes: ventasEnRango('reg-scz', inicioDeMes(HOY), HOY), meta_mes: 65000, cxc_saldo: 361081.8, cxc_vencido: 42666 },
}

/** Productos bajo mínimo por regional: salen del stock de ejemplo (coinciden con el catálogo). */
export function bajoMinimo(regionalId: string): number {
  return STOCK.filter((s) => s.regional_id === regionalId && s.bajo_minimo).length
}

/** Metas por vendedor (además de la meta por regional). */
export const METAS_VENDEDOR = [
  { id: 'pre-lp-flavia', regional_id: 'reg-lp', vendedor: 'Flavia Rivera', meta: 30000, real: 21400 },
  { id: 'pre-lp-arturo', regional_id: 'reg-lp', vendedor: 'Arturo Reynaga', meta: 35000, real: 33900 },
  { id: 'pre-scz-mario', regional_id: 'reg-scz', vendedor: 'Mario Condori', meta: 25000, real: 14800 },
]

/** Días sin cerrar: LP no cerró ayer (con dos notas sin factura). Cerrar y reabrir lo modifican. */
export const LIQUIDACIONES_ABIERTAS: { regional_id: string; fecha: string }[] = [
  { regional_id: 'reg-lp', fecha: AYER },
  { regional_id: 'reg-lp', fecha: HOY },
  { regional_id: 'reg-cbba', fecha: HOY },
  { regional_id: 'reg-scz', fecha: HOY },
]

// ── Saldos por documento (v_saldo_documento): notas a crédito con saldo y
// saldos iniciales de la cartera (⚠ SUP-24) ──
const SALDOS_INICIALES: [cliente: string, regional: string, numero: string, diasAtras: number, plazo: number, importe: number][] = [
  ['Hipermaxi La Paz', 'reg-lp', 'SI-LP-001', 75, 30, 8450.5],
  ['Hipermaxi La Paz', 'reg-lp', 'SI-LP-002', 20, 30, 3120],
  ['Andys', 'reg-lp', 'SI-LP-003', 40, 15, 591.2],
  ['Hipermaxi Cochabamba', 'reg-cbba', 'SI-CBBA-001', 95, 30, 16318],
  ['Fidalga S.A. SCZ', 'reg-scz', 'SI-SCZ-001', 120, 60, 42666],
  ['Clínica Foianini', 'reg-scz', 'SI-SCZ-002', 30, 90, 12500],
]

function saldo(base: Omit<SaldoDocumento, 'saldo' | 'vencido' | 'dias_mora'>): SaldoDocumento {
  const mora = base.fecha_vencimiento && base.fecha_vencimiento < HOY ? diasEntre(base.fecha_vencimiento, HOY) - 1 : 0
  return { ...base, saldo: redondear(base.importe - base.cobrado - base.abonado), vencido: mora > 0, dias_mora: mora }
}

/** Un documento de cartera inicial (cargar_cartera_inicial, ⚠ SUP-24). */
export function crearSaldoInicial(d: { id: string; regional_id: string; cliente_id: string; numero: string; fecha: string; fecha_vencimiento: string | null; importe: number }): SaldoDocumento {
  return saldo({
    tipo_doc: 'saldo_inicial',
    documento_id: d.id,
    regional_id: d.regional_id,
    cliente_id: d.cliente_id,
    numero: d.numero,
    numero_factura: null,
    fecha: d.fecha,
    fecha_vencimiento: d.fecha_vencimiento ?? d.fecha,
    importe: d.importe,
    cobrado: 0,
    abonado: 0,
  })
}

/** Cobros y abonos sobre un documento: mueven el saldo de la nota y el de v_saldo_documento. */
export function moverSaldo(documentoId: string, cambio: { cobrado?: number; abonado?: number }): void {
  const cobrado = cambio.cobrado ?? 0
  const abonado = cambio.abonado ?? 0
  const s = SALDOS.find((x) => x.documento_id === documentoId)
  if (s) Object.assign(s, saldo({ ...s, cobrado: redondear(s.cobrado + cobrado), abonado: redondear(s.abonado + abonado) }))
  const n = NOTAS.find((x) => x.id === documentoId)
  if (!n) return
  n.cobrado = redondear(n.cobrado + cobrado)
  n.abonado = redondear(n.abonado + abonado)
  n.saldo = n.estado === 'emitida' && n.condicion_tipo === 'credito' ? redondear(n.total - n.cobrado - n.abonado) : 0
}

/** Saldo de una nota a crédito (v_saldo_documento). */
export function saldoDeNota(n: NotaFila): SaldoDocumento {
  return saldo({
    tipo_doc: 'nota',
    documento_id: n.id,
    regional_id: n.regional_id,
    cliente_id: n.cliente_id,
    numero: n.numero,
    numero_factura: n.numero_factura,
    fecha: n.fecha,
    fecha_vencimiento: n.fecha_vencimiento,
    importe: n.total,
    cobrado: n.cobrado,
    abonado: n.abonado,
  })
}

export const SALDOS: SaldoDocumento[] = [
  ...NOTAS.filter((n) => n.saldo > 0).map(saldoDeNota),
  ...SALDOS_INICIALES.map(([cliente, regional, numero, diasAtras, plazo, importe]) => {
    const fecha = sumarDias(HOY, -diasAtras)
    return saldo({
      tipo_doc: 'saldo_inicial',
      documento_id: `si-${numero.toLowerCase()}`,
      regional_id: regional,
      cliente_id: idCliente(cliente),
      numero,
      numero_factura: null,
      fecha,
      fecha_vencimiento: sumarDias(fecha, plazo),
      importe,
      cobrado: Math.round(importe * (estable(numero) > 0.5 ? 0.3 : 0) * 100) / 100,
      abonado: 0,
    })
  }),
]

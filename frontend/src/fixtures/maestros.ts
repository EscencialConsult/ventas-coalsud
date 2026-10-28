import type { Almacen, Cliente, CategoriaCliente, CondicionPago, LineaComercial, Producto, RegionalMaestro, StockFila, UsuarioSistema } from '@/core/models/maestros'
import type { Canal } from '@/core/models/nota-venta'
import { REGIONALES, USUARIOS_DEMO, VENDEDORES } from './organizacion'

// Maestros de ejemplo (⚙ DT-17), en memoria: los servicios fixture los
// modifican como lo haría la base, y se reinician al recargar. Nombres de la
// planilla F3 y de Datos Iniciales; no son datos reales del cliente.

let secuencia = 1000
/** Id nuevo para las altas en modo fixtures. */
export function nuevoId(prefijo: string): string {
  secuencia += 1
  return `${prefijo}-${secuencia}`
}

/** Pseudoaleatorio estable 0–1 a partir de un texto (FNV-1a). */
export function estable(semilla: string): number {
  let h = 2166136261
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return ((h >>> 0) % 1000) / 1000
}

export const REGIONALES_MAESTRO: RegionalMaestro[] = REGIONALES.map((r) => ({ ...r, activo: true }))

/** Regionales con documentos: su código ya no se puede cambiar (lo rechaza la base). */
export const REGIONALES_CON_DOCUMENTOS = new Set(REGIONALES.map((r) => r.id))

export const ALMACENES: Almacen[] = REGIONALES.map((r) => ({ id: `alm-${r.codigo.toLowerCase()}`, regional_id: r.id, nombre: `Almacén ${r.nombre}`, activo: true }))

// ── Condiciones de pago (Datos Iniciales §1.2, ⚠ SUP-25) ──
export const CONDICIONES: CondicionPago[] = [
  { id: 'cp-contado', nombre: 'Contado', tipo: 'contado', dias: 0, orden: 1, activo: true },
  { id: 'cp-15', nombre: 'Crédito 15 días', tipo: 'credito', dias: 15, orden: 2, activo: true },
  { id: 'cp-30', nombre: 'Crédito 30 días', tipo: 'credito', dias: 30, orden: 3, activo: true },
  { id: 'cp-60', nombre: 'Crédito 60 días', tipo: 'credito', dias: 60, orden: 4, activo: true },
  { id: 'cp-90', nombre: 'Crédito 90 días', tipo: 'credito', dias: 90, orden: 5, activo: true },
]

// ── Líneas y productos de la planilla F3 (Datos Iniciales §1.3 y §2) ──
const CATALOGO_F3: [linea: string, productos: string[]][] = [
  ['COMRURAL', ['CHIA 200GR', 'QUINUA TRICOLOR 1 KG', 'QUINUA BLANCA 1KG', 'QUINUA BLANCA 400GR', 'QUINUA BLANCA 300GR', 'QUINUA ROJA 1KG', 'QUINUA ROJA 400GR', 'QUINUA ROJA 300GR', 'QUINUA NEGRA 1KG', 'QUINUA NEGRA 400GR', 'QUINUA NEGRA 300GR', 'POP DULCE 1 KG', 'POP DULCE 500GR', 'POP S/AZUCAR 250GR', 'POP DULCE 20GR', 'POP CHOCOLATE 30GR', 'HARINA -QUINUA 300GR', 'QUINUA INSTANTANEA 150GR', 'HOJUELA DE QUINUA 250GR', 'CARNE DE QUINUA 160GR', 'JUGO QUINUA MANZANA 300ML', 'JUGO DE DURAZNO 300ML', 'MEZCLA P/APANAR 80GR', 'BARRA DE CHOCOLATE 30GR', 'BARRA DE CHOCOLATE BLANCO 30GR', 'BARRA DE QUINUA CHOCOLATE PACK DE 4', 'BARRA DE QUINUA CHOCOLATE BLANCO PACK DE 4', 'BARRA DE QUINUA MIX PACK DE 4', 'POP DE 20GR SIX PACK']],
  ['ASOVITA', ['API MORADO 200GR', 'API AMARILLO 200GR', 'TOJORI', 'API MORADO DE 1KG', 'API AMARILLO DE 1KG', 'AJI AMARILLO 200GR', 'AJI AMARILLO DE 50GR', 'AJI ROJO DE 200GR', 'AJI ROJO DE 50GR']],
  ['LA Y SAA', ['FIFITOS 360GR', 'FIFITOS 150GR', 'FRUTIQUINS 150GR', 'CHOCOQUINS 150GR']],
  ['IPEL', ['NESS X 16R H-DOBLE', 'NESS X 12R H-DOBLE', 'NESS X 4R H-DOBLE', 'NESS X 4R H-SIMPLE', 'QUALITE X 32R H-DOBLE', 'QUALITE X 16R H-DOBLE', 'QUALITE X 12R H-DOBLE', 'QUALITE X 4R H-DOBLE', 'NATURALEZA X 4R HSIMPLE', 'NOBBY 2R HDOBLE X60', 'NATURALEZA 2R HOBLEX50', 'NATURALEZA 6R HOBLEX50', 'PAÑUELOS DESECHABLES NESS', 'SERV.NOBBY NG GRANDE PREMIUM', 'SERV.NOBBY NG PEQUEÑO PREMIUM', 'SERV.NOBBY RJ GRANDE SIMPLE', 'SERV.NOBBY RJ PEQUEÑO SIMPLE', 'TOALLA TRENDS', 'SUPER PEL', 'PH RENOVA 10X250 DH EXTRA LUJO', 'PAPEL TOALLA NOBBY FIT AZUL']],
  ['SULINO', ['SULINO']],
  ['ALCAFOOD', ['PURE DE PAPAS TRADICIONAL 1 KG', 'PURES DE PAPA TRADICIONAL 250 GR', 'PURE DE PAPAS TRADICIONAL 125 GR', 'PAPAS GRATINADAS 133 G', 'PURE SABOR CIBOULETTE 125 GR', 'PURE SABOR 4 QUESOS 125 GR', 'PURE SABOR MERKEN 125 GR', 'PURE SABOR MEDITERRANEO 125 GR', 'PURE PARA UNO TRADICIONAL C/CARNE 47,5 G', 'PURE PARA UNO TRADICIONAL C/POLLO 49.5G', 'PURE PARA UNO SABOR MERKEN C/POLLO 47,5GR', 'PURE PARA UNO 4 QUESOS 47.5GR', 'CAZUELA PARA UNO C/CARNE 47,5G', 'AVENA PARA UNO CON LECHE Y BERRIES', 'AVENA PARA UNO CON LECHE PASAS Y ALMENDRAS 66 G']],
  ['PLASTIOLED', ['TOMATODO OLA KIDS PP 300CC', 'TOMATODO OLA MEDIANO 520 CC', 'TOMATODO SQUARE 72 COVER', 'HERMET. CUADRADO 1250CC', 'HERMET. REDONDO 800 CC', 'KIT N° 03: BOTELLA MEDIANA + 2 HER', 'HERMET. CUADRADO 4LT', 'HERMET. CUADRADO 2LT', 'HERMET. REDONDO 200CC', 'TOMATODO GALAXIA', 'HERMETICO CUADRADO 850CC C/ALD', 'HERMETICO CUADRADO 6 LT', 'KIT FUNCIONAL + HER', 'COD 80023 DESPENSERO 1PISO', 'COD 71083 TOMATODO MAMILA', 'COD 71074 TOMATODO SPA', 'COD 71038 TOMATODO BOTELLA 300 CC', 'COD 74107 PORTA CUBIERTOS', 'COD 80041 TOMATODO CRISS 550 CON ASA', 'COD 71003 TOMATODO 420CC', 'COD 74012 TAPER HERM CUADRADO 10 LITROS']],
  ['KADO', ['EDULCORANTE KADO MIX 100ML', 'EDULCORANTE KADO MIX 250ML', 'EDULCORANTE KADO SUCRALOSA 100ML', 'EDULCORANTE KADO SUCRALOSA 250ML', 'EDULCORANTE KADO STEVIA+SUCRALOSA 100ML', 'EDULCORANTE KADO STEVIA+SUCRALOSA 250ML', 'EDULCORANTE KADO MIX DISPLAY 50 SOBRES']],
  ['COMRURAL GRANEL', ['QUINUA BLANCA ORGANICA POR 1 KINTAL', 'QUINUA GRANEADA POR 1KG', 'HOJUELA DE QUINUA QUINTAL', 'POP SIN AZUCAR 10KG']],
  ['HUGGIES', ['HUGGIES SHAMPOO MANZANILLA 200ML', 'HUGGIES SHAMPOO EXTRA SUAVE VERDE 200ML', 'HUGGIES SHAMPOO MANZANILLA 600ML', 'JAVONCILLO HUGGIES']],
  ['BITS CREAM', []],
  ['CONGELADOS', []],
]

// Únicos precios verificados en F3 (Datos Iniciales §2); el resto son de prueba.
const PRECIOS_F3: Record<string, number> = { 'QUINUA TRICOLOR 1 KG': 44, 'QUINUA BLANCA 1KG': 44, 'QUINUA BLANCA 400GR': 18, 'BARRA DE CHOCOLATE 30GR': 4.5 }

const slug = (texto: string) => texto.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const LINEAS: LineaComercial[] = CATALOGO_F3.map(([nombre], i) => ({ id: `lin-${slug(nombre)}`, nombre, orden: i + 1, activo: true }))

export const PRODUCTOS: Producto[] = CATALOGO_F3.flatMap(([linea, nombres], i) =>
  nombres.map((nombre, j) => {
    const codigo = /^COD (\d+)/.exec(nombre)?.[1] ?? null
    const precio = PRECIOS_F3[nombre] ?? Math.round((3 + estable(nombre) * 60) * 2) / 2
    return {
      id: `pro-${slug(nombre)}`,
      codigo,
      nombre,
      linea_id: LINEAS[i].id,
      orden: j + 1,
      precio_base: precio,
      stock_minimo: estable(`min-${nombre}`) < 0.6 ? Math.round(10 + estable(`m-${nombre}`) * 30) : 0,
      // Duplicado señalado en Datos Iniciales §2: queda inactivo en la demo.
      activo: nombre !== 'NESS X 4R H-SIMPLE',
      linea_comercial: { nombre: linea },
    }
  }),
)

// ── Clientes (seeds/20_usuarios_prueba + cartera de ejemplo para paginar) ──
type BaseCliente = [nombre: string, regional: string, categoria: CategoriaCliente, canal: Canal, vendedor: string | null, condicion: string, extra?: Partial<Cliente>]

const BASE_CLIENTES: BaseCliente[] = [
  ['Hipermaxi La Paz', 'reg-lp', 'supermercado', 'supermercado', 'ven-flavia', 'cp-30', { razon_social: 'Hipermaxi S.A.', nit: '1028627025', zona: 'Sur' }],
  ['Andys', 'reg-lp', 'supermercado', 'supermercado', 'ven-flavia', 'cp-15', { razon_social: 'Andys SRL', zona: 'Calacoto' }],
  ['Macro Abasto', 'reg-lp', 'mayorista', 'ruta', 'ven-arturo', 'cp-contado', { zona: 'Villa Fátima' }],
  ['Mi Super', 'reg-lp', 'supermercado', 'supermercado', 'ven-martha', 'cp-contado', { zona: 'Sopocachi' }],
  ['Tienda Rosita', 'reg-lp', 'minorista', 'ruta', 'ven-arturo', 'cp-contado', { zona: 'El Tejar' }],
  ['Hipermaxi Cochabamba', 'reg-cbba', 'supermercado', 'supermercado', 'ven-jorge', 'cp-30', { razon_social: 'Hipermaxi S.A.', nit: '1028627025' }],
  ['Super America', 'reg-cbba', 'supermercado', 'supermercado', 'ven-jorge', 'cp-contado'],
  ['Fidalga S.A. SCZ', 'reg-scz', 'supermercado', 'supermercado', 'ven-mario', 'cp-60', { razon_social: 'Fidalga S.A.', nit: '1015279027' }],
  ['Clínica Foianini', 'reg-scz', 'institucional', 'institucional', 'ven-sheila', 'cp-90', { razon_social: 'Clínica Foianini SRL' }],
]

const NOMBRES_TIENDA = ['Doña Juana', 'San Miguel', 'El Progreso', 'La Económica', 'Don Pedro', 'Santa Rosa', 'El Buen Precio', 'La Esquina', 'Virgen del Carmen', 'Los Andes', 'El Ahorro', 'San Antonio', 'La Familia', 'Mercedes', 'El Sol', 'Illimani']
const PREFIJOS = ['Tienda', 'Minimarket', 'Abarrotes', 'Distribuidora', 'Comercial', 'Micromercado']
const ZONAS: Record<string, string[]> = {
  'reg-lp': ['Sur', 'Miraflores', 'Sopocachi', 'Villa Fátima', 'Max Paredes', 'El Alto', 'Achumani', 'San Pedro'],
  'reg-cbba': ['Centro', 'Cala Cala', 'Queru Queru', 'Sacaba', 'Quillacollo'],
  'reg-scz': ['Equipetrol', 'Plan 3000', 'Villa 1ro de Mayo', 'Norte', 'Mutualista'],
}
const CANTIDAD_GENERADA: Record<string, number> = { 'reg-lp': 58, 'reg-cbba': 14, 'reg-scz': 16 }

function generados(): BaseCliente[] {
  return Object.entries(CANTIDAD_GENERADA).flatMap(([regional, cantidad]) => {
    const vendedores = VENDEDORES.filter((v) => v.regional_id === regional)
    return Array.from({ length: cantidad }, (_, i): BaseCliente => {
      const semilla = `${regional}-${i}`
      const nombre = `${PREFIJOS[i % PREFIJOS.length]} ${NOMBRES_TIENDA[(i * 7 + regional.length) % NOMBRES_TIENDA.length]}${i >= NOMBRES_TIENDA.length ? ` ${Math.floor(i / NOMBRES_TIENDA.length) + 1}` : ''}`
      const mayorista = estable(semilla) > 0.82
      const institucional = !mayorista && estable(`i-${semilla}`) > 0.92
      const categoria: CategoriaCliente = institucional ? 'institucional' : mayorista ? 'mayorista' : 'minorista'
      const canal: Canal = institucional ? 'institucional' : 'ruta'
      const condicion = estable(`c-${semilla}`) > 0.75 ? 'cp-15' : 'cp-contado'
      const zonas = ZONAS[regional]
      return [nombre, regional, categoria, canal, vendedores[i % vendedores.length]?.id ?? null, condicion, { zona: zonas[i % zonas.length], activo: estable(`a-${semilla}`) > 0.06 }]
    })
  })
}

function aCliente([nombre, regional, categoria, canal, vendedorId, condicionId, extra]: BaseCliente, indice: number): Cliente {
  const condicion = CONDICIONES.find((c) => c.id === condicionId) ?? CONDICIONES[0]
  const vendedor = VENDEDORES.find((v) => v.id === vendedorId)
  return {
    id: `cli-${slug(nombre)}-${indice}`,
    regional_id: regional,
    nombre,
    razon_social: null,
    nit: null,
    categoria,
    canal,
    vendedor_id: vendedorId,
    condicion_pago_id: condicion.id,
    zona: null,
    telefono: estable(`t-${nombre}`) > 0.4 ? `7${String(Math.floor(estable(`n-${nombre}${indice}`) * 9_999_999)).padStart(7, '0')}` : null,
    email: null,
    direccion: null,
    activo: true,
    ...extra,
    vendedor: vendedor ? { nombre: vendedor.nombre } : null,
    condicion_pago: { nombre: condicion.nombre, tipo: condicion.tipo, dias: condicion.dias },
  }
}

export const CLIENTES: Cliente[] = [...BASE_CLIENTES, ...generados()].map(aCliente)

/** Id del cliente de ejemplo por nombre (para enlazar las notas de fixtures). */
export function idCliente(nombre: string): string {
  return CLIENTES.find((c) => c.nombre === nombre)?.id ?? `cli-${slug(nombre)}`
}

// ── Usuarios (lo que ve el nacional en /usuarios) ──
export const USUARIOS: UsuarioSistema[] = [
  ...USUARIOS_DEMO.map(({ perfil }) => ({
    id: perfil.id,
    nombre: perfil.nombre,
    email: perfil.email,
    rol: perfil.rol,
    activo: perfil.activo,
    debe_cambiar_password: perfil.debe_cambiar_password,
    regionales: perfil.rol === 'regional' ? perfil.regionales.map((r) => r.id) : [],
  })),
  { id: 'usr-carla', nombre: 'Carla Mendoza', email: 'carla@coalsud.demo', rol: 'regional', activo: true, debe_cambiar_password: false, regionales: ['reg-cbba'] },
  { id: 'usr-luis', nombre: 'Luis Quispe', email: 'luis@coalsud.demo', rol: 'regional', activo: false, debe_cambiar_password: false, regionales: ['reg-lp'] },
]

// ── Stock (v_stock): almacén por regional + mercadería en poder de vendedores ──
export function filaStock(producto: Producto, regionalId: string, cantidad: number, vendedorId: string | null): StockFila {
  const almacen = ALMACENES.find((a) => a.regional_id === regionalId)
  const linea = LINEAS.find((l) => l.id === producto.linea_id)
  return {
    producto_id: producto.id,
    producto_nombre: producto.nombre,
    linea_id: producto.linea_id,
    linea_nombre: linea?.nombre ?? '',
    // Orden del reporte: primero la línea, después el producto dentro de ella.
    orden: (linea?.orden ?? 0) * 1000 + producto.orden,
    regional_id: regionalId,
    ubicacion: vendedorId ? 'vendedor' : 'almacen',
    almacen_id: almacen?.id ?? '',
    almacen_nombre: almacen?.nombre ?? '',
    vendedor_id: vendedorId,
    vendedor_nombre: VENDEDORES.find((v) => v.id === vendedorId)?.nombre ?? null,
    cantidad,
    stock_minimo: producto.stock_minimo,
    bajo_minimo: !vendedorId && producto.stock_minimo > 0 && cantidad < producto.stock_minimo,
    precio_base: producto.precio_base,
  }
}

const EN_PODER: [vendedor: string, regional: string, producto: string, cantidad: number][] = [
  // CP-03.6: Flavia tiene 5 u. en su poder y no se puede desactivar.
  ['ven-flavia', 'reg-lp', 'pro-quinua-tricolor-1-kg', 5],
  ['ven-flavia', 'reg-lp', 'pro-barra-de-chocolate-30gr', 4],
  ['ven-flavia', 'reg-lp', 'pro-fifitos-150gr', 3],
  ['ven-mario', 'reg-scz', 'pro-quinua-blanca-1kg', 8],
  ['ven-mario', 'reg-scz', 'pro-pop-dulce-500gr', 6],
]

export const STOCK: StockFila[] = [
  ...REGIONALES.flatMap((r) =>
    PRODUCTOS.filter((p) => p.activo).map((p) => {
      const base = p.stock_minimo || 20
      // ~5 % de los productos con mínimo quedan por debajo (alertas de inventario).
      const bajo = p.stock_minimo > 0 && estable(`b-${r.id}-${p.id}`) < 0.07
      const cantidad = bajo ? Math.floor(p.stock_minimo * estable(`q-${r.id}-${p.id}`)) : Math.round(base * (1 + 2.5 * estable(`s-${r.id}-${p.id}`)))
      return filaStock(p, r.id, cantidad, null)
    }),
  ),
  ...EN_PODER.flatMap(([vendedor, regional, productoId, cantidad]) => {
    const producto = PRODUCTOS.find((p) => p.id === productoId)
    return producto ? [filaStock(producto, regional, cantidad, vendedor)] : []
  }),
]

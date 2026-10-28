import { useCallback, useReducer, useRef, useState, type FormEvent } from 'react'
import { useBlocker, useNavigate } from 'react-router-dom'
import { FileCheck2, Printer } from 'lucide-react'
import { useAvisos } from '@/core/avisos/useAvisos'
import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import { mapearError } from '@/core/errores/mapearError'
import { useHoy } from '@/core/fecha/useHoy'
import type { Cliente } from '@/core/models/maestros'
import type { Canal, OrigenStock } from '@/core/models/nota-venta'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useCondiciones, useProductosActivos } from '@/features/catalogo/catalogo.queries'
import { CANALES } from '@/features/clientes/clientes.opciones'
import { BuscadorCliente } from '@/features/clientes/components/BuscadorCliente'
import { useStockInventario } from '@/features/inventario/inventario.queries'
import { useVendedores } from '@/features/vendedores/vendedores.queries'
import { useFormulario, type Errores } from '@/shared/hooks/useFormulario'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoPct } from '@/shared/format/moneda'
import { BotonEnlace, Button } from '@/shared/ui/Button'
import { Input, Select } from '@/shared/ui/Campo'
import { CampoFecha } from '@/shared/ui/CampoFecha'
import { Card } from '@/shared/ui/Card'
import { Confirmacion } from '@/shared/ui/Confirmacion'
import { Alerta } from '@/shared/ui/Estados'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Pagina } from '@/shared/ui/Pagina'
import { Segmentado } from '@/shared/ui/Segmentado'
import { toast } from '@/shared/ui/toast'
import { ItemsNota } from './components/ItemsNota'
import { calcularTotales, leerNumero } from './notas.calculos'
import { itemVacio, reducirItems, type ItemForm } from './notas.items'
import { useEmitirNota } from './notas.queries'
import { rutaImpresionNota } from './notas.rutas'

interface Valores extends Record<string, unknown> {
  fecha: string
  cliente_id: string
  vendedor_id: string
  canal: string
  condicion_pago_id: string
  descuento: string
  numero_factura: string
  observaciones: string
}

const CAMPOS = ['fecha', 'cliente_id', 'vendedor_id', 'canal', 'condicion_pago_id', 'descuento', 'numero_factura'] as const

// Nueva nota (06-pantallas/07 §2): los totales se calculan en vivo solo para
// mostrar; el oficial es el que devuelve emitir_nota_venta. "Disponible" sale
// de v_stock según el origen; la base revalida y marca la fila si no alcanza.
export default function NuevaNotaPage() {
  const navigate = useNavigate()
  const hoy = useHoy()
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const avisos = useAvisos()
  const vendedores = useVendedores(regionalActivaId)
  const condiciones = useCondiciones()
  const productos = useProductosActivos()
  const stock = useStockInventario(regionalActivaId)
  const emitir = useEmitirNota()

  // ⚠ SUP-19: desde el día abierto más antiguo de la regional hasta hoy.
  const minimo = (avisos.data?.dias_pendientes ?? []).filter((d) => d.regional_id === regionalActivaId).reduce((min, d) => (d.fecha < min ? d.fecha : min), hoy)

  const validar = useCallback(
    (v: Valores): Errores<Valores> => {
      const descuento = v.descuento.trim() ? leerNumero(v.descuento) : 0
      return {
        fecha: !v.fecha ? 'Elija la fecha.' : v.fecha > hoy ? 'La fecha no puede ser posterior a hoy.' : undefined,
        cliente_id: !v.cliente_id ? 'Elija el cliente.' : undefined,
        vendedor_id: !v.vendedor_id ? 'Elija el vendedor.' : undefined,
        canal: !v.canal ? 'Elija el canal.' : undefined,
        condicion_pago_id: !v.condicion_pago_id ? 'Elija la condición de pago.' : undefined,
        descuento: descuento === null || descuento > 100 ? 'Entre 0 y 100.' : undefined,
      }
    },
    [hoy],
  )
  const form = useFormulario<Valores>({ fecha: hoy, cliente_id: '', vendedor_id: '', canal: '', condicion_pago_id: '', descuento: '', numero_factura: '', observaciones: '' }, validar)
  const v = form.valores
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [origen, setOrigen] = useState<OrigenStock>('almacen')
  const [items, despachar] = useReducer(reducirItems, undefined, () => [itemVacio()])
  const [erroresItem, setErroresItem] = useState<Record<string, string>>({})

  const descuento = leerNumero(v.descuento) ?? 0
  const enPoder = (stock.data ?? []).filter((s) => s.vendedor_id === v.vendedor_id && v.vendedor_id && s.cantidad > 0)
  const usaVendedor = origen === 'vendedor' && enPoder.length > 0

  const disponible = (productoId: string): number | null => {
    if (!stock.data) return null
    const fila = stock.data.find((s) => s.producto_id === productoId && (usaVendedor ? s.vendedor_id === v.vendedor_id : s.ubicacion === 'almacen'))
    return fila?.cantidad ?? 0
  }

  const producto = (id: string) => {
    const p = productos.data?.find((x) => x.id === id)
    return p ? { precio_base: p.precio_base, linea: p.linea_comercial.nombre } : undefined
  }

  const opciones = (item: ItemForm) => {
    const usados = new Set(items.filter((i) => i.clave !== item.clave).map((i) => i.producto_id))
    const base = usaVendedor ? enPoder.map((s) => ({ valor: s.producto_id, etiqueta: s.producto_nombre })) : (productos.data ?? []).map((p) => ({ valor: p.id, etiqueta: p.nombre }))
    return base.filter((o) => !usados.has(o.valor))
  }

  const cargados = items.filter((i) => i.producto_id)
  const totales = calcularTotales(
    cargados.map((i) => ({ cantidad: leerNumero(i.cantidad) ?? 0, precio: leerNumero(i.precio) ?? 0 })),
    descuento,
  )
  // "Se sugiere cuando cubre todos los ítems": el vendedor lleva todo lo pedido.
  const vendedorCubre =
    origen === 'almacen' &&
    enPoder.length > 0 &&
    cargados.length > 0 &&
    cargados.every((i) => (enPoder.find((s) => s.producto_id === i.producto_id)?.cantidad ?? 0) >= (leerNumero(i.cantidad) ?? Infinity))

  const despacharItems: typeof despachar = (accion) => {
    despachar(accion)
    if (accion.tipo !== 'agregar') setErroresItem(({ [accion.clave]: _quitado, ...resto }) => resto)
  }

  // Al elegir el cliente se proponen su vendedor, canal y condición (editables).
  const elegirCliente = (c: Cliente) => {
    setCliente(c)
    form.cambiar('cliente_id', c.id)
    const vendedorActivo = vendedores.data?.some((ven) => ven.id === c.vendedor_id && ven.activo)
    if (vendedorActivo && c.vendedor_id) form.cambiar('vendedor_id', c.vendedor_id)
    form.cambiar('canal', c.canal)
    if (condiciones.data?.some((cp) => cp.id === c.condicion_pago_id && cp.activo)) form.cambiar('condicion_pago_id', c.condicion_pago_id)
  }

  const revisarItems = () => {
    const errores: Record<string, string> = {}
    const validos: { producto_id: string; cantidad: number; precio_aplicado: number }[] = []
    const usados = items.filter((i) => i.producto_id || i.cantidad.trim())
    for (const i of usados) {
      const cantidad = leerNumero(i.cantidad)
      const precio = leerNumero(i.precio)
      const saldo = i.producto_id ? disponible(i.producto_id) : null
      if (!i.producto_id) errores[i.clave] = 'Elija el producto.'
      else if (cantidad === null || cantidad <= 0) errores[i.clave] = 'Cantidad mayor a 0.'
      else if (precio === null) errores[i.clave] = 'Precio inválido.'
      else if (saldo !== null && cantidad > saldo) errores[i.clave] = `Disponible: ${formatoCantidad(saldo)}`
      else validos.push({ producto_id: i.producto_id, cantidad, precio_aplicado: precio })
    }
    return { validos, errores, vacio: usados.length === 0 }
  }

  const guardado = useRef(false)
  const sucio = form.sucio || items.some((i) => i.producto_id || i.cantidad)
  const bloqueo = useBlocker(({ currentLocation, nextLocation }) => sucio && !guardado.current && currentLocation.pathname !== nextLocation.pathname)

  const enviar = async (imprimir: boolean) => {
    const encabezado = form.validarTodo()
    const { validos, errores, vacio } = revisarItems()
    setErroresItem(errores)
    if (vacio) toast.error('Agregue al menos un producto.')
    if (!encabezado || vacio || Object.keys(errores).length || !regionalActivaId) return
    // La pestaña de impresión se abre ya, con el clic: después del await el navegador la bloquearía.
    const ventana = imprimir ? window.open('', '_blank') : null
    try {
      const nota = await emitir.mutateAsync({
        regional_id: regionalActivaId,
        fecha: v.fecha,
        cliente_id: v.cliente_id,
        vendedor_id: v.vendedor_id,
        canal: v.canal as Canal,
        condicion_pago_id: v.condicion_pago_id,
        descuento_pct: descuento,
        origen_stock: usaVendedor ? 'vendedor' : 'almacen',
        numero_factura: v.numero_factura.trim() || null,
        observaciones: v.observaciones.trim() || null,
        items: validos,
      })
      guardado.current = true
      if (ventana) ventana.location.href = rutaImpresionNota(nota.id)
      toast.exito(`Nota ${nota.numero} emitida`)
      navigate(`/notas/${nota.id}`)
    } catch (error) {
      ventana?.close()
      const e = mapearError(error)
      if (e.esInesperado) return
      const productoId = e.detalle?.producto_id
      const item = typeof productoId === 'string' ? items.find((i) => i.producto_id === productoId) : undefined
      if (item) setErroresItem({ [item.clave]: e.codigo === 'STOCK_INSUFICIENTE' ? `Disponible: ${formatoCantidad(Number(e.detalle?.disponible ?? 0))}` : e.message })
      else if (e.codigo === 'DIA_CERRADO' || e.codigo === 'FECHA_INVALIDA') form.marcarError('fecha', e.message)
      else aplicarErrorFormulario(error, CAMPOS, form.marcarError)
    }
  }

  const alEnviar = (e: FormEvent) => {
    e.preventDefault()
    void enviar(false)
  }

  return (
    <Pagina titulo="Nueva nota de venta" subtitulo={regionalActiva?.nombre}>
      <form onSubmit={alEnviar} noValidate className="grid gap-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CampoFecha label="Fecha" requerido valor={v.fecha} min={minimo} max={hoy} error={form.errores.fecha} alCambiar={(fecha) => form.cambiar('fecha', fecha)} />
            <div className="sm:col-span-1 lg:col-span-2">
              <BuscadorCliente regionalId={regionalActivaId} cliente={cliente} alCambiar={elegirCliente} error={form.errores.cliente_id} onBlur={() => form.tocar('cliente_id')} />
            </div>
            <Select
              label="Vendedor"
              requerido
              {...form.seleccion('vendedor_id')}
              opciones={(vendedores.data ?? []).filter((ven) => ven.activo).map((ven) => ({ valor: ven.id, etiqueta: ven.nombre }))}
            />
            <Select label="Canal" requerido {...form.seleccion('canal')} opciones={CANALES} />
            <Select
              label="Condición de pago"
              requerido
              {...form.seleccion('condicion_pago_id')}
              opciones={(condiciones.data ?? []).filter((c) => c.activo).map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
            />
            <Input label="Descuento (%)" inputMode="decimal" placeholder="0" ayuda={descuento > 0 ? 'Queda registrado.' : undefined} {...form.texto('descuento')} />
            <Input label="N° de factura" placeholder="Opcional: se puede cargar después" {...form.texto('numero_factura')} />
            <Input label="Observaciones" placeholder="Opcional" {...form.texto('observaciones')} />
          </div>
          {enPoder.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-chico font-semibold text-texto-2">Origen del stock</span>
              <Segmentado
                etiqueta="Origen del stock"
                valor={origen}
                alCambiar={setOrigen}
                opciones={[
                  { valor: 'almacen', etiqueta: 'Almacén' },
                  { valor: 'vendedor', etiqueta: 'Saldo del vendedor' },
                ]}
              />
              {vendedorCubre && (
                <Button tam="sm" variante="secundario" onClick={() => setOrigen('vendedor')}>
                  El vendedor lleva todo: usar su saldo
                </Button>
              )}
            </div>
          )}
        </Card>

        <Card titulo="Productos" sinPadding>
          <ItemsNota items={items} despachar={despacharItems} errores={erroresItem} opciones={opciones} producto={producto} disponible={disponible} />
          <dl className="flex flex-wrap items-baseline justify-end gap-x-6 gap-y-1 border-t border-borde px-4 py-3 text-chico text-texto-3">
            <div className="flex gap-2">
              <dt>Subtotal</dt>
              <dd className="text-texto">
                <MontoBs valor={totales.bruto} />
              </dd>
            </div>
            <div className="flex gap-2">
              <dt>Descuento {descuento > 0 && formatoPct(descuento, 2)}</dt>
              <dd className="text-texto">
                <MontoBs valor={totales.descuento} />
              </dd>
            </div>
            <div className="flex items-baseline gap-2">
              <dt className="font-semibold text-texto-2">Total</dt>
              <dd className="text-subtitulo font-semibold text-texto">
                <MontoBs valor={totales.total} />
              </dd>
            </div>
          </dl>
        </Card>

        {usaVendedor && <Alerta tipo="info">Sale del saldo de {vendedores.data?.find((ven) => ven.id === v.vendedor_id)?.nombre}: no mueve el almacén.</Alerta>}

        <div className="flex flex-wrap justify-end gap-2">
          <BotonEnlace a="/notas">Cancelar</BotonEnlace>
          <Button variante="secundario" icono={<Printer size={15} />} disabled={emitir.isPending} onClick={() => enviar(true)}>
            Registrar e imprimir
          </Button>
          <Button type="submit" cargando={emitir.isPending} icono={<FileCheck2 size={16} />}>
            Registrar nota
          </Button>
        </div>
      </form>

      <Confirmacion
        abierto={bloqueo.state === 'blocked'}
        titulo="¿Descartar la nota?"
        consecuencias={['Se pierden el cliente y los productos cargados.']}
        textoConfirmar="Descartar"
        peligro
        alConfirmar={() => bloqueo.proceed?.()}
        alCancelar={() => bloqueo.reset?.()}
      />
    </Pagina>
  )
}

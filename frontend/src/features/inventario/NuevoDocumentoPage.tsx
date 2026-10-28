import { useCallback, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import { mapearError } from '@/core/errores/mapearError'
import { useHoy } from '@/core/fecha/useHoy'
import type { TipoDocumento } from '@/core/models/inventario'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useProductosActivos } from '@/features/catalogo/catalogo.queries'
import { useAlmacenes } from '@/features/configuracion/configuracion.queries'
import { useVendedores } from '@/features/vendedores/vendedores.queries'
import { useFormulario, type Errores } from '@/shared/hooks/useFormulario'
import { formatoCantidad } from '@/shared/format/cantidad'
import { BotonEnlace, Button } from '@/shared/ui/Button'
import { Input, Select } from '@/shared/ui/Campo'
import { CampoFecha } from '@/shared/ui/CampoFecha'
import { Card } from '@/shared/ui/Card'
import { Confirmacion } from '@/shared/ui/Confirmacion'
import { Alerta } from '@/shared/ui/Estados'
import { Pagina } from '@/shared/ui/Pagina'
import { toast } from '@/shared/ui/toast'
import { ItemsDocumento, type FilaItem } from './components/ItemsDocumento'
import { leerCantidad } from './inventario.calculos'
import { useRegistrarDocumento, useStockInventario } from './inventario.queries'
import { esTipoDocumento, MOTIVOS_AJUSTE, TIPOS_DOCUMENTO } from './inventario.tipos'

interface Valores extends Record<string, unknown> {
  fecha: string
  almacen_id: string
  almacen_destino_id: string
  vendedor_id: string
  referencia: string
  motivo: string
  detalle_motivo: string
}

const CAMPOS = ['fecha', 'almacen_id', 'almacen_destino_id', 'vendedor_id', 'motivo'] as const

let secuencia = 0
const nuevaFila = (producto_id = '', cantidad = ''): FilaItem => ({ clave: `fila-${++secuencia}`, producto_id, cantidad })

/** Dato que no se elige (el almacén de origen cuando la regional tiene uno solo). */
function DatoFijo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-chico font-semibold text-texto-2">{etiqueta}</span>
      <span className="flex h-[38px] items-center rounded-control border border-dashed border-borde-2 px-3 text-texto-2">{children}</span>
    </div>
  )
}

// /inventario/nuevo/:tipo — el `key` reinicia el formulario al cambiar de tipo.
export default function NuevoDocumentoPage() {
  const { tipo } = useParams()
  if (!esTipoDocumento(tipo)) return <Navigate to="/inventario/documentos" replace />
  return <FormularioDocumento key={tipo} tipo={tipo} />
}

// Documento nuevo (06-pantallas/06 §5): un formulario para los cinco tipos.
// "Disponible" sale de v_stock (la consulta de la pestaña Stock); la base
// revalida y sus errores se marcan en la fila, el campo o un banner.
function FormularioDocumento({ tipo }: { tipo: TipoDocumento }) {
  const config = TIPOS_DOCUMENTO[tipo]
  const navigate = useNavigate()
  const hoy = useHoy()
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const conVendedor = tipo === 'salida' || tipo === 'retorno'
  const almacenes = useAlmacenes()
  const vendedores = useVendedores(regionalActivaId, conVendedor)
  const productos = useProductosActivos()
  const stock = useStockInventario(regionalActivaId)
  const registrar = useRegistrarDocumento()

  const validar = useCallback(
    (v: Valores): Errores<Valores> => ({
      fecha: !v.fecha ? 'Elija la fecha.' : v.fecha > hoy ? 'La fecha no puede ser posterior a hoy.' : undefined,
      almacen_destino_id: tipo === 'traspaso' && !v.almacen_destino_id ? 'Elija el almacén destino.' : undefined,
      vendedor_id: conVendedor && !v.vendedor_id ? 'Elija el vendedor.' : undefined,
      motivo: tipo === 'ajuste' && !v.motivo ? 'Elija el motivo.' : undefined,
      detalle_motivo: tipo === 'ajuste' && v.motivo === 'otro' && !v.detalle_motivo.trim() ? 'Describa el motivo.' : undefined,
    }),
    [hoy, tipo, conVendedor],
  )
  const form = useFormulario<Valores>({ fecha: hoy, almacen_id: '', almacen_destino_id: '', vendedor_id: '', referencia: '', motivo: '', detalle_motivo: '' }, validar)
  const v = form.valores
  const [filas, setFilas] = useState<FilaItem[]>(() => [nuevaFila()])
  const [erroresFila, setErroresFila] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const propios = (almacenes.data ?? []).filter((a) => a.regional_id === regionalActivaId && a.activo)
  const almacenId = v.almacen_id || (propios.length === 1 ? propios[0].id : '')
  const destinos = (almacenes.data ?? []).filter((a) => a.regional_id !== regionalActivaId && a.activo)
  const destino = destinos.find((a) => a.id === v.almacen_destino_id)
  const enPoder = (vendedorId: string) => (stock.data ?? []).filter((s) => s.vendedor_id === vendedorId && s.cantidad > 0)

  // Saldo del origen: el almacén, o el vendedor en un retorno.
  const disponible = (productoId: string): number | null => {
    if (!stock.data) return null
    const fila = stock.data.find((s) => s.producto_id === productoId && (tipo === 'retorno' ? s.vendedor_id === v.vendedor_id : s.almacen_id === almacenId && s.vendedor_id === null))
    return fila?.cantidad ?? 0
  }

  const opciones = (fila: FilaItem) => {
    const usados = new Set(filas.filter((f) => f.clave !== fila.clave).map((f) => f.producto_id))
    const base =
      tipo === 'retorno' ? enPoder(v.vendedor_id).map((s) => ({ valor: s.producto_id, etiqueta: s.producto_nombre })) : (productos.data ?? []).map((p) => ({ valor: p.id, etiqueta: p.nombre }))
    return base.filter((o) => !usados.has(o.valor))
  }

  const cambiarFila = (clave: string, cambios: Partial<Omit<FilaItem, 'clave'>>) => {
    setFilas((actuales) => actuales.map((f) => (f.clave === clave ? { ...f, ...cambios } : f)))
    setErroresFila(({ [clave]: _quitado, ...resto }) => resto)
  }

  const quitarFila = (clave: string) => {
    setFilas((actuales) => (actuales.length === 1 ? [nuevaFila()] : actuales.filter((f) => f.clave !== clave)))
    setErroresFila(({ [clave]: _quitado, ...resto }) => resto)
  }

  // Retorno: se precarga lo que el vendedor tiene en su poder (retorno total; se puede corregir).
  const cambiarVendedor = (vendedorId: string) => {
    form.cambiar('vendedor_id', vendedorId)
    if (tipo !== 'retorno') return
    const saldos = enPoder(vendedorId)
    setFilas(saldos.length ? saldos.map((s) => nuevaFila(s.producto_id, String(s.cantidad))) : [nuevaFila()])
    setErroresFila({})
  }

  /** Validación de UX de los ítems (la base revalida). */
  const revisarFilas = () => {
    const errores: Record<string, string> = {}
    const items: { producto_id: string; cantidad: number }[] = []
    const usadas = filas.filter((f) => f.producto_id || f.cantidad.trim())
    for (const f of usadas) {
      const q = leerCantidad(f.cantidad)
      const saldo = f.producto_id ? disponible(f.producto_id) : null
      if (!f.producto_id) errores[f.clave] = 'Elija el producto.'
      else if (!f.cantidad.trim()) errores[f.clave] = 'Ingrese la cantidad.'
      else if (q === null) errores[f.clave] = 'Cantidad inválida.'
      else if (tipo === 'ajuste' ? q === 0 : q <= 0) errores[f.clave] = tipo === 'ajuste' ? 'No puede ser 0.' : 'Debe ser mayor a 0.'
      else if (saldo !== null && tipo !== 'ingreso' && tipo !== 'ajuste' && q > saldo) errores[f.clave] = `Disponible: ${formatoCantidad(saldo)}`
      else if (saldo !== null && tipo === 'ajuste' && saldo + q < 0) errores[f.clave] = `Quedaría en negativo (hay ${formatoCantidad(saldo)}).`
      else items.push({ producto_id: f.producto_id, cantidad: q })
    }
    return { items, errores, vacio: usadas.length === 0 }
  }

  const marcarFila = (productoId: string, mensaje: string) => {
    const fila = filas.find((f) => f.producto_id === productoId)
    if (fila) setErroresFila({ [fila.clave]: mensaje })
    else toast.error(mensaje)
  }

  const guardado = useRef(false)
  const sucio = form.sucio || filas.some((f) => f.producto_id || f.cantidad)
  const bloqueo = useBlocker(({ currentLocation, nextLocation }) => sucio && !guardado.current && currentLocation.pathname !== nextLocation.pathname)

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    setErrorGeneral(null)
    const encabezado = form.validarTodo()
    const { items, errores, vacio } = revisarFilas()
    setErroresFila(errores)
    if (vacio) setErrorGeneral('Agregue al menos un producto.')
    if (!almacenId) setErrorGeneral('La regional no tiene un almacén activo.')
    if (!encabezado || vacio || !almacenId || Object.keys(errores).length) return
    try {
      const motivo = MOTIVOS_AJUSTE.find((m) => m.valor === v.motivo)
      const detalle = v.detalle_motivo.trim()
      const { numero } = await registrar.mutateAsync({
        tipo,
        almacen_id: almacenId,
        almacen_destino_id: tipo === 'traspaso' ? v.almacen_destino_id : null,
        vendedor_id: conVendedor ? v.vendedor_id : null,
        fecha: v.fecha,
        referencia: tipo === 'ajuste' ? null : v.referencia.trim() || null,
        motivo: tipo !== 'ajuste' ? null : v.motivo === 'otro' ? detalle : [motivo?.etiqueta, detalle].filter(Boolean).join(': '),
        items,
      })
      guardado.current = true
      toast.exito(`${config.etiqueta} ${numero} ${config.registrado}`)
      navigate('/inventario/documentos')
    } catch (error) {
      const err = mapearError(error)
      if (err.esInesperado) return
      const productoId = err.detalle?.producto_id
      if (err.codigo === 'STOCK_INSUFICIENTE' && typeof productoId === 'string') marcarFila(productoId, `Disponible: ${formatoCantidad(Number(err.detalle?.disponible ?? 0))}`)
      else if (typeof productoId === 'string') marcarFila(productoId, err.message)
      else if (err.codigo === 'DIA_CERRADO') setErrorGeneral(err.message)
      else aplicarErrorFormulario(error, CAMPOS, form.marcarError)
    }
  }

  const sinMercaderia = tipo === 'retorno' && v.vendedor_id && stock.data && enPoder(v.vendedor_id).length === 0

  return (
    <Pagina titulo={config.titulo} subtitulo={regionalActiva?.nombre}>
      <form onSubmit={enviar} noValidate className="grid gap-4">
        {errorGeneral && <Alerta tipo="error">{errorGeneral}</Alerta>}
        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CampoFecha label="Fecha" requerido valor={v.fecha} max={hoy} error={form.errores.fecha} alCambiar={(fecha) => form.cambiar('fecha', fecha)} />
            {propios.length > 1 ? (
              <Select label={tipo === 'traspaso' ? 'Origen' : 'Almacén'} requerido {...form.seleccion('almacen_id')} valor={almacenId} opciones={propios.map((a) => ({ valor: a.id, etiqueta: a.nombre }))} />
            ) : (
              <DatoFijo etiqueta={tipo === 'traspaso' ? 'Origen' : 'Almacén'}>{propios[0]?.nombre ?? '…'}</DatoFijo>
            )}
            {tipo === 'traspaso' && (
              <Select label="Almacén destino" requerido {...form.seleccion('almacen_destino_id')} opciones={destinos.map((a) => ({ valor: a.id, etiqueta: a.nombre }))} />
            )}
            {conVendedor && (
              <Select
                label="Vendedor"
                requerido
                {...form.seleccion('vendedor_id')}
                alCambiar={cambiarVendedor}
                ayuda={sinMercaderia ? 'No tiene mercadería en su poder.' : undefined}
                opciones={(vendedores.data ?? []).filter((ven) => ven.activo).map((ven) => ({ valor: ven.id, etiqueta: ven.nombre }))}
              />
            )}
            {tipo === 'ajuste' ? (
              <>
                <Select label="Motivo" requerido {...form.seleccion('motivo')} opciones={MOTIVOS_AJUSTE} />
                <Input label="Detalle del motivo" requerido={v.motivo === 'otro'} placeholder={v.motivo === 'otro' ? 'Describa el motivo' : 'Opcional'} {...form.texto('detalle_motivo')} />
              </>
            ) : (
              <Input label="Referencia" placeholder={tipo === 'ingreso' ? 'N° de remito o proveedor' : 'Opcional'} {...form.texto('referencia')} />
            )}
          </div>
          {destino && (
            <Alerta tipo="info" className="mt-4">
              Se sumará en {destino.nombre} con la misma fecha.
            </Alerta>
          )}
        </Card>

        <Card titulo="Productos" sinPadding>
          <ItemsDocumento tipo={tipo} filas={filas} errores={erroresFila} opciones={opciones} disponible={disponible} alCambiar={cambiarFila} alQuitar={quitarFila} alAgregar={() => setFilas((actuales) => [...actuales, nuevaFila()])} />
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <BotonEnlace a="/inventario/documentos">Cancelar</BotonEnlace>
          <Button type="submit" cargando={registrar.isPending} icono={<config.icono size={16} />}>
            {config.registrar}
          </Button>
        </div>
      </form>

      <Confirmacion
        abierto={bloqueo.state === 'blocked'}
        titulo="¿Descartar el documento?"
        consecuencias={['Se pierden los datos y los productos cargados.']}
        textoConfirmar="Descartar"
        peligro
        alConfirmar={() => bloqueo.proceed?.()}
        alCancelar={() => bloqueo.reset?.()}
      />
    </Pagina>
  )
}

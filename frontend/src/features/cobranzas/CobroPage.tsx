import { useRef, useState, type FormEvent } from 'react'
import { useBlocker, useNavigate, useSearchParams } from 'react-router-dom'
import { HandCoins } from 'lucide-react'
import { useAvisos } from '@/core/avisos/useAvisos'
import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import { mapearError } from '@/core/errores/mapearError'
import { useHoy } from '@/core/fecha/useHoy'
import type { FormaPago } from '@/core/models/cobranzas'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useCliente, useSaldosCliente } from '@/features/clientes/clientes.queries'
import { BuscadorCliente, type ClienteElegido } from '@/features/clientes/components/BuscadorCliente'
import { leerNumero } from '@/features/notas/notas.calculos'
import { useNota } from '@/features/notas/notas.queries'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoMonto, redondear } from '@/shared/format/moneda'
import { BotonEnlace, Button } from '@/shared/ui/Button'
import { Input, Select } from '@/shared/ui/Campo'
import { CampoFecha } from '@/shared/ui/CampoFecha'
import { Card } from '@/shared/ui/Card'
import { Casilla } from '@/shared/ui/Casilla'
import { Confirmacion } from '@/shared/ui/Confirmacion'
import { Badge } from '@/shared/ui/Badge'
import { EmptyState } from '@/shared/ui/Estados'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Pagina } from '@/shared/ui/Pagina'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { toast } from '@/shared/ui/toast'
import { FORMAS_PAGO } from './cobranzas.opciones'
import { useRegistrarCobro } from './cobranzas.queries'

const CAMPOS = ['fecha', 'forma_pago'] as const

// Registrar cobro (06-pantallas/08 §1): varios documentos del cliente en un
// paso, una cobranza por documento (⚠ SUP-22). Con ?nota= llega marcada con su
// saldo; con ?cliente=, el cliente elegido.
export default function CobroPage() {
  const navigate = useNavigate()
  const hoy = useHoy()
  const [params] = useSearchParams()
  const notaId = params.get('nota') ?? ''
  const clienteId = params.get('cliente') ?? ''
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const avisos = useAvisos()
  const nota = useNota(notaId, Boolean(notaId))
  const clienteUrl = useCliente(clienteId, Boolean(clienteId) && !notaId)
  const registrar = useRegistrarCobro()

  const [cliente, setCliente] = useState<ClienteElegido | null>(null)
  // Cliente que llega por la URL (de la nota o directo): se adopta una vez.
  const deUrl: ClienteElegido | null = nota.data ? { id: nota.data.cliente_id, nombre: nota.data.cliente_nombre, nit: nota.data.cliente_nit } : (clienteUrl.data ?? null)
  const elegido = cliente ?? deUrl
  const saldos = useSaldosCliente(elegido?.id ?? '', Boolean(elegido))

  const [importes, setImportes] = useState<Record<string, string>>({})
  const [notaMarcada, setNotaMarcada] = useState(false)
  if (!notaMarcada && notaId && saldos.data) {
    setNotaMarcada(true)
    const doc = saldos.data.find((s) => s.documento_id === notaId)
    if (doc) setImportes({ [doc.documento_id]: doc.saldo.toFixed(2) })
  }

  // Desde la liquidación llega con la fecha del reporte y a dónde volver (⚠ SUP-51).
  const [fecha, setFecha] = useState(params.get('fecha') || hoy)
  const volver = params.get('volver')?.startsWith('/') ? params.get('volver') : null
  const [forma, setForma] = useState<FormaPago | ''>('')
  const [referencia, setReferencia] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [errores, setErrores] = useState<{ filas: Record<string, string>; fecha?: string; forma_pago?: string }>({ filas: {} })

  const minimo = (avisos.data?.dias_pendientes ?? []).filter((d) => d.regional_id === regionalActivaId).reduce((min, d) => (d.fecha < min ? d.fecha : min), hoy)
  const marcados = Object.entries(importes)
  const total = redondear(marcados.reduce((t, [, v]) => t + (leerNumero(v) ?? 0), 0))

  const guardado = useRef(false)
  const bloqueo = useBlocker(({ currentLocation, nextLocation }) => marcados.length > 0 && !guardado.current && currentLocation.pathname !== nextLocation.pathname)

  const elegirCliente = (c: ClienteElegido) => {
    setCliente(c)
    setImportes({})
    setErrores({ filas: {} })
  }

  const marcar = (documentoId: string, saldo: number, marcado: boolean) => {
    setImportes(({ [documentoId]: _quitado, ...resto }) => (marcado ? { ...resto, [documentoId]: saldo.toFixed(2) } : resto))
    setErrores((e) => ({ ...e, filas: {} }))
  }

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const filas: Record<string, string> = {}
    for (const [id, texto] of marcados) {
      const saldo = saldos.data?.find((s) => s.documento_id === id)?.saldo ?? 0
      const importe = leerNumero(texto)
      if (importe === null || importe <= 0) filas[id] = 'Importe mayor a 0.'
      else if (importe > saldo) filas[id] = `Máximo Bs ${formatoMonto(saldo)}.`
    }
    const nuevos = { filas, fecha: !fecha ? 'Elija la fecha.' : undefined, forma_pago: !forma ? 'Elija la forma de pago.' : undefined }
    setErrores(nuevos)
    if (!marcados.length) toast.error('Marque al menos un documento.')
    if (!marcados.length || Object.keys(filas).length || nuevos.fecha || nuevos.forma_pago || !regionalActivaId || !forma) return
    try {
      const cobros = await registrar.mutateAsync({
        regional_id: regionalActivaId,
        fecha,
        forma_pago: forma,
        referencia_pago: referencia.trim() || null,
        observaciones: observaciones.trim() || null,
        aplicaciones: marcados.map(([id, texto]) => ({
          tipo_doc: saldos.data?.find((s) => s.documento_id === id)?.tipo_doc ?? 'nota',
          documento_id: id,
          importe: leerNumero(texto) ?? 0,
        })),
      })
      guardado.current = true
      const primero = cobros[0]?.numero ?? ''
      const ultimo = cobros.at(-1)?.numero.split('-').at(-1) ?? ''
      toast.exito(cobros.length === 1 ? `Cobro ${primero} registrado` : `${cobros.length} cobros registrados (${primero} a ${ultimo})`)
      navigate(volver ?? (notaId ? `/notas/${notaId}` : `/clientes/${elegido?.id ?? ''}?pestana=saldo`))
    } catch (error) {
      const err = mapearError(error)
      if (err.esInesperado) return
      const documento = err.detalle?.documento_id
      if (typeof documento === 'string') setErrores((x) => ({ ...x, filas: { [documento]: err.message } }))
      else if (err.codigo === 'DIA_CERRADO' || err.codigo === 'FECHA_INVALIDA') setErrores((x) => ({ ...x, fecha: err.message }))
      else aplicarErrorFormulario(error, CAMPOS, (campo, mensaje) => setErrores((x) => ({ ...x, [campo]: mensaje })))
    }
  }

  return (
    <Pagina titulo="Registrar cobro" subtitulo={regionalActiva?.nombre}>
      <form onSubmit={enviar} noValidate className="grid gap-4">
        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <BuscadorCliente regionalId={regionalActivaId} cliente={elegido} alCambiar={elegirCliente} />
            </div>
            <CampoFecha label="Fecha" requerido valor={fecha} min={minimo} max={hoy} error={errores.fecha} alCambiar={setFecha} />
            <Select
              label="Forma de pago"
              requerido
              valor={forma}
              opciones={FORMAS_PAGO}
              error={errores.forma_pago}
              alCambiar={(valor) => {
                setForma(valor)
                setErrores((x) => ({ ...x, forma_pago: undefined }))
              }}
            />
            <Input label="Referencia" placeholder="N° de transferencia o cheque" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
            <Input label="Observaciones" placeholder="Opcional" value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
          </div>
        </Card>

        <Card titulo="Documentos con saldo" sinPadding>
          {!elegido ? (
            <EmptyState icono={HandCoins} titulo="Elija el cliente para ver sus documentos" />
          ) : (
            <SeccionConsulta consulta={saldos}>
              {(docs) =>
                docs.length ? (
                  <ul aria-label="Documentos con saldo" className="grid gap-2 p-3">
                    {docs.map((d) => {
                      const marcado = d.documento_id in importes
                      return (
                        <li key={d.documento_id} className="grid items-start gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                          <Casilla marcada={marcado} alCambiar={(m) => marcar(d.documento_id, d.saldo, m)}>
                            <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                              <span className="min-w-0">
                                <span className="font-medium">{d.tipo_doc === 'saldo_inicial' ? `Saldo inicial ${d.numero}` : d.numero}</span>
                                {d.numero_factura && <span className="text-texto-3"> · {d.numero_factura}</span>}
                                <span className="block text-chico text-texto-3 tabular-nums">
                                  {formatoFecha(d.fecha)}
                                  {d.fecha_vencimiento && ` · vence ${formatoFecha(d.fecha_vencimiento)}`}
                                </span>
                              </span>
                              <span className="flex items-center gap-2">
                                {d.vencido && <Badge variante="error">{d.dias_mora} días de mora</Badge>}
                                <MontoBs valor={d.saldo} className="font-semibold" />
                              </span>
                            </span>
                          </Casilla>
                          {marcado && (
                            <Input
                              label={`Importe a cobrar de ${d.numero}`}
                              inputMode="decimal"
                              value={importes[d.documento_id]}
                              error={errores.filas[d.documento_id]}
                              onChange={(e) => setImportes((x) => ({ ...x, [d.documento_id]: e.target.value }))}
                              className="[&_label]:sr-only"
                            />
                          )}
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <EmptyState icono={HandCoins} titulo="Este cliente no tiene deudas" />
                )
              }
            </SeccionConsulta>
          )}
        </Card>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="mr-auto text-chico text-texto-2">
            Total a registrar <MontoBs valor={total} className="text-subtitulo font-semibold text-texto" />
          </span>
          <BotonEnlace a={volver ?? (notaId ? `/notas/${notaId}` : '/notas')}>Cancelar</BotonEnlace>
          <Button type="submit" cargando={registrar.isPending} icono={<HandCoins size={16} />}>
            Registrar cobro
          </Button>
        </div>
      </form>

      <Confirmacion
        abierto={bloqueo.state === 'blocked'}
        titulo="¿Descartar el cobro?"
        consecuencias={['Se pierden los documentos marcados.']}
        textoConfirmar="Descartar"
        peligro
        alConfirmar={() => bloqueo.proceed?.()}
        alCancelar={() => bloqueo.reset?.()}
      />
    </Pagina>
  )
}

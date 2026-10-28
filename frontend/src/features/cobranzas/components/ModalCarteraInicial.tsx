import { useRef, useState, type ChangeEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CircleCheck, Download, FileUp, Upload } from 'lucide-react'
import { mapearError } from '@/core/errores/mapearError'
import type { DocumentoCartera } from '@/core/models/cobranzas'
import { clientesService } from '@/features/clientes/clientes.service'
import { useRegionales } from '@/features/configuracion/configuracion.queries'
import { descargarArchivo } from '@/shared/export/descargar'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoMonto, redondear } from '@/shared/format/moneda'
import { Button } from '@/shared/ui/Button'
import { Alerta } from '@/shared/ui/Estados'
import { Modal } from '@/shared/ui/Modal'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { fechaIso, importeCsv, leerCsvCartera, PLANTILLA_CARTERA } from '../cartera.csv'
import { useCargarCartera } from '../cobranzas.queries'

interface FilaRevisada {
  linea: number
  regional_id: string | null
  regional: string
  cliente: string
  documento: DocumentoCartera | null
  importe: number
  error: string | null
}

const descargarPlantilla = () => descargarArchivo(PLANTILLA_CARTERA, 'cartera_inicial.csv', 'text/csv;charset=utf-8')

const COLUMNAS: Columna<FilaRevisada>[] = [
  { clave: 'linea', titulo: 'Fila', numerico: true, render: (f) => f.linea },
  { clave: 'cliente', titulo: 'Cliente', principalMovil: true, render: (f) => f.cliente || '—' },
  { clave: 'regional', titulo: 'Regional', render: (f) => f.regional || '—' },
  { clave: 'documento', titulo: 'Documento', numerico: true, render: (f) => f.documento?.numero_documento ?? '—' },
  { clave: 'fecha', titulo: 'Fecha', numerico: true, ocultarEnMovil: true, render: (f) => (f.documento ? formatoFecha(f.documento.fecha_documento) : '—') },
  { clave: 'importe', titulo: 'Importe', alinear: 'der', numerico: true, render: (f) => (f.importe ? formatoMonto(f.importe) : '—') },
  {
    clave: 'estado',
    titulo: 'Revisión',
    render: (f) => (f.error ? <span className="text-error">{f.error}</span> : <CircleCheck size={16} className="text-ok" aria-label="Correcta" />),
  },
]

// Cartera inicial (06-pantallas/05, ⚠ SUP-24): CSV con vista previa y
// validación por fila; solo se carga si todo el archivo está bien (como
// importar.mjs). Una llamada por regional, en paralelo.
export function ModalCarteraInicial({ alCerrar }: { alCerrar: () => void }) {
  const qc = useQueryClient()
  const regionales = useRegionales()
  const cargar = useCargarCartera()
  const archivo = useRef<HTMLInputElement>(null)
  const [nombre, setNombre] = useState('')
  const [filas, setFilas] = useState<FilaRevisada[] | null>(null)
  const [revisando, setRevisando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cargados, setCargados] = useState<{ documentos: number; importe: number } | null>(null)

  const validas = filas?.filter((f) => !f.error) ?? []
  const total = redondear(validas.reduce((t, f) => t + f.importe, 0))
  const listo = filas !== null && filas.length > 0 && validas.length === filas.length

  const revisar = async (e: ChangeEvent<HTMLInputElement>) => {
    const elegido = e.target.files?.[0]
    e.target.value = ''
    if (!elegido) return
    setNombre(elegido.name)
    setFilas(null)
    setCargados(null)
    setError(null)
    setRevisando(true)
    try {
      const { filas: leidas, error: formato } = leerCsvCartera(await elegido.text())
      if (formato) return setError(formato)
      const porCodigo = new Map((regionales.data ?? []).map((r) => [r.codigo.toLowerCase(), r]))
      // Clientes por nombre, una consulta por regional y en paralelo (regla 20).
      const codigos = [...new Set(leidas.map((f) => f.regional_codigo.toLowerCase()))].filter((c) => porCodigo.has(c))
      const clientes = await Promise.all(
        codigos.map((codigo) => {
          const regional = porCodigo.get(codigo)
          const nombres = [...new Set(leidas.filter((f) => f.regional_codigo.toLowerCase() === codigo).map((f) => f.cliente_nombre))]
          return qc.fetchQuery({ queryKey: ['clientes', 'por-nombres', regional?.id, nombres.join('|')], queryFn: ({ signal }) => clientesService.porNombres(regional?.id ?? '', nombres, { signal }) })
        }),
      )
      const encontrados = clientes.flat()
      const vistos = new Set<string>()
      setFilas(
        leidas.map((f) => {
          const regional = porCodigo.get(f.regional_codigo.toLowerCase())
          const cliente = encontrados.find((c) => c.regional_id === regional?.id && c.nombre === f.cliente_nombre)
          const fecha = fechaIso(f.fecha_documento)
          const vence = f.fecha_vencimiento ? fechaIso(f.fecha_vencimiento) : null
          const importe = importeCsv(f.importe)
          const clave = `${regional?.id}|${f.numero_documento.toLowerCase()}`
          const error = !regional
            ? `Regional "${f.regional_codigo}" desconocida.`
            : !cliente
              ? 'Cliente no encontrado en la regional.'
              : !f.numero_documento
                ? 'Falta el N° de documento.'
                : vistos.has(clave)
                  ? 'N° repetido en el archivo.'
                  : !fecha
                    ? 'Fecha inválida.'
                    : f.fecha_vencimiento && !vence
                      ? 'Vencimiento inválido.'
                      : importe === null
                        ? 'Importe inválido.'
                        : null
          vistos.add(clave)
          return {
            linea: f.linea,
            regional_id: regional?.id ?? null,
            regional: regional?.codigo ?? f.regional_codigo,
            cliente: f.cliente_nombre,
            importe: importe ?? 0,
            error,
            documento:
              cliente && fecha && importe !== null
                ? { cliente_id: cliente.id, numero_documento: f.numero_documento, fecha_documento: fecha, fecha_vencimiento: vence, importe, observaciones: f.observaciones || null }
                : null,
          }
        }),
      )
    } catch (err) {
      setError(mapearError(err).message)
    } finally {
      setRevisando(false)
    }
  }

  const confirmar = async () => {
    if (!listo || !filas) return
    const porRegional = new Map<string, DocumentoCartera[]>()
    for (const f of filas) if (f.regional_id && f.documento) porRegional.set(f.regional_id, [...(porRegional.get(f.regional_id) ?? []), f.documento])
    try {
      const resultados = await Promise.all([...porRegional].map(([regionalId, documentos]) => cargar.mutateAsync({ regionalId, documentos })))
      setCargados({ documentos: resultados.reduce((t, r) => t + r.insertados, 0), importe: total })
      setFilas(null)
    } catch (err) {
      setError(mapearError(err).message)
    }
  }

  return (
    <Modal
      abierto
      tam="xl"
      titulo="Cargar cartera inicial"
      alCerrar={alCerrar}
      bloqueado={cargar.isPending}
      pie={
        <>
          <Button variante="secundario" className="mr-auto" icono={<Download size={15} />} onClick={descargarPlantilla}>
            Plantilla
          </Button>
          <Button variante="secundario" onClick={alCerrar}>
            {cargados ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!cargados && (
            <Button icono={<Upload size={15} />} disabled={!listo} cargando={cargar.isPending} onClick={confirmar}>
              {listo ? `Cargar ${filas.length} documentos` : 'Cargar'}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-4">
        <p className="text-chico text-texto-3">
          Saldos pendientes por documento a la fecha de puesta en marcha. CSV separado por «;», fechas AAAA-MM-DD o DD/MM/AAAA, decimales con punto. Si una fila tiene un error no se carga nada.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={archivo} type="file" accept=".csv,text/csv" className="sr-only" tabIndex={-1} aria-hidden onChange={revisar} />
          <Button variante="secundario" icono={<FileUp size={15} />} cargando={revisando} onClick={() => archivo.current?.click()}>
            Elegir archivo CSV
          </Button>
          {nombre && <span className="min-w-0 truncate text-chico text-texto-2">{nombre}</span>}
        </div>
        {error && <Alerta tipo="error">{error}</Alerta>}
        {cargados && (
          <Alerta tipo="ok">
            Se cargaron {cargados.documentos} documentos por Bs {formatoMonto(cargados.importe)}, lo mismo que suma el archivo.
          </Alerta>
        )}
        {filas && (
          <>
            <p className="text-cuerpo">
              <b>{validas.length}</b> de {filas.length} filas correctas · Total <b className="tabular-nums">Bs {formatoMonto(total)}</b>
            </p>
            <div className="-mx-5 border-y border-borde">
              <Tabla etiqueta="Vista previa de la cartera" columnas={COLUMNAS} filas={filas} claveFila={(f) => String(f.linea)} />
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

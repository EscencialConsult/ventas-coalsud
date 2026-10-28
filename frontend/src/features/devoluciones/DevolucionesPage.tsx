import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FilePen, Undo2 } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import { useHoy } from '@/core/fecha/useHoy'
import type { Devolucion, FiltrosDevoluciones, TipoReverso } from '@/core/models/cobranzas'
import { POR_PAGINA } from '@/core/models/maestros'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { formatoFecha } from '@/shared/format/fecha'
import { Badge } from '@/shared/ui/Badge'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Input } from '@/shared/ui/Campo'
import { Card } from '@/shared/ui/Card'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EmptyState } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { ModalFormulario } from '@/shared/ui/ModalFormulario'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Pagina } from '@/shared/ui/Pagina'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { toast } from '@/shared/ui/toast'
import { TIPOS_REVERSO } from './devoluciones.opciones'
import { useDevoluciones, useRegistrarNc } from './devoluciones.queries'

const FILTROS = { desde: '', hasta: '', tipo: '', pagina: '1' }

/** N° de la nota de crédito contable: se carga cuando Contabilidad la emite (con el día cerrado también). */
function ModalNc({ devolucion, alCerrar }: { devolucion: Devolucion; alCerrar: () => void }) {
  const registrar = useRegistrarNc()
  const [numero, setNumero] = useState(devolucion.nc_contable_numero ?? '')
  const [error, setError] = useState<string>()

  const guardar = async () => {
    if (!numero.trim()) return setError('Ingrese el N° de la nota de crédito.')
    try {
      await registrar.mutateAsync({ id: devolucion.id, numero })
      toast.exito(`NC guardada en ${devolucion.numero}`)
      alCerrar()
    } catch (e) {
      aplicarErrorFormulario(e, ['numero'] as const, (_campo, mensaje) => setError(mensaje))
    }
  }

  return (
    <ModalFormulario
      abierto
      titulo={`Nota de crédito de ${devolucion.numero}`}
      sucio={numero.trim() !== (devolucion.nc_contable_numero ?? '')}
      guardando={registrar.isPending}
      alCerrar={alCerrar}
      alGuardar={guardar}
    >
      <Input
        label="N° de NC contable"
        requerido
        placeholder="NC-0012"
        value={numero}
        error={error}
        onChange={(e) => {
          setNumero(e.target.value)
          setError(undefined)
        }}
      />
    </ModalFormulario>
  )
}

// Devoluciones (06-pantallas/07 §5): las registra el detalle de la nota; acá
// se consultan y se carga el N° de la nota de crédito de Contabilidad.
export default function DevolucionesPage() {
  const hoy = useHoy()
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const pagina = Math.max(1, Number(f.pagina) || 1)
  const filtros: FiltrosDevoluciones = { desde: f.desde, hasta: f.hasta, tipo: f.tipo as TipoReverso | '' }
  const consulta = useDevoluciones(regionalActivaId, filtros, pagina)
  const editable = usePermisos()('nota.devolver')
  const [editando, setEditando] = useState<Devolucion | null>(null)

  const columnas: Columna<Devolucion>[] = [
    { clave: 'numero', titulo: 'Devolución', numerico: true, render: (d) => <DosLineas principal={<span className="font-medium">{d.numero}</span>} secundario={formatoFecha(d.fecha)} /> },
    {
      clave: 'nota',
      titulo: 'Nota',
      principalMovil: true,
      render: (d) => (
        <DosLineas
          principal={
            <Link to={`/notas/${d.nota_venta_id}`} className="font-medium text-rojo hover:underline">
              {d.nota_numero}
            </Link>
          }
          secundario={d.cliente_nombre}
        />
      ),
    },
    { clave: 'tipo', titulo: 'Tipo', render: (d) => <Badge variante={TIPOS_REVERSO[d.tipo_reverso].tono}>{TIPOS_REVERSO[d.tipo_reverso].etiqueta}</Badge> },
    { clave: 'importe', titulo: 'Importe', alinear: 'der', render: (d) => <MontoBs valor={d.importe} /> },
    { clave: 'nc', titulo: 'NC contable', render: (d) => d.nc_contable_numero ?? <Badge variante="alerta">Pendiente</Badge> },
    { clave: 'usuario', titulo: 'Usuario', ocultarEnMovil: true, render: (d) => d.usuario_nombre },
    ...(editable
      ? [
          {
            clave: 'acciones',
            titulo: 'Acciones',
            acciones: true,
            render: (d: Devolucion) => (
              <BotonIcono etiqueta={d.nc_contable_numero ? `Cambiar la NC de ${d.numero}` : `Cargar la NC de ${d.numero}`} onClick={() => setEditando(d)}>
                <FilePen size={15} />
              </BotonIcono>
            ),
          },
        ]
      : []),
  ]

  return (
    <Pagina titulo="Devoluciones" subtitulo={regionalActiva?.nombre ?? 'Todas las regionales'}>
      <Card sinPadding>
        <BarraFiltros>
          <FiltroFechas desde={f.desde} hasta={f.hasta} max={hoy} alCambiar={(desde, hasta) => cambiar({ desde, hasta })} />
          <FiltroSelect
            etiqueta="Tipo"
            valor={f.tipo}
            alCambiar={(tipo) => cambiar({ tipo })}
            opciones={[{ valor: '', etiqueta: 'Reembolsos y abonos' }, ...Object.entries(TIPOS_REVERSO).map(([valor, t]) => ({ valor, etiqueta: t.etiqueta }))]}
          />
        </BarraFiltros>
        <SeccionConsulta consulta={consulta}>
          {(datos) => (
            <>
              <Tabla
                etiqueta="Devoluciones"
                columnas={columnas}
                filas={datos.filas}
                claveFila={(d) => d.id}
                vacio={<EmptyState icono={Undo2} titulo="No hay devoluciones con esos filtros" detalle="Se registran desde el detalle de una nota de un día ya cerrado." />}
              />
              <Paginacion pagina={pagina} total={datos.total} porPagina={POR_PAGINA} unidad="devoluciones" alCambiar={(p) => cambiar({ pagina: String(p) })} />
            </>
          )}
        </SeccionConsulta>
      </Card>
      {editando && <ModalNc devolucion={editando} alCerrar={() => setEditando(null)} />}
    </Pagina>
  )
}

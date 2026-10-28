import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Eye, ShieldCheck } from 'lucide-react'
import { useHoy } from '@/core/fecha/useHoy'
import type { AccionAuditoria, EntidadAuditoria, FiltrosAuditoria, RegistroAuditoria } from '@/core/models/auditoria'
import { POR_PAGINA } from '@/core/models/maestros'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useUsuarios } from '@/features/usuarios/usuarios.queries'
import { exportarTabla, nombreExport } from '@/shared/export/excelTabla'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { formatoFechaHora } from '@/shared/format/fecha'
import { BotonExcel } from '@/shared/ui/BotonExcel'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Card } from '@/shared/ui/Card'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EmptyState } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { Pagina } from '@/shared/ui/Pagina'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { auditoriaService } from './auditoria.service'
import { ModalDetalleAuditoria } from './components/ModalDetalleAuditoria'
import { ACCIONES, enlace, ENTIDADES, resumen, textoRegistro } from './resumenes'

const FILTROS = { desde: '', hasta: '', usuario: '', accion: '', entidad: '', pagina: '1' }

// Auditoría (06-pantallas/12) · solo nacional y solo lectura: cada acción con
// un resumen legible; "Ver detalle" muestra qué cambió (antes y después).
export default function AuditoriaPage() {
  const hoy = useHoy()
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const pagina = Math.max(1, Number(f.pagina) || 1)
  const filtros: FiltrosAuditoria = { desde: f.desde, hasta: f.hasta, usuario: f.usuario, accion: f.accion as AccionAuditoria | '', entidad: f.entidad as EntidadAuditoria | '' }
  const consulta = useQuery({
    queryKey: ['auditoria', regionalActivaId, filtros.desde, filtros.hasta, filtros.usuario, filtros.accion, filtros.entidad, pagina],
    queryFn: ({ signal }) => auditoriaService.listar(regionalActivaId, filtros, pagina, { signal }),
  })
  const usuarios = useUsuarios()
  const [viendo, setViendo] = useState<RegistroAuditoria | null>(null)

  const columnas: Columna<RegistroAuditoria>[] = [
    { clave: 'fecha', titulo: 'Fecha y hora', numerico: true, render: (r) => formatoFechaHora(r.created_at) },
    { clave: 'usuario', titulo: 'Usuario', render: (r) => <DosLineas principal={r.usuario_nombre} secundario={r.regional_codigo ?? undefined} /> },
    { clave: 'accion', titulo: 'Acción', principalMovil: true, render: (r) => <span className="font-medium">{ACCIONES[r.accion]}</span> },
    {
      clave: 'registro',
      titulo: 'Registro',
      numerico: true,
      render: (r) => {
        const a = enlace(r)
        return a ? (
          <Link to={a} className="font-medium text-rojo hover:underline">
            {textoRegistro(r)}
          </Link>
        ) : (
          textoRegistro(r)
        )
      },
    },
    { clave: 'detalle', titulo: 'Detalle', render: (r) => resumen(r) },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      acciones: true,
      render: (r) => (
        <BotonIcono etiqueta="Ver detalle" onClick={() => setViendo(r)}>
          <Eye size={15} />
        </BotonIcono>
      ),
    },
  ]

  return (
    <Pagina titulo="Auditoría" subtitulo={regionalActiva?.nombre ?? 'Todas las regionales'}>
      <Card sinPadding>
        <BarraFiltros>
          <FiltroFechas desde={f.desde} hasta={f.hasta} max={hoy} alCambiar={(desde, hasta) => cambiar({ desde, hasta })} />
          <FiltroSelect
            etiqueta="Usuario"
            valor={f.usuario}
            alCambiar={(usuario) => cambiar({ usuario })}
            opciones={[{ valor: '', etiqueta: 'Todos los usuarios' }, ...(usuarios.data ?? []).map((u) => ({ valor: u.nombre, etiqueta: u.nombre }))]}
          />
          <FiltroSelect etiqueta="Acción" valor={f.accion} alCambiar={(accion) => cambiar({ accion })} opciones={[{ valor: '', etiqueta: 'Todas las acciones' }, ...Object.entries(ACCIONES).map(([valor, etiqueta]) => ({ valor, etiqueta }))]} />
          <FiltroSelect etiqueta="Entidad" valor={f.entidad} alCambiar={(entidad) => cambiar({ entidad })} opciones={[{ valor: '', etiqueta: 'Todas las entidades' }, ...Object.entries(ENTIDADES).map(([valor, etiqueta]) => ({ valor, etiqueta }))]} />
          <div className="sm:ml-auto">
            <BotonExcel
              tam="sm"
              disabled={!consulta.data?.total}
              alExportar={async () => {
                const filas = await auditoriaService.todos(regionalActivaId, filtros)
                await exportarTabla({
                  titulo: `Auditoría · ${regionalActiva?.nombre ?? 'Todas las regionales'}`,
                  nombre: nombreExport('Auditoria', regionalActiva?.codigo, filtros.desde, filtros.hasta),
                  filas,
                  columnas: [
                    { titulo: 'Fecha y hora', valor: (r) => formatoFechaHora(r.created_at) },
                    { titulo: 'Usuario', valor: (r) => r.usuario_nombre },
                    { titulo: 'Regional', valor: (r) => r.regional_codigo },
                    { titulo: 'Acción', valor: (r) => ACCIONES[r.accion] },
                    { titulo: 'Registro', valor: (r) => textoRegistro(r) },
                    { titulo: 'Detalle', valor: (r) => resumen(r) },
                  ],
                })
              }}
            />
          </div>
        </BarraFiltros>
        <SeccionConsulta consulta={consulta}>
          {(datos) => (
            <>
              <Tabla etiqueta="Auditoría" columnas={columnas} filas={datos.filas} claveFila={(r) => r.id} vacio={<EmptyState icono={ShieldCheck} titulo="Sin registros con esos filtros" />} />
              <Paginacion pagina={pagina} total={datos.total} porPagina={POR_PAGINA} unidad="registros" alCambiar={(p) => cambiar({ pagina: String(p) })} />
            </>
          )}
        </SeccionConsulta>
      </Card>

      <ModalDetalleAuditoria registro={viendo} alCerrar={() => setViendo(null)} />
    </Pagina>
  )
}

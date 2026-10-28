import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, Target } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import { useHoy } from '@/core/fecha/useHoy'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { CATEGORIAS } from '@/features/clientes/clientes.opciones'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { formatoPct } from '@/shared/format/moneda'
import { BarraProgreso } from '@/shared/ui/BarraProgreso'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { EmptyState } from '@/shared/ui/Estados'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Pagina } from '@/shared/ui/Pagina'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { ModalMeta } from './components/ModalMeta'
import { periodosAlrededor } from './presupuesto.periodos'
import { presupuestoService, type FilaCumplimiento } from './presupuesto.service'

const FILTROS = { periodo: '' }

// Presupuesto y seguimiento comercial (06-pantallas/10, Reglas §8): metas,
// real, cumplimiento y proyección de cierre.
export default function PresupuestoPage() {
  const hoy = useHoy()
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const periodo = f.periodo || hoy.slice(0, 7)
  const consulta = useQuery({ queryKey: ['presupuesto', periodo, regionalActivaId], queryFn: ({ signal }) => presupuestoService.cumplimiento(periodo, regionalActivaId, { signal }) })
  const editable = usePermisos()('presupuesto.editar')
  const [editando, setEditando] = useState<{ meta: FilaCumplimiento | null } | null>(null)

  const columnas: Columna<FilaCumplimiento>[] = [
    {
      clave: 'meta',
      titulo: 'Meta de',
      principalMovil: true,
      render: (p) => <DosLineas principal={<span className="font-medium">{p.vendedor ?? (CATEGORIAS.find((c) => c.valor === p.categoria)?.etiqueta ?? p.regional)}</span>} secundario={p.vendedor || p.categoria ? p.regional : 'Toda la regional'} />,
    },
    { clave: 'importe', titulo: 'Meta', alinear: 'der', render: (p) => <MontoBs valor={p.meta} entero /> },
    { clave: 'real', titulo: 'Real', alinear: 'der', render: (p) => <MontoBs valor={p.real} entero /> },
    {
      clave: 'avance',
      titulo: 'Avance',
      render: (p) => (
        <span className="flex min-w-32 items-center gap-2">
          <BarraProgreso valor={p.real} maximo={p.meta} etiqueta={`Avance de ${p.vendedor ?? p.regional}`} className="flex-1" />
          <span className="w-10 text-right tabular-nums">{formatoPct(p.cumplimiento_pct)}</span>
        </span>
      ),
    },
    { clave: 'proyeccion', titulo: 'Proyección', alinear: 'der', numerico: true, render: (p) => (p.proyeccion === null ? '—' : formatoPct((p.proyeccion / p.meta) * 100)) },
    { clave: 'estado', titulo: 'Estado', render: (p) => <EstadoBadge estado={p.estado} /> },
    ...(editable
      ? [
          {
            clave: 'acciones',
            titulo: 'Acciones',
            acciones: true,
            render: (p: FilaCumplimiento) => (
              <BotonIcono etiqueta="Editar meta" onClick={() => setEditando({ meta: p })}>
                <Pencil size={15} />
              </BotonIcono>
            ),
          },
        ]
      : []),
  ]

  return (
    <Pagina
      titulo="Presupuesto y seguimiento"
      subtitulo={regionalActiva?.nombre ?? 'Todas las regionales'}
      acciones={
        editable && (
          <Button icono={<Plus size={16} />} onClick={() => setEditando({ meta: null })}>
            Cargar meta
          </Button>
        )
      }
    >
      <Card sinPadding>
        <BarraFiltros>
          <FiltroSelect etiqueta="Período" valor={periodo} alCambiar={(p) => cambiar({ periodo: p === hoy.slice(0, 7) ? '' : p })} opciones={periodosAlrededor(hoy.slice(0, 7))} />
        </BarraFiltros>
        <SeccionConsulta consulta={consulta}>
          {(filas) => (
            <Tabla
              etiqueta="Metas del período"
              columnas={columnas}
              filas={filas}
              claveFila={(p) => p.presupuesto_id}
              vacio={<EmptyState icono={Target} titulo="No hay metas para el período" accion={editable && <Button tam="sm" icono={<Plus size={14} />} onClick={() => setEditando({ meta: null })}>Cargar meta</Button>} />}
            />
          )}
        </SeccionConsulta>
      </Card>

      {consulta.data && consulta.data.some((p) => !p.vendedor && !p.categoria && p.proyeccion !== null) && (
        <Card titulo="Proyección de cierre" subtitulo="Real y proyección contra la meta de cada regional">
          <ul className="grid gap-4">
            {consulta.data
              .filter((p) => !p.vendedor && !p.categoria)
              .map((p) => (
                <li key={p.presupuesto_id} className="grid gap-1.5">
                  <span className="flex justify-between text-chico">
                    <b>{p.regional}</b>
                    <span className="text-texto-3 tabular-nums">
                      Real {formatoPct(p.cumplimiento_pct)} · proyección {p.proyeccion === null ? '—' : formatoPct((p.proyeccion / p.meta) * 100)}
                    </span>
                  </span>
                  <BarraProgreso valor={p.real} maximo={p.meta} etiqueta={`Real de ${p.regional}`} />
                  <BarraProgreso valor={p.proyeccion ?? 0} maximo={p.meta} etiqueta={`Proyección de ${p.regional}`} color="info" />
                </li>
              ))}
          </ul>
        </Card>
      )}

      {editando && <ModalMeta meta={editando.meta} periodo={periodo} alCerrar={() => setEditando(null)} />}
    </Pagina>
  )
}

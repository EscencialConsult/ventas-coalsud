import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import type { CondicionPago } from '@/core/models/maestros'
import { Badge } from '@/shared/ui/Badge'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Button } from '@/shared/ui/Button'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { BarraFiltros } from '@/shared/ui/FiltroSelect'
import { Interruptor } from '@/shared/ui/Interruptor'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { useActivarCondicion, useCondiciones } from './catalogo.queries'
import { ModalCondicion } from './components/ModalCondicion'

// Condiciones de pago (06-pantallas/05 §3, ⚠ SUP-25).
export default function CondicionesTab() {
  const condiciones = useCondiciones()
  const editable = usePermisos()('catalogo.editar')
  const activar = useActivarCondicion()
  const [editando, setEditando] = useState<{ condicion: CondicionPago | null } | null>(null)

  const columnas: Columna<CondicionPago>[] = [
    { clave: 'nombre', titulo: 'Condición', principalMovil: true, render: (c) => <span className="font-medium">{c.nombre}</span> },
    { clave: 'tipo', titulo: 'Tipo', render: (c) => <Badge variante={c.tipo === 'contado' ? 'ok' : 'info'}>{c.tipo === 'contado' ? 'Contado' : 'Crédito'}</Badge> },
    { clave: 'dias', titulo: 'Días', alinear: 'der', numerico: true, render: (c) => (c.tipo === 'contado' ? <span className="text-texto-3">—</span> : c.dias) },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (c) => (editable ? <Interruptor activo={c.activo} etiqueta={`${c.nombre} activa`} alCambiar={() => activar.mutate(c)} /> : <EstadoBadge estado={c.activo ? 'activo' : 'inactivo'} />),
    },
    ...(editable
      ? [
          {
            clave: 'acciones',
            titulo: 'Acciones',
            acciones: true,
            render: (c: CondicionPago) => (
              <BotonIcono etiqueta={`Editar ${c.nombre}`} onClick={() => setEditando({ condicion: c })}>
                <Pencil size={15} />
              </BotonIcono>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      {editable && (
        <BarraFiltros>
          <Button icono={<Plus size={16} />} className="w-full sm:ml-auto sm:w-auto" onClick={() => setEditando({ condicion: null })}>
            Nueva condición
          </Button>
        </BarraFiltros>
      )}
      <SeccionConsulta consulta={condiciones}>
        {(lista) => (
          <>
            <Tabla etiqueta="Condiciones de pago" columnas={columnas} filas={lista} claveFila={(c) => c.id} filaApagada={(c) => !c.activo} />
            {editando && (
              <ModalCondicion condicion={editando.condicion} siguienteOrden={Math.max(0, ...lista.map((c) => c.orden)) + 1} alCerrar={() => setEditando(null)} />
            )}
          </>
        )}
      </SeccionConsulta>
    </>
  )
}

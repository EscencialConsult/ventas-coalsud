import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import type { LineaComercial } from '@/core/models/maestros'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/ui/cn'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { BarraFiltros } from '@/shared/ui/FiltroSelect'
import { Interruptor } from '@/shared/ui/Interruptor'
import { ListaReordenable } from '@/shared/ui/ListaReordenable'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { useActivarLinea, useLineas, useReordenarLineas } from './catalogo.queries'
import { ModalLinea } from './components/ModalLinea'

/** Solo las líneas que cambiaron de lugar (orden 1..n). */
function cambiosDeOrden(nuevas: LineaComercial[]) {
  return nuevas.map((l, i) => ({ id: l.id, orden: i + 1, antes: l.orden })).filter((c) => c.orden !== c.antes).map(({ id, orden }) => ({ id, orden }))
}

// Líneas comerciales (06-pantallas/05 §2): su orden es el del reporte diario
// y del Excel. Se reordenan arrastrando o con las flechas.
export default function LineasTab() {
  const lineas = useLineas()
  const editable = usePermisos()('catalogo.editar')
  const reordenar = useReordenarLineas()
  const activar = useActivarLinea()
  const [editando, setEditando] = useState<{ linea: LineaComercial | null } | null>(null)

  return (
    <>
      <BarraFiltros>
        <p className="text-chico text-texto-3">El orden de las líneas es el del reporte diario y del Excel.</p>
        {editable && (
          <Button icono={<Plus size={16} />} className="w-full sm:ml-auto sm:w-auto" onClick={() => setEditando({ linea: null })}>
            Nueva línea
          </Button>
        )}
      </BarraFiltros>

      <SeccionConsulta consulta={lineas}>
        {(lista) => (
          <ListaReordenable
            etiqueta="Líneas comerciales en orden"
            items={lista}
            claveItem={(l) => l.id}
            nombreItem={(l) => l.nombre}
            soloLectura={!editable}
            alReordenar={(nuevas) => reordenar.mutate(cambiosDeOrden(nuevas))}
            render={(l, posicion) => (
              <div className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-right text-chico text-texto-3 tabular-nums">{posicion}</span>
                <span className={cn('min-w-0 flex-1 truncate font-medium', !l.activo && 'text-texto-3')}>{l.nombre}</span>
                {editable ? (
                  <>
                    <Interruptor activo={l.activo} etiqueta={`${l.nombre} activa`} alCambiar={() => activar.mutate(l)} />
                    <BotonIcono etiqueta={`Editar ${l.nombre}`} onClick={() => setEditando({ linea: l })}>
                      <Pencil size={15} />
                    </BotonIcono>
                  </>
                ) : (
                  <EstadoBadge estado={l.activo ? 'activo' : 'inactivo'} />
                )}
              </div>
            )}
          />
        )}
      </SeccionConsulta>

      {editando && <ModalLinea linea={editando.linea} alCerrar={() => setEditando(null)} />}
    </>
  )
}

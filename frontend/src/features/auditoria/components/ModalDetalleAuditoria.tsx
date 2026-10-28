import type { RegistroAuditoria } from '@/core/models/auditoria'
import { formatoFechaHora } from '@/shared/format/fecha'
import { cn } from '@/shared/ui/cn'
import { Modal } from '@/shared/ui/Modal'
import { detalleLegible } from '../detalle'
import { ACCIONES, textoRegistro } from '../resumenes'

/** "Ver detalle" de un registro de auditoría: qué cambió, en lenguaje del negocio. */
export function ModalDetalleAuditoria({ registro, alCerrar }: { registro: RegistroAuditoria | null; alCerrar: () => void }) {
  const detalle = registro ? detalleLegible(registro.accion, registro.datos) : null
  return (
    <Modal abierto={registro !== null} titulo={registro ? `${ACCIONES[registro.accion]} · ${textoRegistro(registro)}` : ''} alCerrar={alCerrar}>
      {registro && detalle && (
        <div className="grid gap-4">
          <p className="text-chico text-texto-3">
            {registro.usuario_nombre}
            {registro.regional_codigo && ` · ${registro.regional_codigo}`} · {formatoFechaHora(registro.created_at)}
          </p>

          {detalle.cambios.length > 0 && (
            <table className="w-full border-collapse text-cuerpo">
              <thead>
                <tr className="border-b border-borde text-left text-mini font-semibold text-texto-3 uppercase">
                  <th scope="col" className="py-2 pr-3">
                    Campo
                  </th>
                  <th scope="col" className="py-2 pr-3">
                    Antes
                  </th>
                  <th scope="col" className="py-2">
                    Después
                  </th>
                </tr>
              </thead>
              <tbody>
                {detalle.cambios.map((c) => (
                  <tr key={c.campo} className="border-b border-borde/70 last:border-b-0">
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-texto-2">
                      {c.campo}
                    </th>
                    <td className="py-2 pr-3 text-texto-3 tabular-nums">{c.antes}</td>
                    <td className={cn('py-2 tabular-nums', c.cambio && 'font-semibold')}>{c.despues}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {detalle.datos.length > 0 && (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
              {detalle.datos.map((d) => (
                <div key={d.campo} className="contents">
                  <dt className="text-texto-2">{d.campo}</dt>
                  <dd className="tabular-nums">{d.valor}</dd>
                </div>
              ))}
            </dl>
          )}

          {!detalle.cambios.length && !detalle.datos.length && <p className="text-texto-3">Esta acción no guardó datos adicionales.</p>}
        </div>
      )}
    </Modal>
  )
}

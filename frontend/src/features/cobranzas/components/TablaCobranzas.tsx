import { useState } from 'react'
import { Ban, HandCoins } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import { mapearError } from '@/core/errores/mapearError'
import type { UseQueryResult } from '@tanstack/react-query'
import type { Cobranza } from '@/core/models/cobranzas'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoMonto } from '@/shared/format/moneda'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { ConMotivo } from '@/shared/ui/ConMotivo'
import { Confirmacion } from '@/shared/ui/Confirmacion'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { EmptyState } from '@/shared/ui/Estados'
import { MontoBs } from '@/shared/ui/MontoBs'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { toast } from '@/shared/ui/toast'
import { etiquetaFormaPago } from '../cobranzas.opciones'
import { useAnularCobro } from '../cobranzas.queries'

interface Props {
  consulta: UseQueryResult<Cobranza[]>
  /** Cobranzas de varios documentos (día): suma cliente y documento. */
  conDocumento?: boolean
  etiqueta: string
  vacio: string
}

// Tabla de cobranzas (detalle de la nota y pestaña del día). Anular: día del
// cobro abierto y motivo obligatorio (⚠ SUP-23, CP-07.7).
export function TablaCobranzas({ consulta, conDocumento = false, etiqueta, vacio }: Props) {
  const anular = useAnularCobro()
  const puedeAnular = usePermisos()('cobranza.anular')
  const [anulando, setAnulando] = useState<Cobranza | null>(null)

  const confirmar = async (motivo: string) => {
    if (!anulando) return
    try {
      await anular.mutateAsync({ cobro: anulando, motivo })
      toast.exito(`Cobro ${anulando.numero} anulado`)
    } catch (error) {
      const e = mapearError(error)
      if (!e.esInesperado) toast.error(e.message)
    } finally {
      setAnulando(null)
    }
  }

  const columnas: Columna<Cobranza>[] = [
    { clave: 'numero', titulo: 'Cobro', principalMovil: true, numerico: true, render: (c) => <DosLineas principal={<span className="font-medium">{c.numero}</span>} secundario={formatoFecha(c.fecha)} /> },
    ...(conDocumento
      ? [
          {
            clave: 'documento',
            titulo: 'Documento',
            render: (c: Cobranza) => <DosLineas principal={c.cliente_nombre} secundario={c.tipo_doc === 'saldo_inicial' ? `Saldo inicial ${c.documento_numero}` : [c.documento_numero, c.numero_factura].filter(Boolean).join(' / ')} />,
          },
        ]
      : []),
    { clave: 'forma', titulo: 'Forma de pago', render: (c) => <DosLineas principal={etiquetaFormaPago(c.forma_pago)} secundario={c.referencia_pago ?? undefined} /> },
    { clave: 'importe', titulo: 'Importe', alinear: 'der', render: (c) => <MontoBs valor={c.importe} /> },
    { clave: 'estado', titulo: 'Estado', render: (c) => <EstadoBadge estado={c.estado} /> },
    ...(puedeAnular
      ? [
          {
            clave: 'acciones',
            titulo: 'Acciones',
            acciones: true,
            render: (c: Cobranza) =>
              c.estado === 'vigente' && (
                <ConMotivo motivo={c.dia_cerrado ? 'El día del cobro está cerrado.' : null}>
                  <BotonIcono etiqueta={`Anular ${c.numero}`} sinTooltip={c.dia_cerrado} disabled={c.dia_cerrado} onClick={() => setAnulando(c)}>
                    <Ban size={15} />
                  </BotonIcono>
                </ConMotivo>
              ),
          },
        ]
      : []),
  ]

  return (
    <>
      <SeccionConsulta consulta={consulta}>
        {(cobros) => (
          <Tabla
            etiqueta={etiqueta}
            columnas={columnas}
            filas={cobros}
            claveFila={(c) => c.id}
            filaInactiva={(c) => c.estado === 'anulada'}
            vacio={<EmptyState icono={HandCoins} titulo={vacio} />}
          />
        )}
      </SeccionConsulta>
      <Confirmacion
        abierto={anulando !== null}
        titulo={`¿Anular el cobro ${anulando?.numero ?? ''}?`}
        consecuencias={[`Vuelve a la deuda de la nota: Bs ${formatoMonto(anulando?.importe ?? 0)}.`, 'El cobro queda anulado y no se puede deshacer.']}
        textoConfirmar="Anular cobro"
        peligro
        campoMotivo="obligatorio"
        cargando={anular.isPending}
        alConfirmar={confirmar}
        alCancelar={() => setAnulando(null)}
      />
    </>
  )
}

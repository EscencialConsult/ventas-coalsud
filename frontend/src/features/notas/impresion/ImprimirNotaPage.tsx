import { useParams } from 'react-router-dom'
import { mapearError } from '@/core/errores/mapearError'
import { HojaA4, PrintLayout } from '@/shared/print/PrintLayout'
import { Alerta, Skeleton } from '@/shared/ui/Estados'
import { useNota } from '../notas.queries'
import { NotaImpresa } from './NotaImpresa'

const MAX_ITEMS_MEDIA_HOJA = 12

// /imprimir/nota/:id — A5 duplicada en A4 (07-Impresion §2): copia cliente
// arriba, copia de control abajo, con línea de corte. Con más de 12 ítems,
// cada copia ocupa una A4 y se avisa antes de imprimir.
export default function ImprimirNotaPage() {
  const { id = '' } = useParams()
  const consulta = useNota(id)
  const nota = consulta.data
  const largo = (nota?.items.length ?? 0) > MAX_ITEMS_MEDIA_HOJA

  return (
    <PrintLayout
      titulo={nota ? `Nota ${nota.numero}` : 'Nota de venta'}
      listo={Boolean(nota)}
      aviso={nota && largo ? `La nota tiene ${nota.items.length} productos: cada copia ocupa una hoja A4 (2 páginas).` : undefined}
    >
      {consulta.isError && (
        <Alerta tipo="error" className="w-[210mm] max-w-full">
          {mapearError(consulta.error).message}
        </Alerta>
      )}
      {consulta.isPending && <Skeleton className="h-[148.5mm] w-[210mm] max-w-full" />}
      {nota &&
        (largo ? (
          <>
            <HojaA4>
              <NotaImpresa nota={nota} copia="cliente" largo />
            </HojaA4>
            <HojaA4>
              <NotaImpresa nota={nota} copia="control" largo />
            </HojaA4>
          </>
        ) : (
          <HojaA4 className="h-[297mm]">
            <NotaImpresa nota={nota} copia="cliente" largo={false} />
            <NotaImpresa nota={nota} copia="control" largo={false} />
            {/* Línea de corte a la mitad exacta (sin sumar alto a la hoja). */}
            <div className="pointer-events-none absolute inset-x-0 top-[148.5mm] border-t border-dashed border-texto-3" aria-hidden />
          </HojaA4>
        ))}
    </PrintLayout>
  )
}

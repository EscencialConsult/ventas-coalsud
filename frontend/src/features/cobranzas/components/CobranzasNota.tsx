import { Card } from '@/shared/ui/Card'
import { useCobranzasNota } from '../cobranzas.queries'
import { TablaCobranzas } from './TablaCobranzas'

/** Cobranzas de una nota a crédito (06-pantallas/07 §3). */
export function CobranzasNota({ notaId }: { notaId: string }) {
  const consulta = useCobranzasNota(notaId, true)
  return (
    <Card titulo="Cobranzas" sinPadding>
      <TablaCobranzas consulta={consulta} etiqueta="Cobranzas de la nota" vacio="Todavía no se cobró nada de esta nota" />
    </Card>
  )
}

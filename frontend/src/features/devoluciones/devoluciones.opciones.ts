import type { TipoReverso } from '@/core/models/cobranzas'
import type { VarianteBadge } from '@/shared/ui/Badge'

export const TIPOS_REVERSO: Record<TipoReverso, { etiqueta: string; tono: VarianteBadge }> = {
  reembolso: { etiqueta: 'Reembolso', tono: 'alerta' },
  abono_cuenta: { etiqueta: 'Abono a cuenta', tono: 'info' },
}

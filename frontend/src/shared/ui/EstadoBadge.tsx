import { Badge, type VarianteBadge } from './Badge'

// Único mapeo estado → color (04-Sistema_de_Diseno §5).
const ESTADOS = {
  emitida: ['info', 'Emitida'],
  anulada: ['neutro', 'Anulada'],
  sin_factura: ['alerta', 'Sin factura'],
  vencida: ['error', 'Vencida'],
  cancelada: ['ok', 'Cancelada'],
  abierta: ['alerta', 'Abierta'],
  cerrada: ['ok', 'Cerrada'],
  vigente: ['ok', 'Vigente'],
  bajo_minimo: ['error', 'Bajo mínimo'],
  cumplido: ['ok', 'Cumplido'],
  en_camino: ['info', 'En camino'],
  en_riesgo: ['alerta', 'En riesgo'],
  bajo: ['error', 'Bajo'],
  no_cumplido: ['error', 'No cumplido'],
  activo: ['ok', 'Activo'],
  inactivo: ['neutro', 'Inactivo'],
} as const satisfies Record<string, readonly [VarianteBadge, string]>

export type Estado = keyof typeof ESTADOS

export function EstadoBadge({ estado, texto }: { estado: Estado; texto?: string }) {
  const [variante, etiqueta] = ESTADOS[estado]
  return (
    <Badge variante={variante} punto>
      {texto ?? etiqueta}
    </Badge>
  )
}

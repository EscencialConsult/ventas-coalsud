// Tonos de color compartidos por chips de ícono, KPIs y gráficos: un solo
// mapeo para que la misma idea (ok, alerta, marca…) tenga el mismo color en
// toda la app. Las clases van completas para que Tailwind las detecte.

export type Tono = 'rojo' | 'naranja' | 'dorado' | 'ok' | 'error' | 'info' | 'alerta' | 'neutro'

interface ClasesTono {
  /** Fondo tenue + color del ícono (chips). */
  chip: string
  /** Relleno sólido (puntos, barras HTML). */
  solido: string
  /** Trazo SVG (líneas y anillos). */
  trazo: string
  /** Relleno SVG (barras y áreas). */
  relleno: string
}

export const TONOS: Record<Tono, ClasesTono> = {
  rojo: { chip: 'bg-rojo-tenue text-rojo', solido: 'bg-rojo', trazo: 'stroke-rojo', relleno: 'fill-rojo' },
  naranja: { chip: 'bg-naranja-tenue text-naranja', solido: 'bg-naranja', trazo: 'stroke-naranja', relleno: 'fill-naranja' },
  dorado: { chip: 'bg-dorado-tenue text-dorado', solido: 'bg-dorado', trazo: 'stroke-dorado', relleno: 'fill-dorado' },
  ok: { chip: 'bg-ok-fondo text-ok', solido: 'bg-ok', trazo: 'stroke-ok', relleno: 'fill-ok' },
  error: { chip: 'bg-error-fondo text-error', solido: 'bg-error', trazo: 'stroke-error', relleno: 'fill-error' },
  info: { chip: 'bg-info-fondo text-info', solido: 'bg-info', trazo: 'stroke-info', relleno: 'fill-info' },
  alerta: { chip: 'bg-alerta-fondo text-alerta', solido: 'bg-alerta', trazo: 'stroke-alerta', relleno: 'fill-alerta' },
  neutro: { chip: 'bg-fondo-3 text-texto-2', solido: 'bg-texto-3', trazo: 'stroke-texto-3', relleno: 'fill-texto-3' },
}

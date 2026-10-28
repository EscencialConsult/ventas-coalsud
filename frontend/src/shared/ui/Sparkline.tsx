import * as m from 'motion/react-m'
import { cn } from './cn'
import { TONOS, type Tono } from './tonos'

const ANCHO = 120
const ALTO = 40
const MARGEN = 3

interface Props {
  valores: number[]
  /** Resumen para lectores de pantalla (p. ej. "Ventas diarias del mes"). */
  etiqueta: string
  tono?: Tono
  className?: string
}

function puntos(valores: number[]): [number, number][] {
  const min = Math.min(...valores)
  const rango = Math.max(...valores) - min || 1
  const paso = valores.length > 1 ? ANCHO / (valores.length - 1) : 0
  return valores.map((v, i) => [i * paso, ALTO - MARGEN - ((v - min) / rango) * (ALTO - MARGEN * 2)])
}

// Mini gráfico de línea en SVG propio (⚙ DT-16): la línea se dibuja al montar.
export function Sparkline({ valores, etiqueta, tono = 'rojo', className }: Props) {
  if (valores.length < 2) return null
  const p = puntos(valores)
  const linea = p.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${linea} L${ANCHO},${ALTO} L0,${ALTO} Z`
  const [ultX, ultY] = p[p.length - 1]

  return (
    <svg viewBox={`-4 0 ${ANCHO + 8} ${ALTO}`} className={cn('h-10 w-28 shrink-0 overflow-visible', className)} role="img" aria-label={etiqueta}>
      <path d={area} className={cn(TONOS[tono].relleno, 'opacity-[0.07]')} />
      <m.path
        d={linea}
        fill="none"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={TONOS[tono].trazo}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      <m.circle cx={ultX} cy={ultY} r={3} className={TONOS[tono].relleno} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} />
    </svg>
  )
}

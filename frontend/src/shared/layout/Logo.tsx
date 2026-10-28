import * as m from 'motion/react-m'
import { cn } from '@/shared/ui/cn'

// Logo de la demo F1: tres arcos rojo / naranja / dorado (colores del @theme).
const ARCOS = [
  { d: 'M16 3 A13 13 0 1 1 3.5 23', ancho: 2.6, clase: 'stroke-rojo' },
  { d: 'M16 8 A8 8 0 1 1 8.5 21', ancho: 2.1, clase: 'stroke-naranja' },
  { d: 'M16 13 A3.5 3.5 0 1 1 12.8 19', ancho: 1.7, clase: 'stroke-dorado' },
]

/** animado: los arcos se dibujan y borran en bucle (pantalla de carga). */
export function Logo({ tam = 30, animado = false, className }: { tam?: number; animado?: boolean; className?: string }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      {ARCOS.map((arco, i) =>
        animado ? (
          <m.path
            key={arco.d}
            d={arco.d}
            strokeWidth={arco.ancho}
            strokeLinecap="round"
            className={arco.clase}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, delay: i * 0.15, ease: 'easeInOut', repeat: Infinity, repeatType: 'reverse', repeatDelay: 0.2 }}
          />
        ) : (
          <path key={arco.d} d={arco.d} strokeWidth={arco.ancho} strokeLinecap="round" className={arco.clase} />
        ),
      )}
    </svg>
  )
}

/** compacto: solo el logo (sidebar contraído). */
export function Marca({ oscuro = true, compacto = false }: { oscuro?: boolean; compacto?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo tam={compacto ? 30 : 32} />
      {!compacto && (
        <div className="min-w-0">
          <div className={cn('font-marca text-subtitulo leading-tight font-extrabold tracking-tight', oscuro ? 'text-white' : 'text-texto')}>
            COAL<span className={oscuro ? 'text-rojo-2' : 'text-rojo'}>SUD</span>
          </div>
          <div className={cn('text-micro font-medium tracking-[2px] uppercase', oscuro ? 'text-white/35' : 'text-texto-3')}>ONE Comercial</div>
        </div>
      )}
    </div>
  )
}

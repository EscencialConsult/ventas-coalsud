import { cn } from './cn'

const COLOR = {
  rojo: '[&::-webkit-progress-value]:bg-rojo [&::-moz-progress-bar]:bg-rojo',
  ok: '[&::-webkit-progress-value]:bg-ok [&::-moz-progress-bar]:bg-ok',
  info: '[&::-webkit-progress-value]:bg-info [&::-moz-progress-bar]:bg-info',
  alerta: '[&::-webkit-progress-value]:bg-alerta [&::-moz-progress-bar]:bg-alerta',
  error: '[&::-webkit-progress-value]:bg-error [&::-moz-progress-bar]:bg-error',
}

export type ColorBarra = keyof typeof COLOR

// Barra liviana sin librería de gráficos (⚙ DT-16), sobre <progress>: semántica
// y accesible (regla 32), sin estilos inline (regla 8).
export function BarraProgreso({ valor, maximo, etiqueta, color = 'rojo', className }: { valor: number; maximo: number; etiqueta: string; color?: ColorBarra; className?: string }) {
  return (
    <progress
      value={Math.max(0, valor)}
      max={Math.max(1, maximo)}
      aria-label={etiqueta}
      className={cn(
        'h-1.5 w-full appearance-none overflow-hidden rounded-full bg-superficie [&::-webkit-progress-bar]:bg-superficie [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full',
        COLOR[color],
        className,
      )}
    />
  )
}

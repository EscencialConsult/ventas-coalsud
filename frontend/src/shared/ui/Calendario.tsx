import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { diaSemana, diasEnMes, formatoFechaLarga, formatoPeriodo, hoyBolivia, sumarDias, sumarMeses } from '@/shared/format/fecha'
import { BotonIcono } from './BotonIcono'
import { cn } from './cn'

const DIAS = [
  { corto: 'L', nombre: 'lunes' },
  { corto: 'M', nombre: 'martes' },
  { corto: 'M', nombre: 'miércoles' },
  { corto: 'J', nombre: 'jueves' },
  { corto: 'V', nombre: 'viernes' },
  { corto: 'S', nombre: 'sábado' },
  { corto: 'D', nombre: 'domingo' },
]

const MOVIMIENTO: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }

interface Props {
  desde: string | null
  hasta: string | null
  /** Rango: primer clic = inicio (hasta = null); segundo = fin (si es anterior al inicio, se invierten). Día: desde = hasta. */
  alCambiar: (desde: string, hasta: string | null) => void
  modo?: 'rango' | 'dia'
  /** Fechas fuera de [min, max] no se pueden elegir (p. ej. max = hoy del servidor). */
  min?: string
  max?: string
  /** Meses lado a lado (2 en pantallas anchas). */
  meses?: 1 | 2
  /** Si cambia y esa fecha no está a la vista, el calendario se mueve hasta ella (p. ej. al elegir un atajo). */
  mostrar?: string | null
  etiqueta: string
}

function semanasDe(periodo: string): (string | null)[][] {
  const dias = Array.from({ length: diasEnMes(periodo) }, (_, i) => `${periodo}-${String(i + 1).padStart(2, '0')}`)
  const celdas: (string | null)[] = [...Array<null>(diaSemana(`${periodo}-01`)).fill(null), ...dias]
  while (celdas.length % 7) celdas.push(null)
  return Array.from({ length: celdas.length / 7 }, (_, i) => celdas.slice(i * 7, i * 7 + 7))
}

// Calendario propio (regla 12: nunca type="date"), para un rango o un solo día. El rango se
// dibuja como una franja continua con los extremos en color. Teclado: flechas
// por día/semana, RePág/AvPág por mes, Enter o Espacio para elegir.
export function Calendario({ desde, hasta, alCambiar, modo = 'rango', min, max, meses = 1, mostrar, etiqueta }: Props) {
  const inicial = hasta ?? desde ?? max ?? hoyBolivia()
  // `ultimo` es el mes de la derecha; los demás son los anteriores.
  const [ultimo, setUltimo] = useState(inicial.slice(0, 7))
  const [foco, setFoco] = useState(inicial)
  const [hover, setHover] = useState<string | null>(null)
  const contenedor = useRef<HTMLDivElement>(null)
  const enfocar = useRef(false)

  const visibles = Array.from({ length: meses }, (_, i) => sumarMeses(ultimo, i - meses + 1))
  const aLaVista = (f: string) => f.slice(0, 7) >= visibles[0] && f.slice(0, 7) <= ultimo
  const llevarALaVista = (f: string) => {
    const m = f.slice(0, 7)
    if (m < visibles[0]) setUltimo(sumarMeses(m, meses - 1))
    else if (m > ultimo) setUltimo(m)
  }

  // Ajuste durante el render (sin efecto): si `mostrar` cambia a una fecha fuera de la vista, se mueve.
  const [mostrarPrevio, setMostrarPrevio] = useState(mostrar)
  if (mostrar !== mostrarPrevio) {
    setMostrarPrevio(mostrar)
    if (mostrar && !aLaVista(mostrar)) llevarALaVista(mostrar)
  }

  // Tras moverse con el teclado, el foco sigue al día activo (aunque cambie de mes).
  useEffect(() => {
    if (!enfocar.current) return
    enfocar.current = false
    contenedor.current?.querySelector<HTMLButtonElement>(`[data-fecha="${foco}"]`)?.focus()
  }, [foco, ultimo])

  const fueraDeRango = (f: string) => (max !== undefined && f > max) || (min !== undefined && f < min)

  const elegir = (f: string) => {
    if (fueraDeRango(f)) return
    setFoco(f)
    if (modo === 'dia') alCambiar(f, f)
    else if (!desde || hasta) alCambiar(f, null)
    else if (f < desde) alCambiar(f, desde)
    else alCambiar(desde, f)
  }

  const alTeclear = (e: KeyboardEvent<HTMLDivElement>) => {
    let destino: string | null = null
    if (e.key in MOVIMIENTO) destino = sumarDias(foco, MOVIMIENTO[e.key])
    else if (e.key === 'PageUp' || e.key === 'PageDown') {
      const otro = sumarMeses(foco.slice(0, 7), e.key === 'PageUp' ? -1 : 1)
      destino = `${otro}-${String(Math.min(Number(foco.slice(8)), diasEnMes(otro))).padStart(2, '0')}`
    }
    if (!destino) return
    e.preventDefault()
    if (fueraDeRango(destino)) return
    enfocar.current = true
    setFoco(destino)
    llevarALaVista(destino)
  }

  // Extremos del rango; mientras se elige el fin, el día bajo el mouse muestra el rango tentativo.
  let inicio = desde
  let fin = hasta
  if (desde && !hasta && hover) {
    inicio = hover < desde ? hover : desde
    fin = hover < desde ? desde : hover
  }
  const hoy = hoyBolivia()
  // Un solo día entra en el orden de Tab (roving tabindex): el activo o el último elegible a la vista.
  const diasVisibles = visibles.flatMap((p) => Array.from({ length: diasEnMes(p) }, (_, i) => `${p}-${String(i + 1).padStart(2, '0')}`))
  const tabulable = aLaVista(foco) && !fueraDeRango(foco) ? foco : (diasVisibles.filter((f) => !fueraDeRango(f)).at(-1) ?? null)

  return (
    <div ref={contenedor} className="flex gap-8 select-none" onKeyDown={alTeclear} onMouseLeave={() => setHover(null)}>
      {visibles.map((periodo, indice) => (
        <div key={periodo} className="w-[280px]">
          <div className="mb-3 flex items-center justify-between">
            {indice === 0 ? (
              <BotonIcono etiqueta="Mes anterior" sinTooltip onClick={() => setUltimo(sumarMeses(ultimo, -1))} disabled={min !== undefined && periodo <= min.slice(0, 7)}>
                <ChevronLeft size={17} />
              </BotonIcono>
            ) : (
              <span className="size-8" aria-hidden />
            )}
            <span className="text-cuerpo font-semibold" aria-live="polite">
              {formatoPeriodo(periodo)}
            </span>
            {indice === visibles.length - 1 ? (
              <BotonIcono etiqueta="Mes siguiente" sinTooltip onClick={() => setUltimo(sumarMeses(ultimo, 1))} disabled={max !== undefined && ultimo >= max.slice(0, 7)}>
                <ChevronRight size={17} />
              </BotonIcono>
            ) : (
              <span className="size-8" aria-hidden />
            )}
          </div>

          <table role="grid" aria-label={`${etiqueta}: ${formatoPeriodo(periodo)}`} className="w-full border-separate border-spacing-x-0 border-spacing-y-1">
            <thead>
              <tr>
                {DIAS.map((d) => (
                  <th key={d.nombre} scope="col" abbr={d.nombre} className="h-7 text-mini font-medium text-texto-3">
                    {d.corto}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {semanasDe(periodo).map((semana) => (
                <tr key={semana.find(Boolean) ?? 'vacia'}>
                  {semana.map((f, col) => {
                    if (!f) return <td key={`v${col}`} />
                    const esInicio = f === inicio
                    const esFin = f === fin
                    const extremo = esInicio || esFin
                    const enTramo = inicio !== null && fin !== null && f > inicio && f < fin
                    const conFranja = inicio !== null && fin !== null && inicio !== fin
                    const bloqueado = fueraDeRango(f)
                    return (
                      <td
                        key={f}
                        className={cn(
                          'p-0 text-center',
                          // Franja continua del rango; se corta con bordes redondeados al cambiar de semana.
                          enTramo && 'bg-rojo-tenue',
                          enTramo && col === 0 && 'rounded-l-control',
                          enTramo && col === 6 && 'rounded-r-control',
                          conFranja && esInicio && col !== 6 && 'bg-linear-to-r from-transparent from-50% to-rojo-tenue to-50%',
                          conFranja && esFin && col !== 0 && 'bg-linear-to-l from-transparent from-50% to-rojo-tenue to-50%',
                        )}
                      >
                        <button
                          type="button"
                          data-fecha={f}
                          tabIndex={f === tabulable ? 0 : -1}
                          disabled={bloqueado}
                          aria-pressed={f === desde || f === hasta}
                          aria-label={`${formatoFechaLarga(f)}${f === hoy ? ', hoy' : ''}`}
                          onClick={() => elegir(f)}
                          onMouseEnter={() => setHover(f)}
                          className={cn(
                            'relative mx-auto flex size-10 items-center justify-center rounded-control text-cuerpo tabular-nums transition-colors duration-100',
                            extremo && 'bg-rojo font-semibold text-white',
                            enTramo && 'text-rojo hover:bg-rojo/10',
                            !extremo && !enTramo && !bloqueado && 'text-texto hover:bg-fondo-3 active:bg-superficie',
                            bloqueado && 'cursor-not-allowed text-texto-3/40',
                          )}
                        >
                          {Number(f.slice(8))}
                          {f === hoy && <span className={cn('absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full', extremo ? 'bg-white' : 'bg-rojo')} aria-hidden />}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

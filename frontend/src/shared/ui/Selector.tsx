import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { Check, ChevronDown, Search } from 'lucide-react'
import { normalizar } from '@/shared/format/texto'
import { cn } from './cn'
import { RELIEVE, TEXTO_RELIEVE } from './neumorfismo'
import { useAnclaje } from './useAnclaje'

export interface OpcionSelector<T extends string = string> {
  valor: T
  etiqueta: string
}

const SALTO_PAGINA = 8

const VARIANTES = {
  // Dentro de Campo, que aporta el aspecto hundido, el borde y el foco.
  campo: 'h-[38px]',
  // Barras de filtro: botón en relieve, sin etiqueta visible.
  filtro: cn('h-9 w-full rounded-control px-3 text-cuerpo font-medium sm:w-auto sm:min-w-40', RELIEVE),
}

interface Props<T extends string> {
  valor: string
  opciones: OpcionSelector<T>[]
  alCambiar: (valor: T) => void
  /** Nombre de la lista (y del botón en la variante filtro). */
  etiqueta: string
  /** Texto cuando el valor no es ninguna opción. */
  placeholder?: string
  variante?: keyof typeof VARIANTES
  /** Listas largas (productos): campo de búsqueda arriba de la lista. */
  buscable?: boolean
  /** Búsqueda en el servidor (clientes): recibe lo tipeado y las opciones llegan ya filtradas. */
  alBuscar?: (texto: string) => void
  /** Mientras llegan las opciones de `alBuscar`. */
  buscando?: boolean
  /** Etiqueta del valor elegido cuando no está entre las opciones (resultados de otra búsqueda). */
  etiquetaElegida?: string
  /** Filtro aplicado: se resalta para que no pase inadvertido. */
  destacado?: boolean
  disabled?: boolean
  onBlur?: () => void
  id?: string
  className?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/**
 * Select propio (regla 37): la lista la dibuja la app, no el navegador.
 * Sin búsqueda, el foco queda en el botón (combobox + aria-activedescendant);
 * con `buscable`, pasa al campo de búsqueda de la lista y vuelve al botón al
 * elegir. La lista va anclada al botón (useAnclaje).
 */
export function Selector<T extends string>({
  valor,
  opciones,
  alCambiar,
  etiqueta,
  placeholder = 'Elija…',
  variante = 'campo',
  buscable = false,
  alBuscar,
  buscando = false,
  etiquetaElegida,
  destacado = false,
  disabled = false,
  onBlur,
  className,
  ...aria
}: Props<T>) {
  const idLista = useId()
  const { disparador, panel, abierto, abrir: abrirPanel, cerrar, estilo, clases, animacion } = useAnclaje<HTMLButtonElement, HTMLDivElement>()
  const busqueda = useRef({ texto: '', hasta: 0 })
  const campoBusqueda = useRef<HTMLInputElement>(null)
  const [activo, setActivo] = useState(-1)
  const [texto, setTexto] = useState('')
  const elegida = opciones.find((o) => o.valor === valor)
  const textoElegido = elegida?.etiqueta ?? (valor ? etiquetaElegida : undefined)
  const visibles = buscable && texto.trim() && !alBuscar ? opciones.filter((o) => normalizar(o.etiqueta).includes(normalizar(texto.trim()))) : opciones

  const abrir = (indice = Math.max(0, opciones.findIndex((o) => o.valor === valor))) => {
    setTexto('')
    alBuscar?.('')
    setActivo(indice)
    abrirPanel()
  }

  useEffect(() => {
    if (abierto && buscable) campoBusqueda.current?.focus()
  }, [abierto, buscable])

  useEffect(() => {
    if (abierto) panel.current?.querySelector('[data-activo="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [abierto, activo, panel])

  const elegir = (indice: number) => {
    const opcion = visibles[indice]
    cerrar()
    if (buscable) disparador.current?.focus()
    if (opcion && opcion.valor !== valor) alCambiar(opcion.valor)
  }

  // Búsqueda por tipeo sin campo: las letras seguidas (en menos de 600 ms) se suman.
  const buscar = (tecla: string): number => {
    const ahora = Date.now()
    const b = busqueda.current
    b.texto = ahora < b.hasta ? b.texto + normalizar(tecla) : normalizar(tecla)
    b.hasta = ahora + 600
    return opciones.findIndex((o) => normalizar(o.etiqueta).startsWith(b.texto))
  }

  /** Teclas de la lista abierta, comunes al botón y al campo de búsqueda. Devuelve true si la usó. */
  const navegar = (e: KeyboardEvent<HTMLElement>): boolean => {
    const ultimo = visibles.length - 1
    const mover: Record<string, () => number> = {
      ArrowDown: () => Math.min(ultimo, activo + 1),
      ArrowUp: () => Math.max(0, activo - 1),
      PageDown: () => Math.min(ultimo, activo + SALTO_PAGINA),
      PageUp: () => Math.max(0, activo - SALTO_PAGINA),
      ...(buscable ? {} : { Home: () => 0, End: () => ultimo }),
    }
    if (mover[e.key]) {
      e.preventDefault()
      setActivo(mover[e.key]())
    } else if (e.key === 'Enter' || (e.key === ' ' && !buscable)) {
      e.preventDefault()
      elegir(activo)
    } else if (e.key === 'Escape') {
      // Que no cierre también el modal que contiene al selector.
      e.preventDefault()
      e.stopPropagation()
      cerrar()
      disparador.current?.focus()
    } else if (e.key === 'Tab') {
      cerrar()
    } else return false
    return true
  }

  const alTeclear = (e: KeyboardEvent<HTMLButtonElement>) => {
    const imprimible = e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey
    if (!abierto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        abrir()
      } else if (imprimible && !buscable) {
        const i = buscar(e.key)
        abrir(i >= 0 ? i : undefined)
      }
      return
    }
    if (!navegar(e) && imprimible && !buscable) {
      const i = buscar(e.key)
      if (i >= 0) setActivo(i)
    }
  }

  // Se cierra (y avisa onBlur) solo si el foco salió del botón y de la lista.
  const alPerderFoco = (e: FocusEvent<HTMLElement>) => {
    const destino = e.relatedTarget as Node | null
    if (panel.current?.contains(destino) || disparador.current?.contains(destino)) return
    cerrar()
    onBlur?.()
  }

  return (
    <>
      <button
        ref={disparador}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        aria-activedescendant={abierto && !buscable && activo >= 0 ? `${idLista}-${activo}` : undefined}
        aria-label={variante === 'filtro' ? etiqueta : undefined}
        disabled={disabled}
        onClick={() => (abierto ? cerrar() : abrir())}
        onKeyDown={alTeclear}
        // Espacio activa el botón al soltar: ya se resolvió al presionar.
        onKeyUp={(e) => {
          if (e.key === ' ') e.preventDefault()
        }}
        onBlur={alPerderFoco}
        className={cn(
          'flex cursor-pointer items-center gap-2 text-left transition-[background-color,border-color,color,box-shadow] duration-150 disabled:cursor-not-allowed',
          VARIANTES[variante],
          variante === 'filtro' && (destacado ? 'text-rojo' : TEXTO_RELIEVE),
          className,
        )}
        {...aria}
      >
        <span className={cn('min-w-0 flex-1 truncate', !textoElegido && 'text-texto-3')}>{textoElegido ?? placeholder}</span>
        <ChevronDown size={15} className={cn('shrink-0 transition-transform duration-200', destacado ? 'text-rojo' : 'text-texto-3', abierto && 'rotate-180')} aria-hidden />
      </button>
      {createPortal(
        <AnimatePresence>
          {abierto && (
            <m.div
              ref={panel}
              {...animacion}
              style={estilo}
              className={cn(clases, 'flex max-h-(--alto) max-w-[min(360px,calc(100vw-16px))] flex-col overflow-hidden rounded-card border border-borde bg-white text-cuerpo shadow-elevado')}
            >
              {buscable && (
                <div className="relative shrink-0 border-b border-borde p-1.5">
                  <Search size={14} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-texto-3" aria-hidden />
                  <input
                    ref={campoBusqueda}
                    type="text"
                    role="combobox"
                    aria-expanded
                    aria-controls={idLista}
                    aria-autocomplete="list"
                    aria-activedescendant={activo >= 0 && visibles[activo] ? `${idLista}-${activo}` : undefined}
                    aria-label={`Buscar ${etiqueta.toLowerCase()}`}
                    placeholder="Buscar…"
                    value={texto}
                    onChange={(e) => {
                      setTexto(e.target.value)
                      setActivo(0)
                      alBuscar?.(e.target.value)
                    }}
                    onKeyDown={navegar}
                    onBlur={alPerderFoco}
                    className="h-8 w-full rounded-[7px] bg-fondo-2 pr-2 pl-8 outline-none placeholder:text-texto-3 focus:bg-fondo-3"
                  />
                </div>
              )}
              <ul
                id={idLista}
                role="listbox"
                aria-label={etiqueta}
                // Clic en la lista (o su barra de scroll) sin mover el foco.
                onMouseDown={(e) => e.preventDefault()}
                className="scroll-fino min-h-0 overflow-y-auto p-1.5"
              >
                {buscando && <li className="px-2.5 py-2 text-texto-3">Buscando…</li>}
                {!buscando && visibles.length === 0 && <li className="px-2.5 py-2 text-texto-3">{texto ? 'Sin coincidencias' : 'Sin opciones'}</li>}
                {visibles.map((o, i) => {
                  const seleccionada = o.valor === valor
                  return (
                    <li
                      key={o.valor}
                      id={`${idLista}-${i}`}
                      role="option"
                      aria-selected={seleccionada}
                      data-activo={i === activo}
                      onMouseMove={() => {
                        if (i !== activo) setActivo(i)
                      }}
                      onClick={() => elegir(i)}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-[7px] px-2.5 py-2 transition-colors duration-100',
                        i === activo && 'bg-fondo-3',
                        seleccionada ? 'font-semibold text-rojo' : 'text-texto',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{o.etiqueta}</span>
                      {seleccionada && <Check size={14} className="shrink-0" aria-hidden />}
                    </li>
                  )
                })}
              </ul>
            </m.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

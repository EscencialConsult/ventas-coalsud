import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { BotonIcono } from './BotonIcono'
import { cn } from './cn'
import { BORDE_CAMPO, CAMPO } from './neumorfismo'

interface Props {
  /** Valor confirmado (p. ej. el de la URL). */
  valor: string
  /** Se llama 300 ms después de la última tecla (regla 18). */
  alCambiar: (valor: string) => void
  placeholder: string
  etiqueta: string
}

// Buscador de los listados: el texto se escribe libre y el filtro se aplica
// cuando el usuario hace una pausa; un solo request por pausa.
export function CampoBusqueda({ valor, alCambiar, placeholder, etiqueta }: Props) {
  const [texto, setTexto] = useState(valor)
  const demorado = useDebounce(texto)
  const alCambiarRef = useRef(alCambiar)
  const valorRef = useRef(valor)
  useEffect(() => {
    alCambiarRef.current = alCambiar
    valorRef.current = valor
  })

  // Si el valor cambia desde afuera (atrás/adelante del navegador), el campo lo sigue.
  const [valorPrevio, setValorPrevio] = useState(valor)
  if (valor !== valorPrevio) {
    setValorPrevio(valor)
    setTexto(valor)
  }

  // Solo cuando cambia lo tipeado (no cuando cambia el valor desde afuera).
  useEffect(() => {
    if (demorado.trim() !== valorRef.current) alCambiarRef.current(demorado.trim())
  }, [demorado])

  return (
    <div className="relative w-full sm:w-72">
      <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-texto-3" aria-hidden />
      <input
        type="search"
        aria-label={etiqueta}
        placeholder={placeholder}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className={cn(CAMPO, BORDE_CAMPO.normal, 'h-9 w-full pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden')}
      />
      {texto && (
        <span className="absolute top-1/2 right-1 -translate-y-1/2">
          <BotonIcono etiqueta="Limpiar búsqueda" variante="interno" sinTooltip onClick={() => setTexto('')}>
            <X size={14} />
          </BotonIcono>
        </span>
      )}
    </div>
  )
}

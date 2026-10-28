import { useState } from 'react'
import type { Cliente } from '@/core/models/maestros'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { Select } from '@/shared/ui/Campo'
import { useClientes } from '../clientes.queries'

/** Lo mínimo para mostrar el cliente elegido (puede venir de una nota, sin la ficha completa). */
export type ClienteElegido = Pick<Cliente, 'id' | 'nombre'> & Partial<Pick<Cliente, 'nit' | 'zona'>>

interface Props {
  regionalId: string | null
  cliente: ClienteElegido | null
  alCambiar: (cliente: Cliente) => void
  error?: string
  onBlur?: () => void
}

// Cliente de la nota (06-pantallas/07 §2): busca en el servidor entre los
// activos de la regional (debounce, regla 18) y muestra NIT y zona al elegirlo.
export function BuscadorCliente({ regionalId, cliente, alCambiar, error, onBlur }: Props) {
  const [texto, setTexto] = useState('')
  const q = useDebounce(texto)
  const consulta = useClientes(regionalId, { q, categoria: '', canal: '', vendedorId: '', estado: 'activos' }, 1)
  const filas = consulta.data?.filas ?? []
  const datos = cliente ? [cliente.nit && `NIT ${cliente.nit}`, cliente.zona && `Zona ${cliente.zona}`].filter(Boolean).join(' · ') : ''

  return (
    <Select
      label="Cliente"
      requerido
      buscable
      placeholder="Buscar cliente…"
      valor={cliente?.id ?? ''}
      etiquetaElegida={cliente?.nombre}
      opciones={filas.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
      alBuscar={setTexto}
      buscando={consulta.isFetching}
      alCambiar={(id) => {
        const elegido = filas.find((c) => c.id === id)
        if (elegido) alCambiar(elegido)
      }}
      error={error}
      ayuda={datos || undefined}
      onBlur={onBlur}
    />
  )
}

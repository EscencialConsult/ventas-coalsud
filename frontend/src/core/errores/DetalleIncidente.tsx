import { useState } from 'react'
import { Check, Copy, RotateCw } from 'lucide-react'
import { Button } from '@/shared/ui/Button'
import { textoIncidente, type Incidente } from './incidentes'

// Dos niveles (regla 34): mensaje para el usuario final con Copiar y Recargar,
// y detalle técnico desplegable para el desarrollador.
export function DetalleIncidente({ incidente }: { incidente: Incidente }) {
  const [copiado, setCopiado] = useState<'si' | 'no' | null>(null)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoIncidente(incidente))
      setCopiado('si')
    } catch {
      setCopiado('no')
    }
  }

  return (
    <div className="space-y-4 text-cuerpo">
      <p className="text-texto-2">
        Copie el detalle y envíeselo al administrador del sistema. Código <b className="font-mono text-texto">{incidente.codigo}</b>.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variante="secundario" icono={copiado === 'si' ? <Check size={14} /> : <Copy size={14} />} onClick={copiar}>
          {copiado === 'si' ? 'Copiado' : 'Copiar detalle'}
        </Button>
        <Button icono={<RotateCw size={14} />} onClick={() => window.location.reload()}>
          Recargar
        </Button>
        {copiado === 'no' && <span className="text-chico text-error">No se pudo copiar: seleccione el texto del detalle.</span>}
      </div>
      <details className="rounded-control border border-borde bg-fondo-2">
        <summary className="cursor-pointer px-3.5 py-2.5 text-chico font-semibold text-texto-2 select-none hover:text-texto">Detalle técnico</summary>
        <pre className="scroll-fino max-h-64 overflow-auto border-t border-borde px-3.5 py-3 font-mono text-mini whitespace-pre-wrap text-texto-2">{textoIncidente(incidente)}</pre>
      </details>
    </div>
  )
}

import { Phone, UserRound } from 'lucide-react'
import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import type { Vendedor } from '@/core/models/organizacion'
import { useFormulario, type Errores } from '@/shared/hooks/useFormulario'
import { Input } from '@/shared/ui/Campo'
import { ModalFormulario } from '@/shared/ui/ModalFormulario'
import { toast } from '@/shared/ui/toast'
import { useGuardarVendedor } from '../vendedores.queries'

interface Valores extends Record<string, unknown> {
  nombre: string
  telefono: string
}

const validar = (v: Valores): Errores<Valores> => ({ nombre: v.nombre.trim() ? undefined : 'Ingrese el nombre.' })

// Alta / edición de vendedor (CP-03.5): queda disponible para salidas y notas de su regional.
export function ModalVendedor({ vendedor, regional, alCerrar }: { vendedor: Vendedor | null; regional: { id: string; nombre: string }; alCerrar: () => void }) {
  const guardar = useGuardarVendedor()
  const form = useFormulario<Valores>({ nombre: vendedor?.nombre ?? '', telefono: vendedor?.telefono ?? '' }, validar)

  const enviar = async () => {
    if (!form.validarTodo()) return
    try {
      await guardar.mutateAsync({
        id: vendedor?.id ?? null,
        datos: { regional_id: vendedor?.regional_id ?? regional.id, nombre: form.valores.nombre, telefono: form.valores.telefono || null, activo: vendedor?.activo ?? true },
      })
      toast.exito(vendedor ? 'Vendedor actualizado.' : `Vendedor creado en ${regional.nombre}.`)
      alCerrar()
    } catch (error) {
      aplicarErrorFormulario(error, ['nombre', 'telefono'] as const, form.marcarError)
    }
  }

  return (
    <ModalFormulario
      abierto
      titulo={vendedor ? `Editar a ${vendedor.nombre}` : `Nuevo vendedor · ${regional.nombre}`}
      sucio={form.sucio}
      guardando={guardar.isPending}
      textoGuardar={vendedor ? 'Guardar' : 'Crear vendedor'}
      alCerrar={alCerrar}
      alGuardar={enviar}
    >
      <div className="grid gap-4">
        <Input label="Nombre" requerido icono={UserRound} autoComplete="off" {...form.texto('nombre')} />
        <Input label="Teléfono" icono={Phone} inputMode="tel" autoComplete="off" placeholder="Opcional" {...form.texto('telefono')} />
      </div>
    </ModalFormulario>
  )
}

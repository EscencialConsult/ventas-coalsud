import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import type { Almacen } from '@/core/models/maestros'
import { useFormulario, type Errores } from '@/shared/hooks/useFormulario'
import { Input, Select } from '@/shared/ui/Campo'
import { ModalFormulario } from '@/shared/ui/ModalFormulario'
import { toast } from '@/shared/ui/toast'
import { useGuardarAlmacen, useRegionales } from '../configuracion.queries'

interface Valores extends Record<string, unknown> {
  regional_id: string
  nombre: string
}

const validar = (v: Valores): Errores<Valores> => ({
  regional_id: v.regional_id ? undefined : 'Elija la regional.',
  nombre: v.nombre.trim() ? undefined : 'Ingrese el nombre.',
})

export function ModalAlmacen({ almacen, alCerrar }: { almacen: Almacen | null; alCerrar: () => void }) {
  const regionales = useRegionales()
  const guardar = useGuardarAlmacen()
  const form = useFormulario<Valores>({ regional_id: almacen?.regional_id ?? '', nombre: almacen?.nombre ?? '' }, validar)

  const enviar = async () => {
    if (!form.validarTodo()) return
    try {
      await guardar.mutateAsync({ id: almacen?.id ?? null, datos: { regional_id: form.valores.regional_id, nombre: form.valores.nombre, activo: almacen?.activo ?? true } })
      toast.exito(almacen ? 'Almacén actualizado.' : 'Almacén creado.')
      alCerrar()
    } catch (error) {
      aplicarErrorFormulario(error, ['regional_id', 'nombre'] as const, form.marcarError)
    }
  }

  return (
    <ModalFormulario
      abierto
      titulo={almacen ? 'Editar almacén' : 'Nuevo almacén'}
      sucio={form.sucio}
      guardando={guardar.isPending}
      textoGuardar={almacen ? 'Guardar' : 'Crear almacén'}
      alCerrar={alCerrar}
      alGuardar={enviar}
    >
      <div className="grid gap-4">
        <Select
          label="Regional"
          requerido
          disabled={almacen !== null}
          {...form.seleccion('regional_id')}
          opciones={(regionales.data ?? []).map((r) => ({ valor: r.id, etiqueta: r.nombre }))}
        />
        <Input label="Nombre" requerido placeholder="Almacén La Paz" {...form.texto('nombre')} />
      </div>
    </ModalFormulario>
  )
}

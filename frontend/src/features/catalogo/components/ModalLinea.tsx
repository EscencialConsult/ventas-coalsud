import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import type { LineaComercial } from '@/core/models/maestros'
import { useFormulario, type Errores } from '@/shared/hooks/useFormulario'
import { Input } from '@/shared/ui/Campo'
import { ModalFormulario } from '@/shared/ui/ModalFormulario'
import { toast } from '@/shared/ui/toast'
import { useGuardarLinea } from '../catalogo.queries'

interface Valores extends Record<string, unknown> {
  nombre: string
}

const validar = (v: Valores): Errores<Valores> => ({ nombre: v.nombre.trim() ? undefined : 'Ingrese el nombre.' })

// Alta / edición de línea comercial (CP-04.2). Una línea nueva va al final del reporte.
export function ModalLinea({ linea, alCerrar }: { linea: LineaComercial | null; alCerrar: () => void }) {
  const guardar = useGuardarLinea()
  const form = useFormulario<Valores>({ nombre: linea?.nombre ?? '' }, validar)

  const enviar = async () => {
    if (!form.validarTodo()) return
    try {
      await guardar.mutateAsync({ id: linea?.id ?? null, datos: { nombre: form.valores.nombre, activo: linea?.activo ?? true } })
      toast.exito(linea ? 'Línea actualizada.' : 'Línea creada al final del orden.')
      alCerrar()
    } catch (error) {
      aplicarErrorFormulario(error, ['nombre'] as const, form.marcarError)
    }
  }

  return (
    <ModalFormulario
      abierto
      titulo={linea ? 'Editar línea' : 'Nueva línea comercial'}
      sucio={form.sucio}
      guardando={guardar.isPending}
      textoGuardar={linea ? 'Guardar' : 'Crear línea'}
      alCerrar={alCerrar}
      alGuardar={enviar}
    >
      <Input label="Nombre" requerido placeholder="COMRURAL" {...form.texto('nombre')} />
    </ModalFormulario>
  )
}

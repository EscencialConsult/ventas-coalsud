import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import type { RegionalMaestro } from '@/core/models/maestros'
import { useFormulario, type Errores } from '@/shared/hooks/useFormulario'
import { Input } from '@/shared/ui/Campo'
import { ModalFormulario } from '@/shared/ui/ModalFormulario'
import { toast } from '@/shared/ui/toast'
import { CODIGO_REGIONAL } from '../configuracion.service'
import { useGuardarRegional } from '../configuracion.queries'

interface Valores extends Record<string, unknown> {
  codigo: string
  nombre: string
}

const validar = (v: Valores): Errores<Valores> => ({
  codigo: CODIGO_REGIONAL.test(v.codigo.trim().toUpperCase()) ? undefined : 'De 2 a 5 letras (p. ej. LP).',
  nombre: v.nombre.trim() ? undefined : 'Ingrese el nombre.',
})

// Regional (06-pantallas/05 §4): el código es el prefijo de la numeración;
// si ya hay documentos, la base no deja cambiarlo.
export function ModalRegional({ regional, alCerrar }: { regional: RegionalMaestro | null; alCerrar: () => void }) {
  const guardar = useGuardarRegional()
  const form = useFormulario<Valores>({ codigo: regional?.codigo ?? '', nombre: regional?.nombre ?? '' }, validar)

  const enviar = async () => {
    if (!form.validarTodo()) return
    try {
      await guardar.mutateAsync({ id: regional?.id ?? null, datos: { codigo: form.valores.codigo, nombre: form.valores.nombre, activo: regional?.activo ?? true } })
      toast.exito(regional ? 'Regional actualizada.' : 'Regional creada.')
      alCerrar()
    } catch (error) {
      aplicarErrorFormulario(error, ['codigo', 'nombre'] as const, form.marcarError)
    }
  }

  return (
    <ModalFormulario
      abierto
      titulo={regional ? `Editar ${regional.nombre}` : 'Nueva regional'}
      sucio={form.sucio}
      guardando={guardar.isPending}
      textoGuardar={regional ? 'Guardar' : 'Crear regional'}
      alCerrar={alCerrar}
      alGuardar={enviar}
    >
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Input label="Código" requerido placeholder="LP" maxLength={5} ayuda="Prefijo de los documentos." {...form.texto('codigo')} />
        <Input label="Nombre" requerido placeholder="La Paz" {...form.texto('nombre')} />
      </div>
    </ModalFormulario>
  )
}

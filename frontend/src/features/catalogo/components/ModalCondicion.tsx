import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import type { CondicionPago } from '@/core/models/maestros'
import type { CondicionTipo } from '@/core/models/nota-venta'
import { useFormulario, type Errores } from '@/shared/hooks/useFormulario'
import { Input } from '@/shared/ui/Campo'
import { ModalFormulario } from '@/shared/ui/ModalFormulario'
import { Segmentado } from '@/shared/ui/Segmentado'
import { toast } from '@/shared/ui/toast'
import { useGuardarCondicion } from '../catalogo.queries'

interface Valores extends Record<string, unknown> {
  nombre: string
  tipo: CondicionTipo
  dias: string
  orden: string
}

const CAMPOS = ['nombre', 'dias', 'orden'] as const

const validar = (v: Valores): Errores<Valores> => ({
  nombre: v.nombre.trim() ? undefined : 'Ingrese el nombre.',
  dias: v.tipo === 'contado' || (Number.isInteger(Number(v.dias)) && Number(v.dias) > 0) ? undefined : 'Indique los días de crédito (entero mayor a 0).',
  orden: v.orden === '' || Number.isInteger(Number(v.orden)) ? undefined : 'Debe ser un número entero.',
})

// Alta / edición de condición de pago (06-pantallas/05 §3, CP-04.5). Contado = 0 días.
export function ModalCondicion({ condicion, siguienteOrden, alCerrar }: { condicion: CondicionPago | null; siguienteOrden: number; alCerrar: () => void }) {
  const guardar = useGuardarCondicion()
  const form = useFormulario<Valores>(
    {
      nombre: condicion?.nombre ?? '',
      tipo: condicion?.tipo ?? 'credito',
      dias: condicion && condicion.tipo === 'credito' ? String(condicion.dias) : '',
      orden: String(condicion?.orden ?? siguienteOrden),
    },
    validar,
  )
  const v = form.valores

  const enviar = async () => {
    if (!form.validarTodo()) return
    try {
      await guardar.mutateAsync({
        id: condicion?.id ?? null,
        datos: { nombre: v.nombre, tipo: v.tipo, dias: v.tipo === 'contado' ? 0 : Number(v.dias), orden: v.orden === '' ? siguienteOrden : Number(v.orden), activo: condicion?.activo ?? true },
      })
      toast.exito(condicion ? 'Condición actualizada.' : 'Condición creada: ya está disponible en clientes y notas.')
      alCerrar()
    } catch (error) {
      aplicarErrorFormulario(error, CAMPOS, form.marcarError)
    }
  }

  return (
    <ModalFormulario
      abierto
      titulo={condicion ? 'Editar condición de pago' : 'Nueva condición de pago'}
      sucio={form.sucio}
      guardando={guardar.isPending}
      textoGuardar={condicion ? 'Guardar' : 'Crear condición'}
      alCerrar={alCerrar}
      alGuardar={enviar}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombre" requerido className="sm:col-span-2" placeholder="Crédito 45 días" {...form.texto('nombre')} />
        <div className="flex flex-col gap-1.5">
          <span className="text-chico font-semibold text-texto-2">
            Tipo <span className="text-rojo">*</span>
          </span>
          <Segmentado
            etiqueta="Tipo de condición"
            valor={v.tipo}
            alCambiar={(tipo) => form.cambiar('tipo', tipo)}
            opciones={[
              { valor: 'credito', etiqueta: 'Crédito' },
              { valor: 'contado', etiqueta: 'Contado' },
            ]}
          />
        </div>
        <Input label="Días" requerido={v.tipo === 'credito'} inputMode="numeric" disabled={v.tipo === 'contado'} placeholder={v.tipo === 'contado' ? '0' : '30'} {...form.texto('dias')} />
        <Input label="Orden" inputMode="numeric" ayuda="Posición en las listas." {...form.texto('orden')} />
      </div>
    </ModalFormulario>
  )
}

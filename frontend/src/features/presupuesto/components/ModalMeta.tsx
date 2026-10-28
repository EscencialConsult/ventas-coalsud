import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import type { CategoriaCliente } from '@/core/models/maestros'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { CATEGORIAS } from '@/features/clientes/clientes.opciones'
import { useVendedores } from '@/features/vendedores/vendedores.queries'
import { useFormulario, type Errores } from '@/shared/hooks/useFormulario'
import { Input, Select, Textarea } from '@/shared/ui/Campo'
import { ModalFormulario } from '@/shared/ui/ModalFormulario'
import { toast } from '@/shared/ui/toast'
import { periodosAlrededor } from '../presupuesto.periodos'
import { presupuestoService, type DatosPresupuesto, type FilaCumplimiento } from '../presupuesto.service'

interface Valores extends Record<string, unknown> {
  periodo: string
  regional_id: string
  vendedor_id: string
  categoria: string
  meta: string
  observaciones: string
}

// Carga o edición de una meta (06-pantallas/10): período y regional
// obligatorios; vendedor (de esa regional) y categoría, opcionales.
export function ModalMeta({ meta, periodo, alCerrar }: { meta: FilaCumplimiento | null; periodo: string; alCerrar: () => void }) {
  const qc = useQueryClient()
  const { regionalActivaId, opciones } = useRegionalActiva()
  const validar = useCallback(
    (v: Valores): Errores<Valores> => ({
      periodo: v.periodo ? undefined : 'Elija el período.',
      regional_id: v.regional_id ? undefined : 'Elija la regional.',
      meta: Number(v.meta.replace(',', '.')) > 0 ? undefined : 'Ingrese una meta mayor a 0.',
    }),
    [],
  )
  const form = useFormulario<Valores>(
    {
      periodo: meta?.periodo ?? periodo,
      regional_id: meta?.regional_id ?? regionalActivaId ?? '',
      vendedor_id: meta?.vendedor_id ?? '',
      categoria: meta?.categoria ?? '',
      meta: meta ? String(meta.meta) : '',
      observaciones: meta?.observaciones ?? '',
    },
    validar,
  )
  const v = form.valores
  const vendedores = useVendedores(v.regional_id || null, Boolean(v.regional_id))
  const guardar = useMutation({
    mutationFn: (datos: DatosPresupuesto) => presupuestoService.guardar(meta?.presupuesto_id ?? null, datos),
    onSuccess: () => {
      for (const clave of [['presupuesto'], ['dashboard', 'cumplimiento']]) void qc.invalidateQueries({ queryKey: clave })
    },
  })

  const enviar = async () => {
    if (!form.validarTodo()) return
    try {
      await guardar.mutateAsync({
        periodo: v.periodo,
        regional_id: v.regional_id,
        vendedor_id: v.vendedor_id || null,
        categoria: (v.categoria || null) as CategoriaCliente | null,
        meta: Number(v.meta.replace(',', '.')),
        observaciones: v.observaciones,
      })
      toast.exito(meta ? 'Meta actualizada' : 'Meta cargada')
      alCerrar()
    } catch (error) {
      aplicarErrorFormulario(error, ['periodo', 'meta'] as const, form.marcarError)
    }
  }

  return (
    <ModalFormulario abierto titulo={meta ? 'Editar meta' : 'Cargar meta'} sucio={form.sucio} guardando={guardar.isPending} alCerrar={alCerrar} alGuardar={enviar}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Período" requerido {...form.seleccion('periodo')} opciones={periodosAlrededor(periodo)} />
        <Select
          label="Regional"
          requerido
          {...form.seleccion('regional_id')}
          alCambiar={(id) => {
            form.cambiar('regional_id', id)
            form.cambiar('vendedor_id', '')
          }}
          opciones={opciones.map((r) => ({ valor: r.id, etiqueta: r.nombre }))}
        />
        <Select
          label="Vendedor"
          {...form.seleccion('vendedor_id')}
          opciones={[{ valor: '', etiqueta: 'Toda la regional' }, ...(vendedores.data ?? []).filter((ven) => ven.activo).map((ven) => ({ valor: ven.id, etiqueta: ven.nombre }))]}
        />
        <Select label="Categoría de cliente" {...form.seleccion('categoria')} opciones={[{ valor: '', etiqueta: 'Todas' }, ...CATEGORIAS]} />
        <Input label="Meta (Bs)" requerido inputMode="decimal" placeholder="120000" {...form.texto('meta')} />
        <Textarea label="Observaciones" className="sm:col-span-2" {...form.texto('observaciones')} />
      </div>
    </ModalFormulario>
  )
}

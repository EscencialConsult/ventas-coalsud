import type { QueryKey } from '@tanstack/react-query'
import { Mail, Phone } from 'lucide-react'
import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import type { CategoriaCliente, Cliente } from '@/core/models/maestros'
import type { Canal } from '@/core/models/nota-venta'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useFormulario, type Errores } from '@/shared/hooks/useFormulario'
import { Input, Select, Textarea } from '@/shared/ui/Campo'
import { Interruptor } from '@/shared/ui/Interruptor'
import { ModalFormulario } from '@/shared/ui/ModalFormulario'
import { toast } from '@/shared/ui/toast'
import { useCondiciones } from '@/features/catalogo/catalogo.queries'
import { useVendedores } from '@/features/vendedores/vendedores.queries'
import { CANAL_SUGERIDO, CANALES, CATEGORIAS, EMAIL_VALIDO } from '../clientes.opciones'
import { useGuardarCliente } from '../clientes.queries'

interface Valores extends Record<string, unknown> {
  nombre: string
  razon_social: string
  nit: string
  categoria: CategoriaCliente | ''
  canal: Canal | ''
  regional_id: string
  vendedor_id: string
  condicion_pago_id: string
  zona: string
  telefono: string
  email: string
  direccion: string
  activo: boolean
}

const CAMPOS = ['nombre', 'razon_social', 'nit', 'categoria', 'canal', 'regional_id', 'vendedor_id', 'condicion_pago_id', 'zona', 'telefono', 'email', 'direccion'] as const

const validar = (v: Valores): Errores<Valores> => ({
  nombre: v.nombre.trim() ? undefined : 'Ingrese el nombre.',
  categoria: v.categoria ? undefined : 'Elija la categoría.',
  canal: v.canal ? undefined : 'Elija el canal.',
  regional_id: v.regional_id ? undefined : 'Elija la regional.',
  email: !v.email.trim() || EMAIL_VALIDO.test(v.email.trim()) ? undefined : 'El correo no tiene un formato válido.',
})

interface Props {
  cliente: Cliente | null
  /** Lista visible (el alta aparece arriba); null desde el detalle. */
  claveVisible: QueryKey | null
  alCerrar: () => void
}

// Alta / edición de cliente (06-pantallas/04 §1, CP-03.1): modal lg.
export function ModalCliente({ cliente, claveVisible, alCerrar }: Props) {
  const { regionalActivaId, opciones: regionales } = useRegionalActiva()
  const condiciones = useCondiciones()
  const guardar = useGuardarCliente(claveVisible)
  const form = useFormulario<Valores>(
    {
      nombre: cliente?.nombre ?? '',
      razon_social: cliente?.razon_social ?? '',
      nit: cliente?.nit ?? '',
      categoria: cliente?.categoria ?? '',
      canal: cliente?.canal ?? '',
      // CP-03.3: solo sus regionales; fija si tiene una sola.
      regional_id: cliente?.regional_id ?? regionalActivaId ?? regionales[0]?.id ?? '',
      vendedor_id: cliente?.vendedor_id ?? '',
      // Vacío = la condición por defecto (Contado), que se conoce cuando llega el catálogo.
      condicion_pago_id: cliente?.condicion_pago_id ?? '',
      zona: cliente?.zona ?? '',
      telefono: cliente?.telefono ?? '',
      email: cliente?.email ?? '',
      direccion: cliente?.direccion ?? '',
      activo: cliente?.activo ?? true,
    },
    validar,
  )
  const v = form.valores
  // CP-03.4: solo vendedores activos de la regional elegida.
  const vendedores = useVendedores(v.regional_id || null, Boolean(v.regional_id))
  const condicionPorDefecto = condiciones.data?.find((c) => c.tipo === 'contado' && c.activo)?.id
  const condicion = v.condicion_pago_id || condicionPorDefecto || ''

  const cambiarCategoria = (categoria: CategoriaCliente) => {
    form.cambiar('categoria', categoria)
    // El canal se sugiere mientras no se haya elegido a mano otro distinto.
    if (!v.canal || v.canal === CANAL_SUGERIDO[v.categoria as CategoriaCliente]) form.cambiar('canal', CANAL_SUGERIDO[categoria])
  }

  const cambiarRegional = (regionalId: string) => {
    form.cambiar('regional_id', regionalId)
    form.cambiar('vendedor_id', '')
  }

  const enviar = async () => {
    if (!form.validarTodo() || !v.categoria || !v.canal) return
    if (!condicion) {
      form.marcarError('condicion_pago_id', 'Elija la condición de pago.')
      return
    }
    try {
      const guardado = await guardar.mutateAsync({
        id: cliente?.id ?? null,
        datos: {
          regional_id: v.regional_id,
          nombre: v.nombre,
          razon_social: v.razon_social || null,
          nit: v.nit || null,
          categoria: v.categoria,
          canal: v.canal,
          vendedor_id: v.vendedor_id || null,
          condicion_pago_id: condicion,
          zona: v.zona || null,
          telefono: v.telefono || null,
          email: v.email || null,
          direccion: v.direccion || null,
          activo: v.activo,
        },
      })
      toast.exito(cliente ? 'Cliente actualizado.' : `Cliente ${guardado.nombre} creado: ya está disponible para notas.`)
      alCerrar()
    } catch (error) {
      aplicarErrorFormulario(error, CAMPOS, form.marcarError)
    }
  }

  return (
    <ModalFormulario
      abierto
      titulo={cliente ? `Editar a ${cliente.nombre}` : 'Nuevo cliente'}
      tam="lg"
      sucio={form.sucio}
      guardando={guardar.isPending}
      textoGuardar={cliente ? 'Guardar' : 'Crear cliente'}
      alCerrar={alCerrar}
      alGuardar={enviar}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Nombre" requerido className="sm:col-span-2" placeholder="Nombre comercial" {...form.texto('nombre')} />
        <Input label="Razón social" placeholder="Opcional" {...form.texto('razon_social')} />
        <Input label="NIT" inputMode="numeric" placeholder="Opcional" {...form.texto('nit')} />

        <Select label="Categoría" requerido {...form.seleccion('categoria')} alCambiar={cambiarCategoria} opciones={CATEGORIAS} />
        <Select label="Canal" requerido ayuda={v.categoria ? 'Sugerido según la categoría.' : undefined} {...form.seleccion('canal')} opciones={CANALES} />

        <Select
          label="Regional"
          requerido
          disabled={regionales.length < 2}
          {...form.seleccion('regional_id')}
          alCambiar={cambiarRegional}
          opciones={regionales.map((r) => ({ valor: r.id, etiqueta: r.nombre }))}
        />
        <Select
          label="Vendedor"
          {...form.seleccion('vendedor_id')}
          opciones={[
            { valor: '', etiqueta: 'Sin vendedor asignado' },
            ...(vendedores.data ?? []).filter((ven) => ven.activo || ven.id === v.vendedor_id).map((ven) => ({ valor: ven.id, etiqueta: ven.nombre })),
          ]}
        />

        <Select
          label="Condición de pago"
          requerido
          {...form.seleccion('condicion_pago_id')}
          valor={condicion}
          opciones={(condiciones.data ?? []).filter((c) => c.activo || c.id === v.condicion_pago_id).map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
        />
        <Input label="Zona" placeholder="Opcional" {...form.texto('zona')} />
        <Input label="Teléfono" icono={Phone} inputMode="tel" placeholder="Opcional" {...form.texto('telefono')} />
        <Input label="Correo" icono={Mail} type="email" placeholder="Opcional" {...form.texto('email')} />
        <Textarea label="Dirección" className="sm:col-span-2" placeholder="Opcional" {...form.texto('direccion')} />
        {cliente && (
          <div className="sm:col-span-2">
            <Interruptor activo={v.activo} texto={v.activo ? 'Cliente activo' : 'Cliente inactivo'} etiqueta="Cliente activo" alCambiar={(a) => form.cambiar('activo', a)} />
          </div>
        )}
      </div>
    </ModalFormulario>
  )
}

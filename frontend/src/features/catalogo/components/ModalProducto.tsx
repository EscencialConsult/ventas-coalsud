import type { QueryKey } from '@tanstack/react-query'
import { aplicarErrorFormulario } from '@/core/errores/errorFormulario'
import type { Producto } from '@/core/models/maestros'
import { useFormulario, type Errores } from '@/shared/hooks/useFormulario'
import { Input, Select } from '@/shared/ui/Campo'
import { Alerta } from '@/shared/ui/Estados'
import { ModalFormulario } from '@/shared/ui/ModalFormulario'
import { toast } from '@/shared/ui/toast'
import { useGuardarProducto, useLineas } from '../catalogo.queries'

interface Valores extends Record<string, unknown> {
  linea_id: string
  nombre: string
  codigo: string
  orden: string
  precio_base: string
  stock_minimo: string
}

const CAMPOS = ['linea_id', 'nombre', 'codigo', 'orden', 'precio_base', 'stock_minimo'] as const

const numero = (texto: string) => (texto.trim() === '' ? NaN : Number(texto.replace(',', '.')))

const validar = (v: Valores): Errores<Valores> => ({
  linea_id: v.linea_id ? undefined : 'Elija la línea.',
  nombre: v.nombre.trim() ? undefined : 'Ingrese el nombre.',
  orden: v.orden === '' || Number.isInteger(numero(v.orden)) ? undefined : 'Debe ser un número entero.',
  precio_base: numero(v.precio_base) >= 0 ? undefined : 'Ingrese un precio (0 o más).',
  stock_minimo: v.stock_minimo === '' || numero(v.stock_minimo) >= 0 ? undefined : 'Debe ser 0 o más.',
})

// Alta / edición de producto (06-pantallas/05 §1, CP-04.1).
export function ModalProducto({ producto, claveVisible, alCerrar }: { producto: Producto | null; claveVisible: QueryKey; alCerrar: () => void }) {
  const lineas = useLineas()
  const guardar = useGuardarProducto(claveVisible)
  const form = useFormulario<Valores>(
    {
      linea_id: producto?.linea_id ?? '',
      nombre: producto?.nombre ?? '',
      codigo: producto?.codigo ?? '',
      orden: String(producto?.orden ?? ''),
      precio_base: producto ? String(producto.precio_base) : '',
      stock_minimo: String(producto?.stock_minimo ?? '0'),
    },
    validar,
  )
  const v = form.valores
  // CP-04.4: cambiar el precio no toca las notas ya emitidas.
  const cambiaPrecio = producto !== null && numero(v.precio_base) !== producto.precio_base && numero(v.precio_base) >= 0

  const enviar = async () => {
    if (!form.validarTodo()) return
    try {
      await guardar.mutateAsync({
        id: producto?.id ?? null,
        datos: {
          linea_id: v.linea_id,
          nombre: v.nombre,
          codigo: v.codigo.trim() || null,
          orden: v.orden === '' ? 0 : numero(v.orden),
          precio_base: numero(v.precio_base),
          stock_minimo: v.stock_minimo === '' ? 0 : numero(v.stock_minimo),
          activo: producto?.activo ?? true,
        },
      })
      toast.exito(producto ? 'Producto actualizado.' : 'Producto creado.')
      alCerrar()
    } catch (error) {
      aplicarErrorFormulario(error, CAMPOS, form.marcarError)
    }
  }

  return (
    <ModalFormulario
      abierto
      titulo={producto ? 'Editar producto' : 'Nuevo producto'}
      tam="lg"
      sucio={form.sucio}
      guardando={guardar.isPending}
      textoGuardar={producto ? 'Guardar' : 'Crear producto'}
      alCerrar={alCerrar}
      alGuardar={enviar}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Línea"
          requerido
          placeholder="Elija una línea…"
          {...form.seleccion('linea_id')}
          opciones={(lineas.data ?? []).filter((l) => l.activo || l.id === v.linea_id).map((l) => ({ valor: l.id, etiqueta: l.nombre }))}
        />
        <Input label="Orden en la línea" inputMode="numeric" placeholder="Al final" ayuda="Posición en el reporte diario." {...form.texto('orden')} />
        <Input label="Nombre" requerido className="sm:col-span-2" placeholder="QUINUA TRICOLOR 1 KG" {...form.texto('nombre')} />
        <Input label="Código" placeholder="Opcional" {...form.texto('codigo')} />
        <div />
        <Input label="Precio base (Bs)" requerido inputMode="decimal" placeholder="0.00" {...form.texto('precio_base')} />
        <Input label="Stock mínimo" inputMode="decimal" ayuda="Debajo de este saldo se avisa en Inventario." {...form.texto('stock_minimo')} />
        {cambiaPrecio && (
          <Alerta tipo="info" className="sm:col-span-2">
            Las notas ya emitidas conservan su precio; el nuevo rige desde ahora.
          </Alerta>
        )}
      </div>
    </ModalFormulario>
  )
}

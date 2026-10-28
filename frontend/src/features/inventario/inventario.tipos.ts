import { ArrowLeftRight, PackagePlus, SlidersHorizontal, Truck, Undo2, type LucideIcon } from 'lucide-react'
import type { TipoDocumento, TipoMovimiento } from '@/core/models/inventario'
import type { VarianteBadge } from '@/shared/ui/Badge'

interface ConfigTipo {
  /** Nombre corto: badge, toast ("Traspaso TR-LP-0007 registrado"). */
  etiqueta: string
  titulo: string
  registrar: string
  registrado: string
  /** Encabezado de la columna "disponible" del formulario. */
  disponible: string
  icono: LucideIcon
  tono: VarianteBadge
}

// 06-pantallas/06 §5: un solo formulario, configurado por tipo.
export const TIPOS_DOCUMENTO: Record<TipoDocumento, ConfigTipo> = {
  ingreso: { etiqueta: 'Ingreso', titulo: 'Nuevo ingreso', registrar: 'Registrar ingreso', registrado: 'registrado', disponible: 'En almacén', icono: PackagePlus, tono: 'ok' },
  salida: { etiqueta: 'Salida', titulo: 'Salida a vendedor', registrar: 'Registrar salida', registrado: 'registrada', disponible: 'Disponible', icono: Truck, tono: 'info' },
  retorno: { etiqueta: 'Retorno', titulo: 'Retorno de vendedor', registrar: 'Registrar retorno', registrado: 'registrado', disponible: 'En poder', icono: Undo2, tono: 'info' },
  traspaso: { etiqueta: 'Traspaso', titulo: 'Nuevo traspaso', registrar: 'Registrar traspaso', registrado: 'registrado', disponible: 'Disponible', icono: ArrowLeftRight, tono: 'alerta' },
  ajuste: { etiqueta: 'Ajuste', titulo: 'Nuevo ajuste', registrar: 'Registrar ajuste', registrado: 'registrado', disponible: 'Disponible', icono: SlidersHorizontal, tono: 'neutro' },
}

export const TIPOS: TipoDocumento[] = ['ingreso', 'salida', 'retorno', 'traspaso', 'ajuste']

export const esTipoDocumento = (valor: string | undefined): valor is TipoDocumento => TIPOS.includes(valor as TipoDocumento)

export const TIPOS_MOVIMIENTO: Record<TipoMovimiento, { etiqueta: string; tono: VarianteBadge }> = {
  ingreso: { etiqueta: 'Ingreso', tono: 'ok' },
  salida: { etiqueta: 'Salida', tono: 'info' },
  retorno: { etiqueta: 'Retorno', tono: 'info' },
  traspaso_salida: { etiqueta: 'Traspaso enviado', tono: 'alerta' },
  traspaso_entrada: { etiqueta: 'Traspaso recibido', tono: 'alerta' },
  venta: { etiqueta: 'Venta', tono: 'marca' },
  anulacion: { etiqueta: 'Anulación', tono: 'neutro' },
  devolucion: { etiqueta: 'Devolución', tono: 'neutro' },
  ajuste: { etiqueta: 'Ajuste', tono: 'neutro' },
}

/** Motivos del ajuste (Contrato §5.1). Se guarda la etiqueta, con el detalle si lo hay. */
export const MOTIVOS_AJUSTE = [
  { valor: 'inventario_inicial', etiqueta: 'Inventario inicial' },
  { valor: 'conteo_fisico', etiqueta: 'Conteo físico' },
  { valor: 'merma', etiqueta: 'Merma' },
  { valor: 'vencimiento', etiqueta: 'Vencimiento' },
  { valor: 'rotura', etiqueta: 'Rotura' },
  { valor: 'otro', etiqueta: 'Otro' },
]

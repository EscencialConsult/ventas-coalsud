import type { Perfil } from '@/core/models/organizacion'

// Qué se MUESTRA a cada rol (05-Navegacion_y_Permisos §3). Refleja la matriz
// de la base (Seguridad RLS §11), pero no la reemplaza: si esto se equivoca,
// la base rechaza. Los componentes preguntan por acción, nunca por rol.
export type Accion =
  | 'usuarios.administrar'
  | 'catalogo.editar'
  | 'configuracion.editar'
  | 'cartera.cargar'
  | 'eecc.ver'
  | 'auditoria.ver'
  | 'liquidacion.reabrir'
  | 'presupuesto.editar'
  | 'clientes.editar'
  | 'vendedores.editar'
  | 'inventario.operar'
  | 'nota.emitir'
  | 'nota.anular'
  | 'nota.factura'
  | 'nota.devolver'
  | 'cobranza.registrar'
  | 'cobranza.anular'
  | 'liquidacion.cerrar'

type Regla = (perfil: Perfil, regionalActivaId: string | null) => boolean

const esNacional: Regla = (p) => p.activo && p.rol === 'nacional'

// Escritura transaccional: rol regional, sobre una regional concreta que sea suya.
const operaRegional: Regla = (p, r) =>
  p.activo && p.rol === 'regional' && r !== null && p.regionales.some((reg) => reg.id === r)

const REGLAS: Record<Accion, Regla> = {
  'usuarios.administrar': esNacional,
  'catalogo.editar': esNacional, // ⚠ SUP-02
  'configuracion.editar': esNacional,
  'cartera.cargar': esNacional, // ⚠ SUP-24
  'eecc.ver': esNacional, // Q1
  'auditoria.ver': esNacional, // Q22
  'liquidacion.reabrir': esNacional, // ⚠ SUP-21 (además: solo el último día cerrado)
  'presupuesto.editar': (p, r) => esNacional(p, r) || operaRegional(p, r), // ⚠ SUP-33
  'clientes.editar': operaRegional,
  'vendedores.editar': operaRegional, // ⚠ SUP-32
  'inventario.operar': operaRegional,
  'nota.emitir': operaRegional,
  'nota.anular': operaRegional,
  'nota.factura': operaRegional,
  'nota.devolver': operaRegional,
  'cobranza.registrar': operaRegional,
  'cobranza.anular': operaRegional,
  'liquidacion.cerrar': operaRegional,
}

export function puede(accion: Accion, perfil: Perfil | null, regionalActivaId: string | null): boolean {
  return perfil ? REGLAS[accion](perfil, regionalActivaId) : false
}

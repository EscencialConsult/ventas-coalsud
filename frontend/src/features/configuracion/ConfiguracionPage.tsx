import { useState } from 'react'
import { FileSpreadsheet, MapPinned, Pencil, Plus, Warehouse } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import type { Almacen, RegionalMaestro } from '@/core/models/maestros'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Interruptor } from '@/shared/ui/Interruptor'
import { Pagina } from '@/shared/ui/Pagina'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { useActivarAlmacen, useActivarRegional, useAlmacenes, useRegionales } from './configuracion.queries'
import { ModalAlmacen } from './components/ModalAlmacen'
import { ModalRegional } from './components/ModalRegional'
import { ModalCarteraInicial } from '@/features/cobranzas/components/ModalCarteraInicial'

type Dialogo = { tipo: 'regional'; regional: RegionalMaestro | null } | { tipo: 'almacen'; almacen: Almacen | null } | { tipo: 'cartera' } | null

// Configuración (06-pantallas/05 §4) · solo nacional: regionales y almacenes,
// en paralelo y cada uno con su estado (regla 27), y la carga de la cartera
// inicial de cuentas por cobrar (⚠ SUP-24).
export default function ConfiguracionPage() {
  const regionales = useRegionales()
  const almacenes = useAlmacenes()
  const activarRegional = useActivarRegional()
  const activarAlmacen = useActivarAlmacen()
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const puedeCargarCartera = usePermisos()('cartera.cargar')

  const nombreRegional = (id: string) => regionales.data?.find((r) => r.id === id)?.nombre ?? '—'

  const columnasRegional: Columna<RegionalMaestro>[] = [
    { clave: 'codigo', titulo: 'Código', numerico: true, render: (r) => <span className="font-semibold text-rojo">{r.codigo}</span> },
    { clave: 'nombre', titulo: 'Regional', principalMovil: true, render: (r) => <span className="font-medium">{r.nombre}</span> },
    { clave: 'estado', titulo: 'Activa', render: (r) => <Interruptor activo={r.activo} etiqueta={`${r.nombre} activa`} alCambiar={() => activarRegional.mutate(r)} /> },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      acciones: true,
      render: (r) => (
        <BotonIcono etiqueta={`Editar ${r.nombre}`} onClick={() => setDialogo({ tipo: 'regional', regional: r })}>
          <Pencil size={15} />
        </BotonIcono>
      ),
    },
  ]

  const columnasAlmacen: Columna<Almacen>[] = [
    { clave: 'nombre', titulo: 'Almacén', principalMovil: true, render: (a) => <span className="font-medium">{a.nombre}</span> },
    { clave: 'regional', titulo: 'Regional', render: (a) => nombreRegional(a.regional_id) },
    { clave: 'estado', titulo: 'Activo', render: (a) => <Interruptor activo={a.activo} etiqueta={`${a.nombre} activo`} alCambiar={() => activarAlmacen.mutate(a)} /> },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      acciones: true,
      render: (a) => (
        <BotonIcono etiqueta={`Editar ${a.nombre}`} onClick={() => setDialogo({ tipo: 'almacen', almacen: a })}>
          <Pencil size={15} />
        </BotonIcono>
      ),
    },
  ]

  return (
    <Pagina
      titulo="Configuración"
      subtitulo="Regionales y almacenes"
      acciones={
        puedeCargarCartera && (
          <Button variante="secundario" icono={<FileSpreadsheet size={15} />} onClick={() => setDialogo({ tipo: 'cartera' })}>
            Cargar cartera inicial
          </Button>
        )
      }
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          titulo="Regionales"
          icono={MapPinned}
          tono="rojo"
          sinPadding
          acciones={
            <Button tam="sm" variante="secundario" icono={<Plus size={14} />} onClick={() => setDialogo({ tipo: 'regional', regional: null })}>
              Nueva
            </Button>
          }
        >
          <SeccionConsulta consulta={regionales}>
            {(lista) => <Tabla etiqueta="Regionales" columnas={columnasRegional} filas={lista} claveFila={(r) => r.id} filaApagada={(r) => !r.activo} />}
          </SeccionConsulta>
        </Card>

        <Card
          titulo="Almacenes"
          icono={Warehouse}
          tono="info"
          sinPadding
          acciones={
            <Button tam="sm" variante="secundario" icono={<Plus size={14} />} onClick={() => setDialogo({ tipo: 'almacen', almacen: null })}>
              Nuevo
            </Button>
          }
        >
          <SeccionConsulta consulta={almacenes}>
            {(lista) => <Tabla etiqueta="Almacenes" columnas={columnasAlmacen} filas={lista} claveFila={(a) => a.id} filaApagada={(a) => !a.activo} />}
          </SeccionConsulta>
        </Card>
      </div>

      {dialogo?.tipo === 'regional' && <ModalRegional regional={dialogo.regional} alCerrar={() => setDialogo(null)} />}
      {dialogo?.tipo === 'almacen' && <ModalAlmacen almacen={dialogo.almacen} alCerrar={() => setDialogo(null)} />}
      {dialogo?.tipo === 'cartera' && <ModalCarteraInicial alCerrar={() => setDialogo(null)} />}
    </Pagina>
  )
}

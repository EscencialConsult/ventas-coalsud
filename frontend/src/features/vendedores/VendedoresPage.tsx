import { useMemo, useState } from 'react'
import { ChartColumn, Pencil, Plus, UserRound } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import { mapearError } from '@/core/errores/mapearError'
import type { StockFila } from '@/core/models/maestros'
import type { Vendedor } from '@/core/models/organizacion'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { formatoCantidad } from '@/shared/format/cantidad'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { BotonEnlace, Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { EmptyState, Skeleton } from '@/shared/ui/Estados'
import { Interruptor } from '@/shared/ui/Interruptor'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Pagina } from '@/shared/ui/Pagina'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { ModalConSaldo } from './components/ModalConSaldo'
import { ModalVendedor } from './components/ModalVendedor'
import { useActivarVendedor, useMercaderiaEnPoder, useVendedores } from './vendedores.queries'

// Vendedores (06-pantallas/04 §2, CU-03): la lista y la mercadería en poder
// se piden en paralelo (regla 20); la mercadería solo aplica a la modalidad
// del mismo nombre (⚠ SUP-07).
export default function VendedoresPage() {
  const { regionalActiva, regionalActivaId, opciones } = useRegionalActiva()
  const vendedores = useVendedores(regionalActivaId)
  const enPoder = useMercaderiaEnPoder(regionalActivaId)
  const editable = usePermisos()('vendedores.editar')
  const activar = useActivarVendedor()
  const [editando, setEditando] = useState<{ vendedor: Vendedor | null } | null>(null)
  const [conSaldo, setConSaldo] = useState<Vendedor | null>(null)

  const porVendedor = useMemo(() => {
    const mapa = new Map<string, StockFila[]>()
    for (const s of enPoder.data ?? []) if (s.vendedor_id) mapa.set(s.vendedor_id, [...(mapa.get(s.vendedor_id) ?? []), s])
    return mapa
  }, [enPoder.data])

  const nombreRegional = (id: string) => opciones.find((r) => r.id === id)?.nombre ?? '—'

  // Si ya se sabe que tiene mercadería, se muestra el aviso sin pedirle nada a la base.
  const alternar = (v: Vendedor) => {
    if (v.activo && porVendedor.get(v.id)?.length) {
      setConSaldo(v)
      return
    }
    activar.mutate(v, { onError: (e) => mapearError(e).codigo === 'VENDEDOR_CON_SALDO' && setConSaldo(v) })
  }

  const columnas: Columna<Vendedor>[] = [
    { clave: 'nombre', titulo: 'Vendedor', principalMovil: true, render: (v) => <span className="font-medium">{v.nombre}</span> },
    { clave: 'telefono', titulo: 'Teléfono', numerico: true, render: (v) => v.telefono ?? <span className="text-texto-3">—</span> },
    ...(regionalActiva ? [] : [{ clave: 'regional', titulo: 'Regional', render: (v: Vendedor) => nombreRegional(v.regional_id) }]),
    {
      clave: 'poder',
      titulo: 'Mercadería en poder',
      alinear: 'der',
      numerico: true,
      render: (v) => {
        if (enPoder.isPending) return <Skeleton className="ml-auto h-4 w-24" />
        const filas = porVendedor.get(v.id)
        if (!filas?.length) return <span className="text-texto-3">—</span>
        const unidades = filas.reduce((s, f) => s + f.cantidad, 0)
        return (
          <span>
            {formatoCantidad(unidades)} u. <span className="text-texto-3">·</span> <MontoBs valor={filas.reduce((s, f) => s + f.cantidad * f.precio_base, 0)} />
          </span>
        )
      },
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (v) => (editable ? <Interruptor activo={v.activo} etiqueta={`${v.nombre} activo`} alCambiar={() => alternar(v)} /> : <EstadoBadge estado={v.activo ? 'activo' : 'inactivo'} />),
    },
    ...(editable
      ? [
          {
            clave: 'acciones',
            titulo: 'Acciones',
            acciones: true,
            render: (v: Vendedor) => (
              <BotonIcono etiqueta={`Editar a ${v.nombre}`} onClick={() => setEditando({ vendedor: v })}>
                <Pencil size={15} />
              </BotonIcono>
            ),
          },
        ]
      : []),
  ]

  return (
    <Pagina
      titulo="Vendedores"
      subtitulo={regionalActiva?.nombre ?? 'Todas las regionales'}
      acciones={
        <div className="flex flex-wrap gap-2">
          <BotonEnlace a="/reportes/vendedores" icono={<ChartColumn size={15} />}>
            Rendimiento
          </BotonEnlace>
          {editable && regionalActiva && (
            <Button icono={<Plus size={16} />} onClick={() => setEditando({ vendedor: null })}>
              Nuevo vendedor
            </Button>
          )}
        </div>
      }
    >
      <Card sinPadding>
        <SeccionConsulta consulta={vendedores}>
          {(lista) => (
            <Tabla
              etiqueta="Vendedores"
              columnas={columnas}
              filas={lista}
              claveFila={(v) => v.id}
              filaApagada={(v) => !v.activo}
              vacio={<EmptyState icono={UserRound} titulo="Todavía no hay vendedores en esta regional" />}
            />
          )}
        </SeccionConsulta>
      </Card>

      {editando && regionalActiva && <ModalVendedor vendedor={editando.vendedor} regional={regionalActiva} alCerrar={() => setEditando(null)} />}
      {conSaldo && <ModalConSaldo vendedor={conSaldo} productos={porVendedor.get(conSaldo.id) ?? []} alCerrar={() => setConSaldo(null)} />}
    </Pagina>
  )
}

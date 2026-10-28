import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, UsersRound } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import { POR_PAGINA, type CategoriaCliente, type Cliente, type FiltrosClientes } from '@/core/models/maestros'
import type { Canal } from '@/core/models/nota-venta'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Button } from '@/shared/ui/Button'
import { CampoBusqueda } from '@/shared/ui/CampoBusqueda'
import { Card } from '@/shared/ui/Card'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { EmptyState } from '@/shared/ui/Estados'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { Interruptor } from '@/shared/ui/Interruptor'
import { Pagina } from '@/shared/ui/Pagina'
import { Paginacion } from '@/shared/ui/Paginacion'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { useVendedores } from '@/features/vendedores/vendedores.queries'
import { CANALES, CATEGORIAS, etiquetaCanal, etiquetaCategoria } from './clientes.opciones'
import { clavesClientes, useActivarCliente, useClientes } from './clientes.queries'
import { ModalCliente } from './components/ModalCliente'

const FILTROS = { q: '', categoria: '', canal: '', vendedor: '', estado: 'activos', pagina: '1' }

// Clientes (06-pantallas/04 §1, CU-03): filtros en la URL, búsqueda con
// debounce y paginación de servidor. La regional es la del topbar; con
// "Todas" (nacional) se suma la columna Regional. El nacional solo lee.
export default function ClientesPage() {
  const navigate = useNavigate()
  const { regionalActiva, regionalActivaId, opciones } = useRegionalActiva()
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const pagina = Math.max(1, Number(f.pagina) || 1)
  const filtros: FiltrosClientes = { q: f.q, categoria: f.categoria as CategoriaCliente | '', canal: f.canal as Canal | '', vendedorId: f.vendedor, estado: f.estado }
  const consulta = useClientes(regionalActivaId, filtros, pagina)
  const vendedores = useVendedores(regionalActivaId)
  const editable = usePermisos()('clientes.editar')
  const activar = useActivarCliente()
  const [editando, setEditando] = useState<{ cliente: Cliente | null } | null>(null)

  const nombreRegional = (id: string) => opciones.find((r) => r.id === id)?.codigo ?? '—'

  const columnas: Columna<Cliente>[] = [
    {
      clave: 'cliente',
      titulo: 'Cliente',
      principalMovil: true,
      render: (c) => <DosLineas principal={<span className="font-medium">{c.nombre}</span>} secundario={[c.razon_social, c.nit && `NIT ${c.nit}`].filter(Boolean).join(' · ') || undefined} />,
    },
    { clave: 'categoria', titulo: 'Categoría', render: (c) => <DosLineas principal={etiquetaCategoria(c.categoria)} secundario={`Canal ${etiquetaCanal(c.canal).toLowerCase()}`} /> },
    ...(regionalActiva ? [] : [{ clave: 'regional', titulo: 'Regional', render: (c: Cliente) => nombreRegional(c.regional_id) }]),
    { clave: 'zona', titulo: 'Zona', ocultarEnMovil: true, render: (c) => c.zona ?? <span className="text-texto-3">—</span> },
    { clave: 'vendedor', titulo: 'Vendedor', render: (c) => c.vendedor?.nombre ?? <span className="text-texto-3">Sin asignar</span> },
    { clave: 'condicion', titulo: 'Condición', render: (c) => c.condicion_pago.nombre },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (c) => (editable ? <Interruptor activo={c.activo} etiqueta={`${c.nombre} activo`} alCambiar={() => activar.mutate(c)} /> : <EstadoBadge estado={c.activo ? 'activo' : 'inactivo'} />),
    },
    ...(editable
      ? [
          {
            clave: 'acciones',
            titulo: 'Acciones',
            acciones: true,
            render: (c: Cliente) => (
              <BotonIcono etiqueta={`Editar a ${c.nombre}`} onClick={() => setEditando({ cliente: c })}>
                <Pencil size={15} />
              </BotonIcono>
            ),
          },
        ]
      : []),
  ]

  return (
    <Pagina
      titulo="Clientes"
      subtitulo={regionalActiva?.nombre ?? 'Todas las regionales'}
      acciones={
        editable && (
          <Button icono={<Plus size={16} />} onClick={() => setEditando({ cliente: null })}>
            Nuevo cliente
          </Button>
        )
      }
    >
      <Card sinPadding>
        <BarraFiltros>
          <CampoBusqueda etiqueta="Buscar clientes" placeholder="Buscar nombre, razón social o NIT…" valor={f.q} alCambiar={(q) => cambiar({ q }, { reemplazar: true })} />
          <FiltroSelect etiqueta="Categoría" valor={f.categoria} alCambiar={(categoria) => cambiar({ categoria })} opciones={[{ valor: '', etiqueta: 'Todas las categorías' }, ...CATEGORIAS]} />
          <FiltroSelect etiqueta="Canal" valor={f.canal} alCambiar={(canal) => cambiar({ canal })} opciones={[{ valor: '', etiqueta: 'Todos los canales' }, ...CANALES]} />
          <FiltroSelect
            etiqueta="Vendedor"
            valor={f.vendedor}
            alCambiar={(vendedor) => cambiar({ vendedor })}
            opciones={[{ valor: '', etiqueta: 'Todos los vendedores' }, ...(vendedores.data ?? []).map((v) => ({ valor: v.id, etiqueta: v.nombre }))]}
          />
          <FiltroSelect
            etiqueta="Estado"
            valor={f.estado}
            alCambiar={(estado) => cambiar({ estado })}
            opciones={[
              { valor: 'activos', etiqueta: 'Activos' },
              { valor: 'inactivos', etiqueta: 'Inactivos' },
              { valor: 'todos', etiqueta: 'Todos' },
            ]}
          />
        </BarraFiltros>

        <SeccionConsulta consulta={consulta}>
          {(datos) => (
            <>
              <Tabla
                etiqueta="Clientes"
                columnas={columnas}
                filas={datos.filas}
                claveFila={(c) => c.id}
                filaApagada={(c) => !c.activo}
                alClicFila={(c) => navigate(`/clientes/${c.id}`)}
                vacio={
                  <EmptyState
                    icono={UsersRound}
                    titulo="No hay clientes con esos filtros"
                    accion={
                      editable && (
                        <Button tam="sm" icono={<Plus size={14} />} onClick={() => setEditando({ cliente: null })}>
                          Nuevo cliente
                        </Button>
                      )
                    }
                  />
                }
              />
              <Paginacion pagina={pagina} total={datos.total} porPagina={POR_PAGINA} unidad="clientes" alCambiar={(p) => cambiar({ pagina: String(p) })} />
            </>
          )}
        </SeccionConsulta>
      </Card>

      {editando && <ModalCliente cliente={editando.cliente} claveVisible={clavesClientes.lista(regionalActivaId, filtros, pagina)} alCerrar={() => setEditando(null)} />}
    </Pagina>
  )
}

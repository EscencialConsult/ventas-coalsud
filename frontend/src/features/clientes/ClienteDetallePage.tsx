import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Pencil, Wallet } from 'lucide-react'
import { usePermisos } from '@/core/auth/usePermisos'
import type { Cliente, SaldoDocumento } from '@/core/models/maestros'
import type { NotaVentaResumen } from '@/core/models/nota-venta'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { formatoFecha } from '@/shared/format/fecha'
import { Badge } from '@/shared/ui/Badge'
import { BotonEnlace, Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { DosLineas } from '@/shared/ui/DosLineas'
import { EstadoBadge } from '@/shared/ui/EstadoBadge'
import { EmptyState, Skeleton } from '@/shared/ui/Estados'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Pagina } from '@/shared/ui/Pagina'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Segmentado } from '@/shared/ui/Segmentado'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { etiquetaCanal, etiquetaCategoria } from './clientes.opciones'
import { useCliente, useNotasCliente, useSaldosCliente } from './clientes.queries'
import { ModalCliente } from './components/ModalCliente'

const PESTANA = { pestana: 'notas' }

// Detalle de cliente (06-pantallas/04 §1): ficha + pestañas "Notas" y
// "Saldo" (la regional la necesita para cobrar; el EECC consolidado sigue
// siendo del nacional). Cada pestaña pide sus datos al abrirse (regla 29).
export default function ClienteDetallePage() {
  const { id = '' } = useParams()
  const consulta = useCliente(id)
  const editable = usePermisos()('clientes.editar')
  const [editando, setEditando] = useState(false)

  return (
    <SeccionConsulta consulta={consulta} cargando={<Skeleton className="h-64 rounded-card" />}>
      {(cliente) => (
        <Pagina
          titulo={cliente.nombre}
          subtitulo={<EstadoBadge estado={cliente.activo ? 'activo' : 'inactivo'} />}
          acciones={
            <>
              <BotonEnlace a="/clientes" variante="secundario" icono={<ArrowLeft size={15} />}>
                Clientes
              </BotonEnlace>
              {editable && (
                <Button variante="secundario" icono={<Pencil size={15} />} onClick={() => setEditando(true)}>
                  Editar
                </Button>
              )}
            </>
          }
        >
          <Ficha cliente={cliente} />
          <PestanasDetalle clienteId={cliente.id} />
          {editando && <ModalCliente cliente={cliente} claveVisible={null} alCerrar={() => setEditando(false)} />}
        </Pagina>
      )}
    </SeccionConsulta>
  )
}

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-chico text-texto-3">{etiqueta}</dt>
      <dd className="mt-0.5 truncate text-cuerpo font-medium">{children || <span className="font-normal text-texto-3">—</span>}</dd>
    </div>
  )
}

function Ficha({ cliente }: { cliente: Cliente }) {
  const { opciones } = useRegionalActiva()
  return (
    <Card>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        <Dato etiqueta="Razón social">{cliente.razon_social}</Dato>
        <Dato etiqueta="NIT">{cliente.nit && <span className="tabular-nums">{cliente.nit}</span>}</Dato>
        <Dato etiqueta="Categoría">
          {etiquetaCategoria(cliente.categoria)} <span className="font-normal text-texto-3">· canal {etiquetaCanal(cliente.canal).toLowerCase()}</span>
        </Dato>
        <Dato etiqueta="Regional">{opciones.find((r) => r.id === cliente.regional_id)?.nombre}</Dato>
        <Dato etiqueta="Vendedor">{cliente.vendedor?.nombre}</Dato>
        <Dato etiqueta="Condición de pago">{cliente.condicion_pago.nombre}</Dato>
        <Dato etiqueta="Zona">{cliente.zona}</Dato>
        <Dato etiqueta="Teléfono">{cliente.telefono && <span className="tabular-nums">{cliente.telefono}</span>}</Dato>
        <Dato etiqueta="Correo">{cliente.email}</Dato>
        <div className="col-span-2 sm:col-span-3 lg:col-span-3">
          <Dato etiqueta="Dirección">{cliente.direccion}</Dato>
        </div>
      </dl>
    </Card>
  )
}

function PestanasDetalle({ clienteId }: { clienteId: string }) {
  const [{ pestana }, cambiar] = useFiltrosUrl(PESTANA)
  return (
    <Card
      sinPadding
      titulo={pestana === 'saldo' ? 'Saldo por documento' : 'Notas de venta'}
      icono={pestana === 'saldo' ? Wallet : FileText}
      tono={pestana === 'saldo' ? 'info' : 'rojo'}
      acciones={
        <Segmentado
          etiqueta="Ver"
          valor={pestana}
          alCambiar={(p) => cambiar({ pestana: p }, { reemplazar: true })}
          opciones={[
            { valor: 'notas', etiqueta: 'Notas' },
            { valor: 'saldo', etiqueta: 'Saldo' },
          ]}
        />
      }
    >
      {pestana === 'saldo' ? <SaldoCliente clienteId={clienteId} /> : <NotasCliente clienteId={clienteId} />}
    </Card>
  )
}

const COLUMNAS_NOTAS: Columna<NotaVentaResumen>[] = [
  {
    clave: 'nota',
    titulo: 'Nota',
    numerico: true,
    principalMovil: true,
    render: (n) => <DosLineas principal={<span className="font-semibold text-rojo">{n.numero}</span>} secundario={[formatoFecha(n.fecha), n.numero_factura].filter(Boolean).join(' · ')} />,
  },
  { clave: 'vendedor', titulo: 'Vendedor', render: (n) => n.vendedor_nombre },
  { clave: 'condicion', titulo: 'Condición', render: (n) => n.condicion_nombre },
  { clave: 'total', titulo: 'Total', alinear: 'der', numerico: true, render: (n) => <MontoBs valor={n.total} className="font-medium" /> },
  { clave: 'estado', titulo: 'Estado', render: (n) => <EstadoBadge estado={n.estado === 'emitida' && n.pendiente_factura ? 'sin_factura' : n.estado} /> },
]

function NotasCliente({ clienteId }: { clienteId: string }) {
  const notas = useNotasCliente(clienteId)
  const navigate = useNavigate()
  return (
    <SeccionConsulta consulta={notas}>
      {(lista) => (
        <Tabla
          etiqueta="Notas de venta del cliente"
          columnas={COLUMNAS_NOTAS}
          filas={lista}
          claveFila={(n) => n.id}
          filaInactiva={(n) => n.estado === 'anulada'}
          alClicFila={(n) => navigate(`/notas/${n.id}`)}
          vacio={<EmptyState icono={FileText} titulo="Este cliente todavía no tiene notas de venta" />}
        />
      )}
    </SeccionConsulta>
  )
}

const COLUMNAS_SALDO: Columna<SaldoDocumento>[] = [
  {
    clave: 'documento',
    titulo: 'Documento',
    numerico: true,
    principalMovil: true,
    render: (s) => (
      <DosLineas
        principal={<span className="font-semibold">{s.numero}</span>}
        secundario={s.tipo_doc === 'saldo_inicial' ? 'Saldo inicial' : (s.numero_factura ?? 'Sin factura')}
      />
    ),
  },
  { clave: 'fecha', titulo: 'Fecha', numerico: true, render: (s) => <DosLineas principal={formatoFecha(s.fecha)} secundario={s.fecha_vencimiento && `vence ${formatoFecha(s.fecha_vencimiento)}`} /> },
  { clave: 'importe', titulo: 'Importe', alinear: 'der', numerico: true, render: (s) => <MontoBs valor={s.importe} /> },
  { clave: 'saldo', titulo: 'Saldo', alinear: 'der', numerico: true, render: (s) => <MontoBs valor={s.saldo} className="font-semibold" /> },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (s) =>
      s.vencido ? (
        <EstadoBadge estado="vencida" texto={`Vencida (${s.dias_mora} ${s.dias_mora === 1 ? 'día' : 'días'})`} />
      ) : (
        <Badge variante="info" punto>
          Al día
        </Badge>
      ),
  },
]

function SaldoCliente({ clienteId }: { clienteId: string }) {
  const saldos = useSaldosCliente(clienteId)
  return (
    <SeccionConsulta consulta={saldos}>
      {(lista) => {
        // Totales derivados de las filas ya cargadas (regla 32).
        const total = lista.reduce((s, d) => s + d.saldo, 0)
        const vencido = lista.filter((d) => d.vencido).reduce((s, d) => s + d.saldo, 0)
        return (
          <>
            {lista.length > 0 && (
              <div className="flex flex-wrap gap-x-8 gap-y-2 border-b border-borde bg-fondo-2 px-5 py-3 text-cuerpo">
                <span>
                  <span className="text-texto-3">Saldo total</span> <MontoBs valor={total} className="ml-1 text-subtitulo font-semibold" />
                </span>
                {vencido > 0 && (
                  <span className="text-error">
                    <span>Vencido</span> <MontoBs valor={vencido} className="ml-1 text-subtitulo font-semibold" />
                  </span>
                )}
              </div>
            )}
            <Tabla etiqueta="Saldo por documento" columnas={COLUMNAS_SALDO} filas={lista} claveFila={(s) => s.documento_id} vacio={<EmptyState icono={Wallet} titulo="Sin saldo pendiente" />} />
          </>
        )
      }}
    </SeccionConsulta>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Printer, UsersRound, Wallet } from 'lucide-react'
import { useHoy } from '@/core/fecha/useHoy'
import type { CategoriaCliente, SaldoDocumento } from '@/core/models/maestros'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { CATEGORIAS } from '@/features/clientes/clientes.opciones'
import { useSaldosCliente } from '@/features/clientes/clientes.queries'
import { useFiltrosUrl } from '@/shared/hooks/useFiltrosUrl'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoMontoEntero } from '@/shared/format/moneda'
import { BotonExcel } from '@/shared/ui/BotonExcel'
import { Button } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Casilla } from '@/shared/ui/Casilla'
import { EmptyState, Skeleton } from '@/shared/ui/Estados'
import { FiltroFechas } from '@/shared/ui/FiltroFechas'
import { BarraFiltros, FiltroSelect } from '@/shared/ui/FiltroSelect'
import { KpiTile } from '@/shared/ui/KpiTile'
import { Modal } from '@/shared/ui/Modal'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Pagina } from '@/shared/ui/Pagina'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { TablaEecc } from './components/TablaEecc'
import { eeccService, type ClienteEecc } from './eecc.service'

const FILTROS = { fecha: '', categoria: '' }

const COLUMNAS_DOCS: Columna<SaldoDocumento>[] = [
  { clave: 'numero', titulo: 'Documento', principalMovil: true, numerico: true, render: (d) => (d.tipo_doc === 'saldo_inicial' ? `Saldo inicial ${d.numero}` : d.numero) },
  { clave: 'factura', titulo: 'Factura', ocultarEnMovil: true, render: (d) => d.numero_factura ?? '—' },
  { clave: 'fecha', titulo: 'Fecha', numerico: true, render: (d) => formatoFecha(d.fecha) },
  { clave: 'vence', titulo: 'Vence', numerico: true, render: (d) => formatoFecha(d.fecha_vencimiento) },
  { clave: 'importe', titulo: 'Importe', alinear: 'der', ocultarEnMovil: true, render: (d) => <MontoBs valor={d.importe} /> },
  { clave: 'cobrado', titulo: 'Cobrado', alinear: 'der', ocultarEnMovil: true, render: (d) => <MontoBs valor={d.cobrado} /> },
  { clave: 'abonado', titulo: 'Abonos', alinear: 'der', ocultarEnMovil: true, render: (d) => <MontoBs valor={d.abonado} /> },
  { clave: 'saldo', titulo: 'Saldo', alinear: 'der', render: (d) => <MontoBs valor={d.saldo} className="font-semibold" /> },
  { clave: 'mora', titulo: 'Mora', alinear: 'der', numerico: true, render: (d) => (d.vencido ? <span className="text-error">{d.dias_mora} d</span> : '—') },
]

/** Documentos con saldo de un cliente (v_saldo_documento): se piden al abrirlo (regla 29). */
function DocumentosCliente({ cliente, alCerrar }: { cliente: ClienteEecc; alCerrar: () => void }) {
  const saldos = useSaldosCliente(cliente.cliente_id)
  return (
    <Modal abierto tam="xl" titulo={cliente.cliente} alCerrar={alCerrar}>
      <div className="-mx-5 -my-4">
        <SeccionConsulta consulta={saldos}>{(docs) => <Tabla etiqueta={`Documentos de ${cliente.cliente}`} columnas={COLUMNAS_DOCS} filas={docs} claveFila={(d) => d.documento_id} />}</SeccionConsulta>
      </div>
    </Modal>
  )
}

// Estado de cuentas por cobrar (06-pantallas/11 §2) · solo nacional. Columnas:
// año anterior + meses del año hasta el de corte (⚠ SUP-26).
export default function EeccPage() {
  const hoy = useHoy()
  const { regionalActiva, regionalActivaId } = useRegionalActiva()
  const [f, cambiar] = useFiltrosUrl(FILTROS)
  const corte = f.fecha || hoy
  const categoria = f.categoria as CategoriaCliente | ''
  const consulta = useQuery({
    queryKey: ['eecc', corte, regionalActivaId, categoria],
    queryFn: ({ signal }) => eeccService.consolidado(corte, regionalActivaId, categoria, { signal }),
  })
  const [cliente, setCliente] = useState<ClienteEecc | null>(null)
  const [conMora, setConMora] = useState(true)
  const e = consulta.data
  const parametros = new URLSearchParams({ fecha: corte, ...(regionalActivaId ? { regional: regionalActivaId } : {}), ...(categoria ? { categoria } : {}) })

  return (
    <Pagina
      titulo="Estado de cuentas por cobrar"
      subtitulo={`${regionalActiva?.nombre ?? 'Todas las regionales'} · expresado en bolivianos`}
      acciones={
        <div className="flex flex-wrap items-center gap-2">
          <Casilla marcada={conMora} alCambiar={setConMora}>
            Vencido y mora en el Excel
          </Casilla>
          <Button variante="secundario" icono={<Printer size={15} />} disabled={!e} onClick={() => window.open(`/imprimir/eecc?${parametros}`, '_blank')}>
            Imprimir
          </Button>
          <BotonExcel
            disabled={!e?.grupos.length}
            alExportar={async () => {
              if (!e) return
              const { exportarEecc } = await import('./eecc.excel')
              await exportarEecc(e, categoria, conMora)
            }}
          />
        </div>
      }
    >
      <Card sinPadding>
        <BarraFiltros>
          <FiltroFechas modo="dia" etiqueta="Al" desde={corte} hasta={corte} max={hoy} resaltar={corte !== hoy} alCambiar={(d) => cambiar({ fecha: d === hoy ? '' : d })} />
          <FiltroSelect etiqueta="Categoría" valor={f.categoria} alCambiar={(c) => cambiar({ categoria: c })} opciones={[{ valor: '', etiqueta: 'Todas las categorías' }, ...CATEGORIAS]} />
        </BarraFiltros>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {e ? (
            <>
              <KpiTile tam="compacto" etiqueta="Saldo pendiente" valor={e.kpis.saldo_total} formato={formatoMontoEntero} prefijo="Bs" icono={Wallet} />
              <KpiTile tam="compacto" etiqueta="Vencido" valor={e.kpis.vencido} formato={formatoMontoEntero} prefijo="Bs" icono={AlertTriangle} tono="naranja" />
              <KpiTile tam="compacto" etiqueta="Clientes con saldo" valor={e.kpis.clientes_con_saldo} icono={UsersRound} tono="dorado" />
              <KpiTile tam="compacto" etiqueta="Clientes en mora" valor={e.kpis.clientes_en_mora} icono={UsersRound} tono="naranja" />
            </>
          ) : (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)
          )}
        </div>
      </Card>

      <SeccionConsulta consulta={consulta} cargando={<Skeleton className="h-64" />} claseError="">
        {(datos) =>
          datos.grupos.length ? (
            <>
              {datos.grupos.map((g) => (
                <Card key={`${g.regional}-${g.categoria}`} sinPadding>
                  <TablaEecc eecc={datos} grupo={g} alElegir={setCliente} />
                </Card>
              ))}
              <Card>
                <p className="flex flex-wrap items-baseline justify-between gap-2 font-semibold">
                  <span>SALDO ACTUAL</span>
                  <MontoBs valor={datos.total_general.total ?? 0} className="text-subtitulo" />
                </p>
                <p className="mt-1 text-chico text-texto-3 tabular-nums">
                  {datos.columnas.map((c) => `${c.etiqueta} ${formatoMontoEntero(datos.total_general[c.clave] ?? 0)}`).join(' · ')}
                </p>
              </Card>
            </>
          ) : (
            <Card>
              <EmptyState icono={Wallet} titulo="No hay saldos pendientes con esos filtros" />
            </Card>
          )
        }
      </SeccionConsulta>

      {cliente && <DocumentosCliente cliente={cliente} alCerrar={() => setCliente(null)} />}
    </Pagina>
  )
}

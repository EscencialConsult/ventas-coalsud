import { useState } from 'react'
import { Boxes, CalendarRange, Mail, PackageX, Plus, Printer, Receipt, Search, Target } from 'lucide-react'
import { formatoFecha } from '@/shared/format/fecha'
import { formatoBs, formatoMontoEntero, formatoPct } from '@/shared/format/moneda'
import { numeroALetras } from '@/shared/format/numeroALetras'
import { Anillo } from '@/shared/ui/Anillo'
import { Badge } from '@/shared/ui/Badge'
import { BarrasHorizontales } from '@/shared/ui/BarrasHorizontales'
import { BotonIcono } from '@/shared/ui/BotonIcono'
import { Button } from '@/shared/ui/Button'
import { Input, Select, Textarea } from '@/shared/ui/Campo'
import { Card } from '@/shared/ui/Card'
import { Confirmacion } from '@/shared/ui/Confirmacion'
import { EstadoBadge, type Estado } from '@/shared/ui/EstadoBadge'
import { Alerta, EmptyState, Skeleton } from '@/shared/ui/Estados'
import { KpiTile } from '@/shared/ui/KpiTile'
import { Modal } from '@/shared/ui/Modal'
import { MontoBs } from '@/shared/ui/MontoBs'
import { Pagina } from '@/shared/ui/Pagina'
import { Segmentado } from '@/shared/ui/Segmentado'
import { Sparkline } from '@/shared/ui/Sparkline'
import { Tabla } from '@/shared/ui/Tabla'
import { toast } from '@/shared/ui/toast'

const ESTADOS: Estado[] = ['emitida', 'anulada', 'sin_factura', 'vencida', 'cancelada', 'abierta', 'cerrada', 'vigente', 'bajo_minimo', 'cumplido', 'en_camino', 'en_riesgo', 'bajo', 'activo', 'inactivo']

const FILAS = [
  { id: '1', producto: 'QUINUA TRICOLOR 1 KG', linea: 'COMRURAL', cantidad: 15, bs: 660 },
  { id: '2', producto: 'QUINUA BLANCA 1KG', linea: 'COMRURAL', cantidad: 24, bs: 1056 },
  { id: '3', producto: 'FIFITOS 360GR', linea: 'LA Y SAA', cantidad: 26, bs: 179 },
]

const SERIE = [3200, 4100, 3800, 5200, 4700, 6100, 5600, 6900, 6300, 7400]

const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// Vitrina de componentes (solo en desarrollo, FE-03): /dev/ui
function SelectDemo() {
  const [condicion, setCondicion] = useState('')
  return (
    <Select
      label="Condición de pago"
      requerido
      valor={condicion}
      alCambiar={setCondicion}
      opciones={[
        { valor: 'contado', etiqueta: 'Contado' },
        { valor: 'credito-30', etiqueta: 'Crédito 30 días' },
      ]}
    />
  )
}

export default function UiPage() {
  const [modal, setModal] = useState(false)
  const [confirmacion, setConfirmacion] = useState(false)
  const [periodo, setPeriodo] = useState<'dia' | 'mes' | 'anio'>('dia')

  return (
    <Pagina titulo="Componentes" subtitulo="Sistema de diseño COALSUD v1.2 · solo en desarrollo" acciones={<Button icono={<Plus size={16} />}>Acción primaria</Button>}>
      <Card titulo="Botones" subtitulo="Relieve al reposo, hundido al presionar; el loading se activa solo si onClick devuelve una promesa" icono={Boxes}>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => esperar(1500)}>Primario (async)</Button>
          <Button variante="secundario" icono={<Printer size={15} />}>
            Secundario
          </Button>
          <Button variante="peligro">Anular nota</Button>
          <Button variante="exito">Cerrar el día</Button>
          <Button cargando>Guardando</Button>
          <Button tam="sm">Pequeño</Button>
          <Button tam="lg">Grande</Button>
          <Button disabled>Deshabilitado</Button>
          <BotonIcono etiqueta="Imprimir" tam="lg">
            <Printer size={16} />
          </BotonIcono>
          <Segmentado
            etiqueta="Período"
            valor={periodo}
            alCambiar={setPeriodo}
            opciones={[
              { valor: 'dia', etiqueta: 'Día' },
              { valor: 'mes', etiqueta: 'Mes' },
              { valor: 'anio', etiqueta: 'Año' },
            ]}
          />
        </div>
      </Card>

      <Card titulo="Campos">
        <div className="grid gap-4 md:grid-cols-3">
          <Input label="Cliente" requerido placeholder="Buscar cliente…" icono={Search} />
          <Input label="N° de factura" ayuda="Opcional al emitir; obligatorio para cerrar el día." />
          <Input label="Cantidad" error="Disponible: 20" defaultValue="25" />
          <SelectDemo />
          <Input label="Correo" type="email" icono={Mail} placeholder="usuario@coalsud.bo" />
          <Textarea label="Observaciones" className="md:col-span-3" />
        </div>
      </Card>

      <Card titulo="Badges de estado">
        <div className="flex flex-wrap gap-2">
          {ESTADOS.map((e) => (
            <EstadoBadge key={e} estado={e} />
          ))}
          <Badge variante="marca">Marca</Badge>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiTile etiqueta="Total ventas" valor={4300} formato={formatoMontoEntero} prefijo="Bs" icono={Receipt} a="/" />
        <KpiTile
          etiqueta="Ventas del mes"
          valor={198420}
          formato={formatoMontoEntero}
          prefijo="Bs"
          icono={CalendarRange}
          tono="naranja"
          grafico={<Sparkline valores={SERIE} etiqueta="Serie de ejemplo" tono="naranja" />}
        />
        <KpiTile etiqueta="Presupuesto" valor={72} sufijo="%" detalle={`Proyección ${formatoPct(96)}`} icono={Target} tono="dorado" grafico={<Anillo pct={72} etiqueta="72 %" tono="dorado" />} />
        <KpiTile tam="compacto" etiqueta="Bajo mínimo" valor={4} icono={PackageX} tono="error" />
      </div>

      <Card titulo="Barras horizontales">
        <BarrasHorizontales
          items={[
            { id: 'lp', etiqueta: 'La Paz', valor: 98200 },
            { id: 'cbba', etiqueta: 'Cochabamba', valor: 52100 },
            { id: 'scz', etiqueta: 'Santa Cruz', valor: 48120 },
          ]}
          formato={(n) => <MontoBs valor={n} entero />}
          conParticipacion
        />
      </Card>

      <Card titulo="Alertas">
        <div className="space-y-2.5">
          <Alerta tipo="info">El reporte diario consolida a todos los vendedores.</Alerta>
          <Alerta tipo="alerta">Hay 1 día sin cerrar: 10/06/2026.</Alerta>
          <Alerta tipo="error">El día 11/06/2026 de La Paz está cerrado.</Alerta>
          <Alerta tipo="ok">Día 11/06/2026 cerrado.</Alerta>
        </div>
      </Card>

      <Card titulo="Tabla" sinPadding>
        <Tabla
          etiqueta="Tabla de ejemplo"
          claveFila={(f) => f.id}
          filas={FILAS}
          filaInactiva={(f) => f.id === '3'}
          alClicFila={(f) => toast.info(`Fila ${f.producto}`)}
          columnas={[
            { clave: 'producto', titulo: 'Producto', principalMovil: true, render: (f) => f.producto },
            { clave: 'linea', titulo: 'Línea', render: (f) => f.linea },
            { clave: 'cantidad', titulo: 'Q', alinear: 'der', numerico: true, render: (f) => f.cantidad },
            { clave: 'bs', titulo: 'Monto', alinear: 'der', numerico: true, render: (f) => <MontoBs valor={f.bs} /> },
          ]}
        />
      </Card>

      <Card titulo="Estados de carga y vacío">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2.5">
            <Skeleton className="h-8" />
            <Skeleton className="h-8 w-2/3" />
          </div>
          <EmptyState titulo="No hay notas este día" accion={<Button tam="sm" icono={<Plus size={14} />}>Nueva nota</Button>} />
        </div>
      </Card>

      <Card titulo="Modales y avisos">
        <div className="flex flex-wrap gap-2.5">
          <Button variante="secundario" onClick={() => setModal(true)}>
            Abrir modal
          </Button>
          <Button variante="peligro" onClick={() => setConfirmacion(true)}>
            Anular nota (confirmación)
          </Button>
          <Button variante="secundario" onClick={() => toast.exito('Nota LP-0416 emitida.', { etiqueta: 'Imprimir', alHacer: () => {} })}>
            Toast éxito
          </Button>
          <Button variante="secundario" onClick={() => toast.error('Stock insuficiente: disponible 20.')}>
            Toast error
          </Button>
        </div>
        <p className="mt-4 text-cuerpo text-texto-2">
          Formatos: {formatoBs(1224.6)} · {formatoFecha('2026-06-11')} · {numeroALetras(621)}
        </p>
      </Card>

      <Modal abierto={modal} titulo="Modal de ejemplo" alCerrar={() => setModal(false)} pie={<Button onClick={() => setModal(false)}>Listo</Button>}>
        <Input label="Campo" />
      </Modal>
      <Confirmacion
        abierto={confirmacion}
        titulo="¿Anular la nota LP-0415?"
        consecuencias={['Se repondrá el stock de 3 productos al almacén.', 'La nota queda anulada y no se puede deshacer.']}
        textoConfirmar="Anular nota"
        peligro
        campoMotivo="opcional"
        alConfirmar={() => {
          setConfirmacion(false)
          toast.exito('Nota LP-0415 anulada.')
        }}
        alCancelar={() => setConfirmacion(false)}
      />
    </Pagina>
  )
}

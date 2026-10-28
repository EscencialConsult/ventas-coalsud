import { useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import type { DocumentoDetalle, ItemDocumento } from '@/core/models/inventario'
import { formatoCantidad } from '@/shared/format/cantidad'
import { formatoFecha, formatoFechaHora } from '@/shared/format/fecha'
import { Badge } from '@/shared/ui/Badge'
import { BotonEnlace } from '@/shared/ui/Button'
import { Card } from '@/shared/ui/Card'
import { Dato, Datos } from '@/shared/ui/Datos'
import { DosLineas } from '@/shared/ui/DosLineas'
import { Skeleton } from '@/shared/ui/Estados'
import { Pagina } from '@/shared/ui/Pagina'
import { SeccionConsulta } from '@/shared/ui/SeccionConsulta'
import { Tabla, type Columna } from '@/shared/ui/Tabla'
import { CantidadMovimiento } from './components/CantidadMovimiento'
import { useDocumentoInventario } from './inventario.queries'
import { TIPOS_DOCUMENTO } from './inventario.tipos'

function DatosDocumento({ doc }: { doc: DocumentoDetalle }) {
  return (
    <Datos>
      <Dato etiqueta="Fecha">{formatoFecha(doc.fecha)}</Dato>
      <Dato etiqueta={doc.tipo === 'traspaso' ? 'Origen' : 'Almacén'}>{doc.almacen_nombre}</Dato>
      {doc.tipo === 'traspaso' && <Dato etiqueta="Destino">{doc.almacen_destino_nombre}</Dato>}
      {doc.vendedor_nombre && <Dato etiqueta="Vendedor">{doc.vendedor_nombre}</Dato>}
      {doc.tipo === 'ajuste' ? <Dato etiqueta="Motivo">{doc.motivo}</Dato> : doc.referencia && <Dato etiqueta="Referencia">{doc.referencia}</Dato>}
      <Dato etiqueta="Registrado por">
        {doc.usuario_nombre} <span className="font-normal text-texto-3 tabular-nums">· {formatoFechaHora(doc.created_at)}</span>
      </Dato>
    </Datos>
  )
}

// Detalle de un documento de inventario (06-pantallas/06 §3): es inmutable,
// así que solo se consulta.
export default function DocumentoDetallePage() {
  const { id = '' } = useParams()
  const consulta = useDocumentoInventario(id)
  const doc = consulta.data
  const tipo = doc ? TIPOS_DOCUMENTO[doc.tipo] : null

  const columnas: Columna<ItemDocumento>[] = [
    { clave: 'producto', titulo: 'Producto', principalMovil: true, render: (i) => <DosLineas principal={<span className="font-medium">{i.producto_nombre}</span>} secundario={i.linea_nombre} /> },
    { clave: 'cantidad', titulo: 'Cantidad', alinear: 'der', numerico: true, render: (i) => (doc?.tipo === 'ajuste' ? <CantidadMovimiento valor={i.cantidad} /> : formatoCantidad(i.cantidad)) },
  ]

  return (
    <Pagina
      titulo={doc?.numero ?? 'Documento'}
      subtitulo={tipo && <Badge variante={tipo.tono}>{doc?.tipo === 'salida' || doc?.tipo === 'retorno' ? tipo.titulo : tipo.etiqueta}</Badge>}
      acciones={
        <BotonEnlace a="/inventario/documentos" icono={<ArrowLeft size={15} />}>
          Documentos
        </BotonEnlace>
      }
    >
      <SeccionConsulta consulta={consulta} cargando={<Skeleton className="h-64" />} claseError="">
        {(d) => (
          <>
            <Card>
              <DatosDocumento doc={d} />
            </Card>
            <Card titulo="Productos" sinPadding>
              <Tabla etiqueta={`Productos de ${d.numero}`} columnas={columnas} filas={d.detalle} claveFila={(i) => i.producto_id} />
              <p className="border-t border-borde px-4 py-2.5 text-right text-chico text-texto-3 tabular-nums">
                {d.detalle.length} productos · Total <b className="font-semibold text-texto">{formatoCantidad(d.detalle.reduce((t, i) => t + i.cantidad, 0))}</b>
              </p>
            </Card>
          </>
        )}
      </SeccionConsulta>
    </Pagina>
  )
}

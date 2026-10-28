import { Navigate, useParams } from 'react-router-dom'
import { ReporteGenerico } from './components/ReporteGenerico'
import { REPORTES } from './reportes.definiciones'

/** `/reportes/:reporte` para los reportes genéricos (los demás tienen ruta propia). */
export default function ReporteGenericoTab() {
  const { reporte } = useParams()
  switch (reporte) {
    case 'clientes':
      return <ReporteGenerico key={reporte} clave={reporte} def={REPORTES.clientes} />
    case 'productos':
      return <ReporteGenerico key={reporte} clave={reporte} def={REPORTES.productos} />
    case 'rotacion':
      return <ReporteGenerico key={reporte} clave={reporte} def={REPORTES.rotacion} />
    case 'regionales':
      return <ReporteGenerico key={reporte} clave={reporte} def={REPORTES.regionales} />
    default:
      return <Navigate to="/reportes/clientes" replace />
  }
}

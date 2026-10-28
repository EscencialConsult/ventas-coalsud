import { Outlet } from 'react-router-dom'
import { useRegionalActiva } from '@/core/regional/useRegionalActiva'
import { Card } from '@/shared/ui/Card'
import { Pagina } from '@/shared/ui/Pagina'
import { Pestanas } from '@/shared/ui/Pestanas'
import { PESTANAS_REPORTES } from './reportes.definiciones'

// Reportes (06-pantallas/11 §1): una pestaña (subruta) por reporte; cada uno
// pide sus datos al abrirse (regla 29) y trae Imprimir y Excel (RF29).
export default function ReportesPage() {
  const { regionalActiva } = useRegionalActiva()
  return (
    <Pagina titulo="Reportes" subtitulo={regionalActiva?.nombre ?? 'Todas las regionales'}>
      <Card sinPadding>
        <Pestanas etiqueta="Reportes" pestanas={PESTANAS_REPORTES} />
        <Outlet />
      </Card>
    </Pagina>
  )
}

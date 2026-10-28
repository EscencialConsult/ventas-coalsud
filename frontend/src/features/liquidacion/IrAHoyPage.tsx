import { Navigate, useLocation } from 'react-router-dom'
import { useHoy } from '@/core/fecha/useHoy'

/** `/liquidacion` → el día de hoy (06-pantallas/09 §1). */
export default function IrAHoyPage() {
  const hoy = useHoy()
  const { search } = useLocation()
  return <Navigate to={`/liquidacion/${hoy}${search}`} replace />
}

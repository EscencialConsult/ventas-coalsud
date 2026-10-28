import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { PantallaCarga } from '@/shared/ui/PantallaCarga'
import { useSesion } from './useSesion'

// Sin sesión → login. Con contraseña temporal → solo /cambiar-password (CP-02.6).
export function RutaPrivada({ children, esCambioPassword = false }: { children: ReactNode; esCambioPassword?: boolean }) {
  const { sesion } = useSesion()
  const location = useLocation()

  if (sesion.estado === 'cargando') return <PantallaCarga />
  if (sesion.estado === 'sin_sesion') {
    return <Navigate to="/login" replace state={{ desde: location.pathname + location.search }} />
  }
  if (sesion.perfil.debe_cambiar_password && !esCambioPassword) return <Navigate to="/cambiar-password" replace />
  return children
}

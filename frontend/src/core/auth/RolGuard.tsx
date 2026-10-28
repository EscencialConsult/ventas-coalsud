import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/shared/ui/toast'
import type { Accion } from './permisos'
import { usePermisos } from './usePermisos'

// Corta el paso a una ruta si el usuario no puede realizar `accion`
// (p. ej. un regional que entra a /eecc escribiendo la URL, CP-10.3).
export function RolGuard({ accion, children }: { accion: Accion; children: ReactNode }) {
  const puede = usePermisos()
  if (puede(accion)) return children
  return <SinAcceso />
}

function SinAcceso() {
  const navigate = useNavigate()
  useEffect(() => {
    toast.error('No tiene acceso a esa pantalla.')
    navigate('/', { replace: true })
  }, [navigate])
  return null
}

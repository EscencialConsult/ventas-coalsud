import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { MotivoSalida } from '@/core/auth/contextoSesion'
import { useSesion } from '@/core/auth/useSesion'
import { procesarError } from '@/core/errores/procesarError'
import { Alerta } from '@/shared/ui/Estados'
import { FormularioLogin } from './components/FormularioLogin'
import { EncabezadoAuth, LayoutAuth } from './components/LayoutAuth'
import { PanelUsuariosDemo } from './components/PanelUsuariosDemo'

const MENSAJE_MOTIVO: Partial<Record<MotivoSalida, { tipo: 'info' | 'error' | 'alerta'; texto: string }>> = {
  inactividad: { tipo: 'info', texto: 'Su sesión se cerró por inactividad.' },
  usuario_inactivo: { tipo: 'error', texto: 'Su usuario está desactivado. Consulte al administrador.' },
  sesion_vencida: { tipo: 'alerta', texto: 'Su sesión expiró. Ingrese nuevamente.' },
}

// Login (06-pantallas/01). En modo fixtures se agrega el panel para simular
// qué usuario entra (§1b, ⚙ DT-17).
export default function LoginPage() {
  const { sesion, ingresar, demo } = useSesion()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)

  if (sesion.estado === 'activa') {
    const desde = (location.state as { desde?: string } | null)?.desde
    return <Navigate to={desde && desde !== '/login' ? desde : '/'} replace />
  }

  const motivo = sesion.estado === 'sin_sesion' && sesion.motivo ? MENSAJE_MOTIVO[sesion.motivo] : undefined

  // Los dos caminos de ingreso muestran el error en la misma alerta.
  const intentar = async (ingreso: () => Promise<void>) => {
    setError(null)
    try {
      await ingreso()
    } catch (err) {
      setError(procesarError(err).message)
    }
  }

  return (
    <LayoutAuth>
      <section className="rounded-card border border-borde bg-white p-6 shadow-card sm:p-8">
        <EncabezadoAuth titulo="Ingresar" />

        {(motivo || error) && (
          <div className="mb-4 space-y-2">
            {motivo && <Alerta tipo={motivo.tipo}>{motivo.texto}</Alerta>}
            {error && <Alerta tipo="error">{error}</Alerta>}
          </div>
        )}

        <FormularioLogin alIngresar={(email, password) => intentar(() => ingresar(email, password))} alErrorValidacion={setError} />

        <p className="mt-5 border-t border-borde pt-4 text-chico text-texto-3">¿Olvidó su contraseña? Pida al administrador nacional que la resetee.</p>
      </section>

      {demo && <PanelUsuariosDemo usuarios={demo.usuarios} alElegir={(id) => intentar(() => demo.ingresarComo(id))} />}
    </LayoutAuth>
  )
}

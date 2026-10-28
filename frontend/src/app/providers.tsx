import { useState, type ReactNode } from 'react'
import { LazyMotion, MotionConfig } from 'motion/react'
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { AuthProvider } from '@/core/auth/AuthProvider'
import { AvisoIncidentes } from '@/core/errores/AvisoIncidentes'
import { reportarIncidente } from '@/core/errores/incidentes'
import { mapearError } from '@/core/errores/mapearError'
import { RegionalActivaProvider } from '@/core/regional/RegionalActivaProvider'
import { Toaster } from '@/shared/ui/Toaster'
import { toast } from '@/shared/ui/toast'

// Reintentos solo para fallas transitorias. Una regla de negocio rechazada
// (DIA_CERRADO, STOCK_INSUFICIENTE…) no mejora reintentando.
function reintentar(intentos: number, error: unknown): boolean {
  const { codigo } = mapearError(error)
  return (codigo === 'RED' || codigo === 'DESCONOCIDO') && intentos < 2
}

function crearQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      // Las consultas muestran su error en su propia sección (SeccionConsulta);
      // acá solo se reportan las inesperadas al manejador global (regla 34).
      onError: (error) => {
        const e = mapearError(error)
        if (e.esInesperado) reportarIncidente(e)
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        const e = mapearError(error)
        if (e.esInesperado) reportarIncidente(e)
        // Las mutaciones con onError propio (errores de campo, modales) se manejan ahí.
        else if (!mutation.options.onError) toast.error(e.message)
      },
    }),
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: true, retry: reintentar },
      mutations: { retry: false },
    },
  })
}

const cargarAnimaciones = () => import('@/lib/animaciones').then((m) => m.default)

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(crearQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      {/* strict: solo componentes `m` (livianos); reducedMotion respeta la preferencia del sistema. */}
      <LazyMotion features={cargarAnimaciones} strict>
        <MotionConfig reducedMotion="user">
          <AuthProvider>
            <RegionalActivaProvider>
              {children}
              <Toaster />
              <AvisoIncidentes />
            </RegionalActivaProvider>
          </AuthProvider>
        </MotionConfig>
      </LazyMotion>
      {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </QueryClientProvider>
  )
}

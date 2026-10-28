import { RouterProvider } from 'react-router-dom'
import { LimiteErrores } from '@/core/errores/LimiteErrores'
import { Providers } from './providers'
import { router } from './router'

// El límite de errores envuelve también a los providers: si falla la sesión
// o el router, se muestra PantallaError y no una página en blanco.
export function App() {
  return (
    <LimiteErrores>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </LimiteErrores>
  )
}

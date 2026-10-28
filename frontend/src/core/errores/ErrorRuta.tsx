import { useState } from 'react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { crearIncidente } from './incidentes'
import { PantallaError } from './PantallaError'

// errorElement de las rutas raíz: React Router atrapa los errores de las
// pantallas antes que el límite de la raíz, así que se muestra la misma pantalla.
export function ErrorRuta() {
  const error = useRouteError()
  const [incidente] = useState(() =>
    crearIncidente(isRouteErrorResponse(error) ? new Error(`${error.status} ${error.statusText}`) : error),
  )
  return <PantallaError incidente={incidente} />
}

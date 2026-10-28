import { useMatches } from 'react-router-dom'
import { FechaOperacion, FiltroPeriodo } from './FiltroPeriodo'
import { SelectorRegional } from './SelectorRegional'

// Las rutas que aceptan el filtro de período lo declaran en su handle.
function useRutaConFiltroPeriodo(): boolean {
  return useMatches().some((m) => (m.handle as { filtroPeriodo?: boolean } | undefined)?.filtroPeriodo === true)
}

// Dónde y cuándo se opera: regional activa (elegible) y fecha de operación
// (la del servidor, rpc('hoy')). En el dashboard, la fecha suma el filtro de
// período. Pista hundida con la regional en relieve.
export function ContextoOperacion() {
  const conFiltro = useRutaConFiltroPeriodo()

  return (
    // relative: el desplegable de la regional se ancla a este bloque (bordes alineados).
    // h-9 con p-1 deja exactamente h-7 adentro: la pastilla queda a la misma distancia de los tres bordes.
    <div className="relative flex h-9 items-center gap-1 rounded-control bg-superficie p-1 shadow-hundido">
      <SelectorRegional />
      {conFiltro ? <FiltroPeriodo /> : <FechaOperacion />}
    </div>
  )
}

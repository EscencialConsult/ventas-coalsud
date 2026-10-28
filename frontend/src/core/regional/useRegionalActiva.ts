import { useContext } from 'react'
import { ContextoRegionalActiva, type ValorRegionalActiva } from './contextoRegional'

export function useRegionalActiva(): ValorRegionalActiva {
  const valor = useContext(ContextoRegionalActiva)
  if (!valor) throw new Error('useRegionalActiva debe usarse dentro de <RegionalActivaProvider>')
  return valor
}

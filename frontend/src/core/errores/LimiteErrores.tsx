import { Component, type ErrorInfo, type ReactNode } from 'react'
import { crearIncidente, type Incidente } from './incidentes'
import { PantallaError } from './PantallaError'

interface Estado {
  incidente: Incidente | null
}

// Límite de errores en la raíz: atrapa errores de render y de efectos de toda
// la app y muestra PantallaError en lugar de dejarla en blanco.
export class LimiteErrores extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { incidente: null }

  static getDerivedStateFromError(error: unknown): Estado {
    return { incidente: crearIncidente(error) }
  }

  componentDidCatch(_error: unknown, info: ErrorInfo) {
    // Agrega la pila de componentes al incidente ya creado (mismo código).
    this.setState((s) => (s.incidente ? { incidente: { ...s.incidente, componentes: info.componentStack ?? undefined } } : s))
  }

  render() {
    return this.state.incidente ? <PantallaError incidente={this.state.incidente} /> : this.props.children
  }
}
